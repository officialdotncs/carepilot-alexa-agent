import type { TaskCategory, TaskStatus, Priority, ApprovalState } from '@/types';
import { Icon, type IconName } from '@/components/Icon';

export function StatusPill({ status }: { status: TaskStatus }) {
  const map: Record<TaskStatus, { label: string; cls: string; icon: IconName }> = {
    pending: {
      label: 'Pending',
      cls: 'bg-ink-600/60 text-slate-300 border border-white/5',
      icon: 'clock',
    },
    in_progress: {
      label: 'In progress',
      cls: 'bg-teal-500/15 text-teal-200 border border-teal-400/20',
      icon: 'loader',
    },
    blocked: {
      label: 'Blocked',
      cls: 'bg-warning-500/15 text-warning-400 border border-warning-500/20',
      icon: 'pause',
    },
    completed: {
      label: 'Completed',
      cls: 'bg-success-500/15 text-success-400 border border-success-500/20',
      icon: 'checkCircle',
    },
    failed: {
      label: 'Failed',
      cls: 'bg-danger-500/15 text-danger-400 border border-danger-500/20',
      icon: 'xCircle',
    },
  };
  const s = map[status];
  return (
    <span className={`cp-chip ${s.cls}`}>
      <Icon name={s.icon} size={13} className={status === 'in_progress' ? 'animate-spin' : ''} />
      {s.label}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: Priority }) {
  const map: Record<Priority, string> = {
    low: 'bg-slate-500/15 text-slate-300 border border-white/5',
    medium: 'bg-sky-500/15 text-sky-300 border border-sky-400/20',
    high: 'bg-amber-500/15 text-amber-300 border border-amber-400/20',
    urgent: 'bg-rose-500/15 text-rose-300 border border-rose-400/25',
  };
  return <span className={`cp-chip ${map[priority]}`}>{priority}</span>;
}

export function ApprovalPill({ approval }: { approval: ApprovalState }) {
  const map: Record<ApprovalState, { label: string; cls: string; icon: IconName }> = {
    required: {
      label: 'Approval needed',
      cls: 'bg-amber-500/15 text-amber-300 border border-amber-400/25',
      icon: 'shield',
    },
    approved: {
      label: 'Approved',
      cls: 'bg-success-500/15 text-success-400 border border-success-500/20',
      icon: 'shieldCheck',
    },
    rejected: {
      label: 'Rejected',
      cls: 'bg-danger-500/15 text-danger-400 border border-danger-500/20',
      icon: 'xCircle',
    },
    auto: {
      label: 'Auto-handled',
      cls: 'bg-ink-600/60 text-slate-300 border border-white/5',
      icon: 'sparkles',
    },
  };
  const a = map[approval];
  return (
    <span className={`cp-chip ${a.cls}`}>
      <Icon name={a.icon} size={13} />
      {a.label}
    </span>
  );
}

export function CategoryBadge({ category }: { category: TaskCategory }) {
  const map: Record<TaskCategory, { label: string; icon: IconName }> = {
    scheduling: { label: 'Scheduling', icon: 'calendarClock' },
    records: { label: 'Records', icon: 'fileText' },
    logistics: { label: 'Logistics', icon: 'mapPin' },
    insurance: { label: 'Insurance', icon: 'creditCard' },
    communication: { label: 'Communication', icon: 'message' },
    medications: { label: 'Medications', icon: 'pill' },
  };
  const c = map[category];
  return (
    <span className="cp-chip bg-white/5 text-slate-300 border border-white/5">
      <Icon name={c.icon} size={13} />
      {c.label}
    </span>
  );
}
