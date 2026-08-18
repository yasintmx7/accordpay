'use client';

import { WalletCards, Zap } from 'lucide-react';
import { useWallet } from '@/lib/wallet';

export default function NetworkFeeSelector({ compact = false }: { compact?: boolean }) {
  const { isPasskeyWallet, feeMode, setFeeMode } = useWallet();
  if (!isPasskeyWallet) return null;

  return <fieldset className="rounded-xl border border-slate-200 p-3 dark:border-zinc-700">
    <legend className="px-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-zinc-400">Network fee</legend>
    <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'sm:grid-cols-2'}`}>
      <button type="button" onClick={() => setFeeMode('sponsored')} aria-pressed={feeMode === 'sponsored'} className={`min-h-12 rounded-lg border px-3 py-2 text-left transition ${feeMode === 'sponsored' ? 'border-indigo-500 bg-indigo-50 text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-100' : 'border-slate-200 dark:border-zinc-700'}`}><span className="flex items-center gap-2 text-sm font-bold"><Zap size={16} className="text-indigo-600"/>Sponsored</span><span className="mt-0.5 block text-[11px] text-slate-500 dark:text-zinc-400">You pay $0</span></button>
      <button type="button" onClick={() => setFeeMode('self-paid')} aria-pressed={feeMode === 'self-paid'} className={`min-h-12 rounded-lg border px-3 py-2 text-left transition ${feeMode === 'self-paid' ? 'border-indigo-500 bg-indigo-50 text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-100' : 'border-slate-200 dark:border-zinc-700'}`}><span className="flex items-center gap-2 text-sm font-bold"><WalletCards size={16} className="text-indigo-600"/>Pay myself</span><span className="mt-0.5 block text-[11px] text-slate-500 dark:text-zinc-400">Paid in USDC</span></button>
    </div>
    {feeMode === 'sponsored' && <p className="mt-2 text-[11px] leading-4 text-slate-500 dark:text-zinc-400">If sponsorship is unavailable, switch to Pay myself and retry. AccordPay never charges automatically.</p>}
  </fieldset>;
}
