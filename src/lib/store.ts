'use client';

/**
 * Application-level data store backed by localStorage.
 *
 * This keeps the architecture consistent with the existing fully client-side
 * design. Blockchain state is always authoritative for money movement —
 * this layer only manages business workflow metadata.
 */

import type { Address } from 'viem';

// ── Company Profiles ──────────────────────────────────────────────────

export interface CompanyProfile {
  wallet: string;
  name: string;
  logo: string;         // data-URI or empty string
  description: string;
  country: string;
  email: string;
  website: string;
  category: string;
  updatedAt: number;    // ms timestamp
}

const COMPANY_KEY = 'accordpay_companies';

function loadCompanies(): Record<string, CompanyProfile> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(COMPANY_KEY) || '{}');
  } catch { return {}; }
}

function saveCompanies(data: Record<string, CompanyProfile>) {
  try { localStorage.setItem(COMPANY_KEY, JSON.stringify(data)); } catch { /* quota */ }
}

export function getCompanyProfile(wallet: string): CompanyProfile | null {
  const all = loadCompanies();
  return all[wallet.toLowerCase()] ?? null;
}

export function setCompanyProfile(profile: CompanyProfile) {
  const all = loadCompanies();
  all[profile.wallet.toLowerCase()] = { ...profile, updatedAt: Date.now() };
  saveCompanies(all);
}

export function getCompanyName(wallet: string): string {
  const profile = getCompanyProfile(wallet);
  return profile?.name || '';
}

export function getDisplayName(wallet: string): string {
  const name = getCompanyName(wallet);
  if (name) return name;
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

// ── Invoice Business Metadata ─────────────────────────────────────────

export type BusinessStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'cancelled';


export interface InvoiceMeta {
  /** On-chain invoice ID as string */
  invoiceId: string;
  /** Application-level business status */
  businessStatus: BusinessStatus;
  /** Invoice reference/number chosen by buyer */
  invoiceNumber: string;
  /** Description text */
  description: string;
  /** Buyer wallet */
  buyerWallet: string;
  /** Supplier wallet */
  supplierWallet: string;
  /** When the invoice was created in the app (not on-chain) */
  createdAt: number;
  /** When the invoice was "sent" to the supplier */
  sentAt: number | null;
  /** Last update timestamp */
  updatedAt: number;
}

const INVOICES_KEY = 'accordpay_invoice_meta';

function loadInvoiceMetas(): Record<string, InvoiceMeta> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(INVOICES_KEY) || '{}');
  } catch { return {}; }
}

function saveInvoiceMetas(data: Record<string, InvoiceMeta>) {
  try { 
    localStorage.setItem(INVOICES_KEY, JSON.stringify(data)); 
    fetch('/api/meta', { method: 'POST', body: JSON.stringify(data) }).catch(()=>{});
  } catch { /* quota */ }
}

if (typeof window !== 'undefined') {
  setInterval(() => {
    fetch('/api/meta')
      .then(res => res.json())
      .then(data => {
        if (Object.keys(data).length > 0) {
          localStorage.setItem(INVOICES_KEY, JSON.stringify(data));
        }
      })
      .catch(()=>{});
  }, 3000);
}

export function getInvoiceMeta(invoiceId: string): InvoiceMeta | null {
  return loadInvoiceMetas()[invoiceId] ?? null;
}

export function setInvoiceMeta(meta: InvoiceMeta) {
  const all = loadInvoiceMetas();
  all[meta.invoiceId] = { ...meta, updatedAt: Date.now() };
  saveInvoiceMetas(all);
}

export function updateInvoiceMeta(invoiceId: string, partial: Partial<InvoiceMeta>) {
  const all = loadInvoiceMetas();
  let existing = all[invoiceId];
  if (!existing) {
    existing = {
      invoiceId,
      businessStatus: 'sent',
      invoiceNumber: '',
      description: '',
      buyerWallet: '',
      supplierWallet: '',
      createdAt: Date.now(),
      sentAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
  all[invoiceId] = { ...existing, ...partial, updatedAt: Date.now() };
  saveInvoiceMetas(all);
}

export function getAllInvoiceMetas(): Record<string, InvoiceMeta> {
  return loadInvoiceMetas();
}

// ── Notifications ─────────────────────────────────────────────────────

export type NotificationType =
  | 'invoice_sent'
  | 'invoice_received'
  | 'invoice_accepted'
  | 'invoice_rejected'
  | 'invoice_funded'
  | 'invoice_settled'
  | 'early_settlement'
  | 'invoice_matured'
  | 'document_verified'
  | 'invoice_updated'
  | 'invoice_cancelled';

export interface AppNotification {
  id: string;
  wallet: string;        // recipient wallet (lowercase)
  invoiceId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: number;      // ms
}

const NOTIFICATIONS_KEY = 'accordpay_notifications';

function loadNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
  } catch { return []; }
}

function saveNotifications(data: AppNotification[]) {
  try { localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(data)); } catch { /* quota */ }
}

export function getNotifications(wallet: string): AppNotification[] {
  return loadNotifications()
    .filter(n => n.wallet === wallet.toLowerCase())
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getUnreadCount(wallet: string): number {
  return getNotifications(wallet).filter(n => !n.read).length;
}

export function addNotification(notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
  const all = loadNotifications();
  // Avoid duplicate notifications for the same event
  const isDuplicate = all.some(
    n => n.wallet === notification.wallet.toLowerCase()
      && n.invoiceId === notification.invoiceId
      && n.type === notification.type
      && Date.now() - n.createdAt < 5_000
  );
  if (isDuplicate) return;

  all.unshift({
    ...notification,
    wallet: notification.wallet.toLowerCase(),
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    read: false,
    createdAt: Date.now(),
  });
  // Keep max 100 notifications per user
  const forUser = all.filter(n => n.wallet === notification.wallet.toLowerCase());
  if (forUser.length > 100) {
    const toRemove = new Set(forUser.slice(100).map(n => n.id));
    const filtered = all.filter(n => !toRemove.has(n.id));
    saveNotifications(filtered);
  } else {
    saveNotifications(all);
  }
}

export function markNotificationRead(id: string) {
  const all = loadNotifications();
  const found = all.find(n => n.id === id);
  if (found) { found.read = true; saveNotifications(all); }
}

export function markAllNotificationsRead(wallet: string) {
  const all = loadNotifications();
  const w = wallet.toLowerCase();
  let changed = false;
  for (const n of all) {
    if (n.wallet === w && !n.read) { n.read = true; changed = true; }
  }
  if (changed) saveNotifications(all);
}

// ── Helper: Create notification for workflow events ───────────────────

export function notifyInvoiceEvent(
  recipientWallet: string,
  invoiceId: string,
  type: NotificationType,
  title: string,
  message: string,
) {
  addNotification({
    wallet: recipientWallet,
    invoiceId,
    type,
    title,
    message,
  });
}
