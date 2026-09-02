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

const CURRENT_PRIMARY_OFFER = {
  name: "Agent Action Security Review",
  price_label: "€2,500 fixed",
  unit_label: "One consequential agent or automation action",
  fit_check_label: "Non-secret fit check first",
  delivery_label: "Within 10 working days after evidence rules are agreed",
} as const;

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

test("public Ask recognizes a natural agent key-rotation buyer workflow", async () => {
  enableTestOpenAiRuntime();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    throw new Error("provider must not be called");
  }) as typeof fetch;

  try {
    const response = await POST(
      askRequest(
        "We use an AI agent to rotate compromised production API keys. How do we prove who authorized it, what changed, and whether the old key was revoked?",
        "203.0.113.88",
      ),
    );
    const payload = (await response.json()) as {
      answer_mode?: string;
      status?: string;
      route?: { route_id?: string } | null;
      commercial_fit?: {
        result?: string;
        intent?: string;
        offer_id?: string;
        matching_specimen_id?: string;
        offer?: {
          name?: string;
          price_label?: string;
          unit_label?: string;
          fit_check_label?: string;
          delivery_label?: string;
        };
      };
    };

    assert.equal(calls, 0);
    assert.equal(response.status, 200);
    assert.equal(payload.answer_mode, "policy_refusal");
    assert.equal(payload.status, "closed");
    assert.equal(payload.route, null);
    assert.equal(payload.commercial_fit?.result, "likely");
    assert.equal(payload.commercial_fit?.intent, "workflow");
    assert.equal(
      payload.commercial_fit?.offer_id,
      "bounded-workflow-review",
    );
    assert.deepEqual(payload.commercial_fit?.offer, CURRENT_PRIMARY_OFFER);
    assert.equal(
      payload.commercial_fit?.matching_specimen_id,
      "ai-agent-action-proof-run",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public Ask recognizes the paid offer and price", async () => {
  const response = await POST(
    askRequest(
      "What is included in Agent Action Security Review and how much does it cost?",
      "203.0.113.89",
    ),
  );
  const payload = (await response.json()) as {
    status?: string;
    route?: { route_id?: string } | null;
    commercial_fit?: {
      result?: string;
      intent?: string;
      offer?: {
        name?: string;
        price_label?: string;
        unit_label?: string;
        fit_check_label?: string;
        delivery_label?: string;
      };
    };
  };

  assert.equal(payload.status, "closed");
  assert.equal(payload.route, null);
  assert.equal(payload.commercial_fit?.result, "likely");
  assert.equal(payload.commercial_fit?.intent, "offer");
  assert.deepEqual(payload.commercial_fit?.offer, CURRENT_PRIMARY_OFFER);
});

