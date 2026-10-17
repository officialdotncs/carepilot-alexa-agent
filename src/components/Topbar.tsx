import { Icon } from '@/components/Icon';
import { DemoBanner } from '@/components/Card';

const viewTitles: Record<string, { title: string; sub: string }> = {
  overview: { title: 'Overview', sub: 'Your care coordination at a glance' },
  workspace: { title: 'Agent workspace', sub: 'Watch CarePilot work in real time' },
  tasks: { title: 'Tasks', sub: 'Everything CarePilot is coordinating' },
  history: { title: 'Execution history', sub: 'A record of completed and attempted actions' },
  settings: { title: 'Settings', sub: 'Preferences, approvals, and notifications' },
};

export function Topbar({
  view,
  onOpenMobile,
}: {
  view: string;
  onOpenMobile: () => void;
}) {
  const meta = viewTitles[view] ?? viewTitles.overview;
  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-ink-950/80 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6">
        <button
          onClick={onOpenMobile}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/5 lg:hidden"
          aria-label="Open navigation"
        >
          <Icon name="home" size={18} />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-semibold text-white sm:text-xl">
            {meta.title}
          </h1>
          <p className="hidden truncate text-sm text-slate-400 sm:block">
            {meta.sub}
          </p>
        </div>

        <div className="hidden md:block">
          <DemoBanner />
        </div>

        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/5"
          aria-label="Notifications"
        >
          <Icon name="bell" size={18} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-teal-300" />
        </button>
      </div>
    </header>
  );
}
