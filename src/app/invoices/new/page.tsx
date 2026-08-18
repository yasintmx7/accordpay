'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getAddress, isAddress } from 'viem';
import { useWallet } from '@/lib/wallet';
import { createAndFundInvoice, formatTransactionError, hashString } from '@/lib/accordpay';
import {
  approveUsdc,
  formatUsdc,
  getUsdcAllowance,
  getUsdcBalance,
  tryParseUsdc,
} from '@/lib/usdc';
import { getExplorerUrl } from '@/lib/arc';
import NetworkFeeSelector from '@/components/NetworkFeeSelector';
import PaymentLinkButton from '@/components/PaymentLinkButton';
import {
  ACCORDPAY_ADDRESS,
  CIRCLE_FAUCET_URL,
  IS_ACCORDPAY_CONFIGURED,
  USDC_ADDRESS,
} from '@/lib/config';

type TxStatus =
  | 'idle'
  | 'validating'
  | 'approving'
  | 'submitting'
  | 'confirmed'
  | 'rejected'
  | 'failed';

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
  const discount =
    fullAmount !== null && earlyAmount !== null && fullAmount >= earlyAmount
      ? fullAmount - earlyAmount
      : 0n;
  const discountBasisPoints = fullAmount && fullAmount > 0n
    ? (discount * 10_000n) / fullAmount
    : 0n;
  const discountPercent = `${discountBasisPoints / 100n}.${(discountBasisPoints % 100n).toString().padStart(2, '0')}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!walletClient || !publicClient || !address || !ACCORDPAY_ADDRESS) {
      setError('Connect a wallet on Arc Testnet before creating an invoice.');
      return;
    }
    if (!isAddress(supplier)) {
      setError('Enter a valid supplier wallet address.');
      return;
    }
    const supplierAddress = getAddress(supplier);
    if (supplierAddress.toLowerCase() === address.toLowerCase()) {
      setError('The buyer and supplier must be different wallets.');
      return;
    }
    if (fullAmount === null || fullAmount <= 0n) {
      setError('Enter a valid full amount with no more than 6 decimal places.');
      return;
    }
    if (earlyAmount === null || earlyAmount <= 0n || earlyAmount > fullAmount) {
      setError('Early settlement must be greater than 0 and no more than the full amount.');
      return;
    }
    const dueDateMilliseconds = new Date(dueDateInput).getTime();
    if (!Number.isFinite(dueDateMilliseconds) || dueDateMilliseconds < Date.now() + MINIMUM_DUE_LEAD_MS) {
      setError('Choose a due date at least 5 minutes from now.');
      return;
    }

    setTxStatus('validating');
    try {
      const balance = await getUsdcBalance(publicClient, USDC_ADDRESS, address);
      if (balance < fullAmount) {
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
      if (allowance < fullAmount) {
        setTxStatus('approving');
        await approveUsdc(
          walletClient,
          publicClient,
          USDC_ADDRESS,
          ACCORDPAY_ADDRESS,
          fullAmount,
        );
      }

      setTxStatus('submitting');
      const result = await createAndFundInvoice(
        walletClient,
        publicClient,
        ACCORDPAY_ADDRESS,
        {
          supplier: supplierAddress,
          fullAmount,
          earlySettlementAmount: earlyAmount,
          dueDate: BigInt(Math.floor(dueDateMilliseconds / 1_000)),
          invoiceReferenceHash: hashString(reference.trim() || `AccordPay:${address}:${supplierAddress}:${dueDateMilliseconds}:${fullAmount.toString()}`),
          descriptionHash: description.trim()
            ? hashString(description.trim())
            : `0x${'00'.repeat(32)}`,
          dynamicEarlySettlement,
        },
      );
      setTxHash(result.hash);
      setCreatedId(result.invoiceId);
      setTxStatus('confirmed');
    } catch (transactionError) {
      const message = formatTransactionError(transactionError);
      setError(message);
      setTxStatus(/reject|denied|declined/i.test(message) ? 'rejected' : 'failed');
    }
  }

  if (status === 'disconnected' || status === 'connecting' || status === 'no_wallet') {
    return (
      <div className="page-shell max-w-3xl text-center py-24">
        <h1 className="text-2xl font-bold mb-3 dark:text-zinc-100">Connect your wallet</h1>
        <p className="text-slate-500 dark:text-zinc-400">Create a passkey wallet or connect an existing Arc Testnet wallet to secure an invoice.</p>
      </div>
    );
  }

  if (status === 'wrong_network') {
    return (
      <div className="page-shell max-w-3xl text-center py-24 space-y-4">
        <h1 className="text-2xl font-bold dark:text-zinc-100">Wrong network</h1>
        <p className="text-slate-500 dark:text-zinc-400">Switch to Arc Testnet to continue.</p>
        <button onClick={() => void switchToArcTestnet()} className="button-primary">Switch to Arc Testnet</button>
      </div>
    );
  }

  if (!IS_ACCORDPAY_CONFIGURED) {
    return (
      <div className="page-shell max-w-3xl text-center py-24">
        <h1 className="text-2xl font-bold mb-3 dark:text-zinc-100">Deployment required</h1>
        <p className="text-slate-500 dark:text-zinc-400">Deploy AccordPay, then set <code className="rounded bg-slate-100 px-1 dark:bg-zinc-800">NEXT_PUBLIC_ACCORDPAY_ADDRESS</code>.</p>
      </div>
    );
  }

  if (txStatus === 'confirmed' && txHash && createdId) {
    return (
      <div className="page-shell max-w-2xl py-12 sm:py-16">
        <section className="card overflow-hidden text-center">
          <div className="border-b border-slate-100 px-5 py-8 dark:border-zinc-700 sm:px-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">✓</div>
            <h1 className="mt-5 text-3xl font-bold dark:text-zinc-100">Payment secured</h1>
            <p className="mt-2 text-slate-600 dark:text-zinc-400">Invoice #{createdId.toString()} is ready for the supplier.</p>
            <div className="mt-6 rounded-2xl bg-slate-50 p-5 dark:bg-zinc-900/50">
              <p className="text-3xl font-bold text-slate-950 dark:text-white">{fullAmount !== null ? formatUsdc(fullAmount) : '0'} <span className="text-lg text-slate-500">USDC</span></p>
              <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Due {new Date(dueDateInput).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="px-5 py-6 text-left sm:px-10">
            <ol className="space-y-4 text-sm">
              <li className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">✓</span><span><strong>Invoice created</strong><span className="ml-1 text-slate-500">with your payment terms</span></span></li>
              <li className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">✓</span><span><strong>Payment secured</strong><span className="ml-1 text-slate-500">in the escrow contract</span></span></li>
              <li className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">→</span><span><strong>Supplier can receive payment</strong><span className="ml-1 text-slate-500">using Invoice #{createdId.toString()}</span></span></li>
            </ol>
            <div className="mt-7 grid gap-3 sm:grid-cols-2"><button onClick={() => router.push(`/invoices/${createdId.toString()}`)} className="button-primary">View invoice</button><button onClick={() => router.push('/dashboard')} className="button-secondary">Return to dashboard</button></div>
            <div className="mt-3 flex justify-center"><PaymentLinkButton invoiceId={createdId}/></div>
            <div className="mt-5 flex flex-col items-center gap-3 text-sm">
              <button onClick={() => { setTxStatus('idle'); setTxHash(null); setCreatedId(null); setStep(1); setSupplier(''); setReference(''); setDescription(''); setFullAmountInput(''); setEarlyAmountInput(''); setDueDateInput(''); setDynamicEarlySettlement(false); }} className="font-semibold text-indigo-700 hover:underline dark:text-indigo-400">Create another invoice</button>
              <details className="w-full rounded-xl border border-slate-200 text-left dark:border-zinc-700"><summary className="cursor-pointer px-4 py-3 text-center font-medium text-slate-500 dark:text-zinc-400">View transaction details</summary><div className="border-t border-slate-200 p-4 dark:border-zinc-700"><p className="break-all font-mono text-xs text-slate-500 dark:text-zinc-400">{txHash}</p>{chainId && <a className="mt-3 inline-block font-medium text-indigo-700 hover:underline dark:text-indigo-400" href={getExplorerUrl(chainId, 'tx', txHash)} target="_blank" rel="noreferrer">Open on Arcscan ↗</a>}</div></details>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const isSubmitting = ['validating', 'approving', 'submitting'].includes(txStatus);

  function continueFromDetails() {
    setError(null);
    if (!isAddress(supplier)) {
      setError('Enter a valid supplier wallet address.');
      return;
    }
    if (address && getAddress(supplier).toLowerCase() === address.toLowerCase()) {
      setError('The buyer and supplier must be different wallets.');
      return;
    }
    setStep(2);
  }

  function continueFromPayment() {
    setError(null);
    if (fullAmount === null || fullAmount <= 0n) {
      setError('Enter a valid invoice amount.');
      return;
    }
    if (earlyAmount === null || earlyAmount <= 0n || earlyAmount > fullAmount) {
      setError('Early payment must be greater than 0 and no more than the full amount.');
      return;
    }
    const dueDateMilliseconds = new Date(dueDateInput).getTime();
    if (!Number.isFinite(dueDateMilliseconds) || dueDateMilliseconds < Date.now() + MINIMUM_DUE_LEAD_MS) {
      setError('Choose a due date at least 5 minutes from now.');
      return;
    }
    setStep(3);
  }

  return (
    <div className="page-shell max-w-3xl py-10">
      <div className="mb-7">
        <p className="eyebrow">Arc Testnet</p>
        <h1 className="text-3xl font-bold dark:text-zinc-100">Create an invoice</h1>
        <p className="mt-2 text-slate-600 dark:text-zinc-400">Add the payment details, review them, then secure the payment with USDC.</p>
      </div>

      <ol className="mb-6 grid grid-cols-3 gap-2" aria-label="Invoice creation progress">
        {(['Details', 'Payment', 'Review'] as const).map((label, index) => {
          const number = (index + 1) as 1 | 2 | 3;
          const active = step === number;
          const complete = step > number;
          return <li key={label} className={`rounded-xl border px-3 py-3 text-center text-sm font-semibold ${active ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300' : complete ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400' : 'border-slate-200 bg-white text-slate-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500'}`}><span className="hidden sm:inline">{complete ? '✓ ' : `${number}. `}</span>{label}</li>;
        })}
      </ol>

      {error && (
        <div role="alert" className={`mb-5 rounded-lg border p-4 text-sm ${txStatus === 'rejected' ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400'}`}>
          {error}
        </div>
      )}

      <form onSubmit={(event) => void handleSubmit(event)} className="card p-4 sm:p-6">
        {step === 1 && <div className="space-y-6">
          <div><h2 className="text-xl font-bold">Who are you paying?</h2><p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Only the supplier wallet is required. The invoice name and description are optional.</p></div>
          <label className="field-label">Supplier wallet<input required value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="0x…" className="field-input font-mono" /></label>
          <div className="grid gap-6 md:grid-cols-2">
            <label className="field-label">Invoice name <span className="font-normal text-slate-400">(optional)</span><input maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="For example, August services" className="field-input" /></label>
            <label className="field-label">Description <span className="font-normal text-slate-400">(optional)</span><input maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this payment for?" className="field-input" /></label>
          </div>
          <div className="flex justify-end"><button type="button" onClick={continueFromDetails} className="button-primary w-full sm:w-auto">Continue to payment</button></div>
        </div>}

        {step === 2 && <div className="space-y-6">
          <div><h2 className="text-xl font-bold">Set the payment terms</h2><p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Choose the full invoice amount and what the supplier can receive early.</p></div>
          <div className="grid gap-6 md:grid-cols-2">
            <label className="field-label">Full payment (USDC)<input required type="number" min="0.000001" step="0.000001" value={fullAmountInput} onChange={(event) => setFullAmountInput(event.target.value)} placeholder="1000" className="field-input" /></label>
            <label className="field-label">{dynamicEarlySettlement ? 'Starting early payment' : 'Fixed early payment'} (USDC)<input required type="number" min="0.000001" step="0.000001" value={earlyAmountInput} onChange={(event) => setEarlyAmountInput(event.target.value)} placeholder="970" className="field-input" /></label>
          </div>
          <button type="button" role="switch" aria-checked={dynamicEarlySettlement} onClick={() => setDynamicEarlySettlement((enabled) => !enabled)} className={`flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition ${dynamicEarlySettlement ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30' : 'border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900/50'}`}><span><span className="block text-sm font-semibold">Increase early payment over time</span><span className="mt-1 block text-xs leading-5 text-slate-500">Optional. The available amount gradually grows until it reaches the full payment on the due date.</span></span><span className={`relative h-6 w-11 shrink-0 rounded-full transition ${dynamicEarlySettlement ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-zinc-600'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${dynamicEarlySettlement ? 'left-6' : 'left-1'}`}/></span></button>
          <label className="field-label md:w-1/2">Payment due<input required type="datetime-local" min={minimumDueDate || undefined} value={dueDateInput} onChange={(event) => { setDueDateInput(event.target.value); setError(null); }} className="field-input" /><span className="text-xs font-normal text-slate-500">Select a time at least 5 minutes from now.</span></label>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-indigo-950 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-200">
            <p className="font-semibold">Payment preview</p>
            <p className="mt-1">{dynamicEarlySettlement ? <>The supplier can receive <strong>{earlyAmount !== null ? formatUsdc(earlyAmount) : '0'} USDC immediately</strong>. That amount increases continuously until it reaches <strong>{fullAmount !== null ? formatUsdc(fullAmount) : '0'} USDC</strong> on the due date.</> : <>The supplier can receive the fixed amount of <strong>{earlyAmount !== null ? formatUsdc(earlyAmount) : '0'} USDC</strong> anytime before the due date, or wait for <strong>{fullAmount !== null ? formatUsdc(fullAmount) : '0'} USDC</strong>.</>}</p>
            <p className="mt-1 text-xs opacity-80">Buyer savings for early payment: {formatUsdc(discount)} USDC ({discountPercent}%).</p>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button type="button" onClick={() => { setError(null); setStep(1); }} className="button-secondary">Back</button><button type="button" onClick={continueFromPayment} className="button-primary">Review invoice</button></div>
        </div>}

        {step === 3 && <div className="space-y-6">
          <div><h2 className="text-xl font-bold">Review and secure payment</h2><p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Check these details before approving the transaction in your wallet.</p></div>
          <dl className="detail-grid rounded-xl bg-slate-50 p-4 dark:bg-zinc-900/50">
            <dt>Supplier</dt><dd className="font-mono text-xs" title={supplier}>{supplier.slice(0, 12)}…{supplier.slice(-8)}</dd>
            <dt>Invoice name</dt><dd>{reference.trim() || 'No name added'}</dd>
            <dt>Full payment</dt><dd className="font-bold">{fullAmount !== null ? formatUsdc(fullAmount) : '0'} USDC</dd>
            <dt>{dynamicEarlySettlement ? 'Starting payout' : 'Fixed early payment'}</dt><dd>{earlyAmount !== null ? formatUsdc(earlyAmount) : '0'} USDC{dynamicEarlySettlement ? ', increasing until due' : ''}</dd>
            <dt>Due</dt><dd>{dueDateInput ? new Date(dueDateInput).toLocaleString() : 'Not set'}</dd>
          </dl>
          <NetworkFeeSelector />
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">The full payment will be secured for the supplier. Keep a small extra USDC balance for network fees. <a href={CIRCLE_FAUCET_URL} target="_blank" rel="noreferrer" className="font-medium text-indigo-700 hover:underline dark:text-indigo-400">Get testnet USDC ↗</a></div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button type="button" disabled={isSubmitting} onClick={() => { setError(null); setStep(2); }} className="button-secondary disabled:opacity-50">Back</button><button type="submit" disabled={isSubmitting} className="button-primary disabled:cursor-not-allowed disabled:opacity-50">{txStatus === 'validating' && 'Checking balance…'}{txStatus === 'approving' && 'Approve USDC in wallet…'}{txStatus === 'submitting' && 'Securing payment…'}{!isSubmitting && 'Create and secure payment'}</button></div>
        </div>}
      </form>
    </div>
  );
}
