import "server-only";

import { randomBytes } from "node:crypto";

export class AdminMcpDenial {
  readonly status: number;
  readonly code: string;
  readonly headers: Readonly<Record<string, string>>;

  constructor(
    status: number,
    code: string,
    headers: Readonly<Record<string, string>> = {},
  ) {
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

const MESSAGES: Readonly<Record<string, string>> = {
  unauthorized: "Unauthorized.",
  forbidden: "Forbidden.",
  not_found: "Not found.",
  method_not_allowed: "Method not allowed.",
  bad_request: "Bad request.",
  payload_too_large: "Payload too large.",
  rate_limited: "Too many requests.",
  unavailable: "Unavailable.",
  host_rejected: "Forbidden.",
  origin_rejected: "Forbidden.",
};

export function newRequestId(): string {
  return `req_${randomBytes(8).toString("hex")}`;
}

export function denialResponse(denial: AdminMcpDenial, requestId: string): Response {
  const message = MESSAGES[denial.code] ?? "Unavailable.";
  const headers = new Headers();
  headers.set("cache-control", "no-store");
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("x-content-type-options", "nosniff");
  if (denial.status !== 404) headers.set("x-request-id", requestId);
  if (denial.status === 401) headers.set("www-authenticate", "Bearer");
  for (const [name, value] of Object.entries(denial.headers)) {
    headers.set(name, value);
  }
  const body =
    denial.status === 404
      ? JSON.stringify({ ok: false, error: message })
      : JSON.stringify({
          ok: false,
          error: message,
          code: denial.code,
          requestId,
        });
  return new Response(body, { status: denial.status, headers });
}

export function jsonResponse(
  status: number,
  body: string,
  requestId: string,
  extra: Readonly<Record<string, string>> = {},
): Response {
  const headers = new Headers();
  headers.set("cache-control", "no-store");
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-request-id", requestId);
  for (const [name, value] of Object.entries(extra)) headers.set(name, value);
  return new Response(body, { status, headers });
}
