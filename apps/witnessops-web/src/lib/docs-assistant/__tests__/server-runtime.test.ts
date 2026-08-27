import assert from "node:assert/strict";
import test from "node:test";

import type { DocsAssistantRuntimeEnabledConfig } from "../runtime-config";
import {
  DOCS_ASSISTANT_STAGING_MODEL,
  DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID,
} from "../runtime-config";

function testConfig(): DocsAssistantRuntimeEnabledConfig {
  return {
    enabled: true,
    stage: "staging",
    vectorStoreId: DOCS_ASSISTANT_STAGING_VECTOR_STORE_ID,
    model: DOCS_ASSISTANT_STAGING_MODEL,
    apiKey: "test-key",
  };
}

test("docs assistant server runtime module import does not require OPENAI_API_KEY", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const runtimeModule = await import("../server-runtime");
    assert.equal(typeof runtimeModule.buildDocsAssistantResponsesRequest, "function");
  } finally {
    if (previousKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previousKey;
    }
  }
});

test("docs assistant request builder uses exact staging Responses file-search contract", async () => {
  const { buildDocsAssistantResponsesRequest } = await import("../server-runtime");

  const request = buildDocsAssistantResponsesRequest({
    payload: { question: "What is /verify for?", case_id: "probe-verify-purpose" },
    config: testConfig(),
  });

  assert.equal(request.model, "gpt-5.4-mini");
  assert.equal(request.store, false);
  assert.deepEqual(request.tools, [
    {
      type: "file_search",
      vector_store_ids: ["vs_69fe62ba0e8c81918d2763cece82f0c0"],
      max_num_results: 5,
    },
  ]);
  assert.deepEqual(request.tool_choice, { type: "file_search" });
  assert.equal(request.max_tool_calls, 1);
  assert.equal(request.max_output_tokens, 1_200);
  assert.deepEqual(request.include, ["file_search_call.results"]);
  assert.deepEqual(request.text.format.type, "json_schema");
  assert.deepEqual(request.text.format.name, "docs_assistant_answer");
  assert.equal(request.text.format.strict, true);
  assert.equal(request.text.format.schema.type, "object");
  assert.deepEqual(request.text.format.schema.additionalProperties, false);
  assert.deepEqual(
    request.text.format.schema.required,
    [
      "schema_version",
      "answer_status",
      "documented_facts",
      "inference",
      "citations",
      "unsupported_reason",
      "human_review_required",
      "not_proven",
      "boundary_findings",
    ],
  );
  assert.deepEqual(
    request.text.format.schema.properties.answer_status.enum,
    [
      "supported_by_docs",
      "partially_supported",
      "not_found_in_docs",
      "needs_human_review",
      "cannot_claim",
    ],
  );
  assert.match(
    request.input[0]?.content ?? "",
    /Return exactly one JSON object matching the supplied schema/,
  );
});

test("docs assistant server runtime uses injected fake fetch", async () => {
  const { runDocsAssistantServerRuntime } = await import("../server-runtime");
  let calls = 0;
  const fakeFetch = (async () => {
    calls += 1;
    return new Response(
      JSON.stringify({
        output_text: JSON.stringify({
          answer_status: "partially_supported",
          documented_facts: [
            {
              text: "WitnessOps publishes receipt checks at /verify.",
              citation_ids: ["src-collected-corpus-probe-verify-purpose-0"],
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
                file_id: "file-9ztnkfLvWtUvi9ZY52q2UQ",
                filename: "CORPUS_PACKAGE.json",
              },
            ],
          },
        ],
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  const answer = await runDocsAssistantServerRuntime({
    payload: { question: "What is /verify for?", case_id: "probe-verify-purpose" },
    config: testConfig(),
    fetchImpl: fakeFetch,
  });

  assert.equal(calls, 1);
  assert.equal(answer.answer_status, "partially_supported");
  assert.equal(answer.citations.length, 1);
  assert.equal(answer.citations[0]?.source_type, "openai_file_search_result");
});

test("docs assistant payload validator rejects unsupported request shapes", async () => {
  const { validateDocsAssistantAskPayload } = await import("../server-runtime");

  assert.deepEqual(validateDocsAssistantAskPayload(null), {
    ok: false,
    error: "request_body_must_be_json_object",
  });
  assert.deepEqual(validateDocsAssistantAskPayload({ question: "" }), {
    ok: false,
    error: "question_must_be_non_empty_string",
  });
  assert.deepEqual(
    validateDocsAssistantAskPayload({ question: "x", case_id: "" }),
    {
      ok: false,
      error: "case_id_must_be_non_empty_string",
    },
  );
});

test("docs assistant bounds provider time and maps timeout without leaking details", async () => {
  const { isDocsAssistantRuntimeUnavailable, runDocsAssistantServerRuntime } =
    await import("../server-runtime");
  const events: Array<Record<string, unknown>> = [];
  const neverCompletes = ((_url: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("aborted", "AbortError"));
      });
    })) as typeof fetch;

  const answer = await runDocsAssistantServerRuntime({
    payload: { question: "What does a proof packet include?" },
    config: testConfig(),
    fetchImpl: neverCompletes,
    timeoutMs: 5,
    logger: (event) => events.push(event as unknown as Record<string, unknown>),
  });

  assert.equal(isDocsAssistantRuntimeUnavailable(answer), true);
  assert.equal(answer.unsupported_reason, "docs_assistant_runtime_unavailable");
  assert.deepEqual(answer.boundary_findings, ["provider_timeout"]);
  assert.equal(events.at(-1)?.request_id, null);
  assert.equal(events.at(-1)?.error_class, "provider_timeout");
  assert.equal("question" in (events.at(-1) ?? {}), false);
});

test("docs assistant logs provider request IDs without prompt or response bodies", async () => {
  const { runDocsAssistantServerRuntime } = await import("../server-runtime");
  const events: Array<Record<string, unknown>> = [];
  const failedFetch = (async () =>
    new Response("upstream detail must not escape", {
      status: 502,
      headers: { "x-request-id": "req_safe_test" },
    })) as typeof fetch;

  const answer = await runDocsAssistantServerRuntime({
    payload: { question: "What does a proof packet include?" },
    config: testConfig(),
    fetchImpl: failedFetch,
    logger: (event) => events.push(event as unknown as Record<string, unknown>),
  });

  assert.equal(answer.unsupported_reason, "docs_assistant_runtime_unavailable");
  assert.deepEqual(answer.boundary_findings, ["provider_http_error"]);
  assert.equal(events[0]?.request_id, "req_safe_test");
  assert.equal(events[0]?.status, 502);
  assert.equal("question" in (events[0] ?? {}), false);
  assert.equal(JSON.stringify(answer).includes("upstream detail"), false);
});
