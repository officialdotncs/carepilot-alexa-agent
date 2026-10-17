import type {
  AgentActivity,
  CareRecipient,
  CareTask,
  ExecutionRecord,
} from '@/types';

// DEMO DATA — clearly labeled. No real integrations.
// Every consumer of this data is expected to treat it as simulated.

export const DEMO_FLAG = 'Demo data';

export const demoRecipient: CareRecipient = {
  id: 'rec-1',
  name: 'Margaret Chen',
  relationship: 'Mother',
  age: 71,
  nextAppointmentLabel: 'Wed, Oct 21 · 10:30 AM',
  nextAppointmentIso: '2026-10-21T10:30:00',
  provider: 'Dr. Anika Rao — Cardiology',
  conditionLabel: 'Post-op follow-up · hypertension management',
};

export const demoTasks: CareTask[] = [
  {
    id: 'task-1',
    title: 'Confirm cardiology follow-up appointment',
    description:
      'Call Dr. Rao’s office to confirm the Oct 21 appointment and request an earlier slot if any cancellation opens.',
    category: 'scheduling',
    status: 'in_progress',
    priority: 'high',
    approval: 'auto',
    dueLabel: 'Today · before 5:00 PM',
    dueIso: '2026-10-17T17:00:00',
    assignee: 'CarePilot',
    careRecipient: 'Margaret Chen',
    createdAtIso: '2026-10-16T09:12:00',
    source: 'sample',
    steps: [
      {
        id: 's1',
        title: 'Look up provider contact',
        detail: 'Retrieved cardiology office number from records.',
        status: 'completed',
        timestamp: '2026-10-17T08:55:00',
      },
      {
        id: 's2',
        title: 'Place confirmation call',
        detail: 'Calling to confirm Oct 21, 10:30 AM slot.',
        status: 'in_progress',
        timestamp: '2026-10-17T09:02:00',
      },
      {
        id: 's3',
        title: 'Log confirmed time back to calendar',
        detail: 'Pending confirmation from office.',
        status: 'pending',
      },
    ],
  },
  {
    id: 'task-2',
    title: 'Request medication refill — Lisinopril 10mg',
    description:
      'Submit a refill request to the pharmacy and arrange pickup. 3 days of supply remaining.',
    category: 'medications',
    status: 'pending',
    priority: 'urgent',
    approval: 'required',
    dueLabel: 'Tomorrow · 12:00 PM',
    dueIso: '2026-10-18T12:00:00',
    assignee: 'CarePilot',
    careRecipient: 'Margaret Chen',
    createdAtIso: '2026-10-16T11:30:00',
    source: 'sample',
    steps: [
      {
        id: 's1',
        title: 'Verify prescription on file',
        detail: 'Confirm Lisinopril 10mg, 30-day supply, 1 refill remaining.',
        status: 'pending',
      },
      {
        id: 's2',
        title: 'Submit refill to pharmacy',
        detail: 'Awaiting your approval before submitting.',
        status: 'pending',
      },
      {
        id: 's3',
        title: 'Schedule pickup window',
        detail: 'Coordinate pickup with Margaret’s routine.',
        status: 'pending',
      },
    ],
  },
  {
    id: 'task-3',
    title: 'Gather pre-visit records & vitals',
    description:
      'Compile recent blood pressure logs and the surgical discharge summary for Dr. Rao’s review.',
    category: 'records',
    status: 'pending',
    priority: 'medium',
    approval: 'required',
    dueLabel: 'Tue, Oct 20 · 9:00 AM',
    dueIso: '2026-10-20T09:00:00',
    assignee: 'CarePilot',
    careRecipient: 'Margaret Chen',
    createdAtIso: '2026-10-15T14:20:00',
    source: 'sample',
    steps: [
      {
        id: 's1',
        title: 'Export BP log (last 14 days)',
        detail: 'Pull from home monitor CSV.',
        status: 'pending',
      },
      {
        id: 's2',
        title: 'Attach discharge summary',
        detail: 'From the Aug 12 procedure.',
        status: 'pending',
      },
    ],
  },
  {
    id: 'task-4',
    title: 'Arrange transportation to clinic',
    description:
      'Book an accessible ride for Oct 21, 9:45 AM pickup, returning ~12:15 PM.',
    category: 'logistics',
    status: 'blocked',
    priority: 'high',
    approval: 'required',
    dueLabel: 'Mon, Oct 19 · 6:00 PM',
    dueIso: '2026-10-19T18:00:00',
    assignee: 'CarePilot',
    careRecipient: 'Margaret Chen',
    createdAtIso: '2026-10-15T10:05:00',
    source: 'sample',
    steps: [
      {
        id: 's1',
        title: 'Confirm pickup address',
        detail: 'Needs Margaret’s current address — please verify.',
        status: 'blocked',
      },
      {
        id: 's2',
        title: 'Book accessible ride',
        detail: 'Wheelchair-accessible preferred.',
        status: 'pending',
      },
    ],
  },
  {
    id: 'task-5',
    title: 'Send appointment reminder to Margaret',
    description:
      'Send a gentle reminder the evening before with time, address, and what to bring.',
    category: 'communication',
    status: 'completed',
    priority: 'low',
    approval: 'auto',
    dueLabel: 'Completed · yesterday',
    dueIso: '2026-10-16T18:00:00',
    assignee: 'CarePilot',
    careRecipient: 'Margaret Chen',
    createdAtIso: '2026-10-15T08:00:00',
    source: 'sample',
    steps: [
      {
        id: 's1',
        title: 'Compose reminder',
        detail: 'Friendly tone, large text.',
        status: 'completed',
        timestamp: '2026-10-16T17:30:00',
      },
      {
        id: 's2',
        title: 'Deliver via preferred channel',
        detail: 'Sent as SMS + email.',
        status: 'completed',
        timestamp: '2026-10-16T18:01:00',
      },
    ],
  },
  {
    id: 'task-6',
    title: 'Verify insurance coverage for the visit',
    description:
      'Confirm the cardiology follow-up is covered under the current plan and estimate copay.',
    category: 'insurance',
    status: 'completed',
    priority: 'medium',
    approval: 'approved',
    dueLabel: 'Completed · 2 days ago',
    dueIso: '2026-10-15T16:00:00',
    assignee: 'CarePilot',
    careRecipient: 'Margaret Chen',
    createdAtIso: '2026-10-14T09:00:00',
    source: 'sample',
    steps: [
      {
        id: 's1',
        title: 'Check plan network status',
        detail: 'Dr. Rao is in-network.',
        status: 'completed',
        timestamp: '2026-10-15T15:40:00',
      },
      {
        id: 's2',
        title: 'Estimate copay',
        detail: 'Specialist visit: $25 copay.',
        status: 'completed',
        timestamp: '2026-10-15T15:55:00',
      },
    ],
  },
];

