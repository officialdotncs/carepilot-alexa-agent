import { useMemo, useState } from 'react';
import { Card, SectionHeader, DemoBanner } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { StatusPill, CategoryBadge, ApprovalPill } from '@/components/Badges';
import { EmptyState } from '@/components/States';
import { SourceBadge } from '@/components/SourceBadge';
import { useStore } from '@/App';
import { useAgentState } from '@/agent/useAgentState';
import type { ExecutionRecord, TaskStatus } from '@/types';
import { formatDateTime, relativeFromNow } from '@/lib/format';

type Filter = 'all' | 'completed' | 'failed' | 'in_progress' | 'blocked';

const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'in_progress', label: 'Running' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'failed', label: 'Failed' },
];

export function HistoryView() {
  const store = useStore();
  const state = useAgentState(store);
  const { history } = state;
  const [filter, setFilter] = useState<Filter>('all');

  const records = useMemo(() => {
    let list = [...history];
    if (filter !== 'all') list = list.filter((r) => r.status === filter);
    return list.sort(
      (a, b) => new Date(b.startedIso).getTime() - new Date(a.startedIso).getTime()
    );
  }, [history, filter]);

  const summary = useMemo(() => {
    const completed = history.filter((r) => r.status === 'completed').length;
    const failed = history.filter((r) => r.status === 'failed').length;
    const running = history.filter((r) => r.status === 'in_progress').length;
    const blocked = history.filter((r) => r.status === 'blocked').length;
    return { completed, failed, running, blocked };
  }, [history]);

  return (
    <div className="space-y-6 animate-fade-in">
      <DemoBanner />

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryChip
          icon="checkCircle"
          label="Completed"
          value={summary.completed}
          tone="success"
        />
        <SummaryChip
          icon="loader"
          label="Running"
          value={summary.running}
          tone="teal"
        />
        <SummaryChip
          icon="pause"
          label="Blocked"
          value={summary.blocked}
          tone="warning"
        />
        <SummaryChip
          icon="xCircle"
          label="Failed"
          value={summary.failed}
          tone="danger"
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-teal-500/15 text-teal-200 ring-1 ring-teal-400/30'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      {records.length === 0 ? (
        <EmptyState
          icon="activity"
          title="No records"
          description="No execution records match this filter."
        />
      ) : (
        <Card className="p-6">
          <SectionHeader
            title="Execution log"
            subtitle="Chronological record of agent actions"
            icon={<Icon name="activity" size={18} />}
          />
          <ol className="mt-6 space-y-4">
            {records.map((r, i) => (
              <HistoryRow key={r.id} record={r} last={i === records.length - 1} />
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}

function SummaryChip({
  icon,
  label,
  value,
  tone,
}: {
  icon: 'checkCircle' | 'loader' | 'pause' | 'xCircle';
  label: string;
  value: number;
  tone: 'success' | 'teal' | 'warning' | 'danger';
}) {
  const tones: Record<string, string> = {
    success: 'text-success-400 bg-success-500/10 ring-success-500/20',
    teal: 'text-teal-300 bg-teal-500/10 ring-teal-400/20',
    warning: 'text-amber-300 bg-amber-500/10 ring-amber-400/20',
    danger: 'text-rose-300 bg-rose-500/10 ring-rose-400/20',
  };
  return (
    <Card className="flex items-center gap-3 p-4">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-lg ring-1 ${tones[tone]}`}
      >
        <Icon
          name={icon}
          size={16}
          className={icon === 'loader' ? 'animate-spin' : ''}
        />
      </span>
      <div>
        <p className="font-display text-xl font-semibold text-white">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </Card>
  );
}

function HistoryRow({ record, last }: { record: ExecutionRecord; last: boolean }) {
  const tone: Record<TaskStatus, string> = {
    completed: 'bg-success-400',
    in_progress: 'bg-teal-400',
    blocked: 'bg-amber-400',
    failed: 'bg-rose-400',
    pending: 'bg-slate-500',
  };
  return (
    <li className="relative flex gap-4 pl-1">
      {/* timeline rail */}
      <div className="flex flex-col items-center">
        <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${tone[record.status]}`} />
        {!last ? <span className="mt-1 w-px flex-1 bg-white/5" /> : null}
      </div>

      <div className="min-w-0 flex-1 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={record.category} />
          <StatusPill status={record.status} />
          <span className="ml-auto text-xs text-slate-500">
            {relativeFromNow(record.startedIso)}
          </span>
        </div>
        <p className="mt-2 font-medium text-white">{record.taskTitle}</p>
        <p className="mt-1 text-sm text-slate-400">{record.summary}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Icon name="clock" size={12} />
            Started {formatDateTime(record.startedIso)}
          </span>
          {record.completedIso ? (
            <span className="flex items-center gap-1">
              <Icon name="checkCircle" size={12} />
              Ended {formatDateTime(record.completedIso)}
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <Icon name="activity" size={12} />
            Duration: {record.durationLabel}
          </span>
          <ApprovalPill approval={record.approval} />
          <SourceBadge source={record.source} />
        </div>
      </div>
    </li>
  );
}
