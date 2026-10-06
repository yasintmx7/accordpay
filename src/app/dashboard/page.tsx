'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@/lib/wallet';
import { currentEarlySettlementAmount, formatTransactionError, getInvoiceIdsByBuyer, getInvoiceIdsBySupplier, getInvoice, type OnChainInvoice, InvoiceStatus } from '@/lib/accordpay';
import { formatUsdc } from '@/lib/usdc';
import { ACCORDPAY_ADDRESS } from '@/lib/config';
import { CircleAlert, Rocket, Unplug, ArrowRight, Wallet, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { resolveInvoiceStatus } from '@/lib/invoice-status';
import InvoiceStatusBadge from '@/components/InvoiceStatusBadge';
import { InlineCompanyName } from '@/components/CompanyName';
import { getInvoiceMeta } from '@/lib/store';

const CONTRACT = ACCORDPAY_ADDRESS;

function ConnectPrompt() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><Unplug size={24} /></div>
      <h1 className="text-2xl font-bold text-slate-900 mb-3 dark:text-zinc-100">Connect your wallet</h1>
      <p className="text-slate-500">Use the <strong>Connect Wallet</strong> button in the top right header to connect an existing wallet like MetaMask, or create a new passkey wallet.</p>
    </div>
  );
}

function WrongNetworkPrompt() {
  const { switchToArcTestnet } = useWallet();
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><CircleAlert size={24} /></div>
      <h1 className="text-2xl font-bold text-slate-900 mb-3 dark:text-zinc-100">Wrong network</h1>
      <p className="text-slate-500 mb-6">Switch your wallet to Arc Testnet to use AccordPay.</p>
      <button onClick={switchToArcTestnet} className="button-primary">
        Switch to Arc Testnet
      </button>
    </div>
  );
}

function NotConfiguredPrompt() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><Rocket size={24} /></div>
      <h1 className="text-2xl font-bold text-slate-900 mb-3 dark:text-zinc-100">Contract not yet deployed</h1>
      <p className="text-slate-500">Set <code className="bg-slate-100 px-1 rounded">NEXT_PUBLIC_ACCORDPAY_ADDRESS</code> after deploying to Arc Testnet.</p>
    </div>
  );
}

