import { useSyncExternalStore } from 'react';
import type { AgentStore, AgentState } from '@/agent/store';

// React binding for the agent store. useSyncExternalStore gives us a
// tearing-free snapshot of state and re-renders on every dispatch.
export function useAgentState(store: AgentStore): AgentState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
