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
      <nav aria-label="Invoice sections" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-zinc-800 sm:flex sm:gap-2 sm:bg-transparent sm:p-0 dark:sm:bg-transparent">
        <Link href="/invoices/new" className="button-primary hidden sm:inline-flex">Create Invoice</Link>
        <Link
          href="/invoices/sent"
          aria-current={current === 'sent' ? 'page' : undefined}
          className={`flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition ${current === 'sent' ? 'bg-white text-indigo-700 shadow-sm dark:bg-zinc-700 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'} sm:min-h-11 sm:border sm:border-slate-200 sm:bg-white sm:shadow-sm dark:sm:border-zinc-700 dark:sm:bg-zinc-800`}
        >
          Sent
        </Link>
        <Link
          href="/invoices/received"
          aria-current={current === 'received' ? 'page' : undefined}
          className={`flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition ${current === 'received' ? 'bg-white text-indigo-700 shadow-sm dark:bg-zinc-700 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100'} sm:min-h-11 sm:border sm:border-slate-200 sm:bg-white sm:shadow-sm dark:sm:border-zinc-700 dark:sm:bg-zinc-800`}
        >
          Received
        </Link>
      </nav>
    </div>
  );
}
