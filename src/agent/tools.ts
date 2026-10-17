import type { AgentStore } from '@/agent/store';
import { uid, nowIso, formatDuration } from '@/agent/util';
import type {
  CareTask,
  ExecutionRecord,
  Priority,
  TaskCategory,
  TaskStatus,
  ToolName,
  ToolResult,
} from '@/types';

// ---------------------------------------------------------------------------
// Tools — real application logic
//
// Each tool validates its inputs, executes against the store, appends an
// execution record + activity entry, and returns a structured ToolResult.
// Tools never perform real-world side effects (no bookings, calls, contact).
// ---------------------------------------------------------------------------

interface ToolContext {
  store: AgentStore;
  startedIso: string;
}

export interface ToolDef {
  name: ToolName;
  description: string;
  requiresApproval: boolean;
  run: (ctx: ToolContext, args: Record<string, unknown>) => ToolResult;
}

const CATEGORY_KEYWORDS: Record<TaskCategory, string[]> = {
  scheduling: ['appointment', 'schedule', 'confirm', 'reschedule', 'booking', 'calendar'],
  records: ['records', 'vitals', 'summary', 'history', 'documents', 'discharge', 'log'],
  logistics: ['transport', 'ride', 'pickup', 'travel', 'car', 'drive'],
  insurance: ['insurance', 'coverage', 'copay', 'claim', 'plan'],
  communication: ['reminder', 'notify', 'message', 'call', 'email', 'sms', 'tell'],
  medications: ['medication', 'refill', 'prescription', 'medicine', 'drug', 'lisinopril'],
};

const PRIORITY_KEYWORDS: Record<Priority, string[]> = {
  urgent: ['urgent', 'asap', 'immediately', 'critical'],
  high: ['high', 'important', 'soon'],
  medium: ['medium', 'normal', 'moderate'],
  low: ['low', 'minor', 'whenever'],
};

const STATUS_VALUES: TaskStatus[] = ['pending', 'in_progress', 'blocked', 'completed', 'failed'];

function isString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function inferCategory(text: string): TaskCategory {
  const lower = text.toLowerCase();
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) return cat as TaskCategory;
  }
  return 'communication';
}

function inferPriority(text: string): Priority {
  const lower = text.toLowerCase();
  for (const [prio, words] of Object.entries(PRIORITY_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) return prio as Priority;
  }
  return 'medium';
}

function addExecutionRecord(
  ctx: ToolContext,
  task: CareTask,
  status: TaskStatus,
  summary: string,
  approval: ExecutionRecord['approval'],
  source: ExecutionRecord['source']
) {
  const record: ExecutionRecord = {
    id: uid('ex'),
    taskId: task.id,
    taskTitle: task.title,
    category: task.category,
    status,
    startedIso: ctx.startedIso,
    completedIso: nowIso(),
    durationLabel: formatDuration(Date.now() - new Date(ctx.startedIso).getTime()),
    summary,
    agent: 'CarePilot',
    approval,
    source,
  };
  ctx.store.dispatch({ type: 'ADD_HISTORY', record });
}

// ---------------------------------------------------------------------------
// Tool: create_task
// ---------------------------------------------------------------------------

const createTask: ToolDef = {
  name: 'create_task',
  description: 'Create a new care task with category, priority, and approval state.',
  requiresApproval: false, // creating a task is safe; execution of it may not be
  run: (ctx, args) => {
    const title = args.title;
    const description = args.description;
    if (!isString(title)) {
      return { ok: false, message: 'A task title is required.' };
    }
    const text = isString(description) ? description : title;
    const category = (isString(args.category) ? args.category : inferCategory(text)) as TaskCategory;
    const priority = (isString(args.priority) ? args.priority : inferPriority(text)) as Priority;
    const dueLabel = isString(args.dueLabel) ? args.dueLabel : 'Within 2 days';
    const dueIso = isString(args.dueIso) ? args.dueIso : new Date(Date.now() + 2 * 86400000).toISOString();

    // Medications and insurance always require approval — safety policy.
    const requiresApproval =
      args.requiresApproval === true || category === 'medications' || category === 'insurance';

    // Duplicate protection: don't create a task with the same title as an
    // existing non-completed task.
    const existing = ctx.store.getState().tasks.find(
      (t) => t.title.trim().toLowerCase() === title.trim().toLowerCase() && t.status !== 'completed' && t.status !== 'failed'
    );
    if (existing) {
      return {
        ok: false,
        message: `A task named "${existing.title}" already exists and is still open. Not creating a duplicate.`,
      };
    }

    const task: CareTask = {
      id: uid('task'),
      title: title.trim(),
      description: text,
      category,
      priority,
      status: 'pending',
      approval: requiresApproval ? 'required' : 'auto',
      dueLabel,
      dueIso,
      assignee: 'CarePilot',
      careRecipient: ctx.store.getState().recipient.name,
      createdAtIso: nowIso(),
      source: 'user',
      steps: [
        { id: uid('s'), title: 'Prepare', detail: 'Gather details for this task.', status: 'pending' },
        { id: uid('s'), title: 'Execute', detail: 'Carry out the action.', status: 'pending' },
      ],
    };
    ctx.store.dispatch({ type: 'CREATE_TASK', task });
    ctx.store.dispatch({
      type: 'ADD_ACTIVITY',
      activity: { id: uid('a'), tsIso: nowIso(), label: `Created task: ${task.title}`, kind: 'action' },
    });
    return {
      ok: true,
      message: `Created task "${task.title}" (${category}, ${priority}).`,
      data: { taskId: task.id, approval: task.approval },
    };
  },
};

