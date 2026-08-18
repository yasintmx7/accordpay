'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeftRight, FileText, LayoutDashboard, Menu, Plus, Settings, Settings2, X } from 'lucide-react';

const itemClass = 'flex min-h-12 min-w-14 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[11px] font-semibold transition active:scale-95';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [moreOpen]);

  const active = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

  return (
    <>
      {moreOpen && <div className="fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-[1px] lg:hidden" aria-hidden />}
      <div ref={menuRef} className="lg:hidden">
        {moreOpen && (
          <div className="fixed inset-x-3 bottom-[4.75rem] z-50 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="mb-2 flex items-center justify-between px-2"><p className="text-sm font-bold">More</p><button type="button" onClick={() => setMoreOpen(false)} aria-label="Close more menu" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100 dark:active:bg-zinc-800"><X size={20} /></button></div>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/bridge" onClick={() => setMoreOpen(false)} className="flex min-h-14 items-center gap-3 rounded-xl bg-slate-50 px-4 text-sm font-semibold dark:bg-zinc-800"><ArrowLeftRight size={19} className="text-indigo-600" />Crosschain</Link>
              <Link href="/payouts" onClick={() => setMoreOpen(false)} className="flex min-h-14 items-center gap-3 rounded-xl bg-slate-50 px-4 text-sm font-semibold dark:bg-zinc-800"><Settings2 size={19} className="text-indigo-600" />Payouts</Link>
              <Link href="/settings" onClick={() => setMoreOpen(false)} className="col-span-2 flex min-h-14 items-center gap-3 rounded-xl bg-slate-50 px-4 text-sm font-semibold dark:bg-zinc-800"><Settings size={19} className="text-indigo-600" />Wallet settings</Link>
              <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="col-span-2 flex min-h-14 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-indigo-700 dark:border-zinc-700 dark:text-indigo-400">Get testnet USDC ↗</a>
            </div>
          </div>
        )}
        <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
            <Link href="/dashboard" onClick={() => setMoreOpen(false)} aria-current={active('/dashboard') ? 'page' : undefined} className={`${itemClass} ${active('/dashboard') ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-400'}`}><LayoutDashboard size={19} /><span>Dashboard</span></Link>
            <Link href="/invoices/new" onClick={() => setMoreOpen(false)} aria-current={pathname === '/invoices/new' ? 'page' : undefined} className={`${itemClass} ${pathname === '/invoices/new' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-400'}`}><Plus size={20} /><span>Create</span></Link>
            <Link href="/invoices/sent" onClick={() => setMoreOpen(false)} aria-current={active('/invoices') && pathname !== '/invoices/new' ? 'page' : undefined} className={`${itemClass} ${active('/invoices') && pathname !== '/invoices/new' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-400'}`}><FileText size={19} /><span>Invoices</span></Link>
            <button type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} className={`${itemClass} ${moreOpen ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-400'}`}><Menu size={20} /><span>More</span></button>
          </div>
        </nav>
      </div>
    </>
  );
}
