'use client';

import { resolveInvoiceStatus, type UnifiedStatus } from '@/lib/invoice-status';
import type { OnChainInvoice } from '@/lib/accordpay';

const variantClasses: Record<string, string> = {
  neutral:  'bg-slate-100 text-slate-700 dark:bg-zinc-700 dark:text-zinc-300',
  pending:  'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400',
  info:     'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400',
  success:  'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400',
  warning:  'bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400',
  danger:   'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
};

interface Props {
  invoice: OnChainInvoice;
  nowSeconds?: bigint;
  size?: 'sm' | 'md';
}

/**
 * Unified status badge that shows the resolved business + on-chain status.
 */
export default function InvoiceStatusBadge({ invoice, nowSeconds, size = 'sm' }: Props) {
  const info = resolveInvoiceStatus(invoice, nowSeconds);
  const sizeClass = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${sizeClass} ${variantClasses[info.variant]}`}>
      {info.label}
    </span>
  );
}

/**
 * Standalone badge for a known unified status value.
 */
export function StatusBadgeByType({ status, label, size = 'sm' }: { status: UnifiedStatus; label?: string; size?: 'sm' | 'md' }) {
  const { variant, label: defaultLabel } = resolveStatusInfo(status);
  const sizeClass = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${sizeClass} ${variantClasses[variant]}`}>
      {label ?? defaultLabel}
    </span>
  );
}

function resolveStatusInfo(status: UnifiedStatus) {
  const map: Record<UnifiedStatus, { variant: string; label: string }> = {
    draft:       { variant: 'neutral', label: 'Draft' },
    sent:        { variant: 'pending', label: 'Sent' },
    accepted:    { variant: 'info',    label: 'Accepted' },
    rejected:    { variant: 'danger',  label: 'Rejected' },
    cancelled:   { variant: 'danger',  label: 'Cancelled' },
    funded:      { variant: 'info',    label: 'Funded' },
    in_progress: { variant: 'pending', label: 'In Progress' },
    settled:     { variant: 'success', label: 'Settled' },
    overdue:     { variant: 'warning', label: 'Overdue' },
  };
  return map[status];
}
