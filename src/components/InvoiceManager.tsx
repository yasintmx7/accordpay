'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, RefreshCw } from 'lucide-react';
import { InvoiceStatus, statusLabel, type OnChainInvoice } from '@/lib/accordpay';
import { formatUsdc } from '@/lib/usdc';
import { triggerHaptic } from '@/lib/haptics';

type Props = {
  invoices: OnChainInvoice[];
  role: 'buyer' | 'supplier' | 'all';
  onRefresh?: () => Promise<void> | void;
};

type SortKey = 'newest' | 'oldest' | 'amount-high' | 'amount-low' | 'due-soon';

function displayStatus(invoice: OnChainInvoice, now: bigint) {
  if ((invoice.status === InvoiceStatus.Created || invoice.status === InvoiceStatus.Funded) && invoice.dueDate < now) return 'Overdue';
  return statusLabel(invoice.status);
}

function shortAddress(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export default function InvoiceManager({ invoices, role, onRefresh }: Props) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [sort, setSort] = useState<SortKey>('newest');
  const [now] = useState(() => BigInt(Math.floor(Date.now() / 1_000)));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return invoices
      .filter((invoice) => {
        const label = displayStatus(invoice, now);
        if (status !== 'All' && label !== status) return false;
        if (!normalized) return true;
        return [
          invoice.id.toString(),
          `#${invoice.id.toString()}`,
          invoice.buyer,
          invoice.supplier,
          invoice.invoiceReferenceHash,
          invoice.descriptionHash,
        ].some((value) => value.toLowerCase().includes(normalized));
      })
      .sort((a, b) => {
        if (sort === 'oldest') return Number(a.createdAt - b.createdAt);
        if (sort === 'amount-high') return Number(b.fullAmount - a.fullAmount);
        if (sort === 'amount-low') return Number(a.fullAmount - b.fullAmount);
        if (sort === 'due-soon') return Number(a.dueDate - b.dueDate);
        return Number(b.createdAt - a.createdAt);
      });
  }, [invoices, now, query, sort, status]);

  async function handleRefresh() {
    triggerHaptic('light');
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      } else if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  }

  function exportCsv() {
    triggerHaptic('light');
    const header = ['Invoice ID', 'Buyer', 'Supplier', 'Amount USDC', 'Early amount USDC', 'Status', 'Created', 'Due'];
    const rows = visible.map((invoice) => [
      invoice.id.toString(), invoice.buyer, invoice.supplier, formatUsdc(invoice.fullAmount),
      formatUsdc(invoice.earlySettlementAmount), displayStatus(invoice, now),
      new Date(Number(invoice.createdAt) * 1_000).toISOString(),
      new Date(Number(invoice.dueDate) * 1_000).toISOString(),
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `accordpay-${role}-invoices.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="card grid gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-[minmax(15rem,1fr)_12rem_12rem_auto_auto]">
        <label className="sr-only" htmlFor={`${role}-invoice-search`}>Search invoices</label>
        <input id={`${role}-invoice-search`} value={query} onChange={(event) => setQuery(event.target.value)} className="field-input" placeholder="Search ID, wallet or reference hash" />
        <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className="field-input">
          {['All', 'Created', 'Funded', 'Settled early', 'Settled at maturity', 'Cancelled', 'Overdue'].map((option) => <option key={option}>{option}</option>)}
        </select>
        <select aria-label="Sort invoices" value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="field-input">
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
          <option value="amount-high">Amount: high to low</option><option value="amount-low">Amount: low to high</option>
          <option value="due-soon">Due date: soonest</option>
        </select>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            aria-label="Refresh invoices"
            title="Refresh invoices"
            className="button-secondary flex-1 sm:flex-initial min-w-[2.75rem] px-3"
          >
            <RefreshCw size={16} className={`text-slate-600 dark:text-zinc-300 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="sm:hidden">Refresh</span>
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={visible.length === 0}
            className="button-secondary flex-1 sm:flex-initial disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-500 dark:text-zinc-400">Showing {visible.length} of {invoices.length} invoices</p>
      {visible.length === 0 ? (
        <div className="card p-10 text-center text-slate-500 dark:text-zinc-400">No invoices match these filters.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:bg-zinc-800 dark:border-zinc-700">
          <div className="space-y-3 bg-slate-50 p-3 md:hidden dark:bg-zinc-900/50">
            {visible.map((invoice) => {
              const counterparty = role === 'supplier' ? invoice.buyer : invoice.supplier;
              return <article key={invoice.id.toString()} className="mobile-data-card">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Invoice</p><p className="mt-1 text-lg font-bold dark:text-zinc-100">#{invoice.id.toString()}</p></div><span className="status-pill text-xs">{displayStatus(invoice, now)}</span></div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs uppercase text-slate-400 dark:text-zinc-500">Amount</dt><dd className="mt-1 font-bold dark:text-zinc-100">{formatUsdc(invoice.fullAmount)} USDC</dd></div><div><dt className="text-xs uppercase text-slate-400 dark:text-zinc-500">Due</dt><dd className="mt-1 dark:text-zinc-100">{new Date(Number(invoice.dueDate) * 1_000).toLocaleDateString()}</dd></div><div className="col-span-2"><dt className="text-xs uppercase text-slate-400 dark:text-zinc-500">Counterparty</dt><dd className="mt-1 font-mono text-xs dark:text-zinc-100">{shortAddress(counterparty)}</dd></div></dl>
                <Link href={`/invoices/${invoice.id.toString()}`} className="button-secondary mt-4 w-full">View invoice</Link>
              </article>;
            })}
          </div>
          <div className="hidden overflow-x-auto md:block"><table className="min-w-full divide-y divide-slate-200 dark:divide-zinc-700"><thead className="bg-slate-50 dark:bg-zinc-800/50"><tr>{['ID', 'Counterparty', 'Amount', 'Status', 'Created', 'Due', ''].map((label) => <th key={label} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-zinc-700 bg-white dark:bg-zinc-800">{visible.map((invoice) => {
            const counterparty = role === 'supplier' ? invoice.buyer : invoice.supplier;
            return <tr key={invoice.id.toString()} className="hover:bg-slate-50 dark:hover:bg-zinc-700/50"><td className="px-5 py-4 text-sm font-bold dark:text-zinc-100">#{invoice.id.toString()}</td><td className="px-5 py-4 font-mono text-xs text-slate-600 dark:text-zinc-400" title={counterparty}>{shortAddress(counterparty)}</td><td className="px-5 py-4 whitespace-nowrap text-sm font-semibold dark:text-zinc-100">{formatUsdc(invoice.fullAmount)} USDC</td><td className="px-5 py-4"><span className="status-pill text-xs">{displayStatus(invoice, now)}</span></td><td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-zinc-400">{new Date(Number(invoice.createdAt) * 1_000).toLocaleDateString()}</td><td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-zinc-400">{new Date(Number(invoice.dueDate) * 1_000).toLocaleDateString()}</td><td className="px-5 py-4"><Link className="font-semibold text-indigo-700 dark:text-indigo-400" href={`/invoices/${invoice.id.toString()}`}>View</Link></td></tr>;
          })}</tbody></table></div>
        </div>
      )}
    </div>
  );
}
