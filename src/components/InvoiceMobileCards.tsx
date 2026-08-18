import Link from 'next/link';
import { statusLabel, type OnChainInvoice } from '@/lib/accordpay';
import { formatUsdc } from '@/lib/usdc';

type InvoiceMobileCardsProps = {
  invoices: OnChainInvoice[];
  counterparty?: 'buyer' | 'supplier';
  showEarlyAmount?: boolean;
  actionLabel?: string;
};

function shortAddress(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export default function InvoiceMobileCards({
  invoices,
  counterparty,
  showEarlyAmount = false,
  actionLabel = 'View invoice',
}: InvoiceMobileCardsProps) {
  return (
    <div className="space-y-3 md:hidden">
      {invoices.map((invoice) => {
        const counterpartyAddress = counterparty ? invoice[counterparty] : null;
        return (
          <article key={invoice.id.toString()} className="mobile-data-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Invoice</p>
                <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-zinc-100">#{invoice.id.toString()}</h3>
              </div>
              <span className="status-pill text-xs">{statusLabel(invoice.status)}</span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Full amount</dt>
                <dd className="mt-1 font-bold text-slate-950 dark:text-zinc-100">{formatUsdc(invoice.fullAmount)} USDC</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Due</dt>
                <dd className="mt-1 text-slate-700">{new Date(Number(invoice.dueDate) * 1_000).toLocaleDateString()}</dd>
              </div>
              {showEarlyAmount && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Early amount</dt>
                  <dd className="mt-1 font-semibold text-[#3157f6]">{formatUsdc(invoice.earlySettlementAmount)} USDC</dd>
                </div>
              )}
              {counterpartyAddress && (
                <div className={showEarlyAmount ? '' : 'col-span-2'}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{counterparty}</dt>
                  <dd className="mt-1 font-mono text-xs text-slate-700" title={counterpartyAddress}>{shortAddress(counterpartyAddress)}</dd>
                </div>
              )}
            </dl>

            <Link href={`/invoices/${invoice.id.toString()}`} className="button-secondary mt-4 w-full">
              {actionLabel}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