// ---------------------------------------------------------------------------
// Tool: update_task_status
// ---------------------------------------------------------------------------

const updateTaskStatus: ToolDef = {
  name: 'update_task_status',
  description: 'Advance a task to a new status (pending, in_progress, blocked, completed, failed).',
  requiresApproval: false,
  run: (ctx, args) => {
    const taskId = args.taskId;
    const status = args.status;
    if (!isString(taskId)) {
      return { ok: false, message: 'A task id is required.' };
    }
    if (!isString(status) || !STATUS_VALUES.includes(status as TaskStatus)) {
      return { ok: false, message: `Status must be one of: ${STATUS_VALUES.join(', ')}.` };
    }
    const task = ctx.store.getState().tasks.find((t) => t.id === taskId);
    if (!task) {
      return { ok: false, message: `No task found with id "${taskId}".` };
    }
    const newStatus = status as TaskStatus;
    ctx.store.dispatch({ type: 'UPDATE_TASK_STATUS', taskId, status: newStatus });
    const note = isString(args.note) ? args.note : undefined;
    ctx.store.dispatch({
      type: 'ADD_ACTIVITY',
      activity: {
        id: uid('a'),
        tsIso: nowIso(),
        label: `${task.title} → ${newStatus.replace('_', ' ')}`,
        kind: newStatus === 'completed' ? 'success' : newStatus === 'blocked' || newStatus === 'failed' ? 'warn' : 'action',
      },
    });
    const summary = note
      ? `${task.title} marked ${newStatus}. ${note}`
      : `${task.title} marked ${newStatus}.`;
    addExecutionRecord(ctx, task, newStatus, summary, task.approval === 'required' ? 'required' : 'auto', task.source);
    return { ok: true, message: summary, data: { taskId, status: newStatus } };
  },
};

// ---------------------------------------------------------------------------
// Tool: read_outstanding_tasks
// ---------------------------------------------------------------------------

const readOutstandingTasks: ToolDef = {
  name: 'read_outstanding_tasks',
  description: 'Return all tasks that are not yet completed.',
  requiresApproval: false,
  run: (ctx) => {
    const outstanding = ctx.store
      .getState()
      .tasks.filter((t) => t.status !== 'completed' && t.status !== 'failed');
    return {
      ok: true,
      message: `${outstanding.length} outstanding task${outstanding.length === 1 ? '' : 's'}.`,
      data: { tasks: outstanding.map((t) => ({ id: t.id, title: t.title, status: t.status, dueLabel: t.dueLabel })) },
    };
  },
};

// ---------------------------------------------------------------------------
// Tool: generate_preparation_checklist
// ---------------------------------------------------------------------------

const generatePreparationChecklist: ToolDef = {
  name: 'generate_preparation_checklist',
  description: 'Generate a pre-appointment preparation checklist from current state.',
  requiresApproval: false,
  run: (ctx) => {
    const state = ctx.store.getState();
    const appt = state.recipient;
    const items = [
      `Confirm ${appt.nextAppointmentLabel} with ${appt.provider}`,
      'Gather recent vitals and records',
      'Verify insurance coverage and copay',
      'Arrange transportation to the clinic',
      'Prepare medication list and refill status',
      `Send reminder to ${appt.name} the evening before`,
    ];
    return {
      ok: true,
      message: `Checklist generated for ${appt.name}'s appointment.`,
      data: { items, recipient: appt.name, appointment: appt.nextAppointmentLabel },
    };
  },
};

// ---------------------------------------------------------------------------
// Tool: produce_summary
// ---------------------------------------------------------------------------

const produceSummary: ToolDef = {
  name: 'produce_summary',
  description: 'Summarize current care-coordination state across tasks.',
  requiresApproval: false,
  run: (ctx) => {
    const tasks = ctx.store.getState().tasks;
    const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const blocked = tasks.filter((t) => t.status === 'blocked').length;
    const approvals = tasks.filter((t) => t.approval === 'required' && t.status !== 'completed').length;
    const recipient = ctx.store.getState().recipient;
    const message = `${recipient.name} — ${pending} pending, ${completed} completed, ${blocked} blocked, ${approvals} awaiting your approval.`;
    return {
      ok: true,
      message,
      data: { pending, completed, blocked, approvals, recipient: recipient.name },
    };
  },
};

export const TOOLS: Record<ToolName, ToolDef> = {
  create_task: createTask,
  update_task_status: updateTaskStatus,
  read_outstanding_tasks: readOutstandingTasks,
  generate_preparation_checklist: generatePreparationChecklist,
  produce_summary: produceSummary,
};

export function runTool(
  ctx: ToolContext,
  name: ToolName,
  args: Record<string, unknown>
): ToolResult {
  const def = TOOLS[name];
  if (!def) return { ok: false, message: `Unknown tool: ${name}` };
  return def.run(ctx, args);
}
