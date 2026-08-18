'use client';
import { useEffect, useState } from 'react';

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  label: string;
}

/**
 * Counts down to a Unix timestamp (seconds).
 * Updates every second. Returns isExpired=true once past due.
 */
export function useCountdown(unixSeconds: number): Countdown {
  const calc = (): Countdown => {
    const diff = unixSeconds - Math.floor(Date.now() / 1000);
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, label: 'Matured' };
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    const label = days > 0
      ? ${days}d h remaining
      : hours > 0
      ? ${hours}h m remaining
      : ${minutes}m s remaining;
    return { days, hours, minutes, seconds, isExpired: false, label };
  };

  const [state, setState] = useState<Countdown>(calc);

  useEffect(() => {
    const id = window.setInterval(() => setState(calc()), 1000);
    return () => window.clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unixSeconds]);

  return state;
}
