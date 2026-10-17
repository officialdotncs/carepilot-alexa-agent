import { useMemo, useState } from 'react';
import { Card, DemoBanner } from '@/components/Card';
import { Icon } from '@/components/Icon';
import {
  StatusPill,
  PriorityPill,
  ApprovalPill,
  CategoryBadge,
} from '@/components/Badges';
import { EmptyState, LoadingState, ErrorState } from '@/components/States';
import { SourceBadge } from '@/components/SourceBadge';
import { useStore } from '@/App';
import { useAgentState } from '@/agent/useAgentState';
import { approveTask, rejectTask } from '@/agent/orchestrator';
import type { CareTask } from '@/types';
import { formatDateTime } from '@/lib/format';

type Filter = 'all' | 'pending' | 'in_progress' | 'blocked' | 'completed' | 'approvals';

const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'completed', label: 'Completed' },
];

export function TasksView() {
  const store = useStore();
  const state = useAgentState(store);
  const { tasks } = state;
  const [filter, setFilter] = useState<Filter>('all');
  // Simulated async UI states the view supports.
  const [phase] = useState<'ready' | 'loading' | 'error'>('ready');
  const [openId, setOpenId] = useState<string | null>(null);

  const tasksFiltered = useMemo(() => {
    let list = [...tasks];
    if (filter === 'approvals') {
      list = list.filter((t) => t.approval === 'required' && t.status !== 'completed');
    } else if (filter !== 'all') {
      list = list.filter((t) => t.status === filter);
    }
    return list.sort(
      (a, b) => new Date(a.dueIso).getTime() - new Date(b.dueIso).getTime()
    );
  }, [tasks, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      blocked: tasks.filter((t) => t.status === 'blocked').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      approvals: tasks.filter(
        (t) => t.approval === 'required' && t.status !== 'completed'
      ).length,
    };
    return c;
  }, [tasks]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DemoBanner />
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Icon name="calendar" size={14} />
          Coordinating for Margaret Chen — Oct 21 appointment
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = filter === f.id;
          const count = counts[f.id] ?? 0;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-teal-500/15 text-teal-200 ring-1 ring-teal-400/30'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
              }`}
            >
              {f.label}
              <span
                className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                  active ? 'bg-teal-400/20 text-teal-100' : 'bg-white/5 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* State-driven body */}
      {phase === 'loading' ? (
        <LoadingState label="Loading tasks…" rows={4} />
      ) : phase === 'error' ? (
        <ErrorState
          title="Couldn’t load tasks"
          description="There was a problem reading the task list. Please try again."
          onRetry={() => undefined}
        />
      ) : tasksFiltered.length === 0 ? (
        <EmptyState
          icon="checkCircle"
          title="Nothing here"
          description="No tasks match this filter. Try a different category above."
        />
      ) : (
        <div className="space-y-3">
          {tasksFiltered.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              open={openId === task.id}
              onToggle={() =>
                setOpenId((cur) => (cur === task.id ? null : task.id))
              }
              onApprove={() => approveTask(store, task.id)}
              onReject={() => rejectTask(store, task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  open,
  onToggle,
  onApprove,
  onReject,
}: {
  task: CareTask;
  open: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-ink-700/30 sm:p-5"
        aria-expanded={open}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
            task.status === 'blocked'
              ? 'bg-amber-500/10 text-amber-300 ring-amber-400/20'
              : task.status === 'completed'
              ? 'bg-success-500/10 text-success-400 ring-success-500/20'
              : task.status === 'in_progress'
              ? 'bg-teal-500/10 text-teal-300 ring-teal-400/20'
              : 'bg-ink-600/50 text-slate-300 ring-white/5'
          }`}
        >
          <Icon
            name={
              task.status === 'completed'
                ? 'checkCircle'
                : task.status === 'blocked'
                ? 'pause'
                : task.status === 'in_progress'
                ? 'loader'
                : 'clock'
            }
            size={18}
            className={task.status === 'in_progress' ? 'animate-spin' : ''}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-medium text-white">{task.title}</p>
          <p className="mt-0.5 truncate text-xs text-slate-400">{task.dueLabel}</p>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <CategoryBadge category={task.category} />
          <PriorityPill priority={task.priority} />
        </div>

        <div className="flex items-center gap-2">
          <StatusPill status={task.status} />
          <Icon
            name="chevronRight"
            size={16}
            className={`text-slate-500 transition-transform ${open ? 'rotate-90' : ''}`}
          />
        </div>
      </button>

      {open ? (
        <div className="border-t border-white/5 p-4 sm:p-5 animate-slide-in">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={task.category} />
            <PriorityPill priority={task.priority} />
            <ApprovalPill approval={task.approval} />
            <SourceBadge source={task.source} />
            <span className="ml-auto text-xs text-slate-500">
              Created {formatDateTime(task.createdAtIso)}
            </span>
          </div>

          <p className="mt-3 text-sm text-slate-300">{task.description}</p>

          {/* Steps */}
          <div className="mt-4 space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Steps
            </p>
            {task.steps.map((step) => (
              <div
                key={step.id}
                className="flex items-start gap-3 rounded-lg border border-white/5 bg-ink-900/40 p-3"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                    step.status === 'completed'
                      ? 'bg-success-500/20 text-success-400'
                      : step.status === 'in_progress'
                      ? 'bg-teal-500/20 text-teal-300'
                      : step.status === 'blocked'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-ink-600/60 text-slate-400'
                  }`}
                >
                  <Icon
                    name={
                      step.status === 'completed'
                        ? 'check'
                        : step.status === 'in_progress'
                        ? 'loader'
                        : step.status === 'blocked'
                        ? 'pause'
                        : 'dot'
                    }
                    size={11}
                    className={step.status === 'in_progress' ? 'animate-spin' : ''}
                  />
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-sm ${
                      step.status === 'completed'
                        ? 'text-slate-400 line-through'
                        : 'text-slate-100'
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-slate-500">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Approval actions */}
          {task.approval === 'required' && task.status !== 'completed' ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/15 bg-amber-500/5 p-3">
              <Icon name="shield" size={16} className="text-amber-300" />
              <p className="text-sm text-amber-200">
                Your approval is required to proceed.
              </p>
              <div className="ml-auto flex gap-2">
                <button onClick={onReject} className="cp-btn-outline">Decline</button>
                <button onClick={onApprove} className="cp-btn-primary">Approve &amp; run</button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
