'use client';

import { createPublicClient, type Address, type EIP1193Provider as ViemProvider, type Hex } from 'viem';
import { createBundlerClient, toWebAuthnAccount } from 'viem/account-abstraction';
import { english, generateMnemonic, mnemonicToAccount } from 'viem/accounts';
import { arcTestnet, createArcPublicClient } from './arc';
import {
  EIP1193Provider as CircleEIP1193Provider,
  recoveryActions,
  toCircleSmartAccount,
  toModularTransport,
  toPasskeyTransport,
  toWebAuthnCredential,
  WebAuthnMode,
} from '@circle-fin/modular-wallets-core';

export type NetworkFeeMode = 'sponsored' | 'self-paid';
export type PasskeyMode = 'register' | 'login';

const CLIENT_URL = process.env.NEXT_PUBLIC_CIRCLE_MODULAR_WALLET_URL || 'https://modular-sdk.circle.com/v1/rpc/w3s/buidl';
const CLIENT_KEY = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY || '';
const FEE_KEY = 'accordpay_fee_mode';
const RECOVERY_KEY_PREFIX = 'accordpay_recovery_enabled_';
const PASSKEY_CREDENTIAL_KEY = 'accordpay_passkey_credential_v1';

export const PASSKEY_WALLET_RDNS = 'app.accordpay.passkey';

export const isCircleModularWalletConfigured = Boolean(CLIENT_KEY);

type CircleRuntime = {
  smartAccount: { address: Address };
  bundlerClient: ReturnType<typeof createBundlerClient>;
};

let activeRuntime: CircleRuntime | null = null;

type StoredPasskeyCredential = {
  version: 1;
  id: string;
  publicKey: Hex;
  rpId?: string;
};

function readStoredPasskeyCredential(): StoredPasskeyCredential | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PASSKEY_CREDENTIAL_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredPasskeyCredential>;
    if (
      value.version !== 1 ||
      typeof value.id !== 'string' ||
      !value.id ||
      typeof value.publicKey !== 'string' ||
      !value.publicKey.startsWith('0x') ||
      (value.rpId !== undefined && typeof value.rpId !== 'string')
    ) {
      window.localStorage.removeItem(PASSKEY_CREDENTIAL_KEY);
      return null;
    }
    return value as StoredPasskeyCredential;
  } catch {
    window.localStorage.removeItem(PASSKEY_CREDENTIAL_KEY);
    return null;
  }
}

function storePasskeyCredential(credential: { id: string; publicKey: Hex; rpId?: string }): void {
  const value: StoredPasskeyCredential = {
    version: 1,
    id: credential.id,
    publicKey: credential.publicKey,
    ...(credential.rpId ? { rpId: credential.rpId } : {}),
  };
  window.localStorage.setItem(PASSKEY_CREDENTIAL_KEY, JSON.stringify(value));
}

function passkeyOwner(credential: { id: string; publicKey: Hex; rpId?: string }) {
  return toWebAuthnAccount({
    credential: { id: credential.id, publicKey: credential.publicKey },
    ...(credential.rpId ? { rpId: credential.rpId } : {}),
  });
}

function deviceWalletName(): string {
  const storageKey = 'accordpay_passkey_wallet_name';
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const generated = `accordpay-${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`;
  window.localStorage.setItem(storageKey, generated);
  return generated;
}

export function getNetworkFeeMode(): NetworkFeeMode {
  return window.localStorage.getItem(FEE_KEY) === 'self-paid' ? 'self-paid' : 'sponsored';
}

export function setNetworkFeeMode(mode: NetworkFeeMode): void {
  window.localStorage.setItem(FEE_KEY, mode);
  window.dispatchEvent(new CustomEvent('accordpay:fee-mode', { detail: mode }));
}

export function isRecoveryEnabled(address: Address): boolean {
  return window.localStorage.getItem(`${RECOVERY_KEY_PREFIX}${address.toLowerCase()}`) === 'true';
}

export function formatCircleWalletError(error: unknown): string {
  const value = error as { shortMessage?: string; message?: string; details?: string };
  const raw = [value.shortMessage, value.message, value.details].filter(Boolean).join(' ');
  if (/notallowederror|operation.*not allowed|cancel/i.test(raw)) return 'Passkey approval was cancelled. Nothing was submitted.';
  if (/invalid credentials|malformed api key/i.test(raw)) return 'Circle could not authorize this app. Check the Client Key and allowed domain.';
  if (/origin|domain|relying party|rp id/i.test(raw)) return 'This website domain is not authorized for the AccordPay passkey.';
  if (/sponsor|paymaster|aa3|gas station/i.test(raw)) return 'Sponsored fees are unavailable for this transaction. Select “Pay myself” and try again.';
  if (/no credential|credential.*not found|unknown rpc/i.test(raw)) return 'No matching AccordPay passkey was found on this device or synced password manager.';
  if (/network|fetch|timeout/i.test(raw)) return 'Circle could not be reached. Check your connection and try again.';
  return value.shortMessage || value.message || 'The passkey request could not be completed.';
}

