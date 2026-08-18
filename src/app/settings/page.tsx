'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, KeyRound, ShieldCheck, Wallet } from 'lucide-react';
import { useWallet } from '@/lib/wallet';
import NetworkFeeSelector from '@/components/NetworkFeeSelector';
import { enablePasskeyRecovery, formatCircleWalletError, isRecoveryEnabled } from '@/lib/circle-modular-wallet';

export default function WalletSettingsPage() {
  const { status, address, isPasskeyWallet, feeMode, disconnect } = useWallet();
  const [recoveryJustEnabled, setRecoveryJustEnabled] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recoveryEnabled = recoveryJustEnabled || Boolean(address && typeof window !== 'undefined' && isRecoveryEnabled(address));

  async function enableRecovery() {
    setBusy(true); setError(null);
    try {
      const phrase = await enablePasskeyRecovery(feeMode);
      setRecoveryPhrase(phrase); setRecoveryJustEnabled(true);
    } catch (cause) { setError(formatCircleWalletError(cause)); }
    finally { setBusy(false); }
  }

  async function copyPhrase() {
    if (!recoveryPhrase) return;
    await navigator.clipboard.writeText(recoveryPhrase);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  if (status !== 'connected' || !address) return <div className="empty-state"><div className="empty-state-icon"><Wallet size={24}/></div><h1 className="text-2xl font-bold">Connect a wallet</h1><p className="mt-2 text-slate-500">Connect your passkey or existing wallet to manage its settings.</p><Link href="/onboarding" className="button-primary mt-6">Choose wallet</Link></div>;

  return <div className="page-shell max-w-4xl space-y-6 py-6 sm:py-10">
    <div className="border-b border-slate-200 pb-5 dark:border-zinc-700"><p className="eyebrow">Security and preferences</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Wallet settings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">Manage transaction fees, recovery, and your active wallet connection from one place.</p></div>
    <section className="card p-5 sm:p-6"><div className="flex items-start gap-3"><div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700 dark:bg-indigo-950/40"><Wallet size={20}/></div><div className="min-w-0"><h2 className="font-bold">{isPasskeyWallet ? 'AccordPay passkey wallet' : 'Connected browser wallet'}</h2><p className="mt-1 break-all font-mono text-xs text-slate-500">{address}</p><p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">Connected on Arc Testnet</p></div></div></section>
    {isPasskeyWallet && <div className="grid gap-5 md:grid-cols-2">
      <section className="card p-5 sm:p-6"><h2 className="mb-3 font-bold">Transaction fees</h2><NetworkFeeSelector/><p className="mt-3 text-xs leading-5 text-slate-500">This is your default. You can still change it immediately before each transaction.</p></section>
      <section className="card p-5 sm:p-6"><div className="flex items-start gap-3"><KeyRound size={21} className="mt-0.5 text-indigo-600"/><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">Wallet recovery</h2>{recoveryEnabled && <span className="status-pill bg-emerald-50 text-emerald-700">Enabled</span>}</div><p className="mt-2 text-sm leading-6 text-slate-500">A recovery phrase can authorize a new passkey if every synced device is lost.</p>{!recoveryEnabled && <button type="button" disabled={busy} onClick={() => void enableRecovery()} className="button-primary mt-4 disabled:opacity-50"><ShieldCheck size={17}/>{busy ? 'Enabling recovery…' : 'Enable recovery'}</button>}</div></div>
        {recoveryPhrase && <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"><p className="font-bold text-amber-950 dark:text-amber-200">Save these words now</p><p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-300">They are shown once and are not stored by AccordPay. Keep them in a password manager or offline.</p><p className="mt-3 select-all rounded-lg bg-white p-3 font-mono text-sm leading-7 text-slate-900 dark:bg-zinc-900 dark:text-zinc-100">{recoveryPhrase}</p><button type="button" onClick={() => void copyPhrase()} className="button-secondary mt-3 w-full">{copied ? <Check size={17}/> : <Copy size={17}/>} {copied ? 'Copied' : 'Copy recovery phrase'}</button></div>}
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>
    </div>}
    <section className="card p-5 sm:p-6"><h2 className="font-bold">Disconnect</h2><p className="mt-1 text-sm text-slate-500">This removes the active connection from this browser. It does not delete your wallet.</p><button type="button" onClick={disconnect} className="button-secondary mt-4">Disconnect wallet</button></section>
  </div>;
}