export default function DashboardPage() {
  const { status, address, publicClient } = useWallet();
  const [invoices, setInvoices] = useState<OnChainInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowSec, setNowSec] = useState<bigint>(() => BigInt(Math.floor(Date.now() / 1000)));

  useEffect(() => {
    const timer = window.setInterval(() => setNowSec(BigInt(Math.floor(Date.now() / 1_000))), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (status !== 'connected' || !address || !publicClient || !CONTRACT) return;
    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      setInvoices([]);
      try {
        const [buyerIds, supplierIds] = await Promise.all([
          getInvoiceIdsByBuyer(publicClient, CONTRACT, address),
          getInvoiceIdsBySupplier(publicClient, CONTRACT, address),
        ]);
        const allIds = Array.from(new Set([...buyerIds, ...supplierIds]));
        const fetched: OnChainInvoice[] = [];
        
        // Chunk requests to avoid RPC rate limits
        for (let i = 0; i < allIds.length; i += 5) {
          const chunk = allIds.slice(i, i + 5);
          const results = await Promise.all(chunk.map((id) => getInvoice(publicClient, CONTRACT, id)));
          fetched.push(...results);
          if (cancelled) break;
        }
        
        if (!cancelled) setInvoices(fetched.sort((a, b) => Number(b.createdAt - a.createdAt)));
      } catch (e) {
        if (!cancelled) setError(`Could not load invoices from Arc Testnet. ${formatTransactionError(e)}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchAll();
    return () => { cancelled = true; };
  }, [status, address, publicClient]);

  if (status === 'disconnected' || status === 'connecting' || status === 'no_wallet') return <ConnectPrompt />;
  if (status === 'wrong_network') return <WrongNetworkPrompt />;
  if (!CONTRACT) return <NotConfiguredPrompt />;

  // Metrics calculation based on unified status
  const activeCount = invoices.filter(i => {
    const s = resolveInvoiceStatus(i, nowSec).status;
    return s !== 'settled' && s !== 'cancelled' && s !== 'rejected';
  }).length;

  const totalValue = invoices.reduce((acc, i) => acc + i.fullAmount, 0n);
  const totalFunded = invoices.filter(i => resolveInvoiceStatus(i, nowSec).status === 'funded').reduce((acc, i) => acc + i.fullAmount, 0n);
  const totalInProgress = invoices.filter(i => resolveInvoiceStatus(i, nowSec).status === 'in_progress').reduce((acc, i) => acc + i.fullAmount, 0n);
  const totalSettled = invoices.filter(i => resolveInvoiceStatus(i, nowSec).status === 'settled').reduce((acc, i) => acc + i.fullAmount, 0n);
  
  const needsAttention = invoices.filter((invoice) => {
    const role = invoice.buyer.toLowerCase() === address?.toLowerCase() ? 'buyer' : 'supplier';
    const s = resolveInvoiceStatus(invoice, nowSec).status;
    
    if (role === 'buyer') {
      return s === 'draft' || s === 'accepted' || s === 'overdue';
    } else {
      return s === 'sent' || s === 'funded';
    }
  });

  function invoiceRole(invoice: OnChainInvoice) {
    return invoice.buyer.toLowerCase() === address?.toLowerCase() ? 'Sent' : 'Received';
  }

  function counterparty(invoice: OnChainInvoice) {
    return invoiceRole(invoice) === 'Sent' ? invoice.supplier : invoice.buyer;
  }

  function getActionInfo(invoice: OnChainInvoice) {
    const role = invoiceRole(invoice);
    const s = resolveInvoiceStatus(invoice, nowSec).status;
    
    if (role === 'Sent') {
      if (s === 'draft') return { label: 'Send to supplier', icon: <ArrowRight size={16} /> };
      if (s === 'accepted') return { label: 'Secure payment', icon: <Wallet size={16} /> };
      if (s === 'overdue') return { label: 'Settlement ready', icon: <AlertCircle size={16} /> };
    } else {
      if (s === 'sent') return { label: 'Review & Accept', icon: <CheckCircle2 size={16} /> };
      if (s === 'funded') return { label: 'Receive early payment', icon: <Clock size={16} /> };
    }
    return { label: 'View details', icon: <ArrowRight size={16} /> };
  }

  return (
    <div className="page-shell space-y-8 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'} total · {needsAttention.length} requiring action
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
          <Link href="/invoices/new" className="button-primary col-span-2 sm:col-span-1 shadow-indigo-500/20 shadow-lg">Create Invoice</Link>
          <Link href="/invoices/sent" className="button-secondary">Sent</Link>
          <Link href="/invoices/received" className="button-secondary">Received</Link>
        </div>
      </div>

      {/* Metrics Grid - Premium styling */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400">Total Invoice Value</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-zinc-100">
            {loading ? '…' : formatUsdc(totalValue)} <span className="text-base font-semibold text-slate-400">USDC</span>
          </p>
        </div>
        
        <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400">Funded</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-zinc-100">
            {loading ? '…' : formatUsdc(totalFunded)} <span className="text-base font-semibold text-slate-400">USDC</span>
          </p>
        </div>
        
        <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400">Awaiting Settlement</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-zinc-100">
            {loading ? '…' : formatUsdc(totalInProgress)} <span className="text-base font-semibold text-slate-400">USDC</span>
          </p>
        </div>
        
        <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400">Settled</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-zinc-100">
            {loading ? '…' : formatUsdc(totalSettled)} <span className="text-base font-semibold text-slate-400">USDC</span>
          </p>
        </div>
      </div>

      {error && <div role="alert" className="break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* Needs Attention Section */}
      {!loading && needsAttention.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow flex items-center gap-1.5"><AlertCircle size={14}/> Action Required</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-zinc-100">Your next steps</h2>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {needsAttention.slice(0, 4).map((invoice) => {
              const action = getActionInfo(invoice);
              return (
                <Link key={invoice.id.toString()} href={`/invoices/${invoice.id.toString()}`} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-indigo-700">
                  <div className="absolute right-0 top-0 h-full w-1 bg-indigo-500 opacity-0 transition-opacity group-hover:opacity-100"></div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <InvoiceStatusBadge invoice={invoice} nowSeconds={nowSec} />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">#{invoice.id.toString()}</p>
                      </div>
                      <p className="mt-2 text-base font-semibold text-slate-900 dark:text-zinc-100">
                        {formatUsdc(invoice.fullAmount)} USDC
                      </p>
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                        {invoiceRole(invoice) === 'Sent' ? 'To: ' : 'From: '}
                        <InlineCompanyName wallet={counterparty(invoice)} />
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition group-hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400">
                      {action.label}
                      {action.icon}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Activity Table */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Recent Activity</h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading invoices from Arc Testnet…</div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400 dark:bg-zinc-900/50 dark:text-zinc-500">
                <FileText size={24} />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-900 dark:text-zinc-100">No invoices yet</p>
              <p className="mt-1 text-sm text-slate-500">Create your first invoice to get started.</p>
              <Link href="/invoices/new" className="button-primary mt-6">Create Invoice</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-zinc-700">
                <thead className="bg-slate-50 dark:bg-zinc-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-zinc-400">Invoice</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-zinc-400">Counterparty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-zinc-400">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-zinc-400">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-zinc-400">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-zinc-400">Last Activity</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-zinc-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-zinc-700/50 dark:bg-zinc-800">
                  {invoices.slice(0, 10).map((inv) => (
                    <tr key={inv.id.toString()} className="group hover:bg-slate-50 dark:hover:bg-zinc-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 dark:text-zinc-100">#{inv.id.toString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-zinc-300">
                        <InlineCompanyName wallet={counterparty(inv)} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-zinc-100">{formatUsdc(inv.fullAmount)} USDC</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <InvoiceStatusBadge invoice={inv} nowSeconds={nowSec} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-zinc-400">
                        {new Date(Number(inv.dueDate) * 1000).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-zinc-400">
                        {(() => {
                          const meta = getInvoiceMeta(inv.id.toString());
                          if (!meta) return 'Created';
                          const diff = Date.now() - meta.updatedAt;
                          const mins = Math.floor(diff / 60000);
                          if (mins < 1) return 'Just now';
                          if (mins < 60) return `${mins}m ago`;
                          if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
                          return `${Math.floor(mins/1440)}d ago`;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Link href={`/invoices/${inv.id.toString()}`} className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 text-center dark:border-zinc-700 dark:bg-zinc-900/20">
                <Link href="/invoices/sent" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">View all invoices →</Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// Ensure icon is available for empty state
import { FileText } from 'lucide-react';
