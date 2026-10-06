/**
 * Unified status resolution that merges on-chain invoice state
 * with application-level business workflow.
 *
 * RULES:
 * - Blockchain state is ALWAYS authoritative for money movement.
 * - Application status is only used for pre-funding business workflow.
 * - Once an invoice is Funded, Settled, Cancelled, or Rejected on-chain,
 *   the on-chain status takes precedence.
 */

import { InvoiceStatus, type OnChainInvoice } from './accordpay';
import { getInvoiceMeta, type BusinessStatus } from './store';

export type UnifiedStatus =
  | 'sent'
  | 'rejected'
  | 'cancelled'
  | 'funded'
  | 'settled'
  | 'overdue';

export interface StatusInfo {
  status: UnifiedStatus;
  label: string;
  variant: 'neutral' | 'pending' | 'info' | 'success' | 'warning' | 'danger';
  description: string;
}

const STATUS_MAP: Record<UnifiedStatus, StatusInfo> = {
  sent:        { status: 'sent',        label: 'Sent',          variant: 'pending',  description: 'Invoice sent, waiting for buyer to fund' },
  rejected:    { status: 'rejected',    label: 'Rejected',      variant: 'danger',   description: 'Supplier rejected the invoice terms' },
  cancelled:   { status: 'cancelled',   label: 'Cancelled',     variant: 'danger',   description: 'Invoice has been cancelled' },
  funded:      { status: 'funded',      label: 'Funded',        variant: 'info',     description: 'Payment secured and awaiting settlement' },
  settled:     { status: 'settled',     label: 'Settled',       variant: 'success',  description: 'Payment completed and delivered' },
  overdue:     { status: 'overdue',     label: 'Overdue',       variant: 'warning',  description: 'Past due date, settlement available' },
};

export function resolveInvoiceStatus(
  invoice: OnChainInvoice,
  nowSeconds?: bigint,
): StatusInfo {
  const now = nowSeconds ?? BigInt(Math.floor(Date.now() / 1000));
  const meta = getInvoiceMeta(invoice.id.toString());

  // ── On-chain final states always win ──
  if (invoice.status === InvoiceStatus.SettledEarly || invoice.status === InvoiceStatus.SettledAtMaturity) {
    return STATUS_MAP.settled;
  }
  if (invoice.status === InvoiceStatus.Cancelled) {
    return STATUS_MAP.cancelled;
  }
  if (invoice.status === InvoiceStatus.Rejected) {
    return STATUS_MAP.rejected;
  }

  // ── Funded on-chain ──
  if (invoice.status === InvoiceStatus.Funded) {
    if (now >= invoice.dueDate) {
      return STATUS_MAP.overdue;
    }
    return STATUS_MAP.funded;
  }

  // ── Created on-chain but not yet funded ──
  if (invoice.status === InvoiceStatus.Created) {
    if (meta) {
      if (meta.businessStatus === 'rejected') return STATUS_MAP.rejected;
      if (meta.businessStatus === 'cancelled') return STATUS_MAP.cancelled;
    }
    return STATUS_MAP.sent;
  }

  // Fallback
  return STATUS_MAP.sent;
}

export function getStatusInfo(status: UnifiedStatus): StatusInfo {
  return STATUS_MAP[status];
}

/**
 * Returns the variant string for CSS styling purposes.
 */
export function statusVariant(status: UnifiedStatus): string {
  return STATUS_MAP[status].variant;
}

/**
 * Maps a business status to a unified status (for pre-chain invoices).
 */
export function businessToUnified(biz: BusinessStatus): UnifiedStatus {
  switch (biz) {
    case 'draft': return 'sent';
    case 'sent': return 'sent';
    case 'accepted': return 'sent';
    case 'rejected': return 'rejected';
    case 'cancelled': return 'cancelled';
  }
}
