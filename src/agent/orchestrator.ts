import { runTool } from '@/agent/tools';
import { planFromRequest } from '@/agent/planner';
import { fetchBedrockSummary, type BedrockSummaryInput } from '@/agent/bedrock';
import { uid, nowIso, formatDuration } from '@/agent/util';
import type { AgentStore } from '@/agent/store';
import type {
  AgentRun,
  ConversationMessage,
  PlannedAction,
  TraceEntry,
} from '@/types';

// ---------------------------------------------------------------------------
// Orchestrator — request -> plan -> tool execution -> updated state + trace.
//
// The agent uses deterministic intent parsing and structured tool execution.
// For the produce_summary intent, it also calls the Bedrock edge function
// to generate a natural-language summary. If Bedrock is unavailable, the
// deterministic local summary is used — the agent always produces a result.
// ---------------------------------------------------------------------------

export const AGENT_MODE = 'CarePilot agent (Bedrock summary + deterministic tools)';

export interface RunResult {
  runId: string;
  summary: string;
  fallback: boolean;
}

function traceEntry(
  kind: TraceEntry['kind'],
  label: string,
  extra: Partial<TraceEntry> = {}
): TraceEntry {
  return { id: uid('tr'), tsIso: nowIso(), kind, label, ...extra };
}

/** Execute a single action with dependency + approval gating. */
function executeAction(
  store: AgentStore,
  run: AgentRun,
  action: PlannedAction,
  trace: TraceEntry[]
): void {
  // Check dependencies completed.
  const blockedByDep = action.dependsOn.find((depId) => {
    const dep = run.plan.actions.find((a) => a.id === depId);
    return dep && dep.resultKind !== 'executed';
  });
  if (blockedByDep) {
    const dep = run.plan.actions.find((a) => a.id === blockedByDep);
    action.resultKind = 'failed';
    action.error = `Skipped: dependency "${dep?.description ?? blockedByDep}" did not execute successfully.`;
    const entry = traceEntry(
      'error',
      `Skipped action: ${action.description}`,
      { actionId: action.id, toolName: action.toolName, detail: action.error, planId: run.plan.id }
    );
    trace.push(entry);
    store.dispatch({ type: 'APPEND_TRACE', runId: run.id, entry });
    return;
  }

  // Approval gate.
  if (action.requiresApproval) {
    action.resultKind = 'approval_required';
    const entry = traceEntry(
      'approval_required',
      `Approval required: ${action.description}`,
      { actionId: action.id, toolName: action.toolName, planId: run.plan.id }
    );
    trace.push(entry);
    store.dispatch({ type: 'APPEND_TRACE', runId: run.id, entry });
    return;
  }

  // Tool call trace.
  const callEntry = traceEntry(
    'tool_call',
    `Calling tool: ${action.toolName}`,
    { actionId: action.id, toolName: action.toolName, planId: run.plan.id, detail: action.description }
  );
  trace.push(callEntry);
  store.dispatch({ type: 'APPEND_TRACE', runId: run.id, entry: callEntry });

  const result = runTool(
    { store, startedIso: run.startedIso },
    action.toolName,
    action.args
  );
  action.result = result;
  action.resultKind = result.ok ? 'executed' : 'failed';
  if (!result.ok) action.error = result.message;

  const resultEntry = traceEntry(
    'tool_result',
    result.ok ? `Tool succeeded: ${action.toolName}` : `Tool failed: ${action.toolName}`,
    {
      actionId: action.id,
      toolName: action.toolName,
      planId: run.plan.id,
      detail: result.message,
    }
  );
  trace.push(resultEntry);
  store.dispatch({ type: 'APPEND_TRACE', runId: run.id, entry: resultEntry });

  // Record observable state change.
  if (result.ok) {
    const changeEntry = traceEntry(
      'state_change',
      `State updated by ${action.toolName}`,
      { actionId: action.id, toolName: action.toolName, planId: run.plan.id, detail: result.message }
    );
    trace.push(changeEntry);
    store.dispatch({ type: 'APPEND_TRACE', runId: run.id, entry: changeEntry });
  }
}

