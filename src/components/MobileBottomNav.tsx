'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, LayoutDashboard, Menu, Plus } from 'lucide-react';
import { useMobileNavigation } from '@/components/MobileNavigationDrawer';

const itemClass = 'flex h-[54px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-[10px] px-1 text-[11px] font-semibold transition active:scale-[0.97]';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { open, close, toggle } = useMobileNavigation();

  if (pathname !== '/dashboard') return null;

  return (
    <div className="min-[769px]:hidden">
      <div aria-hidden className="h-[calc(5rem+env(safe-area-inset-bottom))]" />
      <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.3rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_20px_rgba(15,23,42,0.055)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          <Link href="/dashboard" onClick={close} aria-current="page" className={`${itemClass} bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400`}><LayoutDashboard size={19} /><span>Dashboard</span></Link>
          <Link href="/invoices/new" onClick={close} className={`${itemClass} text-slate-500 dark:text-zinc-400`}><Plus size={20} /><span>Create</span></Link>
          <Link href="/invoices/sent" onClick={close} className={`${itemClass} text-slate-500 dark:text-zinc-400`}><FileText size={19} /><span>Invoices</span></Link>
          <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu" className={`${itemClass} ${open ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-400'}`}><Menu size={20} /><span>More</span></button>
        </div>
      </nav>
    </div>
  );
}
