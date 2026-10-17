// ---------------------------------------------------------------------------
// Isolated storage layer
//
// A thin wrapper around localStorage with versioning, JSON serialization,
// and graceful failure handling. This is the ONLY module that touches
// browser storage directly — every other module goes through the store's
// persistence hooks, so the storage mechanism can be replaced later
// (e.g. IndexedDB, a remote API) by swapping this one file.
//
// No secrets are ever stored here. Only application state (tasks, plans,
// history, approval states, conversation, activity).
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'carepilot.state.v1';
const STORAGE_VERSION = 1;

export interface PersistedEnvelope {
  version: number;
  savedAtIso: string;
  state: unknown;
}

interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// Detect a working storage adapter. Falls back to no-op if unavailable
// (private mode, SSR, etc.) so the app still works in-memory.
function detectAdapter(): StorageAdapter | null {
  try {
    if (typeof window === 'undefined') return null;
    const test = '__carepilot_storage_test__';
    window.localStorage.setItem(test, '1');
    window.localStorage.removeItem(test);
    return window.localStorage;
  } catch {
    return null;
  }
}

const adapter = detectAdapter();

export const storageAvailable: boolean = adapter !== null;

/** Save state to storage. Silently no-ops if storage is unavailable. */
export function saveState(state: unknown): void {
  if (!adapter) return;
  try {
    const envelope: PersistedEnvelope = {
      version: STORAGE_VERSION,
      savedAtIso: new Date().toISOString(),
      state,
    };
    adapter.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Quota exceeded or serialization error — degrade gracefully.
  }
}

/** Load persisted state. Returns null if missing, corrupt, or version-mismatched. */
export function loadState(): unknown | null {
  if (!adapter) return null;
  try {
    const raw = adapter.getItem(STORAGE_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as PersistedEnvelope;
    if (envelope.version !== STORAGE_VERSION) return null;
    return envelope.state;
  } catch {
    return null;
  }
}

/** Remove all persisted state. Used by the reset-demo control. */
export function clearState(): void {
  if (!adapter) return;
  try {
    adapter.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
