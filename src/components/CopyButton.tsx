'use client';
import { Check, Copy } from 'lucide-react';
import { useClipboard } from '@/lib/useClipboard';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

/**
 * A small icon button that copies `text` to the clipboard.
 * Shows a checkmark for 2 s after copying.
 */
export default function CopyButton({ text, label, className = '' }: CopyButtonProps) {
  const { copied, copy } = useClipboard();

  return (
    <button
      type="button"
      onClick={() => void copy(text)}
      aria-label={copied ? 'Copied!' : (label ?? 'Copy to clipboard')}
      title={copied ? 'Copied!' : (label ?? 'Copy to clipboard')}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition ${
        copied
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300'
      } ${className}`}
    >
      {copied ? (
        <>
          <Check size={13} />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy size={13} />
          <span>{label ?? 'Copy'}</span>
        </>
      )}
    </button>
  );
}
