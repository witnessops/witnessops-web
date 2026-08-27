import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { _resetAllStores } from "@witnessops/config/rate-limit";
import { JSON_AMBIGUITY_MAX_DEPTH } from "@/lib/json-ambiguity";
import {
  DOCS_ASSISTANT_COLLECTED_CORPUS_FILE_ID,
  DOCS_ASSISTANT_STAGING_MODEL,
  DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID,
} from "@/lib/docs-assistant/runtime-config";
import { POST } from "./route";

afterEach(() => {
  _resetAllStores();
  delete process.env.OPENAI_API_KEY;
  delete process.env.WITNESSOPS_ASK_OPENAI_ENABLED;
  delete process.env.WITNESSOPS_ASK_OPENAI_STAGE;
  delete process.env.WITNESSOPS_DOCS_ASSISTANT_VECTOR_STORE_ID;
  delete process.env.WITNESSOPS_DOCS_ASSISTANT_MODEL;
});

function enableTestOpenAiRuntime() {
  process.env.OPENAI_API_KEY = "test-only-placeholder";
  process.env.WITNESSOPS_ASK_OPENAI_ENABLED = "true";
  process.env.WITNESSOPS_ASK_OPENAI_STAGE = "production";
  process.env.WITNESSOPS_DOCS_ASSISTANT_VECTOR_STORE_ID =
    DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID;
  process.env.WITNESSOPS_DOCS_ASSISTANT_MODEL = DOCS_ASSISTANT_STAGING_MODEL;
}

function askRequest(question: string, ip: string) {
  return new Request("https://witnessops.com/api/ask-witnessops", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ question }),
  });
}

test("public Ask rejects malformed UTF-8 before JSON parsing", async () => {
  const response = await POST(
    new Request("https://witnessops.com/api/ask-witnessops", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.84",
      },
      body: new Uint8Array([
        0x7b, 0x22, 0x71, 0x75, 0x65, 0x73, 0x74, 0x69, 0x6f, 0x6e, 0x22,
        0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d,
      ]),
    }),
  );

  assert.equal(response.status, 400);
  const payload = (await response.json()) as { message?: string };
  assert.equal(payload.message, "request body must be valid UTF-8.");
});

