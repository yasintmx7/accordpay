import type { ReactNode } from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}

/**
 * Generic empty state card used across invoice lists, dashboard, etc.
 */
export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">{title}</h2>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-zinc-400">
          {description}
        </p>
      )}
      {action && (
        <Link href={action.href} className="button-primary mt-6">
          {action.label}
        </Link>
      )}
    </div>
  );
}
