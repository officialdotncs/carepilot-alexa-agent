import { useMemo } from 'react';
import { Card, SectionHeader, DemoBanner } from '@/components/Card';
import { StatTile } from '@/components/StatTile';
import { Icon } from '@/components/Icon';
import {
  StatusPill,
  ApprovalPill,
  CategoryBadge,
} from '@/components/Badges';
import { EmptyState } from '@/components/States';
import { useStore } from '@/App';
import { useAgentState } from '@/agent/useAgentState';
import type { ViewId } from '@/types';
import { relativeFromNow, formatDateTime } from '@/lib/format';

export function OverviewView({
  onNavigate,
}: {
  onNavigate: (v: ViewId) => void;
}) {
  const store = useStore();
  const state = useAgentState(store);
  const { tasks, activity, recipient } = state;

  const stats = useMemo(() => {
    const pending = tasks.filter(
      (t) => t.status === 'pending' || t.status === 'in_progress'
    ).length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const approvals = tasks.filter(
      (t) => t.approval === 'required' && t.status !== 'completed'
    ).length;
    const blocked = tasks.filter((t) => t.status === 'blocked').length;
    return { pending, completed, approvals, blocked };
  }, [tasks]);

  const upcoming = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== 'completed' && t.status !== 'failed')
        .sort((a, b) => new Date(a.dueIso).getTime() - new Date(b.dueIso).getTime())
        .slice(0, 4),
    [tasks]
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero / care context */}
      <Card className="overflow-hidden p-0">
        <div className="relative bg-navy-radial p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <div className="mb-3 flex items-center gap-2">
                <DemoBanner />
              </div>
              <p className="text-sm font-medium text-teal-300">
                {recipient.relationship} · {recipient.name}
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-white sm:text-3xl cp-text-balance">
                Preparing for {recipient.nextAppointmentLabel}
              </h2>
              <p className="mt-2 text-sm text-slate-300 sm:text-base">
                {recipient.provider}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {recipient.conditionLabel}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/5 bg-ink-900/60 p-4">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-300 ring-1 ring-teal-400/20">
                <Icon name="stethoscope" size={26} />
                <span className="absolute inset-0 rounded-2xl border border-teal-400/30 animate-ripple" />
              </div>
              <div className="leading-tight">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Next appointment
                </p>
                <p className="font-display text-base font-semibold text-white">
                  {recipient.nextAppointmentLabel}
                </p>
                <p className="text-xs text-slate-400">In 4 days</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon="tasks"
          label="Pending tasks"
          value={stats.pending}
          hint="Awaiting start or in progress"
          tone="teal"
          onClick={() => onNavigate('tasks')}
        />
        <StatTile
          icon="shield"
          label="Approvals needed"
          value={stats.approvals}
          hint="Require your sign-off"
          tone="warning"
          onClick={() => onNavigate('tasks')}
        />
        <StatTile
          icon="checkCircle"
          label="Completed"
          value={stats.completed}
          hint="Finished this week"
          tone="success"
          onClick={() => onNavigate('history')}
        />
        <StatTile
          icon="alert"
          label="Blocked"
          value={stats.blocked}
          hint="Need your input to proceed"
          tone="danger"
          onClick={() => onNavigate('tasks')}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming tasks */}
        <Card className="p-6 lg:col-span-2">
          <SectionHeader
            title="Upcoming tasks"
            subtitle="Ordered by due date"
            icon={<Icon name="calendarClock" size={18} />}
            action={
              <button
                onClick={() => onNavigate('tasks')}
                className="cp-btn-ghost"
              >
                View all
                <Icon name="chevronRight" size={15} />
              </button>
            }
          />
          {upcoming.length === 0 ? (
            <EmptyState
              icon="checkCircle"
              title="All caught up"
              description="There are no pending tasks for this appointment."
            />
          ) : (
            <ul className="mt-5 space-y-3">
              {upcoming.map((t) => (
                <li
                  key={t.id}
                  className="group flex flex-col gap-3 rounded-xl border border-white/5 bg-ink-900/40 p-4 transition-colors hover:border-teal-400/20 hover:bg-ink-700/40 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{t.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{t.dueLabel}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryBadge category={t.category} />
                    <StatusPill status={t.status} />
                    {t.approval === 'required' ? <ApprovalPill approval="required" /> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent activity */}
        <Card className="p-6">
          <SectionHeader
            title="Recent activity"
            subtitle="Latest agent actions"
            icon={<Icon name="activity" size={18} />}
          />
          <ol className="mt-5 space-y-4">
            {activity.slice(0, 6).map((a) => (
              <li key={a.id} className="relative flex gap-3 pl-1">
                <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-teal-400/70 ring-2 ring-teal-400/20" />
                <div className="min-w-0">
                  <p className="text-sm text-slate-200">{a.label}</p>
                  <p className="text-xs text-slate-500">
                    {relativeFromNow(a.tsIso)} · {formatDateTime(a.tsIso)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* Approvals spotlight */}
      {stats.approvals > 0 ? (
        <Card className="border-amber-400/15 bg-amber-500/5 p-6">
          <SectionHeader
            title="Your approvals are needed"
            subtitle={`${stats.approvals} task${stats.approvals > 1 ? 's' : ''} waiting on you`}
            icon={<Icon name="shield" size={18} />}
            action={
              <button
                onClick={() => onNavigate('tasks')}
                className="cp-btn-primary"
              >
                Review approvals
                <Icon name="chevronRight" size={15} />
              </button>
            }
          />
        </Card>
      ) : null}
    </div>
  );
}
