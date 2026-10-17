import { uid, nowIso } from '@/agent/util';
import { parseIntent } from '@/agent/intent';
import type { AgentState } from '@/agent/store';
import type {
  AgentIntent,
  AgentPlan,
  PlannedAction,
  TaskCategory,
  ToolName,
} from '@/types';

// ---------------------------------------------------------------------------
// Planner — converts a parsed intent into a structured plan: a list of
// validated, ordered actions with dependencies, priorities, and approval
// requirements. This is deterministic and local.
// ---------------------------------------------------------------------------

interface PlanInput {
  request: string;
  state: AgentState;
  intent: AgentIntent;
  params: Record<string, unknown>;
  note: string;
}

function action(
  toolName: ToolName,
  args: Record<string, unknown>,
  description: string,
  opts: { requiresApproval?: boolean; dependsOn?: string[] } = {}
): PlannedAction {
  return {
    id: uid('act'),
    toolName,
    args,
    description,
    requiresApproval: opts.requiresApproval ?? false,
    dependsOn: opts.dependsOn ?? [],
  };
}

// Medications and insurance actions always require approval — safety policy.
function categoryRequiresApproval(category: TaskCategory): boolean {
  return category === 'medications' || category === 'insurance';
}

export function buildPlan(input: PlanInput): AgentPlan {
  const { request, intent, params, note } = input;
  const createdAtIso = nowIso();

  switch (intent) {
    case 'prepare_appointment': {
      // Full preparation plan: a checklist, then task-creation actions,
      // ordered with dependencies. Medications + insurance require approval.
      const checklist = action(
        'generate_preparation_checklist',
        {},
        'Generate a preparation checklist for the upcoming appointment.'
      );

      const confirmAppt = action(
        'create_task',
        {
          title: 'Confirm upcoming appointment',
          description: 'Confirm the appointment time with the provider’s office.',
          category: 'scheduling' as TaskCategory,
          priority: 'high',
        },
        'Create task: confirm the upcoming appointment.',
        { dependsOn: [checklist.id] }
      );

      const gatherRecords = action(
        'create_task',
        {
          title: 'Gather pre-visit records and vitals',
          description: 'Compile recent vitals and discharge summary for the visit.',
          category: 'records' as TaskCategory,
          priority: 'medium',
        },
        'Create task: gather pre-visit records and vitals.',
        { dependsOn: [checklist.id] }
      );

      const insurance = action(
        'create_task',
        {
          title: 'Verify insurance coverage for the visit',
          description: 'Confirm the visit is covered and estimate copay.',
          category: 'insurance' as TaskCategory,
          priority: 'medium',
          requiresApproval: true,
        },
        'Create task: verify insurance coverage (requires approval).',
        { requiresApproval: true, dependsOn: [checklist.id] }
      );

      const transport = action(
        'create_task',
        {
          title: 'Arrange transportation to the clinic',
          description: 'Book an accessible ride for appointment day.',
          category: 'logistics' as TaskCategory,
          priority: 'high',
        },
        'Create task: arrange transportation to the clinic.',
        { dependsOn: [confirmAppt.id] }
      );

      const reminder = action(
        'create_task',
        {
          title: 'Send appointment reminder to the care recipient',
          description: 'Send a gentle reminder the evening before.',
          category: 'communication' as TaskCategory,
          priority: 'low',
        },
        'Create task: send appointment reminder.',
        { dependsOn: [confirmAppt.id] }
      );

      const summary = action(
        'produce_summary',
        {},
        'Produce a summary of the resulting care plan.',
        { dependsOn: [confirmAppt.id, gatherRecords.id, insurance.id, transport.id, reminder.id] }
      );

      return {
        id: uid('plan'),
        intent,
        request,
        createdAtIso,
        note,
        fallback: true,
        actions: [checklist, confirmAppt, gatherRecords, insurance, transport, reminder, summary],
      };
    }

    case 'create_task': {
      const category = (params.category as TaskCategory) ?? 'communication';
      const priority = (params.priority as string) ?? 'medium';
      const title = (params.title as string) || 'New task';
      const requiresApproval = categoryRequiresApproval(category);
      const create = action(
        'create_task',
        { title, description: title, category, priority, requiresApproval },
        requiresApproval
          ? `Create task: "${title}" (${category}) — requires your approval.`
          : `Create task: "${title}" (${category}).`,
        { requiresApproval }
      );
      return {
        id: uid('plan'),
        intent,
        request,
        createdAtIso,
        note,
        fallback: true,
        actions: [create],
      };
    }

    case 'update_task_status': {
      const status = params.status as string | undefined;
      if (!status) {
        return {
          id: uid('plan'),
          intent,
          request,
          createdAtIso,
          note: 'Could not determine target status from the request.',
          fallback: true,
          actions: [],
        };
      }
      // Try to find a matching task by title fragment.
      const lower = request.toLowerCase();
      const match = input.state.tasks.find(
        (t: { id: string; title: string; status: string }) =>
          t.status !== 'completed' && lower.includes(t.title.toLowerCase().slice(0, 12))
      );
      if (!match) {
        return {
          id: uid('plan'),
          intent,
          request,
          createdAtIso,
          note: 'Could not match the request to an existing task. Specify the task name.',
          fallback: true,
          actions: [],
        };
      }
      const update = action(
        'update_task_status',
        { taskId: match.id, status },
        `Mark "${match.title}" as ${status.replace('_', ' ')}.`
      );
      return {
        id: uid('plan'),
        intent,
        request,
        createdAtIso,
        note,
        fallback: true,
        actions: [update],
      };
    }

    case 'read_outstanding': {
      const read = action(
        'read_outstanding_tasks',
        {},
        'Read all outstanding (non-completed) tasks.'
      );
      return {
        id: uid('plan'),
        intent,
        request,
        createdAtIso,
        note,
        fallback: true,
        actions: [read],
      };
    }

    case 'generate_checklist': {
      const gen = action(
        'generate_preparation_checklist',
        {},
        'Generate a pre-appointment preparation checklist.'
      );
      return {
        id: uid('plan'),
        intent,
        request,
        createdAtIso,
        note,
        fallback: true,
        actions: [gen],
      };
    }

    case 'produce_summary': {
      const sum = action('produce_summary', {}, 'Produce a summary of current care state.');
      return {
        id: uid('plan'),
        intent,
        request,
        createdAtIso,
        note,
        fallback: true,
        actions: [sum],
      };
    }

    case 'unknown':
    default:
      return {
        id: uid('plan'),
        intent: 'unknown',
        request,
        createdAtIso,
        note: note || 'Unsupported request. The local agent could not classify it.',
        fallback: true,
        actions: [],
      };
  }
}

/** Convenience: parse + plan in one step. */
export function planFromRequest(request: string, state: AgentState): AgentPlan {
  const parsed = parseIntent(request);
  return buildPlan({
    request,
    state,
    intent: parsed.intent,
    params: parsed.params,
    note: parsed.note,
  });
}
