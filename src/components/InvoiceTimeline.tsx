'use client';

import { resolveInvoiceStatus, type UnifiedStatus } from '@/lib/invoice-status';
import type { OnChainInvoice } from '@/lib/accordpay';
import { getInvoiceMeta } from '@/lib/store';
import { Check } from 'lucide-react';

interface Props {
  invoice: OnChainInvoice;
  nowSeconds?: bigint;
}

interface TimelineStep {
  key: string;
  label: string;
  description: string;
  timestamp: number | null;
  completed: boolean;
  active: boolean;
}

/**
 * Visual timeline showing the invoice lifecycle:
 * Draft → Sent → Accepted → Funded → In Progress → Settled
 */
export default function InvoiceTimeline({ invoice, nowSeconds }: Props) {
  const info = resolveInvoiceStatus(invoice, nowSeconds);
  const meta = getInvoiceMeta(invoice.id.toString());

  const statusOrder: UnifiedStatus[] = [
    'sent', 'funded', 'in_progress', 'settled',
  ];
  const currentIndex = statusOrder.indexOf(info.status);
  // For rejected/cancelled/overdue, map to the appropriate position
  const effectiveIndex = info.status === 'rejected' ? 0 : // stops at sent
    info.status === 'cancelled' ? 0 :
    info.status === 'overdue' ? 2 : // past in_progress
    currentIndex;

  const steps: TimelineStep[] = [
    {
      key: 'sent',
      label: info.status === 'rejected' ? 'Rejected' : 'Created & Sent',
      description: info.status === 'rejected' ? 'Supplier rejected' : 'Invoice created and sent',
      timestamp: meta?.createdAt || Number(invoice.createdAt) * 1000,
      completed: effectiveIndex >= 0 || info.status === 'rejected',
      active: info.status === 'sent' || info.status === 'rejected',
    },
    {
      key: 'funded',
      label: 'Funded',
      description: 'Payment secured on-chain',
      timestamp: invoice.fundedAt > 0n ? Number(invoice.fundedAt) * 1000 : null,
      completed: effectiveIndex >= 1,
      active: info.status === 'funded',
    },
    {
      key: 'in_progress',
      label: 'In Progress',
      description: 'Awaiting settlement',
      timestamp: invoice.fundedAt > 0n ? Number(invoice.fundedAt) * 1000 : null,
      completed: effectiveIndex >= 2,
      active: info.status === 'in_progress' || info.status === 'overdue',
    },
    {
      key: 'settled',
      label: 'Settled',
      description: 'Payment completed',
      timestamp: invoice.settledAt > 0n ? Number(invoice.settledAt) * 1000 : null,
      completed: info.status === 'settled',
      active: info.status === 'settled',
    },
  ];

  return (
    <div className="space-y-1">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isRejected = step.key === 'sent' && info.status === 'rejected';

        return (
          <div key={step.key} className="flex gap-3">
            {/* Connector line + circle */}
            <div className="flex flex-col items-center">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                isRejected
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                  : step.completed
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                    : step.active
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400'
                      : 'bg-slate-100 text-slate-400 dark:bg-zinc-700 dark:text-zinc-500'
              }`}>
                {step.completed ? <Check size={14} strokeWidth={3} /> : index + 1}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 min-h-5 ${
                  step.completed ? 'bg-emerald-200 dark:bg-emerald-800' : 'bg-slate-200 dark:bg-zinc-700'
                }`} />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 ${isLast ? 'pb-0' : ''}`}>
              <p className={`text-sm font-semibold ${
                isRejected
                  ? 'text-red-700 dark:text-red-400'
                  : step.completed || step.active
                    ? 'text-slate-900 dark:text-zinc-100'
                    : 'text-slate-400 dark:text-zinc-500'
              }`}>
                {step.label}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {step.description}
                {step.timestamp && (step.completed || step.active) && (
                  <span className="ml-1">· {new Date(step.timestamp).toLocaleDateString()}</span>
                )}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
