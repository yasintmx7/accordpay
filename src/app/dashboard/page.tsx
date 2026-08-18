'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@/lib/wallet';
import { currentEarlySettlementAmount, formatTransactionError, getInvoiceIdsByBuyer, getInvoiceIdsBySupplier, getInvoice, statusLabel, type OnChainInvoice, InvoiceStatus } from '@/lib/accordpay';
import { formatUsdc } from '@/lib/usdc';
import { ACCORDPAY_ADDRESS } from '@/lib/config';
import InvoiceMobileCards from '@/components/InvoiceMobileCards';
import { CircleAlert, Rocket, Unplug } from 'lucide-react';

const CONTRACT = ACCORDPAY_ADDRESS;

function ConnectPrompt() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><Unplug size={24} /></div>
      <h1 className="text-2xl font-bold text-slate-900 mb-3 dark:text-zinc-100">Connect your wallet</h1>
      <p className="text-slate-500">Create a passkey wallet or connect an existing wallet to view your invoices.</p>
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
        const fetched = await Promise.all(allIds.map((id) => getInvoice(publicClient, CONTRACT, id)));
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

  const active = invoices.filter((i) => i.status === InvoiceStatus.Created || i.status === InvoiceStatus.Funded);
  const totalSecured = invoices
    .filter((i) => i.status === InvoiceStatus.Funded)
    .reduce((acc, i) => acc + i.fullAmount, 0n);
  const earlyAvailable = invoices
    .filter((i) => i.status === InvoiceStatus.Funded && nowSec < i.dueDate)
    .reduce((acc, i) => acc + currentEarlySettlementAmount(i, nowSec), 0n);
  const settled = invoices.filter((i) => i.status === InvoiceStatus.SettledEarly || i.status === InvoiceStatus.SettledAtMaturity);
  const needsAttention = invoices.filter((invoice) => {
    const isBuyer = invoice.buyer.toLowerCase() === address?.toLowerCase();
    const isSupplier = invoice.supplier.toLowerCase() === address?.toLowerCase();
    return (isBuyer && invoice.status === InvoiceStatus.Created)
      || (isSupplier && invoice.status === InvoiceStatus.Funded);
  });

  function invoiceRole(invoice: OnChainInvoice) {
    return invoice.buyer.toLowerCase() === address?.toLowerCase() ? 'Sent' : 'Received';
  }

  function counterparty(invoice: OnChainInvoice) {
    const value = invoiceRole(invoice) === 'Sent' ? invoice.supplier : invoice.buyer;
    return `${value.slice(0, 8)}…${value.slice(-6)}`;
  }

  function nextAction(invoice: OnChainInvoice) {
    const role = invoiceRole(invoice);
    if (role === 'Sent' && invoice.status === InvoiceStatus.Created) return nowSec >= invoice.dueDate ? 'Review invoice' : 'Secure payment';
    if (role === 'Received' && invoice.status === InvoiceStatus.Funded) return nowSec >= invoice.dueDate ? 'Receive payment' : 'View early payment';
    return 'View details';
  }


  return (
    <div className="page-shell space-y-8 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'} · {needsAttention.length} need{needsAttention.length === 1 ? 's' : ''} attention · {settled.length} completed</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
          <Link href="/invoices/new" className="button-primary col-span-2 sm:col-span-1">Create Invoice</Link>
          <Link href="/invoices/sent" className="button-secondary">Sent</Link>
          <Link href="/invoices/received" className="button-secondary">Received</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Active Invoices</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-zinc-100">{loading ? '…' : active.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Payments Secured</p>
          <p className="mt-2 text-xl font-bold text-slate-900 sm:text-3xl dark:text-zinc-100">{loading ? '…' : formatUsdc(totalSecured)} <span className="text-sm sm:text-base">USDC</span></p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Available to Receive Early</p>
          <p className="mt-2 text-xl font-bold text-indigo-600 sm:text-3xl dark:text-indigo-400">{loading ? '…' : formatUsdc(earlyAvailable)} <span className="text-sm sm:text-base">USDC</span></p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Completed Payments</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600 sm:text-3xl dark:text-emerald-400">{loading ? '…' : settled.length}</p>
        </div>
      </div>

      {!loading && invoices.length > 0 && (
        <section className="card p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="eyebrow">Payment pipeline</p><h2 className="mt-1 text-lg font-bold">Where your invoices are now</h2></div>
            <p className="text-sm text-slate-500 dark:text-zinc-400">{invoices.length} total</p>
          </div>
          <div className="mt-6 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-zinc-900/50"><p className="text-2xl font-bold">{invoices.filter((i) => i.status === InvoiceStatus.Created).length}</p><p className="mt-1 text-sm text-slate-500">Created</p></div>
            <span className="text-slate-300 dark:text-zinc-600">→</span>
            <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-950/30"><p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{invoices.filter((i) => i.status === InvoiceStatus.Funded).length}</p><p className="mt-1 text-sm text-slate-500">Secured</p></div>
            <span className="text-slate-300 dark:text-zinc-600">→</span>
            <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/30"><p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{settled.length}</p><p className="mt-1 text-sm text-slate-500">Paid</p></div>
          </div>
        </section>
      )}

      {!loading && needsAttention.length > 0 && (
        <section>
          <div className="mb-4"><p className="eyebrow">Needs your attention</p><h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-zinc-100">Your next steps</h2></div>
          <div className="grid gap-3 md:grid-cols-2">
            {needsAttention.slice(0, 4).map((invoice) => <Link key={invoice.id.toString()} href={`/invoices/${invoice.id.toString()}`} className="card flex items-center justify-between gap-4 p-5 transition hover:border-indigo-300 hover:shadow-md dark:hover:border-indigo-700"><div><p className="text-sm text-slate-500 dark:text-zinc-400">{invoiceRole(invoice)} invoice #{invoice.id.toString()}</p><p className="mt-1 font-bold text-slate-900 dark:text-zinc-100">{nextAction(invoice)}</p><p className="mt-1 text-sm text-slate-500">{formatUsdc(invoice.fullAmount)} USDC · {counterparty(invoice)}</p></div><span className="text-xl text-indigo-600 dark:text-indigo-400">→</span></Link>)}
          </div>
        </section>
      )}

      {error && <div role="alert" className="break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4 dark:text-zinc-100">Recent Activity</h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          {loading ? (
            <div className="p-8 text-center text-slate-400 sm:p-12">Loading invoices from Arc Testnet…</div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-slate-500 sm:p-12">No invoices found for this wallet.</div>
          ) : (
            <>
              <div className="bg-slate-50 p-3 md:hidden dark:bg-zinc-900/50">
                <InvoiceMobileCards invoices={invoices.slice(0, 10)} />
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-zinc-700">
                  <thead className="bg-slate-50 dark:bg-zinc-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-zinc-400">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-zinc-400">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-zinc-400">Counterparty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-zinc-400">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-zinc-400">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-zinc-400">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-zinc-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-zinc-700 dark:bg-zinc-800">
                    {invoices.slice(0, 10).map((inv) => (
                      <tr key={inv.id.toString()} className="hover:bg-slate-50 dark:hover:bg-zinc-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-zinc-100">#{inv.id.toString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-zinc-400">{invoiceRole(inv)}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500 dark:text-zinc-400" title={invoiceRole(inv) === 'Sent' ? inv.supplier : inv.buyer}>{counterparty(inv)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-zinc-400">{formatUsdc(inv.fullAmount)} USDC</td>
                        <td className="px-6 py-4 whitespace-nowrap"><span className="status-pill text-xs">{statusLabel(inv.status)}</span></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-zinc-400">{new Date(Number(inv.dueDate) * 1000).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-medium dark:text-indigo-400">
                          <Link href={`/invoices/${inv.id.toString()}`}>{nextAction(inv)}</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
