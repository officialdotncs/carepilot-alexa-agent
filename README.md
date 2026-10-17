# CarePilot

A care-coordination agent that helps a caregiver prepare for a family member's medical appointment. It uses a deterministic intent parser and structured tool execution for task management, with Amazon Bedrock (Amazon Nova Lite) for natural-language summaries via a secure server-side boundary.

Built for the AWS Builder mini-challenge.

## Quick Start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal. The app runs entirely in the browser with demo data preloaded.

## Environment Variables

The following variables are required in `.env` at the project root. They are public-facing values safe for the browser (prefixed with `VITE_`):

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL (used for the Bedrock edge function endpoint) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key (public, read-only access) |

**No AWS credentials appear in `.env`.** AWS credentials are configured as Supabase Edge Function secrets, which are encrypted at rest and never exposed to the browser. See the [Bedrock Integration](#bedrock-integration) section below.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Browser (React + Vite + Tailwind)                  │
│                                                     │
│  Overview · Workspace · Tasks · History · Settings  │
│         │                                           │
│    useAgentState (useSyncExternalStore)             │
│         │                                           │
│    AgentStore (reducer + debounced persistence)     │
│         │                                           │
│    Orchestrator (intent → plan → tools → trace)     │
│         │                                           │
│    Intent Parser → Planner → Tools (5 tools)        │
│         │                                           │
│    bedrock.ts (client fetch to edge function)       │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────┐
│  Supabase Edge Function (bedrock-summary)           │
│                                                     │
│  • Reads AWS credentials from Deno.env              │
│  • Signs SigV4 request using Web Crypto API         │
│  • Calls Amazon Bedrock (Amazon Nova Lite)          │
│  • Validates model output before returning          │
│  • Returns local fallback if Bedrock unavailable    │
└─────────────────────┬───────────────────────────────┘
                      │ AWS SigV4
┌─────────────────────▼───────────────────────────────┐
│  Amazon Bedrock (us-east-1)                         │
│  Model: amazon.nova-lite-v1:0                       │
└─────────────────────────────────────────────────────┘
```

### Core Components

| Layer | File | Purpose |
|-------|------|---------|
| Intent parser | `src/agent/intent.ts` | Deterministic keyword/rule-based intent classification |
| Planner | `src/agent/planner.ts` | Converts intents into structured, validated action plans |
| Orchestrator | `src/agent/orchestrator.ts` | Runs the request → plan → tools → trace pipeline |
| Tools | `src/agent/tools.ts` | 5 tools: create_task, update_task_status, read_outstanding_tasks, generate_preparation_checklist, produce_summary |
| Store | `src/agent/store.ts` | Reducer-based state with debounced localStorage persistence |
| Storage | `src/agent/storage.ts` | Versioned localStorage wrapper with graceful degradation |
| Bedrock client | `src/agent/bedrock.ts` | Browser-side fetch to the edge function with fallback |
| Edge function | `supabase/functions/bedrock-summary/index.ts` | Server-side Bedrock proxy with SigV4 signing |

### Agent Flow

1. User submits a natural-language request in the Workspace
2. `parseIntent()` classifies the request into one of 7 intents
3. `buildPlan()` produces ordered actions with dependencies and approval gates
4. `executeAction()` runs each action through the appropriate tool
5. Tools validate inputs, mutate state, and append execution records
6. For `produce_summary` intent, the orchestrator also calls the Bedrock edge function
7. All steps are recorded in the trace panel for full observability
8. State is persisted to localStorage (debounced 300ms)

## Supported Capabilities

- **Prepare for appointment**: Generates a multi-step plan with checklist, task creation, and approval-gated insurance/medication actions
- **Create task**: Creates a single task with auto-detected category and priority
- **Update task status**: Marks tasks as completed, blocked, in_progress, pending, or failed
- **Read outstanding tasks**: Lists all non-completed tasks
- **Generate checklist**: Produces a pre-appointment preparation checklist
- **Summarize status**: Produces a care-coordination summary (Bedrock when configured, local fallback otherwise)
- **Approve/Reject**: Approval queue for medications and insurance tasks
- **Retry failed actions**: Re-run failed tool calls from the trace panel
- **Persistence**: State survives browser refresh (tasks, history, activity, recipient)
- **Reset**: Restore original demo data from Settings

## Bedrock Integration

### How It Works

When the user asks for a status summary, the orchestrator calls the `bedrock-summary` Supabase Edge Function. The edge function:

1. Reads `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` from Supabase secrets
2. If credentials are missing, returns a deterministic local fallback immediately
3. If credentials are present, signs an AWS SigV4 request and calls Amazon Nova Lite
4. Validates the model output (non-empty string check) before returning it
5. On any error (network, auth, malformed response), returns the local fallback

The client module (`src/agent/bedrock.ts`) adds a second validation layer and a 10-second timeout.

### Required AWS Setup

1. **AWS account** with access to Amazon Bedrock in us-east-1
2. **IAM policy** granting `bedrock:InvokeModel` on `amazon.nova-lite-v1*`
3. **Model access** enabled in the Bedrock console
4. **Supabase Edge Function secrets** configured:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION` (e.g., `us-east-1`)

### Cost Estimate

- Amazon Nova Lite: ~$0.06 per 1M input tokens, ~$0.24 per 1M output tokens
- Each summary request: ~150-250 input tokens, ~100-200 output tokens
- **Per request: ~$0.00005-$0.00007**
- Supabase Edge Functions: included in existing plan

### Current Status

AWS credentials are configured. The edge function is deployed and SigV4 signing is verified working. To complete the integration, the IAM policy must be updated to grant `bedrock:InvokeModel` on `amazon.nova-lite-v1:0` (the previous policy was scoped to the now-deprecated `amazon.titan-text-express-v1`). Model access for Nova Lite must also be enabled in the Bedrock console. Until then, the function returns the local fallback with `"reason": "Bedrock returned 403"`.

## Limitations

- Intent parsing is keyword-based, not NLP — it handles specific phrasings and may not understand all variations
- No real-world side effects (no actual appointments booked, calls made, or messages sent)
- Care recipient profile is read-only (editing is a future phase)
- Settings toggles (auto-approve, notifications, quiet hours) are UI-only and do not affect agent behavior yet
- Bedrock integration only covers the `produce_summary` intent — all other intents use deterministic local tools
- localStorage persistence is browser-specific (no cross-device sync)
- The `prepare_appointment` plan is a fixed template, not dynamically generated

## Test Commands

```bash
# Run the test suite (45 tests)
npm test

# Run tests in watch mode
npm run test:watch

# TypeScript type checking
npm run typecheck

# Production build
npm run build

# Lint
npm run lint
```

### Test Coverage

The test suite (`src/agent/agent.test.ts`) covers:

- **Intent parser**: All 7 intent types, category extraction, priority extraction, unknown input
- **Planner**: Multi-action plans, single-action plans, dependency chains, approval gating
- **Store transitions**: CREATE_TASK, UPDATE_TASK_STATUS (with step propagation), APPROVE_TASK, REJECT_TASK, ADD_HISTORY
- **Store reset**: RESET_DEMO restores seed data, clears runs and conversation
- **Orchestrator**: Full run lifecycle, conversation messages, task creation, unknown intent handling, approval gating
- **Approval flow**: approveTask (approval + status advance), rejectTask (rejection + failed status), activity logging
- **Retry**: Non-existent run/action, non-failed action rejection
- **Restore summary**: buildRestoreSummary output
- **Persistence**: saveState/loadState round-trip, clearState, store restore path, fresh start
- **Duplicate protection**: Creating a task with an existing open title is blocked
- **Edge function source**: No AWS_SESSION_TOKEN dependency, exactly 3 secrets, correct canonical headers, no-credentials fallback preserved, Nova Lite model ID

## Demo Instructions

1. Open the app — you'll see the Overview with 6 seeded demo tasks for Margaret Chen
2. Click **Agent workspace** in the sidebar
3. Try these commands (or click the suggestion chips):
   - "Prepare for the appointment" — generates a 7-action plan with approval-gated insurance
   - "Create a task to refill Lisinopril" — creates a medications task requiring approval
   - "Summarize the current status" — calls the Bedrock edge function (falls back to local summary)
   - "What tasks are outstanding?" — lists all open tasks
   - "Generate a checklist" — produces a pre-appointment checklist
4. Go to **Tasks** to see the approval queue — approve or decline pending tasks
5. Go to **Execution history** to see chronological records of agent actions
6. Go to **Settings** to inspect data counts and reset to demo data
7. Refresh the browser — state persists across reloads (except runs and conversation)
