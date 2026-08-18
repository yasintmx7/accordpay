import { InvoiceStatus, type OnChainInvoice } from '@/lib/accordpay';
import { formatUsdc } from '@/lib/usdc';

export default function InvoiceCharts({ invoices }: { invoices: OnChainInvoice[] }) {
  const groups = [
    { label: 'Created', color: 'bg-blue-500', value: invoices.filter((item) => item.status === InvoiceStatus.Created).length },
    { label: 'Funded', color: 'bg-violet-500', value: invoices.filter((item) => item.status === InvoiceStatus.Funded).length },
    { label: 'Settled', color: 'bg-emerald-500', value: invoices.filter((item) => item.status === InvoiceStatus.SettledEarly || item.status === InvoiceStatus.SettledAtMaturity).length },
    { label: 'Closed', color: 'bg-slate-400', value: invoices.filter((item) => item.status === InvoiceStatus.Cancelled || item.status === InvoiceStatus.Rejected).length },
  ];
  const max = Math.max(1, ...groups.map((group) => group.value));
  const totalVolume = invoices.reduce((sum, invoice) => sum + invoice.fullAmount, 0n);
  const settledVolume = invoices.filter((invoice) => invoice.status === InvoiceStatus.SettledEarly || invoice.status === InvoiceStatus.SettledAtMaturity).reduce((sum, invoice) => sum + (invoice.status === InvoiceStatus.SettledEarly ? invoice.earlySettlementAmount : invoice.fullAmount), 0n);
  const ratio = totalVolume > 0n ? Number((settledVolume * 10_000n) / totalVolume) / 100 : 0;

  return <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
    <section className="card p-5 sm:p-6"><div className="mb-6 flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-500">Invoice pipeline</p><h2 className="mt-1 text-xl font-bold">Status overview</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{invoices.length} total</span></div><div className="grid h-48 grid-cols-4 items-end gap-3 sm:gap-6">{groups.map((group) => <div key={group.label} className="flex h-full flex-col justify-end text-center"><span className="mb-2 text-sm font-bold">{group.value}</span><div title={`${group.label}: ${group.value}`} className={`${group.color} mx-auto w-full max-w-16 rounded-t-lg transition-all`} style={{ height: `${Math.max(group.value ? 12 : 3, (group.value / max) * 100)}%` }} /><span className="mt-2 truncate text-[11px] font-semibold text-slate-500 sm:text-xs">{group.label}</span></div>)}</div></section>
    <section className="card flex flex-col justify-between p-5 sm:p-6"><div><p className="text-sm font-semibold text-slate-500">Settlement progress</p><p className="mt-2 text-3xl font-bold">{ratio.toFixed(1)}%</p><p className="mt-1 text-sm text-slate-500">of tracked invoice value settled</p></div><div className="mt-8"><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, ratio)}%` }} /></div><div className="mt-4 flex justify-between gap-4 text-sm"><span className="text-slate-500">Settled</span><strong>{formatUsdc(settledVolume)} USDC</strong></div><div className="mt-2 flex justify-between gap-4 text-sm"><span className="text-slate-500">Total</span><strong>{formatUsdc(totalVolume)} USDC</strong></div></div></section>
  </div>;
}