/** Run the full request -> plan -> tools -> trace pipeline. */
export async function runAgent(store: AgentStore, request: string): Promise<RunResult> {
  const startedIso = nowIso();
  const state = store.getState();

  // Record the user request in the trace.
  const plan = planFromRequest(request, state);
  const trace: TraceEntry[] = [];

  // User message.
  const userMsg: ConversationMessage = {
    id: uid('msg'),
    role: 'user',
    text: request,
    tsIso: startedIso,
  };
  store.dispatch({ type: 'ADD_MESSAGE', message: userMsg });

  const run: AgentRun = {
    id: uid('run'),
    plan,
    trace: [],
    startedIso,
    summary: '',
  };
  store.dispatch({ type: 'START_RUN', run });

  // Trace: request received.
  const reqEntry = traceEntry('request', `Request: "${request}"`, { planId: plan.id });
  trace.push(reqEntry);
  store.dispatch({ type: 'APPEND_TRACE', runId: run.id, entry: reqEntry });

  // Trace: intent classified.
  const intentEntry = traceEntry(
    'intent',
    `Intent: ${plan.intent}`,
    { planId: plan.id, detail: plan.note }
  );
  trace.push(intentEntry);
  store.dispatch({ type: 'APPEND_TRACE', runId: run.id, entry: intentEntry });

  // Trace: plan assembled.
  const planEntry = traceEntry(
    'plan',
    `Plan assembled: ${plan.actions.length} action${plan.actions.length === 1 ? '' : 's'}`,
    { planId: plan.id, detail: plan.actions.map((a) => `• ${a.description}`).join('\n') }
  );
  trace.push(planEntry);
  store.dispatch({ type: 'APPEND_TRACE', runId: run.id, entry: planEntry });

  // Execute actions in order (dependencies are linear here).
  for (const action of plan.actions) {
    executeAction(store, run, action, trace);
  }

  // Build summary.
  const executed = plan.actions.filter((a) => a.resultKind === 'executed').length;
  const approvalReq = plan.actions.filter((a) => a.resultKind === 'approval_required').length;
  const failed = plan.actions.filter((a) => a.resultKind === 'failed').length;
  const total = plan.actions.length;

  let summary: string;
  let summarySource: 'bedrock' | 'local' = 'local';
  if (plan.intent === 'unknown') {
    summary =
      "I couldn't classify that request. Try asking me to prepare for an appointment, create a task, summarize status, or generate a checklist.";
  } else if (total === 0) {
    summary = plan.note || 'No actions were planned for this request.';
  } else {
    const parts: string[] = [];
    parts.push(`${executed} of ${total} action${total === 1 ? '' : 's'} executed.`);
    if (approvalReq > 0) parts.push(`${approvalReq} need${approvalReq === 1 ? 's' : ''} your approval.`);
    if (failed > 0) parts.push(`${failed} failed.`);
    summary = parts.join(' ');

    // For produce_summary intent, try Bedrock for a richer natural-language summary.
    if (plan.intent === 'produce_summary') {
      const bedrockInput: BedrockSummaryInput = {
        tasks: store.getState().tasks.map((t) => ({
          title: t.title,
          status: t.status,
          category: t.category,
          priority: t.priority,
          approval: t.approval,
          dueLabel: t.dueLabel,
        })),
        recipient: {
          name: state.recipient.name,
          relationship: state.recipient.relationship,
          provider: state.recipient.provider,
          nextAppointmentLabel: state.recipient.nextAppointmentLabel,
          conditionLabel: state.recipient.conditionLabel,
        },
      };

      const bedrockEntry = traceEntry(
        'tool_call',
        'Calling Bedrock summary via edge function',
        { planId: plan.id, detail: 'amazon.titan-text-express-v1 via Supabase Edge Function' }
      );
      trace.push(bedrockEntry);
      store.dispatch({ type: 'APPEND_TRACE', runId: run.id, entry: bedrockEntry });

      const bedrockResult = await fetchBedrockSummary(bedrockInput);

      if (bedrockResult.source === 'amazon_bedrock') {
        summary = bedrockResult.summary;
        summarySource = 'bedrock';
      }

      const bedrockResultEntry = traceEntry(
        'tool_result',
        bedrockResult.source === 'amazon_bedrock'
          ? `Bedrock summary received (${bedrockResult.model ?? 'titan'})`
          : `Bedrock unavailable — using local fallback: ${bedrockResult.reason ?? 'unknown'}`,
        { planId: plan.id, detail: bedrockResult.summary }
      );
      trace.push(bedrockResultEntry);
      store.dispatch({ type: 'APPEND_TRACE', runId: run.id, entry: bedrockResultEntry });
    }
  }

  store.dispatch({ type: 'FINISH_RUN', runId: run.id, summary });

  // Agent message in conversation.
  const agentMsg: ConversationMessage = {
    id: uid('msg'),
    role: 'agent',
    text: summary,
    tsIso: nowIso(),
    runId: run.id,
    fallback: summarySource === 'local',
  };
  store.dispatch({ type: 'ADD_MESSAGE', message: agentMsg });

  const completeEntry = traceEntry('complete', `Run complete in ${formatDuration(Date.now() - new Date(startedIso).getTime())}`, {
    planId: plan.id,
    detail: summarySource === 'bedrock' ? 'Summary from Amazon Bedrock' : 'Summary from local fallback',
  });
  trace.push(completeEntry);
  store.dispatch({ type: 'APPEND_TRACE', runId: run.id, entry: completeEntry });

  return { runId: run.id, summary, fallback: summarySource === 'local' };
}

