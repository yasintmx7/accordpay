'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { ArrowLeftRight, ChevronRight, ExternalLink, Moon, Radio, Settings, Sun, X } from 'lucide-react';
import { useWallet } from '@/lib/wallet';

type MobileNavigationContextValue = {
  open: boolean;
  close: () => void;
  toggle: () => void;
};

const MobileNavigationContext = createContext<MobileNavigationContextValue | null>(null);

export function useMobileNavigation() {
  const context = useContext(MobileNavigationContext);
  if (!context) throw new Error('useMobileNavigation must be used inside MobileNavigationProvider.');
  return context;
}

export function MobileNavigationProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((current) => !current), []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open, close]);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 769px)');
    const closeOnDesktop = () => {
      if (desktopQuery.matches) close();
    };

    closeOnDesktop();
    desktopQuery.addEventListener('change', closeOnDesktop);
    return () => desktopQuery.removeEventListener('change', closeOnDesktop);
  }, [close]);

  return (
    <MobileNavigationContext.Provider value={{ open, close, toggle }}>
      {children}
      <MobileNavigationDrawer />
    </MobileNavigationContext.Provider>
  );
}

function MobileNavigationDrawer() {
  const { open, close } = useMobileNavigation();
  const { status, address, activeWallet } = useWallet();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
  const darkMode = mounted && resolvedTheme === 'dark';

  return (
    <div
      className={`fixed inset-0 z-[80] min-[769px]:hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
      inert={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close navigation drawer"
        onClick={close}
        className={`absolute inset-0 bg-slate-950/30 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="AccordPay navigation"
        className={`absolute right-0 top-0 flex h-[100dvh] w-[min(19rem,82vw)] flex-col border-l border-slate-200 bg-white shadow-[-16px_0_48px_rgba(15,23,42,0.12)] transition-transform duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-950 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-slate-100 px-5 dark:border-zinc-800">
          <Link href="/" onClick={close} className="flex items-center gap-2.5" aria-label="AccordPay home">
            <span className="relative h-7 w-7">
              <Image src="/accordpay-mark-light-compact.png" alt="" fill sizes="28px" className="object-contain dark:hidden" />
              <Image src="/accordpay-mark-dark-compact.png" alt="" fill sizes="28px" className="hidden object-contain dark:block" />
            </span>
            <span className="text-base font-bold tracking-[-0.025em] text-slate-900 dark:text-zinc-100">AccordPay</span>
          </Link>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            aria-label="Close navigation drawer"
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {status === 'connected' && address && (
            <div className="mb-5 border-b border-slate-100 pb-5 dark:border-zinc-800">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-500">Wallet</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-slate-100 text-xs font-bold text-slate-600 dark:bg-zinc-900 dark:text-zinc-300">
                  {(activeWallet?.info.name ?? 'W').slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800 dark:text-zinc-200">{activeWallet?.info.name ?? 'Connected wallet'}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-zinc-500">{shortAddress}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Arc
                </span>
              </div>
            </div>
          )}

          <nav aria-label="Secondary mobile navigation" className="space-y-1">
            <Link href="/bridge" onClick={close} className="mobile-drawer-row">
              <span className="mobile-drawer-row-icon"><ArrowLeftRight size={18} /></span>
              <span>Crosschain</span>
              <ChevronRight size={16} className="ml-auto text-slate-300 dark:text-zinc-600" />
            </Link>
            <Link href="/settings" onClick={close} className="mobile-drawer-row">
              <span className="mobile-drawer-row-icon"><Settings size={18} /></span>
              <span>Settings</span>
              <ChevronRight size={16} className="ml-auto text-slate-300 dark:text-zinc-600" />
            </Link>
          </nav>

          <div className="my-4 h-px bg-slate-100 dark:bg-zinc-800" />

          <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="mobile-drawer-row">
            <span className="mobile-drawer-row-icon text-slate-500 dark:text-zinc-400">USDC</span>
            <span>Testnet Faucet</span>
            <ExternalLink size={15} className="ml-auto text-slate-300 dark:text-zinc-600" />
          </a>

          <div className="my-4 h-px bg-slate-100 dark:bg-zinc-800" />

          <button
            type="button"
            onClick={() => setTheme(darkMode ? 'light' : 'dark')}
            className="mobile-drawer-row w-full"
          >
            <span className="mobile-drawer-row-icon">{darkMode ? <Sun size={18} /> : <Moon size={18} />}</span>
            <span>Theme</span>
            <span className="ml-auto text-xs font-medium text-slate-400 dark:text-zinc-500">{darkMode ? 'Dark' : 'Light'}</span>
          </button>

          <div className="mobile-drawer-row cursor-default">
            <span className="mobile-drawer-row-icon"><Radio size={18} /></span>
            <span>Network</span>
            <span className="ml-auto text-xs font-medium text-slate-400 dark:text-zinc-500">Arc Testnet</span>
          </div>
        </div>

        <p className="shrink-0 border-t border-slate-100 px-5 py-4 text-[10px] leading-4 text-slate-400 dark:border-zinc-800 dark:text-zinc-600">
          Testnet USDC has no financial value.
        </p>
      </aside>
    </div>
  );
}
