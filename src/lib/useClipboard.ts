'use client';
import { useState, useCallback } from 'react';

/**
 * Hook that copies text to clipboard and exposes a transient copied state
 * that resets after the given duration (default 2 s).
 */
export function useClipboard(resetAfterMs = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), resetAfterMs);
    } catch {
      // Clipboard API not available (e.g. HTTP or permissions denied)
      setCopied(false);
    }
  }, [resetAfterMs]);

  return { copied, copy };
}
