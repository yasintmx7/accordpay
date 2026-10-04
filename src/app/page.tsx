import Link from 'next/link';
export default function Home() {
  return (
    <div className="landing-page">
      {/* ─── Hero Section ─── */}
      <section className="hero-section">
        <div className="hero-bg">
          <div className="hero-gradient" />
          <div className="hero-grid" />
          <div className="hero-glow hero-glow-1" />
          <div className="hero-glow hero-glow-2" />
        </div>

        <div className="page-shell relative z-10 py-16 sm:py-28">
          <div className="mx-auto max-w-4xl space-y-6 text-center">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Programmable B2B Settlement on Arc
            </div>

            <h1 className="hero-title">
              Fund invoices.<br className="hidden sm:inline" />
              <span className="hero-title-gradient"> Settle on your terms.</span>
            </h1>

            <p className="mx-auto max-w-2xl text-base leading-7 text-slate-500 dark:text-zinc-400 sm:text-lg sm:leading-8">
              AccordPay gives businesses programmable control over B2B invoice settlement.
              Buyers secure invoices with USDC, while suppliers choose full payment at
              maturity or earlier settlement at transparent terms.
            </p>

            <div className="flex flex-col justify-center gap-3 pt-6 sm:flex-row sm:gap-4">
              <Link href="/dashboard" className="hero-btn-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                Open Dashboard
              </Link>
              <Link href="/invoices/new" className="hero-btn-secondary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                Create Invoice
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Trust Metrics ─── */}
      <section className="page-shell -mt-6 relative z-10 sm:-mt-10">
        <div className="trust-metrics-bar">
          <div className="trust-metric">
            <span className="trust-metric-value">USDC</span>
            <span className="trust-metric-label">Stablecoin Settlement</span>
          </div>
          <div className="trust-metric-divider" />
          <div className="trust-metric">
            <span className="trust-metric-value">Non-Custodial</span>
            <span className="trust-metric-label">Funds Locked On-Chain</span>
          </div>
          <div className="trust-metric-divider" />
          <div className="trust-metric">
            <span className="trust-metric-value">Arc Network</span>
            <span className="trust-metric-label">Near-Zero Fees</span>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="page-shell py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-10 sm:mb-14">
            <p className="eyebrow text-indigo-600 dark:text-indigo-400 mb-3">How it works</p>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Three steps to settlement
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
            <div className="step-card">
              <div className="step-card-number">1</div>
              <div className="step-card-icon step-card-icon-blue">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              </div>
              <h3 className="step-card-title">Create &amp; Fund</h3>
              <p className="step-card-desc">Buyer creates the invoice and locks USDC securely in the smart contract on Arc.</p>
            </div>

            <div className="step-card">
              <div className="step-card-number">2</div>
              <div className="step-card-icon step-card-icon-violet">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/></svg>
              </div>
              <h3 className="step-card-title">Supplier Chooses</h3>
              <p className="step-card-desc">Wait for full payment at maturity, or settle early at a transparent discount.</p>
            </div>

            <div className="step-card">
              <div className="step-card-number">3</div>
              <div className="step-card-icon step-card-icon-emerald">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h3 className="step-card-title">Arc Records</h3>
              <p className="step-card-desc">The settlement outcome is verified and recorded securely on-chain.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Example Settlement ─── */}
      <section className="page-shell pb-16 sm:pb-24">
        <div className="mx-auto max-w-2xl">
          <div className="settlement-card">
            <div className="settlement-header">
              <div className="settlement-header-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              </div>
              <h3 className="settlement-header-title">Example Settlement</h3>
            </div>

            <div className="settlement-body">
              <div className="settlement-row">
                <span className="settlement-label">Invoice value</span>
                <span className="settlement-value">1,000 USDC</span>
              </div>
              <div className="settlement-row">
                <span className="settlement-label">Due in</span>
                <span className="settlement-value">30 days</span>
              </div>
              <div className="settlement-row">
                <span className="settlement-label">Early settlement</span>
                <span className="settlement-value settlement-value-accent">970 USDC</span>
              </div>
              <div className="settlement-row settlement-row-highlight">
                <span className="settlement-label-bold">Buyer discount</span>
                <span className="settlement-value-highlight">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  30 USDC
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ Section ─── */}
      <section className="faq-section">
        <div className="page-shell py-16 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="text-center mb-10 sm:mb-14">
              <p className="eyebrow text-indigo-600 dark:text-indigo-400 mb-3">Support</p>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Frequently asked questions
              </h2>
            </div>

            <div className="faq-list">
              <details className="faq-item">
                <summary className="faq-summary">
                  <span>What is AccordPay?</span>
                  <span className="faq-chevron">
                    <svg fill="none" height="20" width="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
                  </span>
                </summary>
                <p className="faq-answer">AccordPay is a non-custodial B2B settlement protocol that lets buyers securely lock invoice funds on the blockchain, while giving suppliers the choice to get paid early at a discount.</p>
              </details>

              <details className="faq-item">
                <summary className="faq-summary">
                  <span>Which blockchain does AccordPay use?</span>
                  <span className="faq-chevron">
                    <svg fill="none" height="20" width="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
                  </span>
                </summary>
                <p className="faq-answer">AccordPay is built on Arc Testnet, utilizing USDC for high-speed, programmable settlements with virtually zero fees.</p>
              </details>

              <details className="faq-item">
                <summary className="faq-summary">
                  <span>How does early settlement work?</span>
                  <span className="faq-chevron">
                    <svg fill="none" height="20" width="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
                  </span>
                </summary>
                <p className="faq-answer">By default, the buyer sets one fixed early-payment amount that remains unchanged until maturity. Buyers can optionally enable an increasing amount that grows toward the full payment over time. If the supplier accepts early payment, the remaining balance is returned to the buyer.</p>
              </details>

              <details className="faq-item">
                <summary className="faq-summary">
                  <span>Do I need a wallet to use AccordPay?</span>
                  <span className="faq-chevron">
                    <svg fill="none" height="20" width="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
                  </span>
                </summary>
                <p className="faq-answer">Use a passkey wallet created inside AccordPay—no email or seed phrase—or connect an existing wallet such as MetaMask or Rabby.</p>
              </details>

              <details className="faq-item">
                <summary className="faq-summary">
                  <span>What happens if an invoice reaches its due date?</span>
                  <span className="faq-chevron">
                    <svg fill="none" height="20" width="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
                  </span>
                </summary>
                <p className="faq-answer">Once maturity is reached, anyone can finalize settlement, while the contract guarantees that the full invoice amount goes only to the supplier&apos;s configured payout wallet.</p>
              </details>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
