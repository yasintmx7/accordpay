'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import type { EIP1193Provider } from 'viem';
import { useWallet } from '@/lib/wallet';

type BridgeState = 'idle' | 'bridging' | 'complete' | 'failed';

function BridgeContent() {
  const params = useSearchParams();
  const invoiceId = params.get('invoice');
  const { activeWallet, status } = useWallet();
  const [amount, setAmount] = useState('');
  const [state, setState] = useState<BridgeState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function bridgeUsdc() {
    if (!activeWallet || status !== 'connected') { setMessage('Connect a browser wallet before starting the bridge.'); return; }
    if (!/^\d+(\.\d{1,6})?$/.test(amount) || Number(amount) <= 0) { setMessage('Enter a valid USDC amount with up to 6 decimals.'); return; }
    setState('bridging'); setMessage(null);
    try {
      const adapter = await createViemAdapterFromProvider({ provider: activeWallet.provider as EIP1193Provider, capabilities: { addressContext: 'user-controlled' } });
      const kit = new BridgeKit();
      await kit.bridge({ from: { adapter, chain: 'Ethereum_Sepolia' }, to: { adapter, chain: 'Arc_Testnet' }, amount });
      setState('complete');
    } catch (error) {
      const value = error as { shortMessage?: string; message?: string };
      setMessage(value.shortMessage || value.message || 'The crosschain transfer did not complete.');
      setState('failed');
    }
  }

  return <div className="page-shell max-w-4xl space-y-7 py-8 sm:py-12">
    <div><p className="eyebrow">Circle CCTP · Testnet</p><h1 className="mt-2 text-3xl font-bold">Fund from another chain</h1><p className="mt-2 max-w-2xl text-slate-600">Move native USDC from Ethereum Sepolia to Arc Testnet using Circle Bridge Kit, then fund the AccordPay invoice on Arc.</p></div>
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <section className="card space-y-6 p-5 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr]"><div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Pay from</p><p className="mt-2 font-bold">Ethereum Sepolia</p><p className="mt-1 text-xs text-slate-500">Native USDC</p></div><div className="hidden items-center text-xl text-slate-400 sm:flex">→</div><div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-200"><p className="text-xs font-bold uppercase tracking-wide text-indigo-500 dark:text-indigo-400">Settle on</p><p className="mt-2 font-bold">Arc Testnet</p><p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300">AccordPay invoice</p></div></div>
        <label className="field-label">Amount (USDC)<input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="1000.00" className="field-input text-lg" /></label>
        {invoiceId && <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-zinc-800"><span className="text-slate-500 dark:text-zinc-400">Destination invoice</span><strong className="float-right dark:text-zinc-100">#{invoiceId}</strong></div>}
        {message && <div role="alert" className="break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}</div>}
        {state === 'complete' ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-900/20"><p className="font-bold text-emerald-800 dark:text-emerald-400">USDC arrived on Arc</p><p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">Complete the separate invoice-funding transaction so you can verify both steps.</p>{invoiceId && <Link href={`/invoices/${invoiceId}`} className="button-success mt-4 w-full">Continue to fund invoice</Link>}</div> : <button type="button" onClick={() => void bridgeUsdc()} disabled={state === 'bridging'} className="button-primary w-full disabled:opacity-50">{state === 'bridging' ? 'Bridging USDC…' : 'Bridge USDC to Arc'}</button>}
      </section>
      <aside className="card h-fit p-5"><h2 className="font-bold">Two secure steps</h2><ol className="mt-5 space-y-5 text-sm"><li className="flex gap-3"><span className="step-number">1</span><span><strong>Bridge USDC</strong><br/><span className="text-slate-500">Approve and transfer through CCTP.</span></span></li><li className="flex gap-3"><span className="step-number">2</span><span><strong>Fund invoice</strong><br/><span className="text-slate-500">Confirm arrival, then fund on Arc.</span></span></li></ol><p className="mt-6 text-xs leading-5 text-slate-500">Testnet only. You need Sepolia ETH for source-chain gas and Arc USDC for destination gas.</p></aside>
    </div>
  </div>;
}

export default function BridgePage() {
  return <Suspense fallback={<div className="page-shell py-24 text-center text-slate-500">Preparing crosschain funding…</div>}><BridgeContent /></Suspense>;
}
