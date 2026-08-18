'use client';

import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@/lib/wallet';
import Link from 'next/link';
import { Check, Copy, LogOut, Wallet } from 'lucide-react';

export default function WalletButton() {
  const { status, address, wallets, activeWallet, error, connect, disconnect, switchToArcTestnet } = useWallet();
  const [showPicker, setShowPicker] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [copied, setCopied] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [isHydrated, setIsHydrated] = useState(false);
  const [hasSavedWallet, setHasSavedWallet] = useState(false);
  const [isMobileBrowser, setIsMobileBrowser] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsHydrated(true);
    setIsMobileBrowser(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    setCurrentUrl(window.location.href);
    if (localStorage.getItem('accordpay_wallet_rdns')) {
      setHasSavedWallet(true);
    }
  }, []);

  useEffect(() => {
    if (hasSavedWallet && status === 'disconnected') {
      const timer = setTimeout(() => setHasSavedWallet(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasSavedWallet, status]);

  // Close picker on outside click / Escape
  useEffect(() => {
    if (!showPicker) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setShowPicker(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowPicker(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [showPicker]);

  // Close wallet card on outside click / Escape
  useEffect(() => {
    if (!showCard) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) setShowCard(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowCard(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [showCard]);

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  async function copyAddress() {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  // Loading skeleton
  if (!isHydrated || (hasSavedWallet && status === 'disconnected')) {
    return (
      <div className="min-h-10 w-[140px] animate-pulse rounded-xl bg-slate-200 dark:bg-zinc-800" />
    );
  }

  // Connected -- wallet card dropdown
  if (status === 'connected' && address) {
    const walletName = activeWallet?.info.name ?? 'Wallet';
    const walletIcon = activeWallet?.info.icon;

    return (
      <div className="relative" ref={cardRef}>
        <button
          type="button"
          id="wallet-card-trigger"
          onClick={() => setShowCard((open) => !open)}
          aria-expanded={showCard}
          aria-haspopup="dialog"
          className="flex min-h-10 items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 sm:text-sm dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
          <span className="font-mono">{shortAddr(address)}</span>
        </button>

        {showCard && (
          <div
            role="dialog"
            aria-label="Wallet options"
            className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/60">
              {walletIcon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={walletIcon} alt="" className="h-7 w-7 rounded-lg" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                  <Wallet size={14} className="text-indigo-600 dark:text-indigo-400" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">{walletName}</p>
                <p className="truncate font-mono text-[11px] text-slate-500 dark:text-zinc-500">
                  {address}
                </p>
              </div>
              <span className="ml-auto shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                Arc
              </span>
            </div>

            <div className="p-2">
              <button
                type="button"
                id="wallet-copy-address"
                onClick={() => void copyAddress()}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {copied ? (
                  <Check size={16} className="text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy size={16} className="text-slate-400 dark:text-zinc-500" />
                )}
                {copied ? 'Copied!' : 'Copy address'}
              </button>

              <button
                type="button"
                id="wallet-disconnect"
                onClick={() => { void disconnect(); setShowCard(false); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <LogOut size={16} />
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Wrong network
  if (status === 'wrong_network') {
    return (
      <button
        onClick={() => void switchToArcTestnet()}
        title={error ?? undefined}
        className="min-h-10 rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 sm:px-4 sm:text-sm"
      >
        Switch to Arc
      </button>
    );
  }

  // Connecting
  if (status === 'connecting') {
    return (
      <button disabled className="min-h-10 cursor-not-allowed rounded-xl bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 sm:px-4 sm:text-sm dark:bg-zinc-800 dark:text-zinc-500">
        Connecting...
      </button>
    );
  }

  // No wallet (mobile)
  if (status === 'no_wallet') {
    if (isMobileBrowser && currentUrl) {
      const metamaskUrl = `https://metamask.app.link/dapp/${currentUrl.replace(/^https?:\/\//, '')}`;
      const coinbaseUrl = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(currentUrl)}`;
      return (
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowPicker((open) => !open)}
            aria-expanded={showPicker}
            aria-haspopup="menu"
            className="min-h-11 rounded-xl bg-[#3157f6] px-3 py-2 text-xs font-semibold text-white transition active:scale-[0.98] sm:px-4 sm:text-sm"
          >
            Open Wallet
          </button>
          {showPicker && (
            <div className="fixed inset-x-4 top-20 z-50 space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-72">
              <div className="mb-3">
                <p className="font-bold text-slate-900 dark:text-zinc-100">Choose how to continue</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-zinc-400">Create a passkey wallet here or reopen AccordPay in an existing wallet.</p>
              </div>
              <Link href="/onboarding" onClick={() => setShowPicker(false)} className="button-primary w-full">Create passkey wallet</Link>
              <a href={metamaskUrl} onClick={() => setShowPicker(false)} className="button-primary w-full">Open in MetaMask</a>
              <a href={coinbaseUrl} onClick={() => setShowPicker(false)} className="button-secondary w-full">Open in Coinbase Wallet</a>
              <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="block py-2 text-center text-xs font-semibold text-indigo-700 hover:underline dark:text-indigo-400">Install a mobile wallet</a>
              {error && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>}
            </div>
          )}
        </div>
      );
    }
    return <Link href="/onboarding" className="button-primary">Create Wallet</Link>;
  }

  // Disconnected -- show wallet picker
  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setShowPicker((p) => !p)}
        aria-expanded={showPicker}
        aria-haspopup="menu"
        className="min-h-10 rounded-xl bg-[#3157f6] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2648d8] sm:px-4 sm:text-sm"
      >
        Connect Wallet
      </button>
      {showPicker && (
        <div className="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] space-y-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-2xl">
          <Link href="/onboarding" onClick={() => setShowPicker(false)} className="button-primary mb-2 w-full">Continue with passkey</Link>
          <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-zinc-500">Available wallets</p>
          {wallets.length === 0 ? (
            <p className="text-sm text-slate-500 px-3 py-2 dark:text-zinc-400">No browser wallet detected. Use the passkey option above or install MetaMask.</p>
          ) : (
            wallets.map((w) => (
              <button
                key={w.info.uuid}
                onClick={() => void connect(w)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-50 transition dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {w.info.icon ? (
                  // Wallet icons are provided as data URLs by EIP-6963 providers.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.info.icon} alt="" className="w-5 h-5 rounded" />
                ) : (
                  <span aria-hidden className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center dark:bg-indigo-900/50 dark:text-indigo-400">W</span>
                )}
                {w.info.name}
              </button>
            ))
          )}
          {error && <p className="px-3 py-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
