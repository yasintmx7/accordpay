'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink } from 'lucide-react';

type MobileNavigationContextValue = {
  open: boolean;
  close: () => void;
  toggle: () => void;
};

const mobileItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/invoices/sent', label: 'Sent' },
  { href: '/invoices/received', label: 'Received' },
  { href: '/bridge', label: 'Crosschain' },
  { href: '/settings', label: 'Settings' },
];

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

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
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
      <MobileFloatingMenu />
    </MobileNavigationContext.Provider>
  );
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MobileFloatingMenu() {
  const pathname = usePathname();
  const { open, close } = useMobileNavigation();

  return (
    <div
      className={`fixed inset-0 z-[70] min-[769px]:hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
      inert={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close navigation menu"
        onClick={close}
        className="absolute inset-0 cursor-default bg-transparent"
      />

      <nav
        aria-label="Mobile navigation"
        className={`absolute right-4 top-[68px] z-10 w-[min(19rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.14)] transition duration-200 ease-out dark:border-zinc-700 dark:bg-zinc-900 ${open ? 'translate-y-0 scale-100 opacity-100' : '-translate-y-2 scale-[0.98] opacity-0'}`}
      >
        {mobileItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              aria-current={active ? 'page' : undefined}
              className={`header-mobile-link ${active ? 'header-mobile-link-active' : ''}`}
            >
              {item.label}
            </Link>
          );
        })}

        <div className="my-2 h-px bg-slate-100 dark:bg-zinc-800" />

        <a
          href="https://faucet.circle.com"
          target="_blank"
          rel="noreferrer"
          onClick={close}
          className="header-mobile-utility"
        >
          Testnet Faucet
          <ExternalLink size={13} />
        </a>
      </nav>
    </div>
  );
}
