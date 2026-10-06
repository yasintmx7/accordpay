'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink, Menu } from 'lucide-react';
import { useMobileNavigation } from '@/components/MobileNavigationDrawer';

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
    <nav aria-label="Primary navigation" className="hidden h-full items-center min-[769px]:flex">
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
  const { open, toggle } = useMobileNavigation();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={open ? 'Close navigation drawer' : 'Open navigation drawer'}
      className="header-menu-button min-[769px]:hidden"
    >
      <Menu size={19} />
    </button>
  );
}
