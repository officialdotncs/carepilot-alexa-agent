// CarePilot — shared type model
// Single source of truth for the agent workspace domain.

export type TaskStatus =
  | 'pending' // awaiting approval / not started
  | 'in_progress' // agent is executing
  | 'blocked' // needs human input
  | 'completed'
  | 'failed';

export type TaskCategory =
  | 'scheduling'
  | 'records'
  | 'logistics'
  | 'insurance'
  | 'communication'
  | 'medications';

export type ApprovalState = 'required' | 'approved' | 'rejected' | 'auto';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface AgentStep {
  id: string;
  title: string;
  detail: string;
  status: TaskStatus;
  timestamp?: string; // ISO
}

/** Where a task or record originated. */
export type DataSource = 'sample' | 'user';

export interface CareTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: Priority;
  approval: ApprovalState;
  dueLabel: string; // human readable, e.g. "Tomorrow · 2:00 PM"
  dueIso: string;
  assignee: 'CarePilot' | 'You';
  careRecipient: string;
  steps: AgentStep[];
  createdAtIso: string;
  source: DataSource; // sample (seeded demo) vs user (agent-created)
}

export interface ExecutionRecord {
  id: string;
  taskId: string;
  taskTitle: string;
  category: TaskCategory;
  status: TaskStatus;
  startedIso: string;
  completedIso?: string;
  durationLabel: string;
  summary: string;
  agent: string;
  approval: ApprovalState;
  source: DataSource;
}

export interface CareRecipient {
  id: string;
  name: string;
  relationship: string;
  age: number;
  nextAppointmentLabel: string;
  nextAppointmentIso: string;
  provider: string;
  conditionLabel: string;
}

export interface AgentActivity {
  id: string;
  tsIso: string;
  label: string;
  kind: 'thought' | 'action' | 'approval' | 'system' | 'success' | 'warn';
}

export interface NavItem {
  id: ViewId;
  label: string;
  icon: string; // lucide icon name
  badge?: number;
}

export type ViewId =
  | 'overview'
  | 'workspace'
  | 'tasks'
  | 'history'
  | 'settings';

// ---------------------------------------------------------------------------
// Phase 2 — agent orchestration types
// ---------------------------------------------------------------------------

/** Identifiable, deterministic intents the local agent can resolve. */
export type AgentIntent =
  | 'prepare_appointment' // build a full preparation plan
  | 'create_task' // add a single task
  | 'update_task_status' // advance / block / complete a task
  | 'read_outstanding' // list open tasks
  | 'generate_checklist' // produce a preparation checklist
  | 'produce_summary' // summarize current state
  | 'unknown'; // unparseable / unsupported

/** How an action may be discharged. */
export type ActionResultKind =
  | 'planned' // in the plan, not yet attempted
  | 'executed' // tool ran successfully
  | 'failed' // tool ran and returned an error
  | 'approval_required'; // needs human sign-off before running

/** A single validated, structured action inside a plan. */
export interface PlannedAction {
  id: string;
  toolName: ToolName;
  args: Record<string, unknown>;
  /** Human-readable description of what this action will do. */
  description: string;
  /** Whether this action needs human approval before it can execute. */
  requiresApproval: boolean;
  /** Other action ids that must complete before this one. */
  dependsOn: string[];
  result?: ToolResult;
  resultKind?: ActionResultKind;
  error?: string;
  retried?: boolean; // true if this action was retried after a failure
}

/** A structured plan produced by the orchestrator from a request. */
export interface AgentPlan {
  id: string;
  intent: AgentIntent;
  request: string;
  actions: PlannedAction[];
  createdAtIso: string;
  note?: string; // e.g. fallback explanation
  fallback?: boolean; // true when local heuristic mode was used
}

export type ToolName =
  | 'create_task'
  | 'update_task_status'
  | 'read_outstanding_tasks'
  | 'generate_preparation_checklist'
  | 'produce_summary';

export interface ToolResult {
  ok: boolean;
  message: string;
  /** Free-form structured payload specific to the tool. */
  data?: unknown;
}

/** One entry in the execution trace. */
export interface TraceEntry {
  id: string;
  tsIso: string;
  kind:
    | 'request' // user request received
    | 'intent' // intent classified
    | 'plan' // plan assembled
    | 'tool_call' // tool about to run
    | 'tool_result' // tool returned
    | 'state_change' // store mutated
    | 'approval_required' // action paused for sign-off
    | 'error' // error encountered
    | 'complete'; // run finished
  label: string;
  detail?: string;
  planId?: string;
  actionId?: string;
  toolName?: ToolName;
}

/** A full agent run: request -> plan -> tool invocations -> outcome. */
export interface AgentRun {
  id: string;
  plan: AgentPlan;
  trace: TraceEntry[];
  startedIso: string;
  finishedIso?: string;
  summary: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  text: string;
  tsIso: string;
  runId?: string;
  fallback?: boolean;
}
