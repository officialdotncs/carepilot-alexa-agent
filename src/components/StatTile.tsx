import { Icon, type IconName } from '@/components/Icon';

// A single stat tile used across the overview dashboard.
export function StatTile({
  icon,
  label,
  value,
  hint,
  tone = 'neutral',
  onClick,
}: {
  icon: IconName;
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'neutral' | 'teal' | 'warning' | 'danger' | 'success';
  onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    neutral: 'text-slate-300 bg-white/5 ring-white/5',
    teal: 'text-teal-300 bg-teal-500/10 ring-teal-400/20',
    warning: 'text-amber-300 bg-amber-500/10 ring-amber-400/20',
    danger: 'text-rose-300 bg-rose-500/10 ring-rose-400/20',
    success: 'text-success-400 bg-success-500/10 ring-success-500/20',
  };
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`group cp-surface flex items-center gap-4 p-5 text-left transition-all duration-200 ${
        onClick ? 'hover:border-teal-400/30 hover:bg-ink-700/60 cursor-pointer' : 'cursor-default'
      }`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}
      >
        <Icon name={icon} size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-400">{label}</p>
        <p className="font-display text-2xl font-semibold text-white">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
      </div>
      {onClick ? (
        <Icon
          name="chevronRight"
          size={16}
          className="ml-auto text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-300"
        />
      ) : null}
    </button>
  );
}
