'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Fingerprint, KeyRound, RefreshCw, ShieldCheck, WalletCards, Zap } from 'lucide-react';
import { useWallet } from '@/lib/wallet';
import { createCirclePasskeyProvider, formatCircleWalletError, isCircleModularWalletConfigured, recoverCirclePasskeyProvider, type NetworkFeeMode, type PasskeyMode } from '@/lib/circle-modular-wallet';

const passkeyWalletInfo = { uuid: 'accordpay-circle-passkey', name: 'AccordPay Passkey', icon: '', rdns: 'app.accordpay.passkey' };

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoMode = searchParams.get('auto'); // 'login' when coming from the reconnect banner
  const { connect } = useWallet();
  const [feeMode, setFeeMode] = useState<NetworkFeeMode>('sponsored');
  const [busy, setBusy] = useState<PasskeyMode | 'recover' | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Detect non-HTTPS origins — WebAuthn is blocked by most browsers except on localhost
  const [isInsecureOrigin, setIsInsecureOrigin] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      setIsInsecureOrigin(!isLocalhost && window.location.protocol !== 'https:');
    }
  }, []);

  async function finishConnection(provider: unknown) {
    await connect({ info: passkeyWalletInfo, provider: provider as never });
    router.push('/dashboard');
  }

  async function continueWithPasskey(mode: PasskeyMode) {
    setBusy(mode); setError(null);
    try {
      const { provider } = await createCirclePasskeyProvider(mode, feeMode);
      await finishConnection(provider);
    } catch (cause) { setError(formatCircleWalletError(cause)); }
    finally { setBusy(null); }
  }

  async function recoverWallet() {
    if (recoveryPhrase.trim().split(/\s+/).length < 12) { setError('Enter the complete recovery phrase.'); return; }
    setBusy('recover'); setError(null);
    try {
      const { provider } = await recoverCirclePasskeyProvider(recoveryPhrase, feeMode);
      await finishConnection(provider);
    } catch (cause) { setError(formatCircleWalletError(cause)); }
    finally { setBusy(null); }
  }

  return (
    <div className="page-shell max-w-xl py-8 sm:py-14">
      <div className="card overflow-hidden">
        {/* Card header */}
        <div className="bg-[#3157f6] p-6 text-white sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            {autoMode === 'login' ? <RefreshCw size={24} /> : <Fingerprint size={24} />}
          </div>
          {autoMode === 'login' ? (
            <>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-blue-100">Session ended after refresh</p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Reconnect your passkey wallet</h1>
              <p className="mt-2 text-sm leading-6 text-blue-100">Tap the button below to unlock your existing AccordPay wallet with your passkey (Face ID, fingerprint, or device lock).</p>
            </>
          ) : (
            <>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-blue-100">No email or seed phrase</p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Your wallet, secured by passkey</h1>
              <p className="mt-2 text-sm leading-6 text-blue-100">Use Face ID, fingerprint, or your device lock. Synced passkeys work across compatible phones and computers.</p>
            </>
          )}
        </div>

        {/* Card body */}
        <div className="space-y-5 p-5 sm:p-7">
          {/* HTTPS warning */}
          {isInsecureOrigin && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Passkeys require HTTPS. Please open this app on a secure (https://) URL or use localhost for local development.
            </p>
          )}

          {/* Reconnect mode vs normal onboarding */}
          {autoMode === 'login' ? (
            <div className="space-y-3">
              <button
                type="button"
                disabled={busy !== null || !isCircleModularWalletConfigured || isInsecureOrigin}
                onClick={() => void continueWithPasskey('login')}
                className="button-primary w-full disabled:opacity-50"
              >
                <Fingerprint size={18} />
                {busy === 'login' ? 'Unlocking wallet...' : 'Tap to reconnect with passkey'}
              </button>
              <p className="text-center text-xs text-slate-500">or</p>
              <button
                type="button"
                disabled={busy !== null || !isCircleModularWalletConfigured || isInsecureOrigin}
                onClick={() => void continueWithPasskey('register')}
                className="button-secondary w-full disabled:opacity-50"
              >
                Create a new passkey wallet instead
              </button>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-zinc-100">Default network fee</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => setFeeMode('sponsored')} className={`rounded-xl border p-4 text-left transition ${feeMode === 'sponsored' ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100 dark:bg-indigo-950/30 dark:ring-indigo-900' : 'border-slate-200 dark:border-zinc-700'}`}>
                    <span className="flex items-center gap-2 font-bold"><Zap size={17} className="text-indigo-600" />Sponsored</span>
                    <span className="mt-1 block text-xs text-slate-500">Recommended · You pay $0</span>
                  </button>
                  <button type="button" onClick={() => setFeeMode('self-paid')} className={`rounded-xl border p-4 text-left transition ${feeMode === 'self-paid' ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100 dark:bg-indigo-950/30 dark:ring-indigo-900' : 'border-slate-200 dark:border-zinc-700'}`}>
                    <span className="flex items-center gap-2 font-bold"><WalletCards size={17} className="text-indigo-600" />Pay myself</span>
                    <span className="mt-1 block text-xs text-slate-500">Network fee paid in USDC</span>
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">You can change this before every transaction.</p>
              </div>

              <button type="button" disabled={busy !== null || !isCircleModularWalletConfigured || isInsecureOrigin} onClick={() => void continueWithPasskey('register')} className="button-primary w-full disabled:opacity-50">
                <Fingerprint size={18} />{busy === 'register' ? 'Creating secure wallet...' : 'Create wallet with passkey'}
              </button>
              <button type="button" disabled={busy !== null || !isCircleModularWalletConfigured || isInsecureOrigin} onClick={() => void continueWithPasskey('login')} className="button-secondary w-full disabled:opacity-50">Use my existing passkey</button>
              <button type="button" disabled={busy !== null || !isCircleModularWalletConfigured} onClick={() => setShowRecovery((open) => !open)} className="flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-indigo-700 dark:text-indigo-400"><KeyRound size={16} />Recover a wallet</button>
            </>
          )}

          {showRecovery && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
              <label className="field-label">Recovery phrase
                <textarea value={recoveryPhrase} onChange={(event) => setRecoveryPhrase(event.target.value)} rows={3} autoComplete="off" spellCheck={false} placeholder="Enter the words in the correct order" className="field-input resize-none font-mono text-xs" />
              </label>
              <p className="text-xs leading-5 text-slate-500">AccordPay uses this only on your device to authorize a new passkey. It is never stored.</p>
              <button type="button" disabled={busy !== null} onClick={() => void recoverWallet()} className="button-primary w-full disabled:opacity-50">{busy === 'recover' ? 'Recovering wallet...' : 'Create new passkey and recover'}</button>
            </div>
          )}

          {!isCircleModularWalletConfigured && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Passkeys activate after the Circle Client Key and deployed domain are configured.</p>}
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>}

          <div className="flex items-center gap-3"><span className="h-px flex-1 bg-slate-200" /><span className="text-xs uppercase text-slate-400">or</span><span className="h-px flex-1 bg-slate-200" /></div>
          <Link href="/dashboard" className="button-secondary w-full">Connect an existing wallet</Link>
          <p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />The passkey remains under your control. AccordPay and Circle cannot approve transactions without you.</p>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="page-shell max-w-xl py-8 sm:py-14"><div className="card h-96 animate-pulse" /></div>}>
      <OnboardingContent />
    </Suspense>
  );
}
