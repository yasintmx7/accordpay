'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@/lib/wallet';
import {
  cancelInvoice,
  currentEarlySettlementAmount,
  formatTransactionError,
  fundInvoice,
  getInvoice,
  InvoiceStatus,
  rejectInvoice,
  settleAtMaturity,
  settleEarly,
  statusLabel,
  updatePayoutAddress,
  type OnChainInvoice,
} from '@/lib/accordpay';
import { approveUsdc, formatUsdc, getUsdcAllowance, getUsdcBalance } from '@/lib/usdc';
import { getAddress, isAddress } from 'viem';
import { getExplorerUrl } from '@/lib/arc';
import { ACCORDPAY_ADDRESS, IS_ACCORDPAY_CONFIGURED, USDC_ADDRESS } from '@/lib/config';
import InvoiceUtilities from '@/components/InvoiceUtilities';
import NetworkFeeSelector from '@/components/NetworkFeeSelector';
import PaymentLinkButton from '@/components/PaymentLinkButton';

type TxStatus = 'idle' | 'approving' | 'submitting' | 'confirmed' | 'rejected' | 'failed';
type InvoiceAction = 'fund' | 'cancel' | 'reject' | 'settleEarly' | 'settleMaturity' | 'payout';

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status, address, walletClient, publicClient, chainId, switchToArcTestnet } = useWallet();
  const [invoice, setInvoice] = useState<OnChainInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowSeconds, setNowSeconds] = useState(() => BigInt(Math.floor(Date.now() / 1_000)));
  const [payoutAddressInput, setPayoutAddressInput] = useState('');

  const invoiceId = /^\d+$/.test(id) ? BigInt(id) : 0n;

  useEffect(() => {
    const timer = window.setInterval(
      () => setNowSeconds(BigInt(Math.floor(Date.now() / 1_000))),
      30_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  const loadInvoice = useCallback(async () => {
    if (!publicClient || !ACCORDPAY_ADDRESS || invoiceId === 0n) {
      setNotFound(invoiceId === 0n);
      return;
    }
    setLoading(true);
    setNotFound(false);
    setError(null);
    try {
      setInvoice(await getInvoice(publicClient, ACCORDPAY_ADDRESS, invoiceId));
    } catch (loadError) {
      const message = formatTransactionError(loadError);
      setNotFound(/InvoiceNotFound|invoice not found/i.test(message));
      if (!/InvoiceNotFound|invoice not found/i.test(message)) {
        setError(`Could not read this invoice from Arc Testnet. ${message}`);
      }
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [publicClient, invoiceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadInvoice(), 0);
    return () => window.clearTimeout(timer);
  }, [loadInvoice]);

  const performAction = useCallback(async (action: InvoiceAction) => {
    if (!walletClient || !publicClient || !address || !invoice || !ACCORDPAY_ADDRESS) return;
    setError(null);
    setTxStatus('submitting');
    try {
      let hash: `0x${string}`;
      if (action === 'fund') {
        const balance = await getUsdcBalance(publicClient, USDC_ADDRESS, address);
        if (balance < invoice.fullAmount) {
          setError(`Insufficient USDC. Your Arc balance is ${formatUsdc(balance)} USDC.`);
          setTxStatus('idle');
          return;
        }
        const allowance = await getUsdcAllowance(
          publicClient,
          USDC_ADDRESS,
          address,
          ACCORDPAY_ADDRESS,
        );
        if (allowance < invoice.fullAmount) {
          setTxStatus('approving');
          await approveUsdc(
            walletClient,
            publicClient,
            USDC_ADDRESS,
            ACCORDPAY_ADDRESS,
            invoice.fullAmount,
          );
          setTxStatus('submitting');
        }
        hash = await fundInvoice(walletClient, publicClient, ACCORDPAY_ADDRESS, invoiceId);
      } else if (action === 'cancel') {
        hash = await cancelInvoice(walletClient, publicClient, ACCORDPAY_ADDRESS, invoiceId);
      } else if (action === 'reject') {
        hash = await rejectInvoice(walletClient, publicClient, ACCORDPAY_ADDRESS, invoiceId);
      } else if (action === 'payout') {
        if (!isAddress(payoutAddressInput)) throw new Error('Enter a valid payout wallet address.');
        hash = await updatePayoutAddress(walletClient, publicClient, ACCORDPAY_ADDRESS, invoiceId, getAddress(payoutAddressInput));
        setPayoutAddressInput('');
      } else if (action === 'settleEarly') {
        hash = await settleEarly(walletClient, publicClient, ACCORDPAY_ADDRESS, invoiceId);
      } else {
        hash = await settleAtMaturity(walletClient, publicClient, ACCORDPAY_ADDRESS, invoiceId);
      }
      setTxHash(hash);
      setTxStatus('confirmed');
      await loadInvoice();
    } catch (transactionError) {
      const message = formatTransactionError(transactionError);
      setError(message);
      setTxStatus(/reject|denied|declined/i.test(message) ? 'rejected' : 'failed');
    }
  }, [walletClient, publicClient, address, invoice, invoiceId, loadInvoice, payoutAddressInput]);

  if (status === 'disconnected' || status === 'connecting' || status === 'no_wallet') {
    return <StateMessage title="Connect your wallet" message="Connect on Arc Testnet to view this invoice." />;
  }
  if (status === 'wrong_network') {
    return (
      <StateMessage title="Wrong network" message="Switch to Arc Testnet to view this invoice.">
        <button onClick={() => void switchToArcTestnet()} className="button-primary">Switch to Arc Testnet</button>
      </StateMessage>
    );
  }
  if (!IS_ACCORDPAY_CONFIGURED) {
    return <StateMessage title="Deployment required" message="Set NEXT_PUBLIC_ACCORDPAY_ADDRESS after deploying the contract." />;
  }
  if (loading) return <StateMessage title="Loading invoice" message="Reading the latest state from Arc Testnet…" />;
  if (error && !invoice && !notFound) {
    return (
      <StateMessage title="Unable to load invoice" message={error}>
        <button onClick={() => void loadInvoice()} className="button-primary">Try again</button>
      </StateMessage>
    );
  }
  if (notFound || !invoice) {
    return (
      <StateMessage title="Invoice not found" message={`Invoice #${id} does not exist in this AccordPay deployment.`}>
        <Link href="/dashboard" className="button-primary">Return to dashboard</Link>
      </StateMessage>
    );
  }

  const currentEarlyAmount = currentEarlySettlementAmount(invoice, nowSeconds);
  const buyerDiscount = invoice.fullAmount - currentEarlyAmount;
  const discountBasisPoints = invoice.fullAmount > 0n
    ? (buyerDiscount * 10_000n) / invoice.fullAmount
    : 0n;
  const discountPercent = `${discountBasisPoints / 100n}.${(discountBasisPoints % 100n).toString().padStart(2, '0')}`;
  const isPastDue = nowSeconds >= invoice.dueDate;
  const isBusy = txStatus === 'approving' || txStatus === 'submitting';
  const isBuyer = address?.toLowerCase() === invoice.buyer.toLowerCase();
  const isSupplier = address?.toLowerCase() === invoice.supplier.toLowerCase();
  const canFund = isBuyer && invoice.status === InvoiceStatus.Created && !isPastDue;
  const canCancel = isBuyer && invoice.status === InvoiceStatus.Created;
  const canSettleEarly = isSupplier && invoice.status === InvoiceStatus.Funded && !isPastDue;
  const canSettleAtMaturity = (isBuyer || isSupplier) && invoice.status === InvoiceStatus.Funded && isPastDue;
  const canReject = isSupplier && (invoice.status === InvoiceStatus.Created || invoice.status === InvoiceStatus.Funded);
  const canUpdatePayout = canReject;
  const hasAvailableAction = canFund || canCancel || canReject || canSettleEarly || canSettleAtMaturity;
  const isFinal = [
    InvoiceStatus.Cancelled,
    InvoiceStatus.SettledEarly,
    InvoiceStatus.SettledAtMaturity,
    InvoiceStatus.Rejected,
  ].includes(invoice.status);

  let actionMessage = '';
  if (!isBuyer && !isSupplier) {
    actionMessage = 'This wallet is not a party to the invoice, so no actions are available.';
  } else if (isFinal) {
    actionMessage = 'This invoice is complete and no further actions are required.';
  } else if (invoice.status === InvoiceStatus.Created && isSupplier) {
    actionMessage = 'Waiting for the buyer to fund this invoice.';
  } else if (invoice.status === InvoiceStatus.Funded && isBuyer && !isPastDue) {
    actionMessage = 'The invoice is funded. The supplier can settle early or wait until the due date.';
  } else if (invoice.status === InvoiceStatus.Funded && isBuyer && isPastDue) {
    actionMessage = 'The invoice has matured. Either party can complete the guaranteed payment to the supplier.';
  }

  return (
    <div className="page-shell max-w-5xl space-y-6 py-8 sm:py-10">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href="/dashboard" className="text-sm font-medium text-indigo-700 hover:underline">← Dashboard</Link>
        <h1 className="text-2xl font-bold sm:text-3xl">Invoice #{invoice.id.toString()}</h1>
        <span className="status-pill">{statusLabel(invoice.status)}</span>
      </div>

      <section className="card overflow-hidden">
        <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[1.15fr_0.85fr] md:items-center">
          <div>
            <p className="eyebrow">Invoice total</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">{formatUsdc(invoice.fullAmount)} <span className="text-base text-slate-500 sm:text-2xl">USDC</span></p>
            <div className="mt-5 flex flex-wrap gap-x-7 gap-y-3 text-sm">
              <div><p className="text-slate-500 dark:text-zinc-400">Due date</p><p className="mt-1 font-semibold">{new Date(Number(invoice.dueDate) * 1_000).toLocaleDateString()}</p></div>
              <div><p className="text-slate-500 dark:text-zinc-400">Payment</p><p className="mt-1 font-semibold">{invoice.status === InvoiceStatus.Created ? 'Waiting to be secured' : isFinal ? 'Completed' : 'Secured in escrow'}</p></div>
              {!isPastDue && !isFinal && <div><p className="text-slate-500 dark:text-zinc-400">Time remaining</p><p className="mt-1"><CountdownTimer targetSeconds={invoice.dueDate} /></p></div>}
            </div>
          </div>
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/40">
            {hasAvailableAction && <div className="mb-4"><NetworkFeeSelector compact /></div>}
            {invoice.status === InvoiceStatus.Funded && !isPastDue ? <>
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Get paid early</p>
              <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">Receive {formatUsdc(currentEarlyAmount)} USDC today</p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-300">Or wait until {new Date(Number(invoice.dueDate) * 1_000).toLocaleDateString()} to receive the full {formatUsdc(invoice.fullAmount)} USDC.</p>
              {canSettleEarly ? <button disabled={isBusy} onClick={() => void performAction('settleEarly')} className="button-primary mt-5 w-full disabled:opacity-50">{txStatus === 'submitting' ? 'Confirming payment...' : 'Receive early payment'}</button> : <p className="mt-4 text-xs font-medium text-indigo-700 dark:text-indigo-300">Only the supplier can accept this offer.</p>}
            </> : invoice.status === InvoiceStatus.Created ? <>
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Secure this payment</p>
              <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">Fund the invoice so the supplier knows payment is guaranteed.</p>
              {canFund ? <button disabled={isBusy} onClick={() => void performAction('fund')} className="button-primary mt-5 w-full disabled:opacity-50">{txStatus === 'approving' ? 'Approving USDC...' : txStatus === 'submitting' ? 'Securing payment...' : 'Secure payment'}</button> : <p className="mt-4 text-xs font-medium text-indigo-700 dark:text-indigo-300">Waiting for the buyer to secure payment.</p>}
            </> : <>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{isFinal ? 'Invoice complete' : 'Payment ready'}</p>
              <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{invoice.status === InvoiceStatus.Rejected ? 'The supplier rejected these terms.' : isFinal ? 'This invoice has been settled.' : `Guarantee delivery of ${formatUsdc(invoice.fullAmount)} USDC now.`}</p>
              {canSettleAtMaturity && <button disabled={isBusy} onClick={() => void performAction('settleMaturity')} className="button-success mt-5 w-full disabled:opacity-50">{txStatus === 'submitting' ? 'Finalizing payment...' : 'Finalize guaranteed payment'}</button>}
            </>}
          </div>
        </div>
        <details className="border-t border-slate-200 dark:border-zinc-700">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-900/30 sm:px-7">View invoice details</summary>
          <div className="grid gap-8 border-t border-slate-100 p-5 dark:border-zinc-700 sm:p-7 md:grid-cols-2">
            <dl className="detail-grid">
              <dt>Buyer</dt><dd><CopyableValue value={invoice.buyer} label="buyer address" /></dd>
              <dt>Supplier</dt><dd><CopyableValue value={invoice.supplier} label="supplier address" /></dd>
              <dt>Payout wallet</dt><dd><CopyableValue value={invoice.payoutAddress} label="payout address" /></dd>
              <dt>Created</dt><dd>{new Date(Number(invoice.createdAt) * 1_000).toLocaleString()}</dd>
              <dt>Funded</dt><dd>{invoice.fundedAt ? new Date(Number(invoice.fundedAt) * 1_000).toLocaleString() : 'Not funded'}</dd>
            </dl>
            <dl className="detail-grid">
              <dt>{invoice.dynamicEarlySettlement ? 'Available today' : 'Fixed early payment'}</dt><dd className="font-semibold text-indigo-700 dark:text-indigo-400">{formatUsdc(currentEarlyAmount)} USDC</dd>
              {invoice.dynamicEarlySettlement && <><dt>Starting amount</dt><dd>{formatUsdc(invoice.earlySettlementAmount)} USDC</dd></>}
              <dt>Buyer savings today</dt><dd>{formatUsdc(buyerDiscount)} USDC ({discountPercent}%)</dd>
              <dt>Invoice proof</dt><dd><CopyableValue value={invoice.invoiceReferenceHash} label="invoice proof" /></dd>
              <dt>Description proof</dt><dd><CopyableValue value={invoice.descriptionHash} label="description proof" /></dd>
            </dl>
          </div>
        </details>
      </section>

      {txStatus === 'confirmed' && txHash && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
          Transaction confirmed.{' '}
          {chainId && <a href={getExplorerUrl(chainId, 'tx', txHash)} target="_blank" rel="noreferrer" className="font-medium underline hover:text-emerald-900 dark:hover:text-emerald-300">View on Arcscan ↗</a>}
        </div>
      )}
      {error && (
        <div role="alert" className={`break-words rounded-lg border p-4 text-sm ${txStatus === 'rejected' ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400'}`}>
          {error}
        </div>
      )}

      {(canCancel || canReject || canUpdatePayout || (!hasAvailableAction && actionMessage)) && <section className="card p-5 sm:p-6">
        <h2 className="section-title">Next step</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {canCancel && (
            <button disabled={isBusy} onClick={() => void performAction('cancel')} className="button-danger w-full disabled:opacity-50 sm:w-auto">
              {txStatus === 'submitting' ? 'Cancelling…' : 'Cancel invoice'}
            </button>
          )}
          {canUpdatePayout && <div className="w-full rounded-xl border border-slate-200 p-4 dark:border-zinc-700"><label className="field-label">Supplier payout wallet<input value={payoutAddressInput} onChange={(event) => setPayoutAddressInput(event.target.value)} placeholder={invoice.payoutAddress} className="field-input font-mono text-xs"/></label><button disabled={isBusy} onClick={() => void performAction('payout')} className="button-secondary mt-3 w-full sm:w-auto">Update payout address</button></div>}
          {canReject && <button disabled={isBusy} onClick={() => void performAction('reject')} className="button-danger w-full disabled:opacity-50 sm:w-auto">{invoice.status === InvoiceStatus.Funded ? 'Reject and return payment' : 'Reject invoice'}</button>}
          {!hasAvailableAction && actionMessage && <p className="text-sm leading-6 text-slate-600 dark:text-zinc-400">{actionMessage}</p>}
        </div>
      </section>}

      <div className="flex justify-end"><PaymentLinkButton invoiceId={invoice.id}/></div>
      <InvoiceUtilities invoice={invoice} />
    </div>
  );
}

function CopyableValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const compactValue = `${value.slice(0, 10)}…${value.slice(-8)}`;

  async function copyValue() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const input = document.createElement('textarea');
        input.value = value;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        const copiedSuccessfully = document.execCommand('copy');
        input.remove();
        if (!copiedSuccessfully) throw new Error('Copy is not supported in this browser.');
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      <code className="min-w-0 truncate text-xs sm:text-sm" title={value}>{compactValue}</code>
      <button
        type="button"
        onClick={() => void copyValue()}
        className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
        aria-label={`Copy ${label}`}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </span>
  );
}

function StateMessage({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-shell max-w-3xl py-24 text-center">
      <h1 className="text-2xl font-bold dark:text-zinc-100">{title}</h1>
      <p className="mt-3 text-slate-500 dark:text-zinc-400">{message}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

function CountdownTimer({ targetSeconds }: { targetSeconds: bigint }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = Number(targetSeconds) - now;
  if (diff <= 0) return null;

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return (
    <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-900/30 dark:text-indigo-400 dark:ring-indigo-400/20">
      in {parts.join(' ')}
    </span>
  );
}
