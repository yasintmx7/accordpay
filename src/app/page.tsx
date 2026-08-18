import Link from 'next/link';
export default function Home() {
  return (
    <div className="page-shell py-10 sm:py-24">
      <div className="mx-auto max-w-4xl space-y-6 text-center">
        <p className="eyebrow text-indigo-600 dark:text-indigo-400">Programmable B2B settlement on Arc</p>
        <h1 className="text-[2.15rem] leading-[1.12] font-extrabold tracking-tight text-slate-950 dark:text-zinc-100 sm:text-7xl sm:leading-[1.05]">Fund invoices. Settle on your terms.</h1>
        <p className="mx-auto max-w-3xl text-lg leading-8 text-slate-600 dark:text-zinc-400 sm:text-xl">AccordPay gives businesses programmable control over B2B invoice settlement. Buyers secure invoices with USDC, while suppliers choose full payment at maturity or earlier settlement at transparent terms.</p>

        <div className="flex flex-col justify-center gap-3 pt-4 sm:flex-row sm:gap-4">
          <Link href="/dashboard" className="button-primary w-full sm:w-auto">
            Open Dashboard
          </Link>
          <Link href="/invoices/new" className="button-secondary w-full sm:w-auto">
            Create Invoice
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-8 sm:gap-6 sm:pt-12 md:grid-cols-3">
          <div className="card p-4 sm:p-6">
            <h3 className="font-semibold text-lg mb-2 text-slate-900 dark:text-zinc-100">1. Create and fund</h3>
            <p className="text-slate-500 text-sm dark:text-zinc-400">Buyer creates the invoice and locks USDC on Arc.</p>
          </div>
          <div className="card p-4 sm:p-6">
            <h3 className="font-semibold text-lg mb-2 text-slate-900 dark:text-zinc-100">2. Supplier chooses</h3>
            <p className="text-slate-500 text-sm dark:text-zinc-400">Wait for full payment or settle early at a discount.</p>
          </div>
          <div className="card p-4 sm:p-6">
            <h3 className="font-semibold text-lg mb-2 text-slate-900 dark:text-zinc-100">3. Arc records</h3>
            <p className="text-slate-500 text-sm dark:text-zinc-400">The settlement outcome is verified securely onchain.</p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-left sm:mt-12 sm:rounded-2xl sm:p-6 dark:border-indigo-900/50 dark:bg-indigo-900/20">
          <h4 className="font-medium text-indigo-900 mb-4 dark:text-indigo-300">Example Settlement</h4>
          <ul className="space-y-2 text-sm text-indigo-800 dark:text-indigo-200">
            <li className="flex justify-between gap-4">
              <span>Invoice value:</span> <strong className="shrink-0">1,000 USDC</strong>
            </li>
            <li className="flex justify-between gap-4">
              <span>Due in:</span> <strong className="shrink-0">30 days</strong>
            </li>
            <li className="flex justify-between gap-4">
              <span>Early settlement:</span> <strong className="shrink-0">970 USDC</strong>
            </li>
            <li className="flex justify-between gap-4 border-t border-indigo-200 dark:border-indigo-800/50 pt-2">
              <span>Buyer discount:</span> <strong className="shrink-0">30 USDC</strong>
            </li>
          </ul>
        </div>

        <div className="mt-16 text-left border-t border-slate-200 dark:border-zinc-700 pt-16">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-8">Frequently asked questions</h2>
          <div className="mx-auto max-w-3xl divide-y divide-slate-100 dark:divide-zinc-700">
            <details className="group py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-slate-900 dark:text-zinc-100">
                <span>What is AccordPay?</span>
                <span className="transition duration-300 group-open:-rotate-180 text-slate-400">
                  <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
              <p className="mt-4 text-slate-600 text-sm leading-6 dark:text-zinc-400">AccordPay is a non-custodial B2B settlement protocol that lets buyers securely lock invoice funds on the blockchain, while giving suppliers the choice to get paid early at a discount.</p>
            </details>

            <details className="group py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-slate-900 dark:text-zinc-100">
                <span>Which blockchain does AccordPay use?</span>
                <span className="transition duration-300 group-open:-rotate-180 text-slate-400">
                  <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
              <p className="mt-4 text-slate-600 text-sm leading-6 dark:text-zinc-400">AccordPay is built on Arc Testnet, utilizing USDC for high-speed, programmable settlements with virtually zero fees.</p>
            </details>

            <details className="group py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-slate-900 dark:text-zinc-100">
                <span>How does early settlement work?</span>
                <span className="transition duration-300 group-open:-rotate-180 text-slate-400">
                  <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
              <p className="mt-4 text-slate-600 text-sm leading-6 dark:text-zinc-400">By default, the buyer sets one fixed early-payment amount that remains unchanged until maturity. Buyers can optionally enable an increasing amount that grows toward the full payment over time. If the supplier accepts early payment, the remaining balance is returned to the buyer.</p>
            </details>

            <details className="group py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-slate-900 dark:text-zinc-100">
                <span>Do I need a wallet to use AccordPay?</span>
                <span className="transition duration-300 group-open:-rotate-180 text-slate-400">
                  <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
              <p className="mt-4 text-slate-600 text-sm leading-6 dark:text-zinc-400">Use a passkey wallet created inside AccordPay—no email or seed phrase—or connect an existing wallet such as MetaMask or Rabby.</p>
            </details>

            <details className="group py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-slate-900 dark:text-zinc-100">
                <span>What happens if an invoice reaches its due date?</span>
                <span className="transition duration-300 group-open:-rotate-180 text-slate-400">
                  <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
              <p className="mt-4 text-slate-600 text-sm leading-6 dark:text-zinc-400">Once maturity is reached, anyone can finalize settlement, while the contract guarantees that the full invoice amount goes only to the supplier&apos;s configured payout wallet.</p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
