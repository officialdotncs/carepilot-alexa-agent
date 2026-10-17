import { useMemo, useState } from 'react';
import { Card, SectionHeader, DemoBanner } from '@/components/Card';
import { Icon, type IconName } from '@/components/Icon';
import {
  StatusPill,
  CategoryBadge,
  ApprovalPill,
  PriorityPill,
} from '@/components/Badges';
import { TracePanel, ActionResultBadge } from '@/components/TracePanel';
import { EmptyState } from '@/components/States';
import { useStore } from '@/App';
import { useAgentState } from '@/agent/useAgentState';
import { runAgent, AGENT_MODE, approveTask, rejectTask, retryAction } from '@/agent/orchestrator';
import type { AgentActivity, ConversationMessage, ViewId } from '@/types';
import { formatDateTime, relativeFromNow } from '@/lib/format';

const kindIcon: Record<AgentActivity['kind'], IconName> = {
  thought: 'sparkles',
  action: 'dot',
  approval: 'shield',
  system: 'settings',
  success: 'checkCircle',
  warn: 'alert',
};

const kindTone: Record<AgentActivity['kind'], string> = {
  thought: 'bg-slate-500/20 text-slate-300 ring-slate-400/20',
  action: 'bg-teal-500/15 text-teal-300 ring-teal-400/20',
  approval: 'bg-amber-500/15 text-amber-300 ring-amber-400/20',
  system: 'bg-ink-600/60 text-slate-400 ring-white/5',
  success: 'bg-success-500/15 text-success-400 ring-success-500/20',
  warn: 'bg-rose-500/15 text-rose-300 ring-rose-400/20',
};

const SUGGESTIONS = [
  'Prepare for the appointment',
  'Generate a checklist',
  'What tasks are outstanding?',
  'Create a task to refill Lisinopril',
  'Summarize the current status',
];

