'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink, Menu, Plus, X } from 'lucide-react';

const primaryItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/invoices/sent', label: 'Sent' },
  { href: '/invoices/received', label: 'Received' },
  { href: '/bridge', label: 'Crosschain' },
  { href: '/settings', label: 'Settings' },
];

const routesWithHeaderCreateAction = ['/bridge', '/settings', '/payouts'];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function shouldShowHeaderCreateAction(pathname: string) {
  return routesWithHeaderCreateAction.some((route) => isActivePath(pathname, route));
}

export function HeaderCreateAction() {
  const pathname = usePathname();

  if (!shouldShowHeaderCreateAction(pathname)) return null;

  return (
    <Link href="/invoices/new" className="header-create-button">
      Create Invoice
    </Link>
  );
}

export function PrimaryNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="hidden h-full items-center lg:flex">
      {primaryItems.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`nav-link ${active ? 'nav-link-active' : ''}`}
          >
            {item.label}
          </Link>
        );
      })}
      <span className="mx-2 h-4 w-px bg-slate-200 dark:bg-zinc-700" aria-hidden />
      <a
        href="https://faucet.circle.com"
        target="_blank"
        rel="noreferrer"
        className="header-utility-link"
        title="Circle testnet faucet"
      >
        Faucet
        <ExternalLink size={12} aria-hidden />
      </a>
    </nav>
  );
}

export function MobileHeaderMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const showCreateAction = shouldShowHeaderCreateAction(pathname);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        className="header-menu-button"
      >
        {open ? <X size={18} /> : <Menu size={19} />}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Mobile navigation"
          className="absolute right-0 top-full mt-2 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.14)] dark:border-zinc-700 dark:bg-zinc-900"
        >
          {showCreateAction && (
            <>
              <Link href="/invoices/new" role="menuitem" onClick={() => setOpen(false)} className="header-mobile-create">
                <Plus size={17} />
                Create Invoice
              </Link>
              <div className="my-2 h-px bg-slate-100 dark:bg-zinc-800" />
            </>
          )}
          {primaryItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
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
            role="menuitem"
            onClick={() => setOpen(false)}
            className="header-mobile-utility"
          >
            Testnet Faucet
            <ExternalLink size={13} />
          </a>
        </div>
      )}
    </div>
  );
}
