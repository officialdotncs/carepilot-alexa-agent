import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  raised = false,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  raised?: boolean;
  as?: 'div' | 'section' | 'article';
}) {
  return (
    <Tag
      className={`${raised ? 'cp-surface-raised' : 'cp-surface'} ${className}`}
    >
      {children}
    </Tag>
  );
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-300 ring-1 ring-teal-400/20">
            {icon}
          </div>
        ) : null}
        <div>
          <h2 className="font-display text-xl font-semibold text-white">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function DemoBanner() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-teal-400/15 bg-teal-500/5 px-3 py-1.5 text-xs text-teal-200/90">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-300 animate-pulse-soft" />
      Demo data — simulated experience. AI summaries via Amazon Bedrock.
    </div>
  );
}
