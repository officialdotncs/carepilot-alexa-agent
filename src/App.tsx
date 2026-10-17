import { createContext, useContext, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { OverviewView } from '@/views/OverviewView';
import { WorkspaceView } from '@/views/WorkspaceView';
import { TasksView } from '@/views/TasksView';
import { HistoryView } from '@/views/HistoryView';
import { SettingsView } from '@/views/SettingsView';
import { createStore, type AgentStore } from '@/agent/store';
import { buildRestoreSummary } from '@/agent/orchestrator';
import { storageAvailable } from '@/agent/storage';
import { Icon } from '@/components/Icon';
import type { ViewId } from '@/types';

const StoreContext = createContext<AgentStore | null>(null);

export function useStore(): AgentStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used within StoreProvider');
  return store;
}

function App() {
  // One store for the lifetime of the app. Restore happens in createStore.
  const [store] = useState<AgentStore>(() => createStore());
  const [view, setView] = useState<ViewId>('overview');
  const [mobileNav, setMobileNav] = useState(false);
  const [dismissedRestore, setDismissedRestore] = useState(false);

  const navigate = (v: ViewId) => {
    setView(v);
    window.scrollTo({ top: 0 });
  };

  const showRestoreBanner = store.restored && !dismissedRestore;
  const restoreSummary = showRestoreBanner ? buildRestoreSummary(store) : '';

  return (
    <StoreContext.Provider value={store}>
      <div className="flex min-h-screen bg-ink-950 bg-navy-radial text-slate-100">
        <Sidebar
          current={view}
          onNavigate={navigate}
          mobileOpen={mobileNav}
          onCloseMobile={() => setMobileNav(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar view={view} onOpenMobile={() => setMobileNav(true)} />

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
            {/* Restore banner */}
            {showRestoreBanner && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-teal-400/20 bg-teal-500/5 px-4 py-3 animate-fade-in">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-teal-300 ring-1 ring-teal-400/20">
                  <Icon name="sparkles" size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">Welcome back</p>
                  <p className="text-xs text-slate-400">
                    {restoreSummary}
                    {!storageAvailable ? ' · Storage unavailable — state will not persist.' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setDismissedRestore(true)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
                  aria-label="Dismiss"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            )}

            {view === 'overview' && <OverviewView onNavigate={navigate} />}
            {view === 'workspace' && <WorkspaceView onNavigate={navigate} />}
            {view === 'tasks' && <TasksView />}
            {view === 'history' && <HistoryView />}
            {view === 'settings' && <SettingsView />}
          </main>

          <footer className="border-t border-white/5 px-6 py-4 text-center text-xs text-slate-600">
            CarePilot · Simulated care-coordination agent · Summaries via Amazon Bedrock (Nova Lite)
          </footer>
        </div>
      </div>
    </StoreContext.Provider>
  );
}

export default App;