test("public Ask returns an answer without durable receipt custody", async () => {
  const response = await POST(
    new Request("https://witnessops.com/api/ask-witnessops", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.81",
      },
      body: JSON.stringify({ question: "Do I need a fit check?" }),
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Ask-Receipt-Id"), null);
  assert.equal(response.headers.get("X-Ask-Receipt-Status"), null);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const payload = (await response.json()) as {
    schema?: string;
    answer_mode?: string;
  };
  assert.equal(payload.schema, "witnessops.ask.assembled-answer.v1");
  assert.equal(payload.answer_mode, "deterministic_fallback");
});

test("public Ask uses the bounded server-only OpenAI Responses contract when enabled", async () => {
  enableTestOpenAiRuntime();
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  let requestInit: RequestInit | undefined;

  globalThis.fetch = (async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(
      JSON.stringify({
        output_text: JSON.stringify({
          answer_status: "partially_supported",
          documented_facts: [
            {
              text: "WitnessOps is independently certified secure.",
              citation_ids: ["0"],
            },
          ],
          inference: [],
          citations: [],
          unsupported_reason: null,
          human_review_required: false,
          not_proven: ["source_freshness"],
          boundary_findings: [],
        }),
        output: [
          {
            type: "file_search_call",
            results: [
              {
                index: 0,
                file_id: DOCS_ASSISTANT_COLLECTED_CORPUS_FILE_ID,
                filename: "CORPUS_PACKAGE.json",
              },
            ],
          },
        ],
      }),
      { status: 200, headers: { "x-request-id": "req_test" } },
    );
  }) as typeof fetch;

  try {
    const response = await POST(
      askRequest("What does a proof packet include?", "203.0.113.85"),
    );
    const payload = (await response.json()) as {
      answer_mode?: string;
      status?: string;
      template?: { body?: string };
    };

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(requestUrl, "https://api.openai.com/v1/responses");
    assert.equal(requestInit?.method, "POST");
    const body = JSON.parse(String(requestInit?.body)) as {
      model?: string;
      store?: boolean;
      max_output_tokens?: number;
      max_tool_calls?: number;
      tools?: Array<{ vector_store_ids?: string[] }>;
      text?: { format?: { strict?: boolean } };
    };
    assert.equal(body.model, DOCS_ASSISTANT_STAGING_MODEL);
    assert.equal(body.store, false);
    assert.equal(body.max_output_tokens, 1_200);
    assert.equal(body.max_tool_calls, 1);
    assert.deepEqual(body.tools?.[0]?.vector_store_ids, [
      DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID,
    ]);
    assert.equal(body.text?.format?.strict, true);
    assert.equal(payload.answer_mode, "ai_assisted");
    assert.equal(payload.status, "success");
    assert.ok((payload.template?.body ?? "").length > 0);
    assert.equal(
      (payload.template?.body ?? "").includes(
        "WitnessOps is independently certified secure.",
      ),
      false,
    );
    assert.equal(JSON.stringify(payload).includes("test-only-placeholder"), false);
    assert.equal(response.headers.get("X-Ask-Receipt-Id"), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public Ask falls back honestly when OpenAI is unavailable", async () => {
  enableTestOpenAiRuntime();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new DOMException("aborted", "AbortError");
  }) as typeof fetch;

  try {
    const response = await POST(
      askRequest("What does a proof packet include?", "203.0.113.86"),
    );
    const payload = (await response.json()) as {
      answer_mode?: string;
      template?: { body?: string };
    };

    assert.equal(response.status, 200);
    assert.equal(payload.answer_mode, "deterministic_fallback");
    assert.ok((payload.template?.body ?? "").length > 0);
    assert.equal(JSON.stringify(payload).includes("provider_"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public Ask refuses evidence intake before any provider call", async () => {
  enableTestOpenAiRuntime();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    throw new Error("provider must not be called");
  }) as typeof fetch;

  try {
    const response = await POST(
      askRequest("Can I send logs or screenshots?", "203.0.113.87"),
    );
    const payload = (await response.json()) as {
      answer_mode?: string;
      status?: string;
      template?: { body?: string };
    };

    assert.equal(calls, 0);
    assert.equal(payload.answer_mode, "policy_refusal");
    assert.equal(payload.status, "closed");
    assert.match(payload.template?.body ?? "", /Do not paste/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public Ask rejects valid but excessively nested JSON as a controlled client error", async () => {
  const depth = JSON_AMBIGUITY_MAX_DEPTH + 1;
  const body = `${'{"nested":'.repeat(depth)}{"question":"one","question":"two"}${"}".repeat(depth)}`;
  assert.doesNotThrow(() => JSON.parse(body));

  const response = await POST(
    new Request("https://witnessops.com/api/ask-witnessops", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.82",
      },
      body,
    }),
  );

  assert.equal(response.status, 400);
  const payload = (await response.json()) as { failureClass?: string; message?: string };
  assert.equal(payload.failureClass, "FAILURE_INPUT_MALFORMED");
  assert.equal(payload.message, "request body exceeds supported JSON parser limits.");
});

test("public Ask keeps malformed JSON distinct from the scanner depth limit", async () => {
  const response = await POST(
    new Request("https://witnessops.com/api/ask-witnessops", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.83",
      },
      body: '{"unterminated":',
    }),
  );

  assert.equal(response.status, 400);
  const payload = (await response.json()) as { failureClass?: string; message?: string };
  assert.equal(payload.failureClass, "FAILURE_INPUT_MALFORMED");
  assert.equal(payload.message, "request body must be valid JSON.");
});
