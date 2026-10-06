'use client';

import { getDisplayName, getCompanyProfile } from '@/lib/store';

interface Props {
  wallet: string;
  showAddress?: boolean;
  className?: string;
}

/**
 * Displays a company name with wallet address.
 * Falls back to "Unnamed Business" + shortened address when no profile exists.
 */
export default function CompanyName({ wallet, showAddress = true, className = '' }: Props) {
  const profile = getCompanyProfile(wallet);
  const name = profile?.name || 'Unnamed Business';
  const shortAddr = `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;

  return (
    <div className={`min-w-0 ${className}`}>
      <p className="font-semibold text-slate-900 truncate dark:text-zinc-100">{name}</p>
      {showAddress && (
        <p className="font-mono text-xs text-slate-500 truncate dark:text-zinc-400" title={wallet}>
          {shortAddr}
        </p>
      )}
    </div>
  );
}

/**
 * Inline company name — returns just the name string or shortened address.
 * Useful for tables and compact displays.
 */
export function InlineCompanyName({ wallet, className = '' }: { wallet: string; className?: string }) {
  const display = getDisplayName(wallet);
  const shortAddr = `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
  const hasProfile = display !== shortAddr;

  return (
    <span className={`${className}`} title={wallet}>
      {hasProfile ? (
        <span>
          <span className="font-medium">{display}</span>
          <span className="ml-1.5 font-mono text-xs text-slate-400 dark:text-zinc-500">{shortAddr}</span>
        </span>
      ) : (
        <span className="font-mono text-xs">{shortAddr}</span>
      )}
    </span>
  );
}
