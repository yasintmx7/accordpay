'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getAddress, isAddress } from 'viem';
import { useWallet } from '@/lib/wallet';
import { createInvoice, formatTransactionError, hashString } from '@/lib/accordpay';
import { tryParseUsdc, formatUsdc } from '@/lib/usdc';
import { getExplorerUrl } from '@/lib/arc';
import NetworkFeeSelector from '@/components/NetworkFeeSelector';
import { ACCORDPAY_ADDRESS, IS_ACCORDPAY_CONFIGURED } from '@/lib/config';
import { setInvoiceMeta, notifyInvoiceEvent, getDisplayName } from '@/lib/store';
import { ShieldCheck, Send, Info } from 'lucide-react';

type TxStatus = 'idle' | 'submitting' | 'confirmed' | 'failed';
const MINIMUM_DUE_LEAD_MS = 5 * 60 * 1_000;

function toLocalDateTimeInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const { status, address, walletClient, publicClient, chainId, switchToArcTestnet } = useWallet();
  const [supplier, setSupplier] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [fullAmountInput, setFullAmountInput] = useState('');
  const [earlyAmountInput, setEarlyAmountInput] = useState('');
  const [dueDateInput, setDueDateInput] = useState('');
  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<bigint | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dynamicEarlySettlement, setDynamicEarlySettlement] = useState(false);
  const [minimumDueDate, setMinimumDueDate] = useState('');

  useEffect(() => {
    const refreshMinimum = () => setMinimumDueDate(toLocalDateTimeInput(new Date(Date.now() + MINIMUM_DUE_LEAD_MS)));
    refreshMinimum();
    const timer = window.setInterval(refreshMinimum, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const fullAmount = useMemo(() => tryParseUsdc(fullAmountInput), [fullAmountInput]);
  const earlyAmount = useMemo(() => tryParseUsdc(earlyAmountInput), [earlyAmountInput]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!walletClient || !publicClient || !address || !ACCORDPAY_ADDRESS) return;
    const supplierAddress = getAddress(supplier);
    const dueDateMilliseconds = new Date(dueDateInput).getTime();

    setTxStatus('submitting');
    try {
      const emptyHash = `0x${'00'.repeat(32)}` as `0x${string}`;

      // Step 1: Create on-chain invoice
      const result = await createInvoice(
        walletClient,
        publicClient,
        ACCORDPAY_ADDRESS,
        {
          supplier: supplierAddress,
          fullAmount: fullAmount!,
          earlySettlementAmount: earlyAmount!,
          dueDate: BigInt(Math.floor(dueDateMilliseconds / 1_000)),
          invoiceReferenceHash: hashString(reference.trim() || `AccordPay:${address}:${supplierAddress}:${dueDateMilliseconds}:${fullAmount!.toString()}`),
          descriptionHash: emptyHash,
          dynamicEarlySettlement,
        },
      );

      const invoiceIdStr = result.invoiceId.toString();

      // Step 2: Save business metadata & document off-chain
      setInvoiceMeta({
        invoiceId: invoiceIdStr,
        businessStatus: 'sent',
        invoiceNumber: reference.trim(),
        description: description.trim(),
        buyerWallet: address.toLowerCase(),
        supplierWallet: supplierAddress.toLowerCase(),
        createdAt: Date.now(),
        sentAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Step 3: Notify supplier
      notifyInvoiceEvent(
        supplierAddress,
        invoiceIdStr,
        'invoice_received',
        'New Invoice Received',
        `${getDisplayName(address)} sent you invoice #${invoiceIdStr} for ${formatUsdc(fullAmount!)} USDC.`
      );

      setTxHash(result.hash);
      setCreatedId(result.invoiceId);
      setTxStatus('confirmed');
    } catch (transactionError) {
      setError(formatTransactionError(transactionError));
      setTxStatus('failed');
    }
  }

  function validateStep1() {
    setError(null);
    if (!isAddress(supplier)) { setError('Enter a valid supplier wallet address.'); return; }
    if (address && getAddress(supplier).toLowerCase() === address.toLowerCase()) { setError('Buyer and supplier must be different.'); return; }
    setStep(2);
  }

  function validateStep2() {
    setError(null);
    if (fullAmount === null || fullAmount <= 0n) { setError('Enter a valid invoice amount.'); return; }
    if (earlyAmount === null || earlyAmount <= 0n || earlyAmount > fullAmount) { setError('Early payment must be valid.'); return; }
    const dueDateMilliseconds = new Date(dueDateInput).getTime();
    if (!Number.isFinite(dueDateMilliseconds) || dueDateMilliseconds < Date.now() + MINIMUM_DUE_LEAD_MS) { setError('Choose a valid due date.'); return; }
    setStep(3);
  }

  // Early returns for wallet state
  if (status === 'disconnected' || status === 'connecting' || status === 'no_wallet') return <div className="page-shell max-w-3xl text-center py-24"><h1 className="text-2xl font-bold mb-3 dark:text-zinc-100">Connect your wallet</h1><p className="text-slate-500">Connect a wallet to create an invoice.</p></div>;
  if (status === 'wrong_network') return <div className="page-shell max-w-3xl text-center py-24"><h1 className="text-2xl font-bold">Wrong network</h1><button onClick={switchToArcTestnet} className="button-primary mt-4">Switch to Arc Testnet</button></div>;
  if (!IS_ACCORDPAY_CONFIGURED) return <div className="page-shell max-w-3xl text-center py-24"><h1 className="text-2xl font-bold">Deployment required</h1></div>;

  if (txStatus === 'confirmed' && txHash && createdId) {
    return (
      <div className="page-shell max-w-2xl py-12">
        <section className="card overflow-hidden text-center">
          <div className="border-b border-slate-100 px-5 py-8 dark:border-zinc-700">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><ShieldCheck size={28}/></div>
            <h1 className="mt-5 text-3xl font-bold dark:text-zinc-100">Invoice Sent</h1>
            <p className="mt-2 text-slate-600 dark:text-zinc-400">Invoice #{createdId.toString()} was created on-chain and sent to the supplier.</p>
          </div>
          <div className="px-5 py-6 text-left sm:px-10">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-zinc-900/50 mb-6">
              <h3 className="font-semibold text-slate-900 dark:text-zinc-100">Next Steps</h3>
              <p className="mt-1 text-sm text-slate-500">The invoice is now recorded on-chain. You can fund the invoice with USDC to secure the payment.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2"><button onClick={() => router.push(`/invoices/${createdId.toString()}`)} className="button-primary">View invoice</button><button onClick={() => router.push('/dashboard')} className="button-secondary">Return to dashboard</button></div>
          </div>
        </section>
      </div>
    );
  }

  const isSubmitting = txStatus === 'submitting';

  return (
    <div className="page-shell max-w-3xl py-10">
      <div className="mb-7">
        <p className="eyebrow">B2B Workflow</p>
        <h1 className="text-3xl font-bold dark:text-zinc-100">Create Invoice</h1>
        <p className="mt-2 text-slate-600 dark:text-zinc-400">Enter recipient details, set payment terms, and create the invoice.</p>
      </div>

      <ol className="mb-6 grid grid-cols-3 gap-2">
        {(['Details', 'Terms', 'Confirm'] as const).map((label, index) => {
          const number = (index + 1) as 1 | 2 | 3;
          const active = step === number;
          const complete = step > number;
          return <li key={label} className={`rounded-xl border px-3 py-3 text-center text-sm font-semibold ${active ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : complete ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400 dark:bg-zinc-800'}`}><span className="hidden sm:inline">{complete ? '✓ ' : `${number}. `}</span>{label}</li>;
        })}
      </ol>

      {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="card p-4 sm:p-6">
        {step === 1 && <div className="space-y-6">
          <div><h2 className="text-xl font-bold">Commercial Details</h2></div>
          <label className="field-label">Supplier wallet<input required value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="0x…" className="field-input font-mono" /></label>
          <div className="grid gap-6 md:grid-cols-2">
            <label className="field-label">Invoice Reference (Optional)<input maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="INV-2026-001" className="field-input" /></label>
            <label className="field-label">Description (Optional)<input maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Design services" className="field-input" /></label>
          </div>
          <div className="flex justify-end"><button type="button" onClick={validateStep1} className="button-primary w-full sm:w-auto">Continue</button></div>
        </div>}

        {step === 2 && <div className="space-y-6">
          <div><h2 className="text-xl font-bold">Payment Terms</h2></div>
          <div className="grid gap-6 md:grid-cols-2">
            <label className="field-label">Full payment (USDC)<input required type="number" min="0.000001" step="0.000001" value={fullAmountInput} onChange={(e) => setFullAmountInput(e.target.value)} className="field-input" /></label>
            <label className="field-label">{dynamicEarlySettlement ? 'Starting early payment' : 'Fixed early payment'} (USDC)<input required type="number" min="0.000001" step="0.000001" value={earlyAmountInput} onChange={(e) => setEarlyAmountInput(e.target.value)} className="field-input" /></label>
          </div>
          <button type="button" role="switch" aria-checked={dynamicEarlySettlement} onClick={() => setDynamicEarlySettlement((enabled) => !enabled)} className={`flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition ${dynamicEarlySettlement ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30' : 'border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900/50'}`}><span><span className="block text-sm font-semibold">Increase early payment over time</span><span className="mt-1 block text-xs leading-5 text-slate-500">Optional. The available amount gradually grows until it reaches the full payment on the due date.</span></span><span className={`relative h-6 w-11 shrink-0 rounded-full transition ${dynamicEarlySettlement ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-zinc-600'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${dynamicEarlySettlement ? 'left-6' : 'left-1'}`}/></span></button>
          <label className="field-label md:w-1/2">Payment due<input required type="datetime-local" min={minimumDueDate || undefined} value={dueDateInput} onChange={(e) => setDueDateInput(e.target.value)} className="field-input" /></label>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button type="button" onClick={() => setStep(1)} className="button-secondary">Back</button><button type="button" onClick={validateStep2} className="button-primary">Review & Send</button></div>
        </div>}

        {step === 3 && <div className="space-y-6">
          <div><h2 className="text-xl font-bold">Confirm & Create</h2></div>
          <dl className="detail-grid rounded-xl bg-slate-50 p-4 dark:bg-zinc-900/50">
            <dt>Supplier</dt><dd className="font-mono text-xs">{supplier}</dd>
            <dt>Full payment</dt><dd className="font-bold">{fullAmount !== null ? formatUsdc(fullAmount) : '0'} USDC</dd>
            <dt>Early payment</dt><dd>{earlyAmount !== null ? formatUsdc(earlyAmount) : '0'} USDC</dd>
            <dt>Due</dt><dd>{dueDateInput ? new Date(dueDateInput).toLocaleString() : 'Not set'}</dd>
          </dl>
          <NetworkFeeSelector />
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:border-blue-900/50 dark:text-blue-300 flex gap-3">
            <Info className="shrink-0 mt-0.5" size={18} />
            <p>Creating this invoice securely commits the terms to the blockchain. <strong>No USDC is required yet</strong>. You will fund the invoice in the next step.</p>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button type="button" disabled={isSubmitting} onClick={() => setStep(2)} className="button-secondary disabled:opacity-50">Back</button><button type="submit" disabled={isSubmitting} className="button-primary disabled:opacity-50"><Send size={16} className="mr-1" /> {isSubmitting ? 'Creating…' : 'Create Invoice'}</button></div>
        </div>}
      </form>
    </div>
  );
}
