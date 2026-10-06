'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useWallet } from '@/lib/wallet';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from '@/lib/store';

function timeAgo(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function typeIcon(type: string): string {
  switch (type) {
    case 'invoice_sent': return '📤';
    case 'invoice_received': return '📥';
    case 'invoice_accepted': return '✅';
    case 'invoice_rejected': return '❌';
    case 'invoice_funded': return '💰';
    case 'invoice_settled': return '✓';
    case 'early_settlement': return '⚡';
    case 'invoice_matured': return '📅';
    case 'document_verified': return '📄';
    case 'invoice_updated': return '🔄';
    case 'invoice_cancelled': return '🚫';
    default: return '🔔';
  }
}

export default function NotificationCenter() {
  const { address } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // Refresh notifications periodically
  useEffect(() => {
    if (!address) return;
    const refresh = () => {
      setNotifications(getNotifications(address));
      setUnreadCount(getUnreadCount(address));
    };
    refresh();
    const timer = setInterval(refresh, 3_000);
    return () => clearInterval(timer);
  }, [address]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [isOpen]);

  function handleMarkRead(id: string) {
    markNotificationRead(id);
    if (address) {
      setNotifications(getNotifications(address));
      setUnreadCount(getUnreadCount(address));
    }
  }

  function handleMarkAllRead() {
    if (!address) return;
    markAllNotificationsRead(address);
    setNotifications(getNotifications(address));
    setUnreadCount(0);
  }

  if (!address) return null;

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-96 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-zinc-700">
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-400 dark:text-zinc-500">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-zinc-700/50">
                {notifications.slice(0, 20).map(n => (
                  <Link
                    key={n.id}
                    href={`/invoices/${n.invoiceId}`}
                    onClick={() => { handleMarkRead(n.id); setIsOpen(false); }}
                    className={`flex gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-zinc-700/50 ${!n.read ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}
                  >
                    <span className="mt-0.5 text-base">{typeIcon(n.type)}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${n.read ? 'text-slate-600 dark:text-zinc-400' : 'font-semibold text-slate-900 dark:text-zinc-100'}`}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 truncate dark:text-zinc-500">{n.message}</p>
                      <p className="mt-1 text-[11px] text-slate-400 dark:text-zinc-600">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
