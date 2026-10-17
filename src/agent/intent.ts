import type { AgentIntent, TaskCategory, Priority } from '@/types';

// ---------------------------------------------------------------------------
// Intent parser — deterministic, keyword + rule based.
//
// This is the LOCAL agent mode. No external language model is called.
// If an optional LLM integration were configured, it would be tried first
// and this parser would serve as the labeled fallback. That path is stubbed
// in the orchestrator but never claimed to have run.
// ---------------------------------------------------------------------------

export interface ParsedIntent {
  intent: AgentIntent;
  /** Raw structured params extracted from the request, if any. */
  params: Record<string, unknown>;
  /** Human-readable confidence note for the trace. */
  note: string;
}

const PREPARE_TRIGGERS = [
  'prepare for',
  'get ready for',
  'prep for',
  'coordinate',
  'plan for the appointment',
  'help me get ready',
];

const CHECKLIST_TRIGGERS = ['checklist', 'what do i need', 'what should i bring', 'what to do before'];

const SUMMARY_TRIGGERS = ['summary', 'summarize', 'status update', 'where do things stand', "what's the status", 'overview of tasks'];

const OUTSTANDING_TRIGGERS = ['outstanding', 'what is pending', "what's open", 'open tasks', 'what is left', 'what still needs'];

const CREATE_TRIGGERS = ['create a task', 'add a task', 'remind me to', 'i need to', "schedule a", 'set up a'];

const UPDATE_TRIGGERS = ['mark', 'complete', 'finish', 'block', 'start', 'advance', 'update task', 'set status'];

function matchesAny(text: string, triggers: string[]): boolean {
  return triggers.some((t) => text.includes(t));
}

function inferCategoryFromText(text: string): TaskCategory | undefined {
  const map: Record<string, string[]> = {
    scheduling: ['appointment', 'schedule', 'confirm', 'reschedule'],
    records: ['records', 'vitals', 'documents', 'discharge'],
    logistics: ['transport', 'ride', 'pickup', 'travel'],
    insurance: ['insurance', 'coverage', 'copay'],
    communication: ['reminder', 'notify', 'message', 'call'],
    medications: ['medication', 'refill', 'prescription', 'lisinopril'],
  };
  for (const [cat, words] of Object.entries(map)) {
    if (words.some((w) => text.includes(w))) return cat as TaskCategory;
  }
  return undefined;
}

function inferPriorityFromText(text: string): Priority | undefined {
  if (/(urgent|asap|immediately|critical)/.test(text)) return 'urgent';
  if (/(high|important|soon)/.test(text)) return 'high';
  if (/(low|minor|whenever)/.test(text)) return 'low';
  if (/(medium|normal|moderate)/.test(text)) return 'medium';
  return undefined;
}

export function parseIntent(request: string): ParsedIntent {
  const text = request.toLowerCase().trim();

  if (!text) {
    return { intent: 'unknown', params: {}, note: 'Empty request.' };
  }

  // Order matters: most specific first.
  if (matchesAny(text, CHECKLIST_TRIGGERS)) {
    return { intent: 'generate_checklist', params: {}, note: 'Matched checklist trigger.' };
  }

  if (matchesAny(text, SUMMARY_TRIGGERS)) {
    return { intent: 'produce_summary', params: {}, note: 'Matched summary trigger.' };
  }

  if (matchesAny(text, OUTSTANDING_TRIGGERS)) {
    return { intent: 'read_outstanding', params: {}, note: 'Matched outstanding-tasks trigger.' };
  }

  if (matchesAny(text, PREPARE_TRIGGERS)) {
    return { intent: 'prepare_appointment', params: {}, note: 'Matched full-preparation trigger.' };
  }

  if (matchesAny(text, UPDATE_TRIGGERS)) {
    // Try to find a status keyword.
    let status: string | undefined;
    if (/(complete|finish|done)/.test(text)) status = 'completed';
    else if (/(block|stuck|hold)/.test(text)) status = 'blocked';
    else if (/(start|begin|kick off)/.test(text)) status = 'in_progress';
    else if (/(fail|cancel|abandon)/.test(text)) status = 'failed';
    else if (/(pending|not started)/.test(text)) status = 'pending';

    // Try to match an existing task title fragment.
    const params: Record<string, unknown> = {};
    if (status) params.status = status;
    return {
      intent: 'update_task_status',
      params,
      note: status ? `Matched update trigger with status "${status}".` : 'Matched update trigger; status not recognized.',
    };
  }

  if (matchesAny(text, CREATE_TRIGGERS)) {
    const category = inferCategoryFromText(text);
    const priority = inferPriorityFromText(text);
    const params: Record<string, unknown> = {};
    if (category) params.category = category;
    if (priority) params.priority = priority;
    // Use the original request (not lowercased) as the title source.
    params.title = request.replace(/^(please\s+)?(create a task|add a task|remind me to|i need to|schedule a|set up a)\s+/i, '').trim();
    return {
      intent: 'create_task',
      params,
      note: 'Matched create-task trigger.',
    };
  }

  return {
    intent: 'unknown',
    params: {},
    note: 'No supported intent matched. Local fallback cannot handle this request.',
  };
}
