import Link from 'next/link';
import {
  ArrowRight,
  BadgeDollarSign,
  Check,
  Clock3,
  ExternalLink,
  FilePlus2,
  Landmark,
  LockKeyhole,
  Network,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Zap,
} from 'lucide-react';

const benefits = [
  { icon: BadgeDollarSign, title: 'USDC settlement', description: 'Stable, predictable payments' },
  { icon: LockKeyhole, title: 'Non-custodial', description: 'Funds remain locked onchain' },
  { icon: Network, title: 'Built on Arc', description: 'Fast settlement, low fees' },
] as const;

const steps = [
  {
    icon: FilePlus2,
    title: 'Create & fund',
    description: 'The buyer creates an invoice and secures the full USDC amount in the AccordPay contract.',
  },
  {
    icon: WalletCards,
    title: 'Supplier chooses',
    description: 'The supplier can take the available early payment or keep the invoice funded until maturity.',
  },
  {
    icon: Landmark,
    title: 'Settle onchain',
    description: 'At maturity, the contract delivers the full amount to the supplier’s configured payout wallet.',
  },
] as const;

const faqs = [
  {
    question: 'What is AccordPay?',
    answer: 'AccordPay is a non-custodial B2B invoice settlement platform. Buyers secure invoice funds in USDC while suppliers choose when to settle under the invoice’s existing terms.',
  },
  {
    question: 'How does early settlement work?',
    answer: 'The buyer defines the full invoice amount and an early-payment amount. Before maturity, the supplier can accept the current early-payment quote; the remaining discount returns to the buyer.',
  },
  {
    question: 'What happens at maturity?',
    answer: 'Once the due time is reached, settlement can be finalized onchain. The contract sends the full secured amount only to the supplier’s configured payout wallet.',
  },
  {
    question: 'Which network and asset does AccordPay use?',
    answer: 'The current product runs on Arc Testnet and settles invoices with testnet USDC. Testnet assets have no financial value.',
  },
] as const;

