'use client';

import { useEffect } from 'react';

export default function ReminderWatcher() {
  useEffect(() => {
    const check = () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const now = Math.floor(Date.now() / 1_000);
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (!key.startsWith('accordpay-reminder-') || key.endsWith('-notified')) continue;
        const due = Number(localStorage.getItem(key));
        if (!Number.isFinite(due) || due > now) continue;
        const invoiceId = key.replace('accordpay-reminder-', '');
        new Notification(`AccordPay invoice #${invoiceId} is due`, {
          body: 'Open AccordPay to review the invoice settlement status.',
        });
        localStorage.setItem(`${key}-notified`, 'true');
      }
    };
    check();
    const timer = window.setInterval(check, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return null;
}
