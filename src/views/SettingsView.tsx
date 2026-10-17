import { useState } from 'react';
import { Card, SectionHeader, DemoBanner } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { useStore } from '@/App';
import { useAgentState } from '@/agent/useAgentState';
import { storageAvailable } from '@/agent/storage';

export function SettingsView() {
  const store = useStore();
  const state = useAgentState(store);
  const { tasks, history, recipient } = state;
  const [autoApproveLow, setAutoApproveLow] = useState(false);
  const [notifyApprovals, setNotifyApprovals] = useState(true);
  const [notifyCompletions, setNotifyCompletions] = useState(true);
  const [quietHours, setQuietHours] = useState(true);
  const [reminderLead, setReminderLead] = useState('18h');
  const [confirmReset, setConfirmReset] = useState(false);

  const sampleTasks = tasks.filter((t) => t.source === 'sample').length;
  const userTasks = tasks.filter((t) => t.source === 'user').length;

  const handleReset = () => {
    store.resetDemo();
    setConfirmReset(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <DemoBanner />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Approval policy */}
        <Card className="p-6 lg:col-span-2">
          <SectionHeader
            title="Approval policy"
            subtitle="Control when CarePilot acts on its own vs. asks first"
            icon={<Icon name="shield" size={18} />}
          />

          <div className="mt-5 space-y-4">
            <ToggleRow
              title="Auto-handle low-risk tasks"
              description="Let CarePilot complete clearly safe actions (reminders, log lookups) without asking."
              checked={autoApproveLow}
              onChange={setAutoApproveLow}
            />
            <Divider />
            <ToggleRow
              title="Always approve medications & insurance"
              description="Medication refills and insurance actions always require your sign-off, regardless of the setting above."
              checked
              onChange={() => undefined}
              locked
            />
            <Divider />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-white">Reminder lead time</p>
                <p className="text-xs text-slate-400">
                  How far in advance CarePilot sends appointment reminders.
                </p>
              </div>
              <select
                value={reminderLead}
                onChange={(e) => setReminderLead(e.target.value)}
                className="rounded-xl border border-white/10 bg-ink-900/60 px-3 py-2 text-sm text-slate-200 focus:border-teal-400/40"
              >
                <option value="6h">6 hours before</option>
                <option value="12h">12 hours before</option>
                <option value="18h">18 hours before</option>
                <option value="24h">1 day before</option>
                <option value="48h">2 days before</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6">
          <SectionHeader
            title="Notifications"
            icon={<Icon name="bell" size={18} />}
          />
          <div className="mt-5 space-y-4">
            <ToggleRow
              title="Approval requests"
              description="Ping me when something needs my sign-off."
              checked={notifyApprovals}
              onChange={setNotifyApprovals}
            />
            <Divider />
            <ToggleRow
              title="Task completions"
              description="Let me know when a task finishes."
              checked={notifyCompletions}
              onChange={setNotifyCompletions}
            />
            <Divider />
            <ToggleRow
              title="Quiet hours"
              description="Suppress non-urgent notices 9 PM – 7 AM."
              checked={quietHours}
              onChange={setQuietHours}
            />
          </div>
        </Card>

        {/* Profile / care recipient */}
        <Card className="p-6 lg:col-span-2">
          <SectionHeader
            title="Care recipient"
            subtitle="Who CarePilot is coordinating for"
            icon={<Icon name="user" size={18} />}
          />
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" value={recipient.name} />
            <Field label="Relationship" value={recipient.relationship} />
            <Field label="Age" value={String(recipient.age)} />
            <Field label="Primary provider" value={recipient.provider} />
            <Field
              label="Next appointment"
              value={recipient.nextAppointmentLabel}
            />
            <Field label="Care focus" value={recipient.conditionLabel} />
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Editing recipient details is part of a later phase.
          </p>
        </Card>

        {/* Data management */}
        <Card className="p-6 lg:col-span-2">
          <SectionHeader
            title="Data management"
            subtitle="Reset demo data or inspect what's persisted"
            icon={<Icon name="settings" size={18} />}
          />
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Sample tasks" value={String(sampleTasks)} />
            <Field label="You-created tasks" value={String(userTasks)} />
            <Field label="History records" value={String(history.length)} />
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/5 bg-ink-900/40 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">Reset to demo data</p>
              <p className="text-xs text-slate-400">
                Clears all persisted state and restores the original seeded sample data. This removes any tasks or history you created.
              </p>
            </div>
            {confirmReset ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmReset(false)}
                  className="cp-btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  className="rounded-xl bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/30"
                >
                  <Icon name="xCircle" size={14} />
                  Confirm reset
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="cp-btn-outline"
              >
                <Icon name="x" size={14} />
                Reset
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            No secrets are stored in browser storage — only tasks, plans, history, and approval states.
          </p>
        </Card>

        {/* About */}
        <Card className="p-6">
          <SectionHeader
            title="About CarePilot"
            icon={<Icon name="sparkles" size={18} />}
          />
          <p className="mt-4 text-sm text-slate-400">
            CarePilot is a care-coordination agent built for the AWS Builder
            mini-challenge. It is a simulated web experience, not a real
            Alexa+ integration. It uses Amazon Bedrock (Amazon Nova Lite) for
            natural-language summaries via a Supabase Edge Function, with a
            deterministic local fallback when Bedrock is unavailable.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Phase" value="6 — Final release" />
            <Row label="Build" value="1.0.0" />
            <Row label="Mode" value="Bedrock summary + local tools" />
            <Row label="Persistence" value={storageAvailable ? 'Browser storage (active)' : 'Unavailable'} />
            <Row label="AI summary" value="Amazon Bedrock (Nova Lite)" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  locked,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  locked?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium text-white">
          {title}
          {locked ? (
            <span className="cp-chip bg-white/5 text-slate-400">
              <Icon name="lock" size={11} /> Locked on
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={locked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-teal-500' : 'bg-ink-600'
        } ${locked ? 'opacity-60' : ''}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-white/5" />;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-ink-900/40 p-3">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  );
}
