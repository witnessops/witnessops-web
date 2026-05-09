import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test, { afterEach } from "node:test";

import * as route from "./route";
import { POST } from "./route";

const expectedPayload = {
  schema_version: "docs-assistant.disabled.v1",
  status: "disabled",
  answer_status: "cannot_claim",
  message: "WitnessOps Docs Assistant is not enabled.",
  human_review_required: true,
  not_proven: [
    "assistant_implemented",
    "retrieval_configured",
    "model_call_enabled",
    "source_freshness",
    "answer_correctness",
    "artifact_verification",
    "proof_bundle_verification",
    "production_readiness",
  ],
};

const DOCS_ASSISTANT_ENV_KEYS = [
  "OPENAI_API_KEY",
  "WITNESSOPS_DOCS_ASSISTANT_ENABLED",
  "WITNESSOPS_DOCS_ASSISTANT_STAGE",
  "WITNESSOPS_DOCS_ASSISTANT_VECTOR_STORE_ID",
  "WITNESSOPS_DOCS_ASSISTANT_MODEL",
] as const;

function makeRequest(body: unknown = { question: "What is /verify for?" }) {
  return new Request("https://witnessops.com/api/docs-assistant/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function clearDocsAssistantEnv() {
  for (const key of DOCS_ASSISTANT_ENV_KEYS) {
    delete process.env[key];
  }
}

function applyEnabledEnv(overrides: Record<string, string | undefined> = {}) {
  process.env.WITNESSOPS_DOCS_ASSISTANT_ENABLED = "true";
  process.env.WITNESSOPS_DOCS_ASSISTANT_STAGE = "staging";
  process.env.WITNESSOPS_DOCS_ASSISTANT_VECTOR_STORE_ID =
    "vs_69fe62ba0e8c81918d2763cece82f0c0";
  process.env.WITNESSOPS_DOCS_ASSISTANT_MODEL = "gpt-5.4-mini";
  process.env.OPENAI_API_KEY = "test-key";

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

async function withFetchSpy<T>(callback: (getCalls: () => number) => Promise<T>) {
  const previousFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    throw new Error("test fetch should not be called");
  }) as typeof fetch;

  try {
    return await callback(() => calls);
  } finally {
    globalThis.fetch = previousFetch;
  }
}

afterEach(() => {
  clearDocsAssistantEnv();
});

test("docs assistant ask route is POST-only and fails closed", async () => {
  assert.equal("GET" in route, false);
  clearDocsAssistantEnv();

  await withFetchSpy(async (getCalls) => {
    const response = await POST(makeRequest());

    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await response.json(), expectedPayload);
    assert.equal(getCalls(), 0);
  });
});

test("docs assistant ask route fails closed without fetch for misconfigured gates", async () => {
  const cases: Array<{
    name: string;
    env: Record<string, string | undefined>;
  }> = [
    { name: "env_absent", env: {} },
    {
      name: "wrong_stage",
      env: { WITNESSOPS_DOCS_ASSISTANT_STAGE: "production" },
    },
    {
      name: "wrong_vector_store",
      env: { WITNESSOPS_DOCS_ASSISTANT_VECTOR_STORE_ID: "vs_wrong" },
    },
    { name: "missing_api_key", env: { OPENAI_API_KEY: undefined } },
  ];

  for (const testCase of cases) {
    clearDocsAssistantEnv();
    if (testCase.name !== "env_absent") {
      applyEnabledEnv(testCase.env);
    }

    await withFetchSpy(async (getCalls) => {
      const response = await POST(makeRequest());

      assert.equal(response.status, 503, testCase.name);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      assert.deepEqual(await response.json(), expectedPayload);
      assert.equal(getCalls(), 0, testCase.name);
    });
  }
});

test("docs assistant ask route applies refusal precheck without fetch when enabled", async () => {
  const cases: Array<{
    name: string;
    question: string;
    expectedBoundaries: string[];
    expectedNotProven: string[];
  }> = [
    {
      name: "compliance",
      question: "Can WitnessOps certify my company is compliant?",
      expectedBoundaries: [
        "compliance_certification_not_allowed",
        "customer_specific_claim_not_allowed",
      ],
      expectedNotProven: [
        "compliance_correctness",
        "security_posture",
        "source_system_truth",
      ],
    },
    {
      name: "proof_bundle",
      question: "Can the Docs Assistant verify my proof bundle?",
      expectedBoundaries: ["proof_bundle_verification_not_allowed"],
      expectedNotProven: [
        "proof_bundle_verification",
        "artifact_verification",
        "verifier_authority",
      ],
    },
  ];

  for (const testCase of cases) {
    clearDocsAssistantEnv();
    applyEnabledEnv();

    await withFetchSpy(async (getCalls) => {
      const response = await POST(
        makeRequest({
          question: testCase.question,
          case_id: `probe-${testCase.name}`,
        }),
      );
      const body = await response.json();

      assert.equal(response.status, 200, testCase.name);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      assert.equal(body.answer_status, "cannot_claim");
      assert.equal(body.human_review_required, true);
      assert.deepEqual(
        testCase.expectedBoundaries.every((boundary) =>
          body.boundary_findings.includes(boundary),
        ),
        true,
        testCase.name,
      );
      assert.deepEqual(
        testCase.expectedNotProven.every((boundary) =>
          body.not_proven.includes(boundary),
        ),
        true,
        testCase.name,
      );
      assert.equal(getCalls(), 0, testCase.name);
    });
  }
});

test("docs assistant route and page do not expose client-side assistant wiring", () => {
  const implementationFiles = [
    resolve(__dirname, "route.ts"),
    resolve(__dirname, "../../../../lib/docs-assistant/answer-contract.ts"),
    resolve(__dirname, "../../../../lib/docs-assistant/disabled-response.ts"),
    resolve(__dirname, "../../../../lib/docs-assistant/source-policy.ts"),
    resolve(__dirname, "../../../docs/assistant/page.tsx"),
  ];

  for (const file of implementationFiles) {
    const source = readFileSync(file, "utf-8");
    assert.doesNotMatch(source, /NEXT_PUBLIC.*DOCS_ASSISTANT/i);
    assert.doesNotMatch(source, /files\.create|vector[-_ ]?store.*upload/i);
  }
});
