import { Card, SectionHeader } from '@/components/Card';
import { Icon, type IconName } from '@/components/Icon';
import type { TraceEntry, ActionResultKind } from '@/types';
import { formatDateTime, relativeFromNow } from '@/lib/format';

const kindMeta: Record<TraceEntry['kind'], { icon: IconName; tone: string; label: string }> = {
  request: { icon: 'message', tone: 'text-sky-300 bg-sky-500/10 ring-sky-400/20', label: 'Request' },
  intent: { icon: 'sparkles', tone: 'text-teal-300 bg-teal-500/10 ring-teal-400/20', label: 'Intent' },
  plan: { icon: 'tasks', tone: 'text-slate-300 bg-white/5 ring-white/10', label: 'Plan' },
  tool_call: { icon: 'terminal', tone: 'text-teal-300 bg-teal-500/10 ring-teal-400/20', label: 'Tool call' },
  tool_result: { icon: 'checkCircle', tone: 'text-success-400 bg-success-500/10 ring-success-500/20', label: 'Tool result' },
  state_change: { icon: 'dot', tone: 'text-slate-300 bg-white/5 ring-white/10', label: 'State change' },
  approval_required: { icon: 'shield', tone: 'text-amber-300 bg-amber-500/10 ring-amber-400/20', label: 'Approval' },
  error: { icon: 'alert', tone: 'text-rose-300 bg-rose-500/10 ring-rose-400/20', label: 'Error' },
  complete: { icon: 'checkCircle', tone: 'text-success-400 bg-success-500/10 ring-success-500/20', label: 'Complete' },
};

export function TracePanel({ trace }: { trace: TraceEntry[] }) {
  return (
    <Card className="p-6">
      <SectionHeader
        title="Execution trace"
        subtitle="Request → plan → tools → state"
        icon={<Icon name="terminal" size={18} />}
      />
      {trace.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No trace entries yet. Send a request to the agent to see the full execution path.
        </p>
      ) : (
        <ol className="mt-5 space-y-1">
          {trace.map((entry, i) => {
            const meta = kindMeta[entry.kind];
            return (
              <li
                key={entry.id}
                className="relative flex gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.02] animate-slide-in"
              >
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${meta.tone}`}
                  >
                    <Icon name={meta.icon} size={13} />
                  </span>
                  {i < trace.length - 1 ? (
                    <span className="mt-1 w-px flex-1 bg-white/5" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {meta.label}
                    </span>
                    <span className="text-[11px] text-slate-600">
                      {relativeFromNow(entry.tsIso)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200">{entry.label}</p>
                  {entry.detail ? (
                    <p className="mt-0.5 whitespace-pre-line text-xs text-slate-500">
                      {entry.detail}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

const resultKindMeta: Record<ActionResultKind, { icon: IconName; tone: string; label: string }> = {
  planned: { icon: 'clock', tone: 'text-slate-300 bg-white/5', label: 'Planned' },
  executed: { icon: 'checkCircle', tone: 'text-success-400 bg-success-500/10', label: 'Executed' },
  failed: { icon: 'xCircle', tone: 'text-rose-300 bg-rose-500/10', label: 'Failed' },
  approval_required: { icon: 'shield', tone: 'text-amber-300 bg-amber-500/10', label: 'Approval required' },
};

export function ActionResultBadge({ kind }: { kind: ActionResultKind }) {
  const m = resultKindMeta[kind];
  return (
    <span className={`cp-chip ${m.tone}`}>
      <Icon name={m.icon} size={12} />
      {m.label}
    </span>
  );
}
