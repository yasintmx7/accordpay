'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Copy, Landmark, ShieldCheck } from 'lucide-react';
import { createPublicClient, getAddress, http, isAddress } from 'viem';
import { useWallet } from '@/lib/wallet';
import { arcTestnet } from '@/lib/arc';
import { ACCORDPAY_ADDRESS } from '@/lib/config';
import { currentEarlySettlementAmount, formatTransactionError, getInvoice, InvoiceStatus, rejectInvoice, settleAtMaturity, settleEarly, statusLabel, updatePayoutAddress, type OnChainInvoice } from '@/lib/accordpay';
import { formatUsdc } from '@/lib/usdc';
import NetworkFeeSelector from '@/components/NetworkFeeSelector';

type Action = 'early' | 'maturity' | 'reject' | 'payout';

export default function SupplierPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const invoiceId = /^\d+$/.test(id) ? BigInt(id) : 0n;
  const { status, address, walletClient, isPasskeyWallet } = useWallet();
  const readClient = useMemo(
    () =>
      createPublicClient({
        chain: arcTestnet,
        transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.io'),
      }),
    [],
  );
  const [invoice, setInvoice] = useState<OnChainInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Action | null>(null);
  const [payoutAddress, setPayoutAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(0n);

  const loadInvoice = useCallback(async () => {
    if (!ACCORDPAY_ADDRESS || invoiceId === 0n) {
      setError('This payment link is invalid.');
      setLoading(false);
      return;
    }
    try {
      setInvoice(await getInvoice(readClient, ACCORDPAY_ADDRESS, invoiceId));
    } catch (cause) {
      setError(`This invoice could not be verified. ${formatTransactionError(cause)}`);
    } finally {
      setLoading(false);
    }
  }, [invoiceId, readClient]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadInvoice(), 0);
    return () => window.clearTimeout(timer);
  }, [loadInvoice]);
  useEffect(() => {
    const updateNow = () => setNow(BigInt(Math.floor(Date.now() / 1000)));
    updateNow();
    const timer = window.setInterval(updateNow, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  async function perform(action: Action) {
    if (!walletClient || !ACCORDPAY_ADDRESS || !invoice) return;
    setBusy(action);
    setError(null);
    try {
      if (action === 'early') await settleEarly(walletClient, readClient, ACCORDPAY_ADDRESS, invoiceId);
      if (action === 'maturity') await settleAtMaturity(walletClient, readClient, ACCORDPAY_ADDRESS, invoiceId);
      if (action === 'reject') await rejectInvoice(walletClient, readClient, ACCORDPAY_ADDRESS, invoiceId);
      if (action === 'payout') {
        if (!isAddress(payoutAddress)) throw new Error('Enter a valid payout wallet address.');
        await updatePayoutAddress(walletClient, readClient, ACCORDPAY_ADDRESS, invoiceId, getAddress(payoutAddress));
        setPayoutAddress('');
      }
      await loadInvoice();
    } catch (cause) {
      setError(formatTransactionError(cause));
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (loading) return <div className="page-shell max-w-2xl py-24 text-center text-slate-500">Verifying secured payment…</div>;
  if (!invoice)
    return (
      <div className="page-shell max-w-2xl py-24 text-center">
        <h1 className="text-2xl font-bold">Payment link unavailable</h1>
        <p className="mt-3 text-slate-500">{error}</p>
      </div>
    );

  const isSupplier = address?.toLowerCase() === invoice.supplier.toLowerCase();
  const isBuyer = address?.toLowerCase() === invoice.buyer.toLowerCase();
  const isInvoiceParty = isBuyer || isSupplier;
  const isMature = now >= invoice.dueDate;
  const isFunded = invoice.status === InvoiceStatus.Funded;
  const isFinal = [InvoiceStatus.Cancelled, InvoiceStatus.Rejected, InvoiceStatus.SettledEarly, InvoiceStatus.SettledAtMaturity].includes(invoice.status);
  const earlyQuote = currentEarlySettlementAmount(invoice, now);

  return (
    <div className="page-shell max-w-3xl py-8 sm:py-12">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href="/" className="text-sm font-semibold text-indigo-700">
          AccordPay
        </Link>
        <button type="button" onClick={() => void copyLink()} className="button-secondary min-h-10 px-3 text-xs">
          <Copy size={15} />
          {copied ? 'Copied' : 'Share link'}
        </button>
      </div>
      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 p-5 dark:border-zinc-700 dark:bg-zinc-900/50 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Verified supplier payment</p>
              <h1 className="mt-1 text-2xl font-bold">Invoice #{invoice.id.toString()}</h1>
            </div>
            <span className="status-pill">{statusLabel(invoice.status)}</span>
          </div>
        </div>
        <div className="p-5 sm:p-7">
          <div className="text-center">
            <p className="text-sm text-slate-500">Amount secured</p>
            <p className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
              {formatUsdc(invoice.fullAmount)} <span className="text-lg text-slate-500">USDC</span>
            </p>
            {isFunded && !isMature && <p className="mt-3 text-sm text-indigo-700 dark:text-indigo-300">Receive {formatUsdc(earlyQuote)} USDC today, increasing until maturity.</p>}
          </div>
          <div className="mt-7 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-zinc-900/50 sm:grid-cols-2">
            <div>
              <p className="text-slate-500">Buyer</p>
              <p className="mt-1 truncate font-mono text-xs" title={invoice.buyer}>
                {invoice.buyer}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Due date</p>
              <p className="mt-1 font-semibold">{new Date(Number(invoice.dueDate) * 1000).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-500">Supplier</p>
              <p className="mt-1 truncate font-mono text-xs" title={invoice.supplier}>
                {invoice.supplier}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Payment destination</p>
              <p className="mt-1 truncate font-mono text-xs" title={invoice.payoutAddress}>
                {invoice.payoutAddress}
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            <ShieldCheck size={19} className="shrink-0" />
            <p>
              <strong>Verified on Arc.</strong> The payment terms and status above were read directly from the AccordPay contract.
            </p>
          </div>

          {status !== 'connected' && !isFinal && (
            <div className="mt-6 rounded-xl border border-indigo-200 p-5 text-center">
              <h2 className="font-bold">Continue securely</h2>
              <p className="mt-2 text-sm text-slate-500">Create a passkey wallet with no email, or connect the wallet named as supplier.</p>
              <Link href="/onboarding" className="button-primary mt-4 w-full">
                Create or connect wallet
              </Link>
            </div>
          )}

          {status === 'connected' && !isFinal && (
            <div className="mt-6 space-y-4">
              {isPasskeyWallet && <NetworkFeeSelector />}
              {isFunded && !isMature && isSupplier && (
                <button type="button" disabled={busy !== null} onClick={() => void perform('early')} className="button-primary w-full disabled:opacity-50">
                  {busy === 'early' ? 'Confirming payment…' : `Receive ${formatUsdc(earlyQuote)} USDC now`}
                </button>
              )}
              {isFunded && isMature && isInvoiceParty && (
                <button type="button" disabled={busy !== null} onClick={() => void perform('maturity')} className="button-success w-full disabled:opacity-50">
                  {busy === 'maturity' ? 'Finalizing payment…' : 'Finalize guaranteed payment'}
                </button>
              )}
              {isSupplier && (
                <details className="rounded-xl border border-slate-200 dark:border-zinc-700">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Supplier payment controls</summary>
                  <div className="space-y-3 border-t border-slate-200 p-4 dark:border-zinc-700">
                    <label className="field-label">
                      Pay to another treasury wallet
                      <input value={payoutAddress} onChange={(event) => setPayoutAddress(event.target.value)} placeholder={invoice.payoutAddress} className="field-input font-mono text-xs" />
                    </label>
                    <button type="button" disabled={busy !== null} onClick={() => void perform('payout')} className="button-secondary w-full">
                      {busy === 'payout' ? 'Updating…' : 'Update payout address'}
                    </button>
                    <button type="button" disabled={busy !== null} onClick={() => void perform('reject')} className="button-danger w-full">
                      {busy === 'reject' ? 'Returning payment…' : isFunded ? 'Reject and return payment' : 'Reject invoice'}
                    </button>
                  </div>
                </details>
              )}
              {!isSupplier && !isMature && <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">Connect the supplier wallet to manage or claim this payment.</p>}
              {isMature && !isInvoiceParty && <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">Only the buyer or supplier can complete this payment in AccordPay.</p>}
            </div>
          )}

          {isFinal && (
            <div className="mt-6 flex items-start gap-3 rounded-xl bg-slate-50 p-5 dark:bg-zinc-900/50">
              <CheckCircle2 className="shrink-0 text-emerald-600" />
              <div>
                <h2 className="font-bold">{invoice.status === InvoiceStatus.Rejected ? 'Invoice rejected' : invoice.status === InvoiceStatus.Cancelled ? 'Invoice cancelled' : 'Payment complete'}</h2>
                <p className="mt-1 text-sm text-slate-500">The final status is permanently recorded on Arc Testnet.</p>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      </section>
      <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
        <Landmark size={14} />
        Non-custodial settlement · Arc Testnet · USDC
      </p>
    </div>
  );
}
