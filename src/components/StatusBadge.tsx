type BadgeVariant = 'pending' | 'funded' | 'settled' | 'cancelled' | 'overdue' | 'neutral';

interface StatusBadgeProps {
  variant: BadgeVariant;
  label: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  pending:   'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400',
  funded:    'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400',
  settled:   'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  overdue:   'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400',
  neutral:   'bg-slate-100 text-slate-700 dark:bg-zinc-700 dark:text-zinc-300',
};

/**
 * Pill badge for invoice and transaction statuses.
 * Use consistent variants across all list views.
 */
export default function StatusBadge({ variant, label }: StatusBadgeProps) {
  return (
    <span className={inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold }>
      {label}
    </span>
  );
}
