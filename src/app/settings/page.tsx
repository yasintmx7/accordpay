'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Check, Copy, KeyRound, ShieldCheck, Wallet, Building2, Upload } from 'lucide-react';
import { useWallet } from '@/lib/wallet';
import NetworkFeeSelector from '@/components/NetworkFeeSelector';
import { enablePasskeyRecovery, formatCircleWalletError, isRecoveryEnabled } from '@/lib/circle-modular-wallet';
import { getCompanyProfile, setCompanyProfile, type CompanyProfile } from '@/lib/store';
import { fileToDataUri } from '@/lib/documents';

export default function WalletSettingsPage() {
  const { status, address, isPasskeyWallet, feeMode, disconnect } = useWallet();
  const [recoveryJustEnabled, setRecoveryJustEnabled] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile state
  const [profile, setProfile] = useState<Partial<CompanyProfile>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const recoveryEnabled = recoveryJustEnabled || Boolean(address && typeof window !== 'undefined' && isRecoveryEnabled(address));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProfile(address ? (getCompanyProfile(address) ?? {}) : {});
      setProfileSaved(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [address]);

  async function enableRecovery() {
    setBusy(true); setError(null);
    try {
      const phrase = await enablePasskeyRecovery(feeMode);
      setRecoveryPhrase(phrase); setRecoveryJustEnabled(true);
    } catch (cause) { setError(formatCircleWalletError(cause)); }
    finally { setBusy(false); }
  }

  async function copyPhrase() {
    if (!recoveryPhrase) return;
    await navigator.clipboard.writeText(recoveryPhrase);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setSavingProfile(true);
    setTimeout(() => {
      setCompanyProfile({
        wallet: address.toLowerCase(),
        name: profile.name || '',
        logo: profile.logo || '',
        description: profile.description || '',
        country: profile.country || '',
        email: profile.email || '',
        website: profile.website || '',
        category: profile.category || '',
        updatedAt: Date.now(),
      });
      setSavingProfile(false);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    }, 300); // Small fake delay for UX
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be under 2MB');
      return;
    }
    try {
      const uri = await fileToDataUri(file);
      setProfile({ ...profile, logo: uri });
    } catch {
      alert('Failed to read image');
    }
  }

  if (status !== 'connected' || !address) return <div className="empty-state"><div className="empty-state-icon"><Wallet size={24}/></div><h1 className="text-2xl font-bold">Connect a wallet</h1><p className="mt-2 text-slate-500">Connect your passkey or existing wallet to manage its settings.</p><Link href="/onboarding" className="button-primary mt-6">Choose wallet</Link></div>;

  return <div className="page-shell max-w-4xl space-y-6 py-6 sm:py-10">
    <div className="border-b border-slate-200 pb-5 dark:border-zinc-700">
      <p className="eyebrow">Identity and preferences</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">Manage your company profile, transaction fees, and active wallet connection.</p>
    </div>

    {/* Company Profile Section */}
    <section className="card p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-6">
        <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700 dark:bg-indigo-950/40">
          <Building2 size={20}/>
        </div>
        <div>
          <h2 className="font-bold">Company Profile</h2>
          <p className="mt-1 text-sm text-slate-500">This information will be displayed to counterparties on your invoices.</p>
        </div>
      </div>
      
      <form onSubmit={handleSaveProfile} className="space-y-5">
        <div className="flex items-center gap-5 mb-2">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 overflow-hidden border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700">
            {profile.logo ? (
              <Image src={profile.logo} alt="Company logo" width={64} height={64} unoptimized className="h-full w-full object-cover" />
            ) : (
              <Building2 size={24} className="text-slate-400" />
            )}
          </div>
          <div>
            <label className="cursor-pointer button-secondary !min-h-9 !px-3 !py-1.5 !text-xs">
              <Upload size={14} className="mr-1.5" />
              Upload Logo
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
            </label>
            <p className="mt-1 text-[11px] text-slate-500">Max 2MB. Square recommended.</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="field-label">
            Company Name
            <input required value={profile.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Acme Corp" className="field-input" />
          </label>
          <label className="field-label">
            Business Email
            <input type="email" value={profile.email || ''} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="billing@acme.com" className="field-input" />
          </label>
          <label className="field-label">
            Country
            <input value={profile.country || ''} onChange={(e) => setProfile({ ...profile, country: e.target.value })} placeholder="United States" className="field-input" />
          </label>
          <label className="field-label">
            Website
            <input type="url" value={profile.website || ''} onChange={(e) => setProfile({ ...profile, website: e.target.value })} placeholder="https://acme.com" className="field-input" />
          </label>
          <label className="field-label sm:col-span-2">
            Short Description
            <input maxLength={100} value={profile.description || ''} onChange={(e) => setProfile({ ...profile, description: e.target.value })} placeholder="Manufacturing and supply chain solutions" className="field-input" />
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={savingProfile} className="button-primary">
            {savingProfile ? 'Saving...' : 'Save profile'}
          </button>
          {profileSaved && <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Check size={16} /> Saved</span>}
        </div>
      </form>
    </section>

    {/* Wallet Info */}
    <section className="card p-5 sm:p-6"><div className="flex items-start gap-3"><div className="rounded-xl bg-slate-50 p-2.5 text-slate-700 dark:bg-zinc-900/50 dark:text-zinc-300"><Wallet size={20}/></div><div className="min-w-0"><h2 className="font-bold">{isPasskeyWallet ? 'AccordPay passkey wallet' : 'Connected browser wallet'}</h2><p className="mt-1 break-all font-mono text-xs text-slate-500">{address}</p><p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">Connected on Arc Testnet</p></div></div></section>
    
    {isPasskeyWallet && <div className="grid gap-5 md:grid-cols-2">
      <section className="card p-5 sm:p-6"><h2 className="mb-3 font-bold">Transaction fees</h2><NetworkFeeSelector/><p className="mt-3 text-xs leading-5 text-slate-500">This is your default. You can still change it immediately before each transaction.</p></section>
      <section className="card p-5 sm:p-6"><div className="flex items-start gap-3"><KeyRound size={21} className="mt-0.5 text-indigo-600"/><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">Wallet recovery</h2>{recoveryEnabled && <span className="status-pill bg-emerald-50 text-emerald-700">Enabled</span>}</div><p className="mt-2 text-sm leading-6 text-slate-500">A recovery phrase can authorize a new passkey if every synced device is lost.</p>{!recoveryEnabled && <button type="button" disabled={busy} onClick={() => void enableRecovery()} className="button-primary mt-4 disabled:opacity-50"><ShieldCheck size={17}/>{busy ? 'Enabling recovery…' : 'Enable recovery'}</button>}</div></div>
        {recoveryPhrase && <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"><p className="font-bold text-amber-950 dark:text-amber-200">Save these words now</p><p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-300">They are shown once and are not stored by AccordPay. Keep them in a password manager or offline.</p><p className="mt-3 select-all rounded-lg bg-white p-3 font-mono text-sm leading-7 text-slate-900 dark:bg-zinc-900 dark:text-zinc-100">{recoveryPhrase}</p><button type="button" onClick={() => void copyPhrase()} className="button-secondary mt-3 w-full">{copied ? <Check size={17}/> : <Copy size={17}/>} {copied ? 'Copied' : 'Copy recovery phrase'}</button></div>}
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>
    </div>}
    
    <section className="card p-5 sm:p-6"><h2 className="font-bold">Disconnect</h2><p className="mt-1 text-sm text-slate-500">This removes the active connection from this browser. It does not delete your wallet.</p><button type="button" onClick={disconnect} className="button-secondary mt-4 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/20">Disconnect wallet</button></section>
  </div>;
}
