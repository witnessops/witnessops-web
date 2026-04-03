/**
 * HTTP client for the governed-exposure assessment server.
 *
 * Reads GES_SERVER_URL and GES_ASSESSMENT_KEY from environment.
 * If GES_SERVER_URL is not set, all functions return null gracefully
 * so that the caller can degrade without crashing.
 */

export interface AssessmentTriggerResult {
  run_id: string;
  status: "pending" | "running" | "completed" | "failed";
}

export interface FindingSummary {
  severity: string;
  title: string;
  category: string;
}

export interface AssessmentStatusResult {
  run_id: string;
  status: "pending" | "running" | "completed" | "failed";
  domain?: string;
  findings_count?: number;
  envelopes_count?: number;
  checks_count?: number;
  findings_summary?: FindingSummary[];
  signed_with?: string;
  completed_at?: string;
  error?: string;
}

function readConfig(): { serverUrl: string; assessmentKey: string } | null {
  const serverUrl = process.env.GES_SERVER_URL?.trim();
  const assessmentKey = process.env.GES_ASSESSMENT_KEY?.trim();
  if (!serverUrl || !assessmentKey) return null;
  return { serverUrl, assessmentKey };
}

/**
 * Trigger an assessment on the governed-exposure server.
 *
 * Returns the pending run_id, or null if the server is not configured.
 * Throws on server errors (non-2xx) so callers can record the failure.
 */
export async function triggerAssessment(req: {
  email: string;
  domain: string;
  issuanceId: string;
}): Promise<AssessmentTriggerResult | null> {
  const config = readConfig();
  if (!config) return null;

  const url = `${config.serverUrl}/assess`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Assessment-Key": config.assessmentKey,
    },
    body: JSON.stringify({
      email: req.email,
      domain: req.domain,
      issuanceId: req.issuanceId,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (response.status !== 202) {
    const detail = await response.text().catch(() => "(unreadable)");
    throw new Error(`Assessment server returned ${response.status}: ${detail}`);
  }

  const body = (await response.json()) as { run_id: string; status?: string };
  const status = body.status;
  return {
    run_id: body.run_id,
    status:
      status === "running" || status === "completed" || status === "failed"
        ? status
        : "pending",
  };
}

/**
 * Get the current status of an assessment run.
 *
 * Returns null if the server is not configured or run is not found.
 * Throws on unexpected server errors.
 */
export async function getAssessmentStatus(
  runId: string,
): Promise<AssessmentStatusResult | null> {
  const config = readConfig();
  if (!config) return null;

  const url = `${config.serverUrl}/assess/${encodeURIComponent(runId)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "X-Assessment-Key": config.assessmentKey },
    signal: AbortSignal.timeout(10_000),
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    const detail = await response.text().catch(() => "(unreadable)");
    throw new Error(`Assessment server returned ${response.status}: ${detail}`);
  }

  const body = (await response.json()) as { ok: boolean } & AssessmentStatusResult;
  return {
    run_id: body.run_id,
    status: body.status,
    domain: body.domain,
    findings_count: body.findings_count,
    envelopes_count: body.envelopes_count,
    checks_count: body.checks_count,
    findings_summary: body.findings_summary,
    signed_with: body.signed_with,
    completed_at: body.completed_at,
    error: body.error,
  };
}
