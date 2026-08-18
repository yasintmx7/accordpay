import Link from 'next/link';

type InvoiceSection = 'sent' | 'received';

export default function InvoiceSectionHeader({ current }: { current: InvoiceSection }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Link href="/dashboard" className="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-400">← Dashboard</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-zinc-100">
          {current === 'sent' ? 'Sent Invoices' : 'Received Invoices'}
        </h1>
      </div>
      <nav aria-label="Invoice sections" className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
        <Link href="/invoices/new" className="button-primary col-span-2 sm:col-span-1">Create Invoice</Link>
        <Link
          href="/invoices/sent"
          aria-current={current === 'sent' ? 'page' : undefined}
          className={current === 'sent' ? 'button-secondary ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-zinc-900' : 'button-secondary'}
        >
          Sent
        </Link>
        <Link
          href="/invoices/received"
          aria-current={current === 'received' ? 'page' : undefined}
          className={current === 'received' ? 'button-secondary ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-zinc-900' : 'button-secondary'}
        >
          Received
        </Link>
      </nav>
    </div>
  );
}
