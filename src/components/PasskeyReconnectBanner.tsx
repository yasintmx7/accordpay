'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint, X } from 'lucide-react';
import { useWallet } from '@/lib/wallet';

/**
 * Shows a sticky banner when the user previously connected a passkey wallet
 * but the page was refreshed (the in-memory runtime is lost on reload).
 * Tapping the banner navigates to the onboarding page in "auto login" mode.
 */
export default function PasskeyReconnectBanner() {
  const { status, isPasskeySession } = useWallet();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show when we know a passkey session existed but the wallet is not connected.
    if (
      !dismissed &&
      isPasskeySession &&
      (status === 'disconnected' || status === 'no_wallet')
    ) {
      // Small delay so it does not flash briefly during initial hydration.
      const t = window.setTimeout(() => setVisible(true), 600);
      return () => window.clearTimeout(t);
    }
    setVisible(false);
  }, [status, isPasskeySession, dismissed]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes passkey-slide-up {
          from { opacity: 0; transform: translateY(1rem); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .passkey-banner-animate {
          animation: passkey-slide-up 0.3s ease-out both;
        }
      `}</style>
      <div
        role="alert"
        aria-live="polite"
        className="passkey-banner-animate fixed bottom-[5.5rem] left-4 right-4 z-50 lg:bottom-4 lg:left-auto lg:right-4 lg:w-[22rem]"
      >
        <div className="flex items-start gap-3 rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xl dark:border-indigo-800/60 dark:bg-zinc-900">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Fingerprint size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
              Reconnect passkey wallet
            </p>
            <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-zinc-400">
              Your session ended after refresh. Tap to unlock with your passkey.
            </p>
            <button
              type="button"
              onClick={() => router.push('/onboarding?auto=login')}
              className="mt-2.5 inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 active:scale-95"
            >
              <Fingerprint size={13} />
              Tap to reconnect
            </button>
          </div>
          <button
            type="button"
            aria-label="Dismiss reconnect banner"
            onClick={() => setDismissed(true)}
            className="mt-0.5 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </>
  );
}