/** Approve a paused action's associated task and resume execution. */
export function approveTask(store: AgentStore, taskId: string): void {
  store.dispatch({ type: 'APPROVE_TASK', taskId });
  store.dispatch({
    type: 'ADD_ACTIVITY',
    activity: {
      id: uid('a'),
      tsIso: nowIso(),
      label: 'You approved a task — it may now proceed.',
      kind: 'approval',
    },
  });
  // After approval, advance the task to in_progress so it visibly resumes.
  const task = store.getState().tasks.find((t) => t.id === taskId);
  if (task && task.status === 'pending') {
    store.dispatch({ type: 'UPDATE_TASK_STATUS', taskId, status: 'in_progress' });
    store.dispatch({
      type: 'ADD_ACTIVITY',
      activity: {
        id: uid('a'),
        tsIso: nowIso(),
        label: `${task.title} resumed after approval.`,
        kind: 'action',
      },
    });
  }
}

export function rejectTask(store: AgentStore, taskId: string): void {
  store.dispatch({ type: 'REJECT_TASK', taskId });
  store.dispatch({
    type: 'ADD_ACTIVITY',
    activity: {
      id: uid('a'),
      tsIso: nowIso(),
      label: 'You rejected a task.',
      kind: 'warn',
    },
  });
}

/** Retry a failed action from the latest run. */
export function retryAction(store: AgentStore, runId: string, actionId: string): RunResult | null {
  const run = store.getState().runs.find((r) => r.id === runId);
  if (!run) return null;
  const action = run.plan.actions.find((a) => a.id === actionId);
  if (!action || action.resultKind !== 'failed') return null;

  // Mark as retried and re-execute.
  action.retried = true;
  action.result = undefined;
  action.error = undefined;
  action.resultKind = undefined;

  const retryEntry = traceEntry(
    'tool_call',
    `Retrying tool: ${action.toolName}`,
    { actionId: action.id, toolName: action.toolName, planId: run.plan.id, detail: action.description }
  );
  store.dispatch({ type: 'APPEND_TRACE', runId: run.id, entry: retryEntry });

  const result = runTool(
    { store, startedIso: run.startedIso },
    action.toolName,
    action.args
  );
  action.result = result;
  action.resultKind = result.ok ? 'executed' : 'failed';
  if (!result.ok) action.error = result.message;

  const resultEntry = traceEntry(
    'tool_result',
    result.ok ? `Retry succeeded: ${action.toolName}` : `Retry failed: ${action.toolName}`,
    {
      actionId: action.id,
      toolName: action.toolName,
      planId: run.plan.id,
      detail: result.message,
    }
  );
  store.dispatch({ type: 'APPEND_TRACE', runId: run.id, entry: resultEntry });

  return { runId: run.id, summary: result.message, fallback: true };
}

/** Produce a concise context summary for the restore banner on startup. */
export function buildRestoreSummary(store: AgentStore): string {
  const state = store.getState();
  const pending = state.tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;
  const approvals = state.tasks.filter((t) => t.approval === 'required' && t.status !== 'completed').length;
  const blocked = state.tasks.filter((t) => t.status === 'blocked').length;
  const userTasks = state.tasks.filter((t) => t.source === 'user').length;
  const parts: string[] = [];
  parts.push(`${pending} unfinished task${pending === 1 ? '' : 's'}`);
  if (approvals > 0) parts.push(`${approvals} awaiting approval`);
  if (blocked > 0) parts.push(`${blocked} blocked`);
  if (userTasks > 0) parts.push(`${userTasks} you created`);
  return `Restored your session: ${parts.join(', ')}.`;
}
