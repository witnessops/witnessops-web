import "server-only";
import { normalizeAskEvent } from "@/lib/docs-assistant/ask-analytics";

export function isAskTelemetryRequest(raw: unknown): boolean {
  return !!raw && typeof raw === "object" && Object.prototype.hasOwnProperty.call(raw, "telemetry");
}

/** The route applies its bounded body read and separate telemetry rate limit first. */
export function recordAskTelemetry(raw: unknown, request: Request): Response {
  const headers = { "Cache-Control": "no-store" };
  const origin = request.headers.get("origin");
  // Canonical public origins also work behind the existing TLS reverse proxy,
  // where the internal Request URL may use a different scheme or host.
  const sameOrigin = origin === new URL(request.url).origin ||
    origin === "https://witnessops.com" || origin === "https://www.witnessops.com";
  if (!origin || !sameOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
    return new Response(null, { status: 403, headers });
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).join() !== "telemetry") {
    return new Response(null, { status: 400, headers });
  }
  const telemetry = normalizeAskEvent((raw as Record<string, unknown>).telemetry);
  if (!telemetry) return new Response(null, { status: 400, headers });
  // Client-reported event counts, not proof of leads or completed transactions.
  // No request headers, IP, question, response, email, or persistent identity.
  console.info("[ask-witnessops:funnel]", JSON.stringify(telemetry));
  return new Response(null, { status: 204, headers });
}
