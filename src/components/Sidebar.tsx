import { Icon, type IconName } from '@/components/Icon';
import type { NavItem, ViewId } from '@/types';
import { useStore } from '@/App';
import { useAgentState } from '@/agent/useAgentState';

const items: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'workspace', label: 'Agent workspace', icon: 'sparkles' },
  { id: 'tasks', label: 'Tasks', icon: 'tasks' },
  { id: 'history', label: 'Execution history', icon: 'activity' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export function Sidebar({
  current,
  onNavigate,
  mobileOpen,
  onCloseMobile,
}: {
  current: ViewId;
  onNavigate: (id: ViewId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const store = useStore();
  const state = useAgentState(store);
  const approvalCount = state.tasks.filter(
    (t) => t.approval === 'required' && t.status !== 'completed'
  ).length;
  const recipient = state.recipient;

  const renderItem = (item: NavItem) => {
    const active = current === item.id;
    const badge =
      item.id === 'tasks' && approvalCount > 0 ? approvalCount : undefined;
    return (
      <button
        key={item.id}
        onClick={() => {
          onNavigate(item.id);
          onCloseMobile();
        }}
        className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
          active
            ? 'bg-teal-500/10 text-white ring-1 ring-teal-400/25'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
        }`}
        aria-current={active ? 'page' : undefined}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-teal-400" />
        )}
        <Icon
          name={item.icon as IconName}
          size={18}
          className={active ? 'text-teal-300' : 'text-slate-500 group-hover:text-slate-300'}
        />
        <span className="flex-1 text-left">{item.label}</span>
        {badge ? (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500/20 px-1.5 text-xs font-semibold text-amber-300">
            {badge}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink-950/70 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/5 bg-ink-900/95 backdrop-blur transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-ink-950 shadow-glow">
            <Icon name="heart" size={20} />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-success-400 ring-2 ring-ink-900" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-base font-semibold text-white">
              CarePilot
            </p>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">
              Care coordination
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          <p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            Workspace
          </p>
          {items.map(renderItem)}
        </nav>

        {/* Recipient card */}
        <div className="px-3 pb-4">
          <div className="cp-surface-raised p-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">
              Care recipient
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{recipient.name}</p>
            <p className="text-xs text-slate-400">
              {recipient.relationship} · {recipient.age} · Cardiology
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
