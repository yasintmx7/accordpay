'use client';
import { Check, Copy } from 'lucide-react';
import { useClipboard } from '@/lib/useClipboard';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

/**
 * A small icon button that copies 	ext to the clipboard.
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
      className={inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition
         }
    >
      {copied
        ? <><Check size={13} />Copied</>
        : <><Copy size={13} />{label ?? 'Copy'}</>
      }
    </button>
  );
}
