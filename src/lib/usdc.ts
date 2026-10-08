import {
  formatUnits,
  parseUnits,
  type Address,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { erc20Abi } from './contracts/erc20-abi';

export const USDC_DECIMALS = 6;
export const NATIVE_DECIMALS = 18;

export async function getUsdcBalance(
  publicClient: PublicClient,
  tokenAddress: Address,
  account: Address,
): Promise<bigint> {
  return publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account],
  });
}

export async function getUsdcAllowance(
  publicClient: PublicClient,
  tokenAddress: Address,
  owner: Address,
  spender: Address,
): Promise<bigint> {
  return publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [owner, spender],
  });
}

/** Approve only the amount needed for this invoice, never an unlimited amount. */
export async function approveUsdc(
  walletClient: WalletClient,
  publicClient: PublicClient,
  tokenAddress: Address,
  spender: Address,
  amount: bigint,
): Promise<`0x${string}`> {
  const args = [spender, amount] as const;
  const [estimatedGas, fees] = await Promise.all([
    publicClient.estimateContractGas({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args,
      account: walletClient.account!,
    }),
    publicClient.estimateFeesPerGas(),
  ]);
  const hash = await walletClient.writeContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args,
    chain: walletClient.chain,
    account: walletClient.account!,
    gas: (estimatedGas * 120n) / 100n,
    ...fees,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error('USDC approval reverted.');

  // A fallback RPC may briefly trail the node that confirmed the approval.
  // Wait until the new allowance is visible before simulating fundInvoice.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const allowance = await getUsdcAllowance(
      publicClient,
      tokenAddress,
      walletClient.account!.address,
      spender,
    );
    if (allowance >= amount) return hash;
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  return hash;
}

export async function getNativeBalance(
  publicClient: PublicClient,
  account: Address,
): Promise<bigint> {
  return publicClient.getBalance({ address: account });
}

export function formatUsdc(amount: bigint): string {
  return formatUnits(amount, USDC_DECIMALS);
}

export function parseUsdc(amount: string): bigint {
  return parseUnits(amount, USDC_DECIMALS);
}

export function tryParseUsdc(amount: string): bigint | null {
  if (!amount.trim()) return 0n;
  try {
    const parsed = parseUsdc(amount);
    return parsed >= 0n ? parsed : null;
  } catch {
    return null;
  }
}

export function formatNative(amount: bigint): string {
  return formatUnits(amount, NATIVE_DECIMALS);
}
