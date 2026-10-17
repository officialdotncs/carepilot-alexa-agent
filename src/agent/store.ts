import {
  demoActivity,
  demoHistory,
  demoRecipient,
  demoTasks,
} from '@/data/demoData';
import { saveState, loadState, clearState } from '@/agent/storage';
import type {
  AgentActivity,
  AgentRun,
  CareRecipient,
  CareTask,
  ConversationMessage,
  ExecutionRecord,
  TraceEntry,
} from '@/types';

// Canonical application state. All views read from this store; the agent
// orchestrator mutates it through dispatched actions so state changes are
// observable and traceable.

export interface AgentState {
  tasks: CareTask[];
  history: ExecutionRecord[];
  activity: AgentActivity[];
  recipient: CareRecipient;
  runs: AgentRun[];
  conversation: ConversationMessage[];
}

export type AgentAction =
  | { type: 'CREATE_TASK'; task: CareTask }
  | { type: 'UPDATE_TASK_STATUS'; taskId: string; status: CareTask['status']; note?: string }
  | { type: 'APPROVE_TASK'; taskId: string }
  | { type: 'REJECT_TASK'; taskId: string }
  | { type: 'ADD_HISTORY'; record: ExecutionRecord }
  | { type: 'ADD_ACTIVITY'; activity: AgentActivity }
  | { type: 'START_RUN'; run: AgentRun }
  | { type: 'APPEND_TRACE'; runId: string; entry: TraceEntry }
  | { type: 'FINISH_RUN'; runId: string; summary: string }
  | { type: 'ADD_MESSAGE'; message: ConversationMessage }
  | { type: 'RESET_DEMO' };

function reducer(state: AgentState, action: AgentAction): AgentState {
  switch (action.type) {
    case 'CREATE_TASK':
      return { ...state, tasks: [action.task, ...state.tasks] };

    case 'UPDATE_TASK_STATUS': {
      const tasks = state.tasks.map((t) =>
        t.id === action.taskId
          ? {
              ...t,
              status: action.status,
              steps: t.steps.map((s, i) =>
                action.status === 'completed'
                  ? { ...s, status: 'completed' as const }
                  : action.status === 'in_progress' && i === 0 && s.status === 'pending'
                  ? { ...s, status: 'in_progress' as const }
                  : s
              ),
            }
          : t
      );
      return { ...state, tasks };
    }

    case 'APPROVE_TASK': {
      const tasks = state.tasks.map((t) =>
        t.id === action.taskId ? { ...t, approval: 'approved' as const } : t
      );
      return { ...state, tasks };
    }

    case 'REJECT_TASK': {
      const tasks = state.tasks.map((t) =>
        t.id === action.taskId
          ? { ...t, approval: 'rejected' as const, status: 'failed' as const }
          : t
      );
      return { ...state, tasks };
    }

    case 'ADD_HISTORY':
      return { ...state, history: [action.record, ...state.history] };

    case 'ADD_ACTIVITY':
      return { ...state, activity: [action.activity, ...state.activity] };

    case 'START_RUN':
      return { ...state, runs: [action.run, ...state.runs] };

    case 'APPEND_TRACE': {
      const runs = state.runs.map((r) =>
        r.id === action.runId
          ? { ...r, trace: [...r.trace, action.entry] }
          : r
      );
      return { ...state, runs };
    }

    case 'FINISH_RUN': {
      const runs = state.runs.map((r) =>
        r.id === action.runId
          ? { ...r, finishedIso: new Date().toISOString(), summary: action.summary }
          : r
      );
      return { ...state, runs };
    }

    case 'ADD_MESSAGE':
      return { ...state, conversation: [...state.conversation, action.message] };

    case 'RESET_DEMO':
      return {
        tasks: demoTasks.map((t) => ({ ...t })),
        history: demoHistory.map((h) => ({ ...h })),
        activity: demoActivity.map((a) => ({ ...a })),
        recipient: { ...demoRecipient },
        runs: [],
        conversation: [],
      };

    default:
      return state;
  }
}

// What we persist: everything except runs/conversation which are large and
// session-oriented. We keep tasks, history, activity, and recipient.
function serializeForPersistence(state: AgentState): unknown {
  return {
    tasks: state.tasks,
    history: state.history.slice(0, 50), // cap history
    activity: state.activity.slice(0, 40), // cap activity
    recipient: state.recipient,
  };
}

// Validate that a loaded blob looks like persisted state.
function isValidPersisted(data: unknown): data is {
  tasks: CareTask[];
  history: ExecutionRecord[];
  activity: AgentActivity[];
  recipient: CareRecipient;
} {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.tasks) && Array.isArray(d.history) && Array.isArray(d.activity) && !!d.recipient;
}

// Minimal external store: subscribers get notified on every dispatch.
class Store {
  private state: AgentState;
  private listeners = new Set<() => void>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  /** True if state was restored from storage on startup. */
  readonly restored: boolean;

  constructor(initial: AgentState, restored: boolean) {
    this.state = initial;
    this.restored = restored;
  }

  getState = (): AgentState => this.state;

  dispatch = (action: AgentAction): void => {
    this.state = reducer(this.state, action);
    // Debounce persistence — don't write on every rapid APPEND_TRACE.
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      saveState(serializeForPersistence(this.state));
    }, 300);
    this.listeners.forEach((l) => l());
  };

  /** Reset to seed demo data and clear persisted state. */
  resetDemo = (): void => {
    clearState();
    this.dispatch({ type: 'RESET_DEMO' });
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}

export function createStore(): Store {
  // Try restoring persisted state on startup.
  const persisted = loadState();
  if (persisted && isValidPersisted(persisted)) {
    const restored: AgentState = {
      tasks: persisted.tasks,
      history: persisted.history,
      activity: persisted.activity,
      recipient: persisted.recipient,
      runs: [],
      conversation: [],
    };
    return new Store(restored, true);
  }
  // Fresh seed state.
  return new Store(
    {
      tasks: [...demoTasks],
      history: [...demoHistory],
      activity: [...demoActivity],
      recipient: { ...demoRecipient },
      runs: [],
      conversation: [],
    },
    false
  );
}

export type { Store as AgentStore };