function createProvider(runtime: CircleRuntime): ViemProvider {
  const readClient = createArcPublicClient();
  const circleProvider = new CircleEIP1193Provider(runtime.bundlerClient as never, readClient as never);
  return {
    request: async ({ method, params }: { method: string; params?: readonly unknown[] | object }) => {
      if (method === 'eth_chainId') return `0x${arcTestnet.id.toString(16)}`;
      if (method === 'wallet_switchEthereumChain' || method === 'wallet_addEthereumChain') return null;
      if (method === 'eth_sendTransaction' && getNetworkFeeMode() === 'sponsored') {
        const transaction = (params as readonly [{ to: Address; data?: Hex; value?: Hex }])[0];
        try {
          const userOperationHash = await runtime.bundlerClient.sendUserOperation({
            account: runtime.smartAccount as never,
            calls: [{ to: transaction.to, data: transaction.data ?? '0x', value: transaction.value ? BigInt(transaction.value) : 0n }],
            paymaster: true,
          } as never);
          const { receipt } = await runtime.bundlerClient.waitForUserOperationReceipt({ hash: userOperationHash });
          return receipt.transactionHash;
        } catch (error) {
          throw new Error(`SPONSORSHIP_UNAVAILABLE: ${formatCircleWalletError(error)}`);
        }
      }
      const response = await circleProvider.request({ jsonrpc: '2.0', id: Date.now(), method, params } as never);
      return (response as { result: unknown }).result;
    },
  } as ViemProvider;
}

async function buildRuntime(owner: unknown): Promise<CircleRuntime> {
  const modularTransport = toModularTransport(`${CLIENT_URL}/arcTestnet`, CLIENT_KEY);
  const modularClient = createPublicClient({ chain: arcTestnet, transport: modularTransport as never });
  const smartAccount = await toCircleSmartAccount({ client: modularClient as never, owner: owner as never });
  const bundlerClient = createBundlerClient({ account: smartAccount as never, chain: arcTestnet, transport: modularTransport as never });
  return { smartAccount: smartAccount as never, bundlerClient };
}

export async function createCirclePasskeyProvider(mode: PasskeyMode, feeMode: NetworkFeeMode): Promise<{ address: Address; provider: ViemProvider }> {
  if (!CLIENT_KEY) throw new Error('Circle passkey wallets are not configured yet.');
  if (!window.PublicKeyCredential) throw new Error('This browser does not support passkeys. Use a current mobile or desktop browser.');
  try {
    const credential = await toWebAuthnCredential({
      transport: toPasskeyTransport(CLIENT_URL, CLIENT_KEY),
      mode: mode === 'register' ? WebAuthnMode.Register : WebAuthnMode.Login,
      ...(mode === 'register' ? { username: deviceWalletName() } : {}),
    });
    activeRuntime = await buildRuntime(passkeyOwner(credential));
    storePasskeyCredential(credential);
    setNetworkFeeMode(feeMode);
    return { address: activeRuntime.smartAccount.address, provider: createProvider(activeRuntime) };
  } catch (error) {
    throw new Error(formatCircleWalletError(error));
  }
}

/**
 * Rebuilds the in-memory Circle wallet after a page reload. Only the public
 * WebAuthn credential descriptor is persisted; signing still requires the
 * passkey authenticator on the user's device.
 */
export async function restoreCirclePasskeyProvider(feeMode: NetworkFeeMode): Promise<{ address: Address; provider: ViemProvider } | null> {
  if (!CLIENT_KEY || typeof window === 'undefined') return null;
  const credential = readStoredPasskeyCredential();
  if (!credential) return null;
  activeRuntime = await buildRuntime(passkeyOwner(credential));
  setNetworkFeeMode(feeMode);
  return { address: activeRuntime.smartAccount.address, provider: createProvider(activeRuntime) };
}

export function clearCirclePasskeyRuntime(): void {
  activeRuntime = null;
}

export async function enablePasskeyRecovery(feeMode: NetworkFeeMode): Promise<string> {
  if (!activeRuntime) throw new Error('Unlock your AccordPay passkey wallet first.');
  const mnemonic = generateMnemonic(english);
  const recoveryEoa = mnemonicToAccount(mnemonic);
  const recoveryClient = activeRuntime.bundlerClient.extend(recoveryActions as never) as never as { registerRecoveryAddress: (args: unknown) => Promise<unknown> };
  await recoveryClient.registerRecoveryAddress({
    account: activeRuntime.smartAccount,
    recoveryAddress: recoveryEoa.address,
    paymaster: feeMode === 'sponsored' ? true : undefined,
  });
  window.localStorage.setItem(`${RECOVERY_KEY_PREFIX}${activeRuntime.smartAccount.address.toLowerCase()}`, 'true');
  return mnemonic;
}

export async function recoverCirclePasskeyProvider(mnemonic: string, feeMode: NetworkFeeMode): Promise<{ address: Address; provider: ViemProvider }> {
  if (!CLIENT_KEY) throw new Error('Circle passkey wallets are not configured yet.');
  try {
    const recoveryEoa = mnemonicToAccount(mnemonic.trim());
    const tempRuntime = await buildRuntime(recoveryEoa);
    const credential = await toWebAuthnCredential({
      transport: toPasskeyTransport(CLIENT_URL, CLIENT_KEY),
      mode: WebAuthnMode.Register,
      username: `accordpay-recovery-${crypto.randomUUID().slice(0, 12)}`,
    });
    const recoveryClient = tempRuntime.bundlerClient.extend(recoveryActions as never) as never as { executeRecovery: (args: unknown) => Promise<unknown> };
    await recoveryClient.executeRecovery({
      account: tempRuntime.smartAccount,
      credential,
      paymaster: feeMode === 'sponsored' ? true : undefined,
    });
    activeRuntime = await buildRuntime(passkeyOwner(credential));
    storePasskeyCredential(credential);
    setNetworkFeeMode(feeMode);
    window.localStorage.setItem(`${RECOVERY_KEY_PREFIX}${activeRuntime.smartAccount.address.toLowerCase()}`, 'true');
    return { address: activeRuntime.smartAccount.address, provider: createProvider(activeRuntime) };
  } catch (error) {
    throw new Error(formatCircleWalletError(error));
  }
}
