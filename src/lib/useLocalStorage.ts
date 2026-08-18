'use client';
import { useState, useCallback } from 'react';

/**
 * useState but persisted to localStorage.
 * Safe for SSR — returns initialValue on the server.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch { /* quota exceeded or private mode */ }
      return next;
    });
  }, [key]);

  const removeValue = useCallback(() => {
    setStoredValue(initialValue);
    try { window.localStorage.removeItem(key); } catch { /* ignore */ }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}
