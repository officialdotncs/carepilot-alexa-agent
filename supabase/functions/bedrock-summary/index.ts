// ---------------------------------------------------------------------------
// Edge function: bedrock-summary
//
// Proxies a request to Amazon Bedrock (Titan Text Express) to produce a
// natural-language care-coordination summary. Credentials are read from
// Supabase Edge Function secrets — never from the client, never from .env,
// never logged.
//
// If AWS credentials are not configured or Bedrock returns an error, the
// function responds with a structured fallback so the client can display
// the deterministic local summary instead.
//
// Required secrets (set via Supabase dashboard or CLI):
//   AWS_ACCESS_KEY_ID     — IAM key with bedrock:InvokeModel
//   AWS_SECRET_ACCESS_KEY — IAM secret key
//   AWS_REGION            — e.g. us-east-1
//
// IAM policy (minimum):
//   {
//     "Version": "2012-10-17",
//     "Statement": [{
//       "Effect": "Allow",
//       "Action": "bedrock:InvokeModel",
//       "Resource": "arn:aws:bedrock:*:*:model/amazon.titan-text-express-v1"
//     }]
//   }
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SummaryRequest {
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

function deterministicFallback(req: SummaryRequest): string {
  const pending = req.tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;
  const completed = req.tasks.filter((t) => t.status === 'completed').length;
  const blocked = req.tasks.filter((t) => t.status === 'blocked').length;
  const approvals = req.tasks.filter((t) => t.approval === 'required' && t.status !== 'completed').length;
  return `${req.recipient.name} — ${pending} pending, ${completed} completed, ${blocked} blocked, ${approvals} awaiting your approval.`;
}

// AWS SigV4 signing (minimal implementation for Bedrock InvokeModel).
async function signAndCallBedrock(
  body: string,
  accessKey: string,
  secretKey: string,
  region: string,
  sessionToken: string | undefined
): Promise<{ ok: boolean; status: number; text: string }> {
  const service = 'bedrock';
  const host = `bedrock-runtime.${region}.amazonaws.com`;
  const modelId = 'amazon.titan-text-express-v1';
  const endpoint = `https://${host}/model/${modelId}/invoke`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const encoder = new TextEncoder();

  // Canonical request
  const canonicalUri = `/model/${modelId}/invoke`;
  const canonicalQueryString = '';
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-date';
  const payloadHash = await sha256Hex(body);

  const canonicalRequest = `POST\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  // String to sign
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;

  // Signing key
  const kDate = await hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = await hmacSha256Hex(kSigning, stringToSign);

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Host': host,
    'X-Amz-Date': amzDate,
    'Authorization': authHeader,
  };
  if (sessionToken) {
    headers['X-Amz-Security-Token'] = sessionToken;
  }

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers,
    body,
  });
  const text = await resp.text();
  return { ok: resp.ok, status: resp.status, text };
}

async function sha256Hex(data: string | ArrayBuffer): Promise<string> {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return arrayBufferToHex(hash);
}

async function hmacSha256(key: string | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const keyBuf = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey('raw', keyBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function hmacSha256Hex(key: string | ArrayBuffer, data: string): Promise<string> {
  const sig = await hmacSha256(key, data);
  return arrayBufferToHex(sig);
}

function arrayBufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const accessKey = Deno.env.get('AWS_ACCESS_KEY_ID');
  const secretKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
  const region = Deno.env.get('AWS_REGION') || 'us-east-1';
  const sessionToken = Deno.env.get('AWS_SESSION_TOKEN');

  let reqBody: SummaryRequest;
  try {
    reqBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate input shape before doing anything.
  if (!reqBody || !Array.isArray(reqBody.tasks) || !reqBody.recipient?.name) {
    return new Response(JSON.stringify({ error: 'Missing required fields: tasks[], recipient.name' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // If no AWS credentials, return fallback immediately.
  if (!accessKey || !secretKey) {
    const fallback = deterministicFallback(reqBody);
    return new Response(JSON.stringify({
      summary: fallback,
      source: 'local_fallback',
      reason: 'AWS credentials not configured',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Build the Bedrock prompt from structured state.
  const taskLines = reqBody.tasks.map((t) =>
    `- [${t.status}] ${t.title} (${t.category}, ${t.priority}, ${t.approval}, due: ${t.dueLabel})`
  ).join('\n');

  const prompt = `You are a care coordination assistant. Summarize the current state in 2-3 sentences for the caregiver. Be warm, clear, and actionable. Do not use markdown.

Care recipient: ${reqBody.recipient.name} (${reqBody.recipient.relationship}), ${reqBody.recipient.conditionLabel}
Next appointment: ${reqBody.recipient.nextAppointmentLabel} with ${reqBody.recipient.provider}

Tasks:
${taskLines}

Summary:`;

  const bedrockBody = JSON.stringify({
    inputText: prompt,
    textGenerationConfig: {
      maxTokenCount: 200,
      temperature: 0.3,
      stopSequences: [],
    },
  });

  try {
    const result = await signAndCallBedrock(bedrockBody, accessKey, secretKey, region, sessionToken);

    if (!result.ok) {
      return new Response(JSON.stringify({
        summary: deterministicFallback(reqBody),
        source: 'local_fallback',
        reason: `Bedrock returned ${result.status}`,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bedrockResp = JSON.parse(result.text);
    // Titan Text Express returns: { results: [{ outputText: "..." }] }
    const modelText = bedrockResp?.results?.[0]?.outputText;

    if (!modelText || typeof modelText !== 'string' || modelText.trim().length === 0) {
      return new Response(JSON.stringify({
        summary: deterministicFallback(reqBody),
        source: 'local_fallback',
        reason: 'Bedrock returned empty or malformed output',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      summary: modelText.trim(),
      source: 'amazon_bedrock',
      model: 'amazon.titan-text-express-v1',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({
      summary: deterministicFallback(reqBody),
      source: 'local_fallback',
      reason: `Fetch error: ${message}`,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