export const demoHistory: ExecutionRecord[] = [
  {
    id: 'ex-1',
    taskId: 'task-5',
    taskTitle: 'Send appointment reminder to Margaret',
    category: 'communication',
    status: 'completed',
    startedIso: '2026-10-16T17:30:00',
    completedIso: '2026-10-16T18:01:00',
    durationLabel: '31 min',
    summary:
      'Composed and delivered a pre-appointment reminder via SMS and email. Delivery confirmed.',
    agent: 'CarePilot',
    approval: 'auto',
    source: 'sample',
  },
  {
    id: 'ex-2',
    taskId: 'task-6',
    taskTitle: 'Verify insurance coverage for the visit',
    category: 'insurance',
    status: 'completed',
    startedIso: '2026-10-15T15:40:00',
    completedIso: '2026-10-15T15:55:00',
    durationLabel: '15 min',
    summary:
      'Verified Dr. Rao is in-network. Specialist copay estimated at $25. No prior authorization required.',
    agent: 'CarePilot',
    approval: 'approved',
    source: 'sample',
  },
  {
    id: 'ex-3',
    taskId: 'task-1',
    taskTitle: 'Confirm cardiology follow-up appointment',
    category: 'scheduling',
    status: 'in_progress',
    startedIso: '2026-10-17T08:55:00',
    durationLabel: 'running',
    summary:
      'Retrieved provider contact and began confirmation call. Awaiting office response.',
    agent: 'CarePilot',
    approval: 'auto',
    source: 'sample',
  },
  {
    id: 'ex-4',
    taskId: 'task-4',
    taskTitle: 'Arrange transportation to clinic',
    category: 'logistics',
    status: 'blocked',
    startedIso: '2026-10-15T10:05:00',
    durationLabel: 'paused',
    summary:
      'Could not proceed — pickup address needs verification. Escalated to you for input.',
    agent: 'CarePilot',
    approval: 'required',
    source: 'sample',
  },
  {
    id: 'ex-5',
    taskId: 'task-2',
    taskTitle: 'Request medication refill — Lisinopril 10mg',
    category: 'medications',
    status: 'failed',
    startedIso: '2026-10-14T20:10:00',
    completedIso: '2026-10-14T20:14:00',
    durationLabel: '4 min',
    summary:
      'Auto-refill attempt halted — requires your explicit approval before contacting pharmacy.',
    agent: 'CarePilot',
    approval: 'required',
    source: 'sample',
  },
];

export const demoActivity: AgentActivity[] = [
  {
    id: 'a1',
    tsIso: '2026-10-17T09:02:00',
    label: 'Placed confirmation call to Dr. Rao’s office.',
    kind: 'action',
  },
  {
    id: 'a2',
    tsIso: '2026-10-17T08:55:00',
    label: 'Reviewed Margaret’s upcoming appointments for the week.',
    kind: 'thought',
  },
  {
    id: 'a3',
    tsIso: '2026-10-17T08:40:00',
    label: 'Flagged Lisinopril refill as needing your approval.',
    kind: 'approval',
  },
  {
    id: 'a4',
    tsIso: '2026-10-16T18:01:00',
    label: 'Reminder delivered to Margaret (SMS + email).',
    kind: 'success',
  },
  {
    id: 'a5',
    tsIso: '2026-10-16T17:30:00',
    label: 'Composed appointment reminder draft.',
    kind: 'thought',
  },
  {
    id: 'a6',
    tsIso: '2026-10-16T12:15:00',
    label: 'Insurance coverage verified — $25 copay confirmed.',
    kind: 'success',
  },
  {
    id: 'a7',
    tsIso: '2026-10-15T10:30:00',
    label: 'Transportation task blocked: pickup address unverified.',
    kind: 'warn',
  },
];
