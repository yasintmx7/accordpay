import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className="page-shell py-12 sm:py-20">
      <div className="mx-auto max-w-3xl space-y-6 text-slate-600 dark:text-zinc-400">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Privacy Policy</h1>
        <p className="text-sm">Last updated: August 2026</p>
        <p>Your privacy is important to us. This policy outlines how AccordPay handles your data.</p>
        
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8">1. Public On-chain Data</h2>
        <p>AccordPay relies on smart contracts deployed to the public Arc Testnet. Any data you submit through the application (such as wallet addresses, invoice amounts, and settlement dates) is permanently and publicly visible on the blockchain. Do not submit sensitive personal information.</p>
        
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8">2. Local Storage</h2>
        <p>We use local storage in your browser to remember your wallet connection preferences and improve your user experience. We do not use tracking cookies, analytics pixels, or third-party surveillance tools.</p>
      </div>
    </div>
  );
}
