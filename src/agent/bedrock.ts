// ---------------------------------------------------------------------------
// Bedrock summary client — calls the Supabase Edge Function that proxies
// to Amazon Bedrock. The edge function holds AWS credentials server-side
// and returns either a Bedrock-generated summary or a structured fallback.
//
// This module runs in the browser. It never sees AWS credentials — it only
// calls our own edge function endpoint.
// ---------------------------------------------------------------------------

export interface BedrockSummaryInput {
  tasks: Array<{
    title: string;
    status: string;
    category: string;
    priority: string;
    approval: string;
    dueLabel: string;
  }>;
  recipient: {
    name: string;
    relationship: string;
    provider: string;
    nextAppointmentLabel: string;
    conditionLabel: string;
  };
}

export interface BedrockSummaryResult {
  summary: string;
  source: 'amazon_bedrock' | 'local_fallback';
  model?: string;
  reason?: string;
}

export async function fetchBedrockSummary(
  input: BedrockSummaryInput
): Promise<BedrockSummaryResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      summary: buildLocalFallback(input),
      source: 'local_fallback',
      reason: 'Supabase URL or key not configured',
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const resp = await fetch(`${supabaseUrl}/functions/v1/bedrock-summary`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      return {
        summary: buildLocalFallback(input),
        source: 'local_fallback',
        reason: `Edge function returned ${resp.status}`,
      };
    }

    const data = await resp.json() as BedrockSummaryResult;

    // Validate the returned summary before trusting it.
    if (!data.summary || typeof data.summary !== 'string' || data.summary.trim().length === 0) {
      return {
        summary: buildLocalFallback(input),
        source: 'local_fallback',
        reason: 'Edge function returned empty summary',
      };
    }

    return {
      summary: data.summary.trim(),
      source: data.source,
      model: data.model,
      reason: data.reason,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      summary: buildLocalFallback(input),
      source: 'local_fallback',
      reason: `Fetch failed: ${message}`,
    };
  }
}

function buildLocalFallback(input: BedrockSummaryInput): string {
  const pending = input.tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;
  const completed = input.tasks.filter((t) => t.status === 'completed').length;
  const blocked = input.tasks.filter((t) => t.status === 'blocked').length;
  const approvals = input.tasks.filter((t) => t.approval === 'required' && t.status !== 'completed').length;
  return `${input.recipient.name} — ${pending} pending, ${completed} completed, ${blocked} blocked, ${approvals} awaiting your approval.`;
}