export default function Home() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-grid" aria-hidden="true" />
        <div className="home-hero-halo" aria-hidden="true" />

        <div className="page-shell home-hero-layout">
          <div className="home-hero-copy">
            <div className="home-kicker"><span className="home-kicker-dot" />B2B settlement on Arc</div>

            <h1 className="home-title">
              <span>Fund invoices.</span>
              <span className="home-title-accent">Settle on your terms.</span>
            </h1>

            <p className="home-lead">Lock USDC into an invoice. Suppliers can settle early or receive the full amount at maturity.</p>
            <p className="home-supporting-copy">Simple, programmable settlement without unnecessary paperwork or intermediaries.</p>

            <div className="home-hero-actions">
              <Link href="/dashboard" className="home-primary-cta">Open Dashboard <ArrowRight size={17} strokeWidth={2} /></Link>
              <Link href="/invoices/new" className="home-secondary-cta"><FilePlus2 size={17} strokeWidth={2} /> Create Invoice</Link>
            </div>

            <div className="home-assurance" aria-label="Product assurances">
              <span><Check size={14} /> Non-custodial</span>
              <span><Check size={14} /> USDC-native</span>
              <span><Check size={14} /> Arc Testnet</span>
            </div>
          </div>

          <div className="home-product-preview" aria-label="AccordPay invoice preview">
            <div className="home-preview-topline">
              <div><p className="home-preview-label">Invoice</p><p className="home-preview-id">#AP-1042</p></div>
              <span className="home-funded-badge"><span /> Funded</span>
            </div>

            <div className="home-preview-amount"><span>Amount secured</span><strong>10,000 <small>USDC</small></strong></div>

            <div className="home-preview-meta">
              <div><span>Network</span><strong><span className="home-network-dot" /> Arc</strong></div>
              <div><span>Due</span><strong>14 days</strong></div>
            </div>

            <div className="home-preview-divider" />
            <p className="home-preview-section-label">Supplier options</p>

            <div className="home-option-list">
              <div className="home-option home-option-active">
                <span className="home-option-icon"><Zap size={17} /></span>
                <span><strong>Settle early</strong><small>Receive the current quote</small></span>
                <span className="home-option-check"><Check size={14} /></span>
              </div>
              <div className="home-option">
                <span className="home-option-icon"><Clock3 size={17} /></span>
                <span><strong>Wait until maturity</strong><small>Receive the full 10,000 USDC</small></span>
              </div>
            </div>

            <div className="home-preview-footnote"><ShieldCheck size={15} /> Terms secured by the AccordPay contract</div>
          </div>
        </div>
      </section>

      <section className="page-shell home-benefit-wrap" aria-label="AccordPay benefits">
        <div className="home-benefit-strip">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div className="home-benefit" key={title}>
              <span className="home-benefit-icon"><Icon size={19} strokeWidth={1.8} /></span>
              <span><strong>{title}</strong><small>{description}</small></span>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section home-how-section">
        <div className="page-shell">
          <div className="home-section-heading">
            <p className="home-section-kicker">How it works</p>
            <h2>Three steps to settlement</h2>
            <p>Clear terms for buyers. Flexible timing for suppliers. Settlement enforced onchain.</p>
            <Link href="/how-it-works" className="home-text-link">Explore the architecture <ArrowRight size={16} /></Link>
          </div>

          <div className="home-steps">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <article className="home-step" key={title}>
                <div className="home-step-topline">
                  <span className="home-step-number">0{index + 1}</span>
                  <span className="home-step-icon"><Icon size={21} strokeWidth={1.8} /></span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-outcomes-section">
        <div className="page-shell home-outcomes-layout">
          <div className="home-outcomes-copy">
            <p className="home-section-kicker">One invoice, two outcomes</p>
            <h2>Liquidity when it helps. Full value when it matters.</h2>
            <p>AccordPay keeps the commercial flow simple. The buyer secures the obligation once, and the supplier chooses the settlement timing that fits their business.</p>
            <Link href="/invoices/new" className="home-text-link">Create an invoice <ArrowRight size={16} /></Link>
          </div>

          <div className="home-outcome-cards">
            <article className="home-outcome-card">
              <span className="home-outcome-icon"><Zap size={20} /></span>
              <p className="home-outcome-eyebrow">Before maturity</p>
              <h3>Settle early</h3>
              <p>Access working capital sooner using the invoice’s transparent early-payment terms.</p>
            </article>
            <article className="home-outcome-card home-outcome-card-featured">
              <span className="home-outcome-icon"><Clock3 size={20} /></span>
              <p className="home-outcome-eyebrow">At maturity</p>
              <h3>Receive full payment</h3>
              <p>Finalize settlement and route the complete secured amount to the supplier payout wallet.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="home-section home-trust-section">
        <div className="page-shell">
          <div className="home-trust-panel">
            <div className="home-trust-icon"><Sparkles size={22} /></div>
            <div>
              <p className="home-section-kicker">Built for credible settlement</p>
              <h2>Clear state. Verifiable terms. Controlled payout.</h2>
              <p>Every invoice state and settlement outcome is readable on Arc, while funds move only through the contract’s defined rules.</p>
            </div>
            <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer" className="home-secondary-cta home-explorer-link">View Arc explorer <ExternalLink size={15} /></a>
          </div>
        </div>
      </section>

      <section className="home-section home-faq-section">
        <div className="page-shell home-faq-layout">
          <div className="home-faq-heading">
            <p className="home-section-kicker">Questions</p>
            <h2>Everything you need to know</h2>
            <p>AccordPay keeps the workflow focused on invoice funding and settlement.</p>
          </div>
          <div className="home-faq-list">
            {faqs.map(({ question, answer }) => (
              <details className="home-faq-item" key={question}>
                <summary>{question}<span aria-hidden>+</span></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="home-final-cta">
        <div className="page-shell">
          <div className="home-final-cta-panel">
            <div><p className="home-section-kicker">Start settling on Arc</p><h2>Put your next invoice on better rails.</h2></div>
            <div className="home-final-actions">
              <Link href="/dashboard" className="home-primary-cta">Open Dashboard <ArrowRight size={17} /></Link>
              <Link href="/invoices/new" className="home-secondary-cta">Create Invoice</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