test("public Ask never sends a secret-bearing buyer question to the provider", async () => {
  enableTestOpenAiRuntime();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    throw new Error("provider must not be called");
  }) as typeof fetch;

  try {
    const response = await POST(
      askRequest(
        "Can WitnessOps review one bounded AI-agent action? The agent used api_key=sk-proj-abcdefghijklmnopqrstuv.",
        "203.0.113.90",
      ),
    );
    const payload = (await response.json()) as {
      schema?: string;
      answer_mode?: string;
      status?: string;
      assembler_contract_id?: string;
      deterministic_replay_hash?: string;
      authority_answer?: {
        schema?: string;
        status?: string;
        route?: unknown;
        template?: { template_id?: string };
        policy_decision?: {
          question_class_id?: string;
          template_id?: string;
        };
      };
      commercial_fit?: { result?: string; offer?: unknown };
    };

    assert.equal(calls, 0);
    assert.equal(
      payload.schema,
      "witnessops.ask.public-boundary-response.v1",
    );
    assert.equal(payload.answer_mode, "policy_refusal");
    assert.equal(payload.status, "closed");
    assert.equal(payload.assembler_contract_id, undefined);
    assert.equal(payload.deterministic_replay_hash, undefined);
    assert.equal(
      payload.authority_answer?.schema,
      "witnessops.ask.assembled-answer.v1",
    );
    assert.equal(
      payload.authority_answer?.policy_decision?.question_class_id,
      "ai_agent_action",
    );
    assert.equal(
      payload.authority_answer?.template?.template_id,
      payload.authority_answer?.policy_decision?.template_id,
    );
    assert.equal(payload.commercial_fit?.result, "blocked");
    assert.equal(payload.commercial_fit?.offer, null);
    assert.equal(JSON.stringify(payload).includes("sk-proj"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public Ask does not sell or send an active incident to the provider", async () => {
  enableTestOpenAiRuntime();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    throw new Error("provider must not be called");
  }) as typeof fetch;

  try {
    const response = await POST(
      askRequest(
        "Can WitnessOps review one bounded AI-agent action during our active ransomware incident right now?",
        "203.0.113.91",
      ),
    );
    const payload = (await response.json()) as {
      answer_mode?: string;
      status?: string;
      route?: unknown;
      authority_answer?: {
        policy_decision?: { question_class_id?: string };
      };
      commercial_fit?: { result?: string; offer?: unknown };
    };

    assert.equal(calls, 0);
    assert.equal(payload.answer_mode, "policy_refusal");
    assert.equal(payload.status, "closed");
    assert.equal(payload.route, null);
    assert.equal(
      payload.authority_answer?.policy_decision?.question_class_id,
      "ai_agent_action",
    );
    assert.equal(payload.commercial_fit?.result, "not_fit");
    assert.equal(payload.commercial_fit?.offer, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public Ask hard-stops broader secret, abuse, and claim boundaries", async () => {
  enableTestOpenAiRuntime();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    throw new Error("provider must not be called");
  }) as typeof fetch;

  const cases = [
    {
      question:
        'Can WitnessOps review one bounded AI-agent action? It used {"apiKey":"supersecretvalue123"}.',
      expectedResult: "blocked",
      forbiddenEcho: "supersecretvalue123",
    },
    {
      question:
        "Can WitnessOps review one bounded AI-agent action? AWS_SECRET_ACCESS_KEY=anothersecretvalue123.",
      expectedResult: "blocked",
      forbiddenEcho: "anothersecretvalue123",
    },
    {
      question:
        "Can WitnessOps review one bounded AI-agent action that probes a rival without permission?",
      expectedResult: "blocked",
      forbiddenEcho: "without permission",
    },
    {
      question:
        "Can WitnessOps review one bounded AI-agent action and verify that it is secure?",
      expectedResult: "not_fit",
      forbiddenEcho: "verify that it is secure",
    },
  ] as const;

  try {
    for (const [index, item] of cases.entries()) {
      const response = await POST(
        askRequest(item.question, `203.0.113.${100 + index}`),
      );
      const payload = (await response.json()) as {
        answer_mode?: string;
        status?: string;
        authority_answer?: {
          policy_decision?: { question_class_id?: string };
        };
        commercial_fit?: { result?: string; offer?: unknown };
      };

      assert.equal(payload.answer_mode, "policy_refusal");
      assert.equal(payload.status, "closed");
      assert.equal(
        payload.authority_answer?.policy_decision?.question_class_id,
        "ai_agent_action",
      );
      assert.equal(payload.commercial_fit?.result, item.expectedResult);
      assert.equal(payload.commercial_fit?.offer, null);
      assert.equal(JSON.stringify(payload).includes(item.forbiddenEcho), false);
    }
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public Ask hard-stops common secret and unsafe-language variants before the provider", async () => {
  enableTestOpenAiRuntime();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    throw new Error("provider must not be called");
  }) as typeof fetch;

  const cases = [
    {
      question:
        "Can WitnessOps review one bounded AI-agent action? Authorization: Basic dXNlcjpwYXNz",
      expectedResult: "blocked",
    },
    {
      question:
        "Can WitnessOps review one bounded AI-agent action? -----BEGIN ENCRYPTED PRIVATE KEY-----",
      expectedResult: "blocked",
    },
    {
      question:
        "Can WitnessOps review one bounded AI-agent action while our systems are currently being hacked?",
      expectedResult: "not_fit",
    },
    {
      question:
        "Can WitnessOps review one bounded AI-agent action that steals credentials from a rival?",
      expectedResult: "blocked",
    },
  ] as const;

  try {
    for (const [index, item] of cases.entries()) {
      const response = await POST(
        askRequest(item.question, `203.0.113.${120 + index}`),
      );
      const payload = (await response.json()) as {
        schema?: string;
        status?: string;
        route?: unknown;
        assembler_contract_id?: string;
        authority_answer?: {
          schema?: string;
          template?: { template_id?: string };
          policy_decision?: { template_id?: string };
        };
        commercial_fit?: { result?: string; offer?: unknown };
      };

      assert.equal(
        payload.schema,
        "witnessops.ask.public-boundary-response.v1",
      );
      assert.equal(payload.status, "closed");
      assert.equal(payload.route, null);
      assert.equal(payload.assembler_contract_id, undefined);
      assert.equal(
        payload.authority_answer?.schema,
        "witnessops.ask.assembled-answer.v1",
      );
      assert.equal(
        payload.authority_answer?.template?.template_id,
        payload.authority_answer?.policy_decision?.template_id,
      );
      assert.equal(payload.commercial_fit?.result, item.expectedResult);
      assert.equal(payload.commercial_fit?.offer, null);
    }
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public Ask keeps broad-scope and unrelated-price signals honest", async () => {
  const broadResponse = await POST(
    askRequest(
      "Review our AI agent across our entire cloud environment",
      "203.0.113.110",
    ),
  );
  const broadPayload = (await broadResponse.json()) as {
    status?: string;
    route?: unknown;
    commercial_fit?: { result?: string; offer?: { price_label?: string } };
  };

  assert.equal(broadPayload.status, "closed");
  assert.equal(broadPayload.route, null);
  assert.equal(broadPayload.commercial_fit?.result, "needs_boundary");
  assert.equal(
    broadPayload.commercial_fit?.offer?.price_label,
    "€2,500 fixed",
  );

  const multiResponse = await POST(
    askRequest(
      "Review every AI-agent workflow across production",
      "203.0.113.112",
    ),
  );
  const multiPayload = (await multiResponse.json()) as {
    commercial_fit?: { result?: string; offer?: { price_label?: string } };
  };
  assert.equal(multiPayload.commercial_fit?.result, "needs_boundary");
  assert.equal(
    multiPayload.commercial_fit?.offer?.price_label,
    "€2,500 fixed",
  );

  const unrelatedResponse = await POST(
    askRequest("How much does AWS cost?", "203.0.113.111"),
  );
  const unrelatedPayload = (await unrelatedResponse.json()) as {
    commercial_fit?: { result?: string; offer?: unknown };
  };
  assert.equal(unrelatedPayload.commercial_fit?.result, "unknown");
  assert.equal(unrelatedPayload.commercial_fit?.offer, null);

  const vendorWorkflowResponse = await POST(
    askRequest(
      "How much does an AWS automated workflow cost?",
      "203.0.113.113",
    ),
  );
  const vendorWorkflowPayload = (await vendorWorkflowResponse.json()) as {
    commercial_fit?: { result?: string; offer?: unknown };
  };
  assert.equal(vendorWorkflowPayload.commercial_fit?.result, "unknown");
  assert.equal(vendorWorkflowPayload.commercial_fit?.offer, null);
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
