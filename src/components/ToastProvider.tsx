'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X, AlertTriangle } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

export type ToastType = 'success' | 'error' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

const listeners: Array<(toast: ToastMessage) => void> = [];

export function toast(message: string, type: ToastType = 'success') {
  const id = crypto.randomUUID();
  triggerHaptic(type === 'success' ? 'success' : type === 'error' ? 'error' : 'warning');
  listeners.forEach((fn) => fn({ id, type, message }));
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (t: ToastMessage) => {
      setToasts((prev) => [...prev, t]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 4000);
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  if (toasts.length === 0) return null;

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={18} className="text-emerald-500 shrink-0" />,
    error: <XCircle size={18} className="text-red-500 shrink-0" />,
    warning: <AlertTriangle size={18} className="text-amber-500 shrink-0" />,
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[60] flex flex-col gap-2 lg:bottom-6 lg:left-auto lg:right-6 lg:w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          aria-live="polite"
          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          style={{ animation: 'passkey-slide-up 0.25s ease-out both' }}
        >
          {icons[t.type]}
          <p className="flex-1 text-sm text-slate-800 dark:text-zinc-200">{t.message}</p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
