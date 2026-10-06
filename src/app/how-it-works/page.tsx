import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  Braces,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  FileCheck2,
  Landmark,
  LockKeyhole,
  Network,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'How AccordPay Works',
  description: 'Learn how AccordPay funds, secures, and settles B2B invoices on Arc Testnet.',
};

const lifecycle = [
  { title: 'Created', description: 'The buyer records the supplier, amounts, maturity date, and reference hashes.' },
  { title: 'Funded', description: 'The full invoice value is transferred into the AccordPay contract.' },
  { title: 'Settled early', description: 'The supplier receives the current quote and the discount returns to the buyer.' },
  { title: 'Settled at maturity', description: 'The full secured value is paid to the supplier payout wallet.' },
] as const;

const architecture = [
  { icon: Braces, title: 'Next.js application', description: 'Invoice UI, dashboards, receipts, and responsive workflows.' },
  { icon: WalletCards, title: 'Wallet layer', description: 'EIP-6963 browser wallets or a configured Circle passkey wallet.' },
  { icon: Network, title: 'Viem client', description: 'Typed reads, writes, receipt checks, and event decoding.' },
  { icon: ShieldCheck, title: 'AccordPay contract', description: 'Lifecycle rules, access control, and escrow accounting.' },
] as const;

function FlowArrow() {
  return (
    <div className="flex items-center justify-center text-indigo-400" aria-hidden="true">
      <ArrowRight className="hidden md:block" size={24} />
      <ArrowDown className="md:hidden" size={22} />
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="bg-slate-50 dark:bg-zinc-900">
      <section className="border-b border-slate-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="page-shell py-14 sm:py-20">
          <p className="eyebrow">Product documentation</p>
          <div className="mt-4 grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <h1 className="max-w-4xl text-4xl font-bold tracking-[-0.035em] text-slate-950 dark:text-white sm:text-5xl">
                How AccordPay works
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600 dark:text-zinc-300">
                AccordPay turns one funded invoice into two contract-enforced settlement choices: take the available early payout or receive the full amount at maturity.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href="/invoices/new" className="button-primary">Create Invoice</Link>
              <Link href="/dashboard" className="button-secondary">Open Dashboard</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell py-12 sm:py-16" aria-labelledby="settlement-model">
        <div className="max-w-3xl">
          <p className="eyebrow">Settlement model</p>
          <h2 id="settlement-model" className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">One funded invoice, two outcomes</h2>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-zinc-300">The buyer secures the complete obligation once. The supplier controls settlement timing under the invoice terms already stored by the contract.</p>
        </div>

        <div className="mt-9 grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 dark:border-indigo-900/70 dark:bg-indigo-950/35">
            <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-300"><WalletCards size={22} /><h3 className="font-bold">Buyer</h3></div>
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-zinc-300">Defines the supplier, amount, starting payout, and maturity date, then escrows the full USDC amount.</p>
          </article>
          <FlowArrow />
          <article className="rounded-2xl border border-slate-300 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-950">
            <div className="flex items-center gap-3 text-slate-900 dark:text-white"><LockKeyhole size={22} /><h3 className="font-bold">AccordPay escrow</h3></div>
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-zinc-300">Stores the lifecycle state and invoice hashes while holding the settlement amount under fixed contract rules.</p>
          </article>
          <FlowArrow />
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/70 dark:bg-emerald-950/30">
            <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-300"><Landmark size={22} /><h3 className="font-bold">Supplier</h3></div>
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-zinc-300">Chooses the current early-settlement quote or waits until maturity for the full secured value.</p>
          </article>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950" aria-labelledby="dynamic-quote">
        <div className="page-shell grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center">
          <div>
            <p className="eyebrow">Dynamic settlement</p>
            <h2 id="dynamic-quote" className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">The available payout grows toward maturity</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-zinc-300">For dynamic invoices, the supplier payout increases linearly from the configured starting amount to the full invoice value. The contract&apos;s preview function returns the same quote enforced during settlement.</p>
            <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">Contract formula</p>
              <p className="mt-3 break-words font-mono text-sm leading-7 text-slate-900 dark:text-zinc-100 sm:text-base">starting payout + (discount range × elapsed time ÷ total duration)</p>
            </div>
          </div>
          <aside className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 dark:border-indigo-900/70 dark:bg-indigo-950/35">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">Illustrative invoice</p>
            <div className="mt-5 space-y-5">
              <div><p className="text-sm text-slate-500 dark:text-zinc-400">Full value</p><p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">10,000 USDC</p></div>
              <div><p className="text-sm text-slate-500 dark:text-zinc-400">Starting payout</p><p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">9,400 USDC</p></div>
              <div><p className="text-sm text-slate-500 dark:text-zinc-400">Halfway quote</p><p className="mt-1 text-xl font-bold text-indigo-600 dark:text-indigo-300">9,700 USDC</p></div>
            </div>
            <p className="mt-6 text-xs leading-5 text-slate-500 dark:text-zinc-400">Example values explain the mechanism and are not production pricing.</p>
          </aside>
        </div>
      </section>

      <section className="page-shell py-12 sm:py-16" aria-labelledby="lifecycle">
        <div className="max-w-3xl">
          <p className="eyebrow">Onchain lifecycle</p>
          <h2 id="lifecycle" className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">State changes follow role and timing rules</h2>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-zinc-300">Each successful transition emits an event that the interface can use for status, timeline, and receipt information.</p>
        </div>

        <ol className="mt-9 grid gap-4 lg:grid-cols-4">
          {lifecycle.map((item, index) => (
            <li key={item.title} className="relative rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">0{index + 1}</span>
              <h3 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-zinc-300">{item.description}</p>
            </li>
          ))}
        </ol>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-100/70 px-5 py-4 text-sm leading-6 text-slate-600 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300"><strong className="text-slate-900 dark:text-white">Cancellation:</strong> the buyer can cancel only before funding.</div>
          <div className="rounded-xl border border-slate-200 bg-slate-100/70 px-5 py-4 text-sm leading-6 text-slate-600 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300"><strong className="text-slate-900 dark:text-white">Rejection:</strong> the supplier can reject incorrect terms; funded USDC returns to the buyer.</div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950" aria-labelledby="architecture">
        <div className="page-shell py-12 sm:py-16">
          <div className="max-w-3xl">
            <p className="eyebrow">Architecture</p>
            <h2 id="architecture" className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Clear responsibility at every layer</h2>
            <p className="mt-3 text-base leading-7 text-slate-600 dark:text-zinc-300">The browser signs transactions, the contract controls settlement, and Arc USDC carries the invoice value.</p>
          </div>

          <div className="mt-9 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
            {architecture.map(({ icon: Icon, title, description }, index) => (
              <div key={title} className="contents">
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <Icon className="text-indigo-600 dark:text-indigo-300" size={22} />
                  <h3 className="mt-4 font-bold text-slate-950 dark:text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-zinc-300">{description}</p>
                </article>
                {index < architecture.length - 1 ? <FlowArrow /> : null}
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="rounded-2xl border border-slate-200 p-5 dark:border-zinc-800">
              <div className="flex items-start gap-4"><CircleDollarSign className="mt-0.5 shrink-0 text-emerald-600" size={22} /><div><h3 className="font-bold text-slate-950 dark:text-white">Arc Testnet USDC</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-300">AccordPay uses the official 6-decimal ERC-20 interface for approvals and invoice transfers. Users keep additional testnet USDC for gas.</p></div></div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-5 dark:border-zinc-800">
              <div className="flex items-start gap-4"><Network className="mt-0.5 shrink-0 text-indigo-600" size={22} /><div><h3 className="font-bold text-slate-950 dark:text-white">Circle Bridge Kit</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-300">Provides a separate Ethereum Sepolia to Arc funding path outside the escrow contract.</p></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell py-12 sm:py-16" aria-labelledby="security">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <p className="eyebrow">Security model</p>
            <h2 id="security" className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">The contract minimizes authority</h2>
            <ul className="mt-7 space-y-4 text-sm leading-6 text-slate-600 dark:text-zinc-300">
              <li className="flex gap-3"><FileCheck2 className="mt-0.5 shrink-0 text-emerald-600" size={19} /><span>SafeERC20 transfers and reentrancy protection on every token-moving action.</span></li>
              <li className="flex gap-3"><FileCheck2 className="mt-0.5 shrink-0 text-emerald-600" size={19} /><span>Exact incoming-balance checks, explicit lifecycle validation, and buyer or supplier role checks.</span></li>
              <li className="flex gap-3"><FileCheck2 className="mt-0.5 shrink-0 text-emerald-600" size={19} /><span>No owner withdrawal, upgrade hook, protocol fee, or arbitrary external call.</span></li>
            </ul>
          </div>
          <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/70 dark:bg-amber-950/25">
            <div className="flex items-center gap-3 text-amber-800 dark:text-amber-300"><Clock3 size={21} /><h3 className="font-bold">Current limitations</h3></div>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-amber-950/80 dark:text-amber-100/80">
              <li>The contract has not received a professional security audit.</li>
              <li>The deployment is intended for Arc Testnet demonstrations only.</li>
              <li>Settlement requires an onchain transaction; no offchain scheduler runs automatically.</li>
              <li>Plain invoice text stays offchain, while only reference and description hashes are stored in the contract.</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="border-t border-slate-200/80 bg-slate-950 text-white dark:border-zinc-800" aria-labelledby="technical-links">
        <div className="page-shell flex flex-col gap-7 py-12 sm:flex-row sm:items-center sm:justify-between sm:py-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-300">Technical references</p>
            <h2 id="technical-links" className="mt-3 text-2xl font-bold">Inspect the product and its source</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">The deployed app and repository reflect the architecture described on this page.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="https://accordpay.vercel.app" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-500 px-5 text-sm font-semibold text-white transition hover:bg-indigo-400">Live product <ExternalLink size={15} /></a>
            <a href="https://github.com/yasintmx7/accordpay" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-700 px-5 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900">GitHub source <ExternalLink size={15} /></a>
          </div>
        </div>
      </section>
    </div>
  );
}
