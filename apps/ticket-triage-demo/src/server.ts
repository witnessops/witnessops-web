import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { isFixtureId, loadFixture } from "./fixtures.js";
import {
  hasAllowedLoopbackAuthority,
  parseLoopbackRequestTarget,
} from "./http-guards.js";
import { createOpenAIProvider } from "./openai-provider.js";
import { resolveRuntimeConfig } from "./runtime-config.js";
import { runTicketTriage } from "./service.js";
import {
  DEMO_DATA_CLASSIFICATION,
  INPUT_SCHEMA_VERSION,
  type TicketTriageInput,
} from "./types.js";
import { renderPage } from "./ui.js";

const MAX_BODY_BYTES = 64 * 1024;
const LOOPBACK_HOST = "127.0.0.1";

function applySecurityHeaders(response: ServerResponse): void {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  applySecurityHeaders(response);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(value));
}

function sendHtml(response: ServerResponse, status: number, html: string): void {
  applySecurityHeaders(response);
  response.statusCode = status;
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(html);
}

async function readBoundedBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > MAX_BODY_BYTES) {
      request.resume();
      throw new Error("ticket_triage_request_body_too_large");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function nullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

function ticketFromForm(form: URLSearchParams): TicketTriageInput {
  return {
    schema_version: INPUT_SCHEMA_VERSION,
    ticket_id: form.get("ticket_id") ?? "",
    received_at: form.get("received_at") ?? "",
    data_classification: DEMO_DATA_CLASSIFICATION,
    requester: {
      display_name: form.get("requester_name") ?? "",
      company: form.get("requester_company") ?? "",
      contact: form.get("requester_contact") ?? "",
    },
    channel: (form.get("channel") ?? "portal") as TicketTriageInput["channel"],
    subject: form.get("subject") ?? "",
    description: form.get("description") ?? "",
    reported_impact: (form.get("reported_impact") ??
      "unknown") as TicketTriageInput["reported_impact"],
    context: {
      affected_service: nullable(form.get("affected_service")),
      device_type: nullable(form.get("device_type")),
      operating_system: nullable(form.get("operating_system")),
      location: nullable(form.get("location")),
      error_message: nullable(form.get("error_message")),
    },
    attachments: [0, 1, 2].flatMap((index) => {
      const fileName = nullable(form.get(`attachment_${index}_file_name`));
      const mediaType = nullable(form.get(`attachment_${index}_media_type`));
      if (!fileName || !mediaType) {
        return [];
      }
      return [
        {
          file_name: fileName,
          media_type: mediaType,
          description:
            nullable(form.get(`attachment_${index}_description`)) ?? "",
        },
      ];
    }),
  };
}

const runtime = resolveRuntimeConfig(process.env);
const config = {
  port: runtime.port,
  provider: createOpenAIProvider({
    apiKey: runtime.apiKey,
    model: runtime.model,
  }),
};

const server = createServer(async (request, response) => {
  try {
    if (!hasAllowedLoopbackAuthority({ headers: request.headers, port: config.port })) {
      sendJson(response, 403, { error: "loopback_authority_required" });
      return;
    }

    const requestUrl = parseLoopbackRequestTarget({
      requestTarget: request.url,
      port: config.port,
    });
    if (!requestUrl) {
      sendJson(response, 400, { error: "invalid_request_target" });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/health") {
      sendJson(response, 200, {
        status: "ready",
        provider: config.provider.name,
        model: config.provider.model,
        bind: LOOPBACK_HOST,
        external_actions: false,
      });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/") {
      const requestedFixture = requestUrl.searchParams.get("fixture");
      const fixtureId = isFixtureId(requestedFixture)
        ? requestedFixture
        : "DEMO-001";
      sendHtml(response, 200, renderPage({ ticket: await loadFixture(fixtureId) }));
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/triage") {
      if (!request.headers["content-type"]?.startsWith("application/json")) {
        sendJson(response, 415, { error: "application_json_required" });
        return;
      }
      const rawBody = await readBoundedBody(request);
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        parsed = null;
      }
      const startedAt = performance.now();
      const output = await runTicketTriage({
        rawInput: parsed,
        provider: config.provider,
      });
      process.stdout.write(
        `ticket_triage_run ticket_id=${output.ticket_id ?? "unknown"} status=${output.result_status} duration_ms=${Math.round(performance.now() - startedAt)}\n`,
      );
      sendJson(response, 200, output);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/triage") {
      if (!request.headers["content-type"]?.startsWith(
        "application/x-www-form-urlencoded",
      )) {
        sendJson(response, 415, { error: "form_urlencoded_required" });
        return;
      }
      const rawBody = await readBoundedBody(request);
      const ticket = ticketFromForm(new URLSearchParams(rawBody));
      const startedAt = performance.now();
      const output = await runTicketTriage({
        rawInput: ticket,
        provider: config.provider,
      });
      process.stdout.write(
        `ticket_triage_run ticket_id=${output.ticket_id ?? "unknown"} status=${output.result_status} duration_ms=${Math.round(performance.now() - startedAt)}\n`,
      );
      sendHtml(response, 200, renderPage({ ticket, output }));
      return;
    }

    sendJson(response, 404, { error: "not_found" });
  } catch (error) {
    const status =
      error instanceof Error &&
      error.message === "ticket_triage_request_body_too_large"
        ? 413
        : 500;
    sendJson(response, status, {
      error: status === 413 ? "request_body_too_large" : "bounded_runtime_error",
    });
  }
});

server.listen(config.port, LOOPBACK_HOST, () => {
  process.stdout.write(
    `ticket_triage_demo_ready url=http://${LOOPBACK_HOST}:${config.port} provider=${config.provider.name} model=${config.provider.model}\n`,
  );
});
