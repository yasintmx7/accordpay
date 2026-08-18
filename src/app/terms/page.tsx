import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
};

export default function TermsPage() {
  return (
    <div className="page-shell py-12 sm:py-20">
      <div className="mx-auto max-w-3xl space-y-6 text-slate-600 dark:text-zinc-400">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Terms of Service</h1>
        <p className="text-sm">Last updated: August 2026</p>
        <p>This is a demonstration project built for a hackathon on the Arc Testnet. By using AccordPay, you agree to these terms.</p>
        
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8">1. Testnet Environment</h2>
        <p>AccordPay operates strictly on the Arc Testnet. All transactions, USDC balances, and invoices have no real-world financial value. Do not attempt to use mainnet funds or real assets with this application.</p>
        
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8">2. No Warranties</h2>
        <p>This service is provided &quot;as is&quot;, without warranty of any kind, express or implied. The smart contracts are unaudited and are provided for demonstration and educational purposes only.</p>
      </div>
    </div>
  );
}