export function WorkspaceView({
  onNavigate,
}: {
  onNavigate: (v: ViewId) => void;
}) {
  const store = useStore();
  const state = useAgentState(store);
  const { tasks, activity, recipient, runs, conversation } = state;
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const activeTask = useMemo(
    () => tasks.find((t) => t.status === 'in_progress') ?? tasks[0],
    [tasks]
  );
  const approvals = useMemo(
    () => tasks.filter((t) => t.approval === 'required' && t.status !== 'completed'),
    [tasks]
  );
  const latestRun = runs[0];

  const submit = async (text: string) => {
    const request = text.trim();
    if (!request || busy) return;
    setBusy(true);
    setInput('');
    try {
      await runAgent(store, request);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <DemoBanner />

      {/* Agent mode banner */}
      <div className="flex items-center gap-2 rounded-xl border border-teal-400/15 bg-teal-500/5 px-4 py-2.5 text-xs text-teal-200/90">
        <Icon name="wand" size={14} />
        <span className="font-medium">{AGENT_MODE}</span>
        <span className="text-teal-200/60">— summaries use Amazon Bedrock (Nova Lite).</span>
      </div>

      {/* Conversation */}
      <Card className="p-6">
        <SectionHeader
          title="Ask CarePilot"
          subtitle="Describe what you need — the agent will plan and act"
          icon={<Icon name="sparkles" size={18} />}
          action={
            latestRun ? (
              <span className="flex items-center gap-2 text-xs text-teal-200">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-teal-400/60 animate-ripple" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-400" />
                </span>
                Active
              </span>
            ) : null
          }
        />

        {/* Messages */}
        <div className="mt-5 max-h-80 space-y-3 overflow-y-auto rounded-xl border border-white/5 bg-ink-900/40 p-4">
          {conversation.length === 0 ? (
            <EmptyState
              icon="sparkles"
              title="Start the conversation"
              description="Ask CarePilot to prepare for an appointment, create a task, or summarize status. Try a suggestion below."
            />
          ) : (
            conversation.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
          )}
          {busy ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Icon name="loader" size={14} className="animate-spin text-teal-300" />
              Planning and executing…
            </div>
          ) : null}
        </div>

        {/* Suggestions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => submit(s)}
              disabled={busy}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition-all hover:border-teal-400/30 hover:bg-teal-500/5 hover:text-teal-200 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="mt-3 flex gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask CarePilot to do something…"
              disabled={busy}
              className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 pr-12 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400/40 disabled:opacity-50"
            />
            <Icon
              name="sparkles"
              size={16}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="cp-btn-primary"
          >
            <Icon name="send" size={16} />
            Send
          </button>
        </form>
      </Card>

      {/* Plan + Trace from latest run */}
      {latestRun ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="p-6">
            <SectionHeader
              title="Planned actions"
              subtitle={`Intent: ${latestRun.plan.intent.replace('_', ' ')}`}
              icon={<Icon name="tasks" size={18} />}
            />
            {latestRun.plan.actions.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">{latestRun.plan.note}</p>
            ) : (
              <ul className="mt-5 space-y-2.5">
                {latestRun.plan.actions.map((action) => (
                  <li
                    key={action.id}
                    className="rounded-xl border border-white/5 bg-ink-900/40 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">
                          {action.description}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Tool: <code className="text-teal-300/80">{action.toolName}</code>
                          {action.dependsOn.length > 0
                            ? ` · depends on ${action.dependsOn.length} prior action${action.dependsOn.length > 1 ? 's' : ''}`
                            : ''}
                        </p>
                        {action.error ? (
                          <p className="mt-1 text-xs text-rose-300/80">{action.error}</p>
                        ) : null}
                        {action.result?.message ? (
                          <p className="mt-1 text-xs text-slate-400">
                            {action.result.message}
                          </p>
                        ) : null}
                      </div>
                      {action.resultKind ? (
                        <ActionResultBadge kind={action.resultKind} />
                      ) : (
                        <ActionResultBadge kind="planned" />
                      )}
                    </div>
                    {action.resultKind === 'failed' ? (
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => retryAction(store, latestRun.id, action.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-white/5"
                        >
                          <Icon name="loader" size={12} />
                          Retry
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <TracePanel trace={latestRun.trace} />
        </div>
      ) : null}

      {/* Active task + right rail */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Active task card */}
        <Card className="p-6 xl:col-span-2">
          <SectionHeader
            title="Current focus"
            subtitle="What the agent is working on now"
            icon={<Icon name="activity" size={18} />}
          />
          {activeTask ? (
            <div className="mt-5 rounded-xl border border-teal-400/15 bg-teal-500/5 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={activeTask.category} />
                <StatusPill status={activeTask.status} />
                <PriorityPill priority={activeTask.priority} />
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold text-white">
                {activeTask.title}
              </h3>
              <p className="mt-1 text-sm text-slate-300">{activeTask.description}</p>

              {/* Steps timeline */}
              <div className="mt-4 space-y-3">
                {activeTask.steps.map((step) => (
                  <div key={step.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                          step.status === 'completed'
                            ? 'bg-success-500/20 text-success-400 ring-1 ring-success-500/30'
                            : step.status === 'in_progress'
                            ? 'bg-teal-500/20 text-teal-300 ring-1 ring-teal-400/30'
                            : step.status === 'blocked'
                            ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30'
                            : 'bg-ink-600/60 text-slate-400 ring-1 ring-white/5'
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
                          size={12}
                          className={step.status === 'in_progress' ? 'animate-spin' : ''}
                        />
                      </span>
                      <span className="mt-1 w-px flex-1 bg-white/5" />
                    </div>
                    <div className="min-w-0 pb-2">
                      <p
                        className={`text-sm font-medium ${
                          step.status === 'completed'
                            ? 'text-slate-400 line-through'
                            : 'text-white'
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs text-slate-500">{step.detail}</p>
                      {step.timestamp ? (
                        <p className="mt-0.5 text-[11px] text-slate-600">
                          {formatDateTime(step.timestamp)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              icon="sparkles"
              title="No active task"
              description="Ask the agent to create or start a task."
            />
          )}

          {/* Activity feed */}
          <div className="mt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Activity feed
            </p>
            <ul className="space-y-2.5">
              {activity.slice(0, 8).map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.02] animate-slide-in"
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${kindTone[a.kind]}`}
                  >
                    <Icon name={kindIcon[a.kind]} size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-200">{a.label}</p>
                    <p className="text-[11px] text-slate-600">
                      {relativeFromNow(a.tsIso)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Right rail: approvals + context */}
        <div className="space-y-6">
          <Card className="p-6">
            <SectionHeader
              title="Approvals queue"
              subtitle="Actions needing your decision"
              icon={<Icon name="shield" size={18} />}
              action={
                <button
                  onClick={() => onNavigate('tasks')}
                  className="cp-btn-ghost"
                >
                  Open
                  <Icon name="chevronRight" size={15} />
                </button>
              }
            />
            {approvals.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">No approvals pending.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {approvals.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-xl border border-amber-400/15 bg-amber-500/5 p-3"
                  >
                    <p className="text-sm font-medium text-white">{t.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{t.dueLabel}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <ApprovalPill approval="required" />
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={() => rejectTask(store, t.id)}
                          className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-white/5"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => approveTask(store, t.id)}
                          className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-500/30"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <SectionHeader
              title="Care context"
              icon={<Icon name="heart" size={18} />}
            />
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Recipient</dt>
                <dd className="font-medium text-white">{recipient.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Relationship</dt>
                <dd className="text-slate-200">{recipient.relationship}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Provider</dt>
                <dd className="text-right text-slate-200">{recipient.provider}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Appointment</dt>
                <dd className="text-slate-200">{recipient.nextAppointmentLabel}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ConversationMessage }) {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';
  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? 'bg-teal-500/15 text-teal-50 ring-1 ring-teal-400/20'
            : isSystem
            ? 'bg-rose-500/10 text-rose-100 ring-1 ring-rose-400/15'
            : 'bg-ink-700/60 text-slate-100 ring-1 ring-white/5'
        }`}
      >
        <p className="whitespace-pre-line">{msg.text}</p>
        <p className="mt-1 text-[10px] text-slate-500">
          {relativeFromNow(msg.tsIso)}
          {msg.fallback && !isUser ? ' · local agent' : ''}
        </p>
      </div>
    </div>
  );
}
