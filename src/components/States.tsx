import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/Icon';

export function EmptyState({
  icon = 'sparkles',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-ink-800/40 px-6 py-14 text-center animate-fade-in">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-300 ring-1 ring-teal-400/20">
        <Icon name={icon} size={24} />
      </div>
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function LoadingState({
  label = 'Loading…',
  rows = 3,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-3 animate-fade-in" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-slate-400">
        <span className="flex h-5 w-5 items-center justify-center text-teal-300">
          <Icon name="loader" size={16} className="animate-spin" />
        </span>
        {label}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="cp-shimmer h-24 rounded-2xl border border-white/5 bg-ink-800/60"
        />
      ))}
      <span className="sr-only">Loading content, please wait.</span>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We couldn’t load this right now. Please try again.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border border-danger-500/20 bg-danger-500/5 px-6 py-12 text-center animate-fade-in"
      role="alert"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-500/10 text-danger-400 ring-1 ring-danger-500/20">
        <Icon name="alert" size={24} />
      </div>
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-400">{description}</p>
      {onRetry ? (
        <button onClick={onRetry} className="cp-btn-outline mt-5">
          Try again
        </button>
      ) : null}
    </div>
  );
}
