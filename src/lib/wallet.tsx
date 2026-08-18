'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Chain,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { arcTestnet, supportedChains } from './arc';
import { getNetworkFeeMode, setNetworkFeeMode as persistNetworkFeeMode, type NetworkFeeMode } from './circle-modular-wallet';

interface EIP6963ProviderInfo {
  rdns: string;
  uuid: string;
  name: string;
  icon: string;
}

export interface EIP1193Provider {
  request: (args: { method: string; params?: readonly unknown[] | object }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

export type WalletStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'wrong_network'
  | 'no_wallet';

export interface WalletState {
  status: WalletStatus;
  address: Address | null;
  chainId: number | null;
  chain: Chain | null;
  isOnSupportedChain: boolean;
  isOnTestnet: boolean;
  wallets: EIP6963ProviderDetail[];
  activeWallet: EIP6963ProviderDetail | null;
  publicClient: PublicClient | null;
  walletClient: WalletClient | null;
  error: string | null;
  isPasskeyWallet: boolean;
  /** True when the user connected via passkey in this or a prior session (used to show the reconnect banner after refresh). */
  isPasskeySession: boolean;
  feeMode: NetworkFeeMode;
  setFeeMode: (mode: NetworkFeeMode) => void;
  connect: (wallet: EIP6963ProviderDetail, isAutoConnect?: boolean) => Promise<void>;
  disconnect: () => void;
  switchToArcTestnet: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

export function useWallet(): WalletState {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used inside <WalletProvider>.');
  return context;
}

function errorMessage(error: unknown): string {
  const value = error as { shortMessage?: string; message?: string };
  return value.shortMessage || value.message || 'The wallet request failed.';
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<EIP6963ProviderDetail[]>([]);
  const [activeWallet, setActiveWallet] = useState<EIP6963ProviderDetail | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [status, setStatus] = useState<WalletStatus>('disconnected');
  const [publicClient, setPublicClient] = useState<PublicClient | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feeMode, setFeeModeState] = useState<NetworkFeeMode>(() => typeof window === 'undefined' ? 'sponsored' : getNetworkFeeMode());

  useEffect(() => {
    const update = (event: Event) => setFeeModeState((event as CustomEvent<NetworkFeeMode>).detail);
    window.addEventListener('accordpay:fee-mode', update);
    return () => window.removeEventListener('accordpay:fee-mode', update);
  }, []);

  const setFeeMode = useCallback((mode: NetworkFeeMode) => {
    persistNetworkFeeMode(mode);
    setFeeModeState(mode);
  }, []);

  const resolveChain = useCallback((id: number): Chain | null => {
    return supportedChains.find((candidate) => candidate.id === id) ?? null;
  }, []);

  useEffect(() => {
    const addWallet = (detail: EIP6963ProviderDetail) => {
      setWallets((previous) => {
        if (previous.some((wallet) => wallet.info.uuid === detail.info.uuid || wallet.provider === detail.provider)) {
          return previous;
        }
        return [...previous, detail];
      });
      setStatus((current) => (current === 'no_wallet' ? 'disconnected' : current));
    };

    const announceHandler = (event: Event) => {
      addWallet((event as CustomEvent<EIP6963ProviderDetail>).detail);
    };

    window.addEventListener('eip6963:announceProvider', announceHandler as EventListener);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    const fallbackTimer = window.setTimeout(() => {
      const injected = (window as Window & { ethereum?: EIP1193Provider }).ethereum;
      if (!injected) return;
      addWallet({
        info: {
          rdns: 'legacy.injected',
          uuid: 'legacy-injected-provider',
          name: 'Browser Wallet',
          icon: '',
        },
        provider: injected,
      });
    }, 300);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener('eip6963:announceProvider', announceHandler as EventListener);
    };
  }, []);

  useEffect(() => {
    if (wallets.length > 0 || activeWallet) return;
    const timer = window.setTimeout(() => setStatus('no_wallet'), 900);
    return () => window.clearTimeout(timer);
  }, [wallets.length, activeWallet]);

  const synchronize = useCallback(async (
    wallet: EIP6963ProviderDetail,
    requestAccounts: boolean,
  ) => {
    const method = requestAccounts ? 'eth_requestAccounts' : 'eth_accounts';
    const [accountResult, rawChainId] = await Promise.all([
      wallet.provider.request({ method }),
      wallet.provider.request({ method: 'eth_chainId' }),
    ]);
    const accounts = accountResult as Address[];
    if (!accounts[0]) {
      setAddress(null);
      setWalletClient(null);
      setPublicClient(null);
      setStatus('disconnected');
      return;
    }

    const id = Number.parseInt(rawChainId as string, 16);
    const detectedChain = resolveChain(id);
    const nextWalletClient = createWalletClient({
      account: accounts[0],
      chain: detectedChain ?? arcTestnet,
      transport: custom(wallet.provider as Parameters<typeof custom>[0]),
    });
    const nextPublicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.io'),
      batch: { multicall: true },
    });

    setAddress(accounts[0]);
    setChainId(id);
    setWalletClient(nextWalletClient);
    setPublicClient(nextPublicClient);
    setStatus(detectedChain ? 'connected' : 'wrong_network');
  }, [resolveChain]);

  const connect = useCallback(async (wallet: EIP6963ProviderDetail, isAutoConnect = false) => {
    setStatus('connecting');
    setError(null);
    setActiveWallet(wallet);
    try {
      await synchronize(wallet, !isAutoConnect);
      if (typeof window !== 'undefined') {
        localStorage.setItem('accordpay_wallet_rdns', wallet.info.rdns);
        // Persist a passkey session flag so the reconnect banner shows after a refresh.
        if (wallet.info.rdns === 'app.accordpay.passkey') {
          localStorage.setItem('accordpay_passkey_session', '1');
        }
      }
    } catch (connectError) {
      if (!isAutoConnect) {
        setError(errorMessage(connectError));
      }
      // If it's an auto-connect, we just fall back to disconnected without showing an error or wiping storage,
      // so that they remain "remembered" for next time they unlock their wallet.
      setActiveWallet(null);
      setStatus('disconnected');
    }
  }, [synchronize]);

  const disconnect = useCallback(async () => {
    if (activeWallet) {
      try {
        await activeWallet.provider.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }],
        });
      } catch {
        // Many wallets do not support this method yet, so we silently ignore errors.
      }
    }
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accordpay_wallet_rdns');
      // Clear the passkey session flag so the reconnect banner does not re-appear.
      localStorage.removeItem('accordpay_passkey_session');
    }
    setStatus(wallets.length === 0 ? 'no_wallet' : 'disconnected');
    setAddress(null);
    setChainId(null);
    setActiveWallet(null);
    setPublicClient(null);
    setWalletClient(null);
    setError(null);
  }, [activeWallet, wallets.length]);

  useEffect(() => {
    if (!activeWallet?.provider.on) return;

    const refresh = () => {
      void synchronize(activeWallet, false).catch((refreshError) => {
        setError(errorMessage(refreshError));
        disconnect();
      });
    };
    activeWallet.provider.on('accountsChanged', refresh);
    activeWallet.provider.on('chainChanged', refresh);

    return () => {
      activeWallet.provider.removeListener?.('accountsChanged', refresh);
      activeWallet.provider.removeListener?.('chainChanged', refresh);
    };
  }, [activeWallet, disconnect, synchronize]);

  const switchToArcTestnet = useCallback(async () => {
    if (!activeWallet) return;
    setError(null);
    try {
      await activeWallet.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${arcTestnet.id.toString(16)}` }],
      });
    } catch (switchError) {
      const code = (switchError as { code?: number })?.code;
      if (code !== 4902) {
        setError(errorMessage(switchError));
        return;
      }
      try {
        await activeWallet.provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${arcTestnet.id.toString(16)}`,
            chainName: arcTestnet.name,
            nativeCurrency: arcTestnet.nativeCurrency,
            rpcUrls: [...arcTestnet.rpcUrls.default.http],
            blockExplorerUrls: [arcTestnet.blockExplorers.default.url],
          }],
        });
      } catch (addError) {
        setError(errorMessage(addError));
        return;
      }
    }
    await synchronize(activeWallet, false);
  }, [activeWallet, synchronize]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeWallet) return;
    
    const savedRdns = localStorage.getItem('accordpay_wallet_rdns');
    if (!savedRdns) return;

    const previouslyConnected = wallets.find(w => w.info.rdns === savedRdns);
    if (previouslyConnected && status === 'disconnected') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void connect(previouslyConnected, true);
    }
  }, [wallets, activeWallet, connect, status]);

  const chain = chainId ? resolveChain(chainId) : null;
  const isOnSupportedChain = chain !== null;
  const isOnTestnet = chainId === arcTestnet.id;
  const isPasskeyWallet = activeWallet?.info.rdns === 'app.accordpay.passkey';
  // isPasskeySession is true from the moment of connect until explicit disconnect,
  // even across page refreshes (read from localStorage).
  const isPasskeySession = isPasskeyWallet || (
    typeof window !== 'undefined' &&
    localStorage.getItem('accordpay_passkey_session') === '1'
  );

  const value = useMemo<WalletState>(() => ({
    status,
    address,
    chainId,
    chain,
    isOnSupportedChain,
    isOnTestnet,
    wallets,
    activeWallet,
    publicClient,
    walletClient,
    error,
    isPasskeyWallet,
    isPasskeySession,
    feeMode,
    setFeeMode,
    connect,
    disconnect,
    switchToArcTestnet,
  }), [
    status,
    address,
    chainId,
    chain,
    isOnSupportedChain,
    isOnTestnet,
    wallets,
    activeWallet,
    publicClient,
    walletClient,
    error,
    isPasskeyWallet,
    isPasskeySession,
    feeMode,
    setFeeMode,
    connect,
    disconnect,
    switchToArcTestnet,
  ]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
