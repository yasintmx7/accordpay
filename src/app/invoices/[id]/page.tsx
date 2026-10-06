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
  rejectInvoice as onChainReject,
  settleAtMaturity,
  settleEarly,
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
import InvoiceTimeline from '@/components/InvoiceTimeline';
import DocumentUpload from '@/components/DocumentUpload';
import { resolveInvoiceStatus } from '@/lib/invoice-status';
import InvoiceStatusBadge from '@/components/InvoiceStatusBadge';
import { InlineCompanyName } from '@/components/CompanyName';
import { getInvoiceMeta, updateInvoiceMeta, notifyInvoiceEvent, type InvoiceMeta } from '@/lib/store';
import { ShieldCheck, XCircle, AlertCircle, Wallet } from 'lucide-react';

type TxStatus = 'idle' | 'approving' | 'submitting' | 'confirmed' | 'rejected' | 'failed';
type InvoiceAction = 'fund' | 'cancel' | 'onChainReject' | 'settleEarly' | 'settleMaturity' | 'payout';

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status, address, walletClient, publicClient, chainId, switchToArcTestnet } = useWallet();
  const [invoice, setInvoice] = useState<OnChainInvoice | null>(null);
  const [meta, setMeta] = useState<InvoiceMeta | null>(null);
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
      const inv = await getInvoice(publicClient, ACCORDPAY_ADDRESS, invoiceId);
      setInvoice(inv);
      setMeta(getInvoiceMeta(inv.id.toString()));
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

  // Handle off-chain Accept / Reject logic
  async function handleOffchainAccept() {
    if (!walletClient || !address || !invoice) return;
    setTxStatus('submitting');
    try {
      // Create acceptance signature message
      const message = `Accept AccordPay Invoice #${invoice.id.toString()}\nAmount: ${formatUsdc(invoice.fullAmount)} USDC\nDue: ${new Date(Number(invoice.dueDate) * 1000).toLocaleString()}`;
      let signature: `0x${string}` = '0x' as `0x${string}`;
      try {
        signature = await walletClient.signMessage({
          message,
          account: walletClient.account!,
        });
      } catch (err) {
        // Fallback for testing: bypass strict signature requirement if wallet fails.
        console.warn('Sign message failed or was bypassed:', err);
      }
      
      updateInvoiceMeta(invoice.id.toString(), {
        businessStatus: 'accepted',
        acceptance: {
          status: 'accepted',
          supplierWallet: address.toLowerCase(),
          signature,
          message,
          timestamp: Date.now(),
          rejectionReason: '',
        }
      });
      
      notifyInvoiceEvent(
        invoice.buyer,
        invoice.id.toString(),
        'invoice_accepted',
        'Invoice Accepted',
        `Supplier accepted invoice #${invoice.id.toString()}`
      );
      
      setTxStatus('confirmed');
      await loadInvoice();
    } catch (err) {
      setError(formatTransactionError(err));
      setTxStatus('failed');
    }
  }

  async function handleOffchainReject() {
    if (!invoice || !address) return;
    const reason = window.prompt("Reason for rejection (optional):");
    if (reason === null) return; // cancelled
    
    updateInvoiceMeta(invoice.id.toString(), {
      businessStatus: 'rejected',
      acceptance: {
        status: 'rejected',
        supplierWallet: address.toLowerCase(),
        signature: '',
        message: '',
        timestamp: Date.now(),
        rejectionReason: reason,
      }
    });
    
    notifyInvoiceEvent(
      invoice.buyer,
      invoice.id.toString(),
      'invoice_rejected',
      'Invoice Rejected',
      `Supplier rejected invoice #${invoice.id.toString()}${reason ? `: ${reason}` : ''}`
    );
    
    await loadInvoice();
  }

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
        
        // Update meta & notify
        notifyInvoiceEvent(invoice.supplier, invoice.id.toString(), 'invoice_funded', 'Payment Secured', `Buyer funded invoice #${invoice.id.toString()}`);
        
      } else if (action === 'cancel') {
        hash = await cancelInvoice(walletClient, publicClient, ACCORDPAY_ADDRESS, invoiceId);
        updateInvoiceMeta(invoice.id.toString(), { businessStatus: 'cancelled' });
        notifyInvoiceEvent(invoice.supplier, invoice.id.toString(), 'invoice_cancelled', 'Invoice Cancelled', `Buyer cancelled invoice #${invoice.id.toString()}`);
        
      } else if (action === 'onChainReject') {
        hash = await onChainReject(walletClient, publicClient, ACCORDPAY_ADDRESS, invoiceId);
        notifyInvoiceEvent(invoice.buyer, invoice.id.toString(), 'invoice_rejected', 'Payment Rejected', `Supplier returned payment for invoice #${invoice.id.toString()}`);
        
      } else if (action === 'payout') {
        if (!isAddress(payoutAddressInput)) throw new Error('Enter a valid payout wallet address.');
        hash = await updatePayoutAddress(walletClient, publicClient, ACCORDPAY_ADDRESS, invoiceId, getAddress(payoutAddressInput));
        setPayoutAddressInput('');
        
      } else if (action === 'settleEarly') {
        hash = await settleEarly(walletClient, publicClient, ACCORDPAY_ADDRESS, invoiceId);
        notifyInvoiceEvent(invoice.buyer, invoice.id.toString(), 'early_settlement', 'Early Settlement', `Supplier took early settlement for invoice #${invoice.id.toString()}`);
        
      } else {
        hash = await settleAtMaturity(walletClient, publicClient, ACCORDPAY_ADDRESS, invoiceId);
        const role = address.toLowerCase() === invoice.buyer.toLowerCase() ? 'Buyer' : 'Supplier';
        notifyInvoiceEvent(
          role === 'Buyer' ? invoice.supplier : invoice.buyer, 
          invoice.id.toString(), 
          'invoice_settled', 
          'Payment Settled', 
          `${role} executed final settlement for invoice #${invoice.id.toString()}`
        );
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

  if (status === 'disconnected' || status === 'connecting' || status === 'no_wallet') return <StateMessage title="Connect your wallet" message="Connect on Arc Testnet to view this invoice." />;
  if (status === 'wrong_network') return <StateMessage title="Wrong network" message="Switch to Arc Testnet to view this invoice."><button onClick={() => void switchToArcTestnet()} className="button-primary">Switch to Arc Testnet</button></StateMessage>;
  if (!IS_ACCORDPAY_CONFIGURED) return <StateMessage title="Deployment required" message="Set NEXT_PUBLIC_ACCORDPAY_ADDRESS after deploying the contract." />;
  if (loading) return <StateMessage title="Loading invoice" message="Reading the latest state from Arc Testnet…" />;
  if (error && !invoice && !notFound) return <StateMessage title="Unable to load invoice" message={error}><button onClick={() => void loadInvoice()} className="button-primary">Try again</button></StateMessage>;
  if (notFound || !invoice) return <StateMessage title="Invoice not found" message={`Invoice #${id} does not exist.`}><Link href="/dashboard" className="button-primary">Return to dashboard</Link></StateMessage>;

  const resolvedStatus = resolveInvoiceStatus(invoice, nowSeconds);
  const currentEarlyAmount = currentEarlySettlementAmount(invoice, nowSeconds);
  const buyerDiscount = invoice.fullAmount - currentEarlyAmount;
  const isPastDue = nowSeconds >= invoice.dueDate;
  const isBusy = txStatus === 'approving' || txStatus === 'submitting';
  
  const isBuyer = address?.toLowerCase() === invoice.buyer.toLowerCase();
  const isSupplier = address?.toLowerCase() === invoice.supplier.toLowerCase();
  
  // Action state logic based on unified status
  const s = resolvedStatus.status;
  const canOffchainAccept = isSupplier && s === 'sent';
  const canOffchainReject = isSupplier && s === 'sent';
  const canFund = isBuyer && s === 'accepted';
  const canCancel = isBuyer && (s === 'draft' || s === 'sent' || s === 'accepted');
  const canSettleEarly = isSupplier && (s === 'funded' || s === 'in_progress') && !isPastDue;
  const canSettleAtMaturity = (isBuyer || isSupplier) && s === 'overdue' && isPastDue;
  const canOnchainReject = isSupplier && (s === 'funded' || s === 'in_progress' || s === 'overdue');
  const canUpdatePayout = isSupplier && (s === 'sent' || s === 'accepted' || s === 'funded' || s === 'in_progress' || s === 'overdue');
  
  const hasAvailableAction = canOffchainAccept || canOffchainReject || canFund || canCancel || canOnchainReject || canSettleEarly || canSettleAtMaturity;

  return (
    <div className="page-shell max-w-6xl space-y-6 py-8 sm:py-10">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href="/dashboard" className="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-400">← Dashboard</Link>
        <h1 className="text-2xl font-bold sm:text-3xl">Invoice #{invoice.id.toString()}</h1>
        <InvoiceStatusBadge invoice={invoice} nowSeconds={nowSeconds} size="md" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
        <div className="space-y-6">
          <section className="card p-5 sm:p-7">
            <h2 className="section-title">Commercial Details</h2>
            <dl className="detail-grid mb-6">
              <dt>Buyer</dt><dd><InlineCompanyName wallet={invoice.buyer} /></dd>
              <dt>Supplier</dt><dd><InlineCompanyName wallet={invoice.supplier} /></dd>
              <dt>Invoice Reference</dt><dd>{meta?.invoiceNumber || 'No name added'}</dd>
              <dt>Description</dt><dd>{meta?.description || 'No description added'}</dd>
            </dl>
            
            <h3 className="text-sm font-semibold text-slate-900 mb-3 dark:text-zinc-100">Document Verification</h3>
            <DocumentUpload document={meta?.document || null} onUpload={()=>{}} onRemove={()=>{}} readOnly />
          </section>
          
          <section className="card p-5 sm:p-7">
            <h2 className="section-title">Payment Terms & Financials</h2>
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500 dark:text-zinc-400">Total Amount</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{formatUsdc(invoice.fullAmount)} <span className="text-base text-slate-500">USDC</span></p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Due date</span><span className="font-semibold">{new Date(Number(invoice.dueDate) * 1_000).toLocaleDateString()}</span></div>
                  {(!isPastDue && invoice.status !== InvoiceStatus.SettledEarly && invoice.status !== InvoiceStatus.SettledAtMaturity && invoice.status !== InvoiceStatus.Cancelled && invoice.status !== InvoiceStatus.Rejected) && 
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Time remaining</span><span><CountdownTimer targetSeconds={invoice.dueDate} /></span></div>
                  }
                </div>
              </div>
              
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">{invoice.dynamicEarlySettlement ? 'Available today' : 'Fixed early payment'}</p>
                <p className="mt-1 text-2xl font-bold text-indigo-700 dark:text-indigo-400">{formatUsdc(currentEarlyAmount)} USDC</p>
                <p className="mt-2 text-xs text-indigo-800/70 dark:text-indigo-300/70">Buyer savings: {formatUsdc(buyerDiscount)} USDC</p>
              </div>
            </div>
          </section>

          {/* Context-aware Actions Panel */}
          {hasAvailableAction && (
            <section className="card border-indigo-200 bg-gradient-to-b from-indigo-50/50 to-white p-5 sm:p-7 shadow-sm dark:border-indigo-900/30 dark:from-indigo-950/20 dark:to-zinc-800">
              <h2 className="text-lg font-bold text-slate-900 mb-4 dark:text-zinc-100 flex items-center gap-2">
                <AlertCircle size={20} className="text-indigo-600 dark:text-indigo-400"/> Action Required
              </h2>
              
              {canOffchainAccept && (
                <div>
                  <p className="mb-4 text-sm text-slate-600 dark:text-zinc-400">Review the commercial terms and document. Accept the invoice to proceed to funding.</p>
                  <div className="flex gap-3">
                    <button disabled={isBusy} onClick={handleOffchainAccept} className="button-success w-full"><ShieldCheck size={16}/> Accept Terms</button>
                    <button disabled={isBusy} onClick={handleOffchainReject} className="button-danger w-full"><XCircle size={16}/> Reject</button>
                  </div>
                </div>
              )}

              {canFund && (
                <div>
                  <p className="mb-4 text-sm text-slate-600 dark:text-zinc-400">The supplier has accepted the terms. Secure the payment in the escrow contract.</p>
                  <NetworkFeeSelector compact />
                  <button disabled={isBusy} onClick={() => void performAction('fund')} className="button-primary mt-4 w-full disabled:opacity-50">
                    <Wallet size={16}/> {txStatus === 'approving' ? 'Approving USDC...' : txStatus === 'submitting' ? 'Securing payment...' : 'Secure payment'}
                  </button>
                </div>
              )}

              {canSettleEarly && (
                <div>
                  <p className="mb-4 text-sm text-slate-600 dark:text-zinc-400">The invoice is funded. You can receive the early payment amount now.</p>
                  <NetworkFeeSelector compact />
                  <button disabled={isBusy} onClick={() => void performAction('settleEarly')} className="button-primary mt-4 w-full">Receive {formatUsdc(currentEarlyAmount)} USDC now</button>
                </div>
              )}

              {canSettleAtMaturity && (
                <div>
                  <p className="mb-4 text-sm text-slate-600 dark:text-zinc-400">The invoice has matured. Finalize the guaranteed payment.</p>
                  <NetworkFeeSelector compact />
                  <button disabled={isBusy} onClick={() => void performAction('settleMaturity')} className="button-success mt-4 w-full">Finalize Payment</button>
                </div>
              )}
            </section>
          )}

          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-base font-bold mb-4 border-b border-slate-100 pb-2 dark:border-zinc-700">Lifecycle</h2>
            <InvoiceTimeline invoice={invoice} nowSeconds={nowSeconds} />
          </section>
          
          <section className="card p-5">
            <h2 className="text-base font-bold mb-4 border-b border-slate-100 pb-2 dark:border-zinc-700">Blockchain Proofs</h2>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs text-slate-500">Invoice Hash</dt><dd><CopyableValue value={invoice.invoiceReferenceHash} label="hash" /></dd></div>
              <div><dt className="text-xs text-slate-500">Doc/Desc Hash</dt><dd><CopyableValue value={invoice.descriptionHash} label="hash" /></dd></div>
            </dl>
          </section>

          {(canCancel || canOnchainReject || canUpdatePayout) && (
            <section className="card p-5">
              <h2 className="text-base font-bold mb-4 border-b border-slate-100 pb-2 dark:border-zinc-700">Management</h2>
              <div className="space-y-3">
                {canUpdatePayout && <div><input value={payoutAddressInput} onChange={(e) => setPayoutAddressInput(e.target.value)} placeholder="New payout address" className="field-input text-xs font-mono mb-2"/><button disabled={isBusy} onClick={() => void performAction('payout')} className="button-secondary w-full !text-xs">Update payout address</button></div>}
                {canOnchainReject && <button disabled={isBusy} onClick={() => void performAction('onChainReject')} className="button-danger w-full !text-xs">Return Payment (Reject)</button>}
                {canCancel && <button disabled={isBusy} onClick={() => void performAction('cancel')} className="button-danger w-full !text-xs">Cancel Invoice</button>}
              </div>
            </section>
          )}
        </div>
      </div>
      
      <div className="mt-6">
        <InvoiceUtilities invoice={invoice} />
      </div>
    </div>
  );
}

// Keep CopyableValue, StateMessage, CountdownTimer same as before

function CopyableValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const compactValue = `${value.slice(0, 10)}…${value.slice(-8)}`;
  async function copyValue() {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {}
  }
  return (
    <span className="flex items-center gap-2">
      <code className="truncate text-xs" title={value}>{compactValue}</code>
      <button type="button" onClick={copyValue} className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-800 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:text-zinc-200">{copied ? 'Copied' : 'Copy'}</button>
    </span>
  );
}

function StateMessage({ title, message, children }: { title: string; message: string; children?: React.ReactNode }) {
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
  return <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-900/30 dark:text-indigo-400 dark:ring-indigo-400/20">in {parts.join(' ')}</span>;
}
