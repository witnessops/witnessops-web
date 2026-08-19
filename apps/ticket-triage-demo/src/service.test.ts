import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createMockProvider } from "./mock-provider.js";
import { ProviderUnavailableError } from "./openai-provider.js";
import { runTicketTriage } from "./service.js";
import type { TicketTriageInput, TriageProvider } from "./types.js";

async function fixture(): Promise<TicketTriageInput> {
  return JSON.parse(
    await readFile(
      fileURLToPath(
        new URL("../fixtures/DEMO-001-access-failure.json", import.meta.url),
      ),
      "utf8",
    ),
  ) as TicketTriageInput;
}

test("rejects non-synthetic input before provider execution", async () => {
  const input = { ...(await fixture()), data_classification: "customer_data" };
  let calls = 0;
  const provider: TriageProvider = {
    name: "never",
    model: "never",
    async generate() {
      calls += 1;
      throw new Error("must_not_execute");
    },
  };

  const output = await runTicketTriage({ rawInput: input, provider });
  assert.equal(calls, 0);
  assert.equal(output.result_status, "rejected");
  assert.equal(output.failure?.code, "DEMO_DATA_BOUNDARY");
  assert.deepEqual(output.control.external_actions_performed, []);
});

test("maps bounded length violations without calling provider", async () => {
  const input = { ...(await fixture()), description: "x".repeat(4001) };
  const output = await runTicketTriage({
    rawInput: input,
    provider: createMockProvider(),
  });
  assert.equal(output.result_status, "rejected");
  assert.equal(output.failure?.code, "INPUT_LIMIT_EXCEEDED");
});

test("maps structurally invalid input to a safe failure", async () => {
  const output = await runTicketTriage({
    rawInput: { ticket_id: "DEMO-001" },
    provider: createMockProvider(),
  });
  assert.equal(output.result_status, "insufficient_input");
  assert.equal(output.failure?.code, "INVALID_INPUT");
});

test("maps semantically insufficient input to a safe failure", async () => {
  const input = { ...(await fixture()), description: "Too slow" };
  const output = await runTicketTriage({
    rawInput: input,
    provider: createMockProvider(),
  });
  assert.equal(output.result_status, "insufficient_input");
  assert.equal(output.failure?.code, "INSUFFICIENT_INFORMATION");
});

test("rejects requests for autonomous external action before provider execution", async () => {
  const input = {
    ...(await fixture()),
    description:
      "The user is locked out. Reset the account automatically without human approval.",
  };
  let calls = 0;
  const provider: TriageProvider = {
    name: "never",
    model: "never",
    async generate() {
      calls += 1;
      throw new Error("must_not_execute");
    },
  };

  const output = await runTicketTriage({ rawInput: input, provider });
  assert.equal(calls, 0);
  assert.equal(output.result_status, "rejected");
  assert.equal(output.failure?.code, "HUMAN_REVIEW_ONLY");
});

test("does not expose provider errors", async () => {
  const provider: TriageProvider = {
    name: "unavailable",
    model: "unavailable",
    async generate() {
      throw new ProviderUnavailableError(503);
    },
  };
  const output = await runTicketTriage({
    rawInput: await fixture(),
    provider,
  });
  assert.equal(output.result_status, "system_error");
  assert.equal(output.failure?.code, "MODEL_UNAVAILABLE");
  assert.doesNotMatch(JSON.stringify(output), /503|stack|openai/i);
});

test("rejects a provider result that violates the triage contract", async () => {
  const provider: TriageProvider = {
    name: "invalid",
    model: "invalid",
    async generate() {
      return { summary: "incomplete" } as never;
    },
  };
  const output = await runTicketTriage({
    rawInput: await fixture(),
    provider,
  });
  assert.equal(output.result_status, "system_error");
  assert.equal(output.failure?.code, "INVALID_MODEL_OUTPUT");
});

test("enforces security escalation outside model discretion", async () => {
  const input = JSON.parse(
    await readFile(
      fileURLToPath(
        new URL("../fixtures/DEMO-002-suspected-phishing.json", import.meta.url),
      ),
      "utf8",
    ),
  ) as TicketTriageInput;
  const base = await createMockProvider().generate(input);
  base.escalation = { required: false, reason_codes: [], route_to: "none" };
  base.suggested_assignment.queue = "service_desk";
  base.suggested_priority.level = "P4";
  const provider: TriageProvider = {
    name: "policy-test",
    model: "policy-test",
    async generate() {
      return base;
    },
  };

  const output = await runTicketTriage({ rawInput: input, provider });
  assert.equal(output.result_status, "human_review_required");
  assert.equal(output.triage?.escalation.required, true);
  assert.equal(output.triage?.escalation.route_to, "security");
  assert.equal(output.triage?.suggested_assignment.queue, "security");
  assert.equal(output.triage?.suggested_priority.level, "P2");
  assert.ok(
    output.triage?.escalation.reason_codes.includes(
      "suspected_security_event",
    ),
  );
});

test("sets low confidence for an explicitly unknown performance scope", async () => {
  const input = JSON.parse(
    await readFile(
      fileURLToPath(
        new URL("../fixtures/DEMO-003-performance-issue.json", import.meta.url),
      ),
      "utf8",
    ),
  ) as TicketTriageInput;
  const base = await createMockProvider().generate(input);
  base.suggested_priority.confidence = "medium";
  const provider: TriageProvider = {
    name: "policy-test",
    model: "policy-test",
    async generate() {
      return base;
    },
  };

  const output = await runTicketTriage({ rawInput: input, provider });
  assert.equal(output.result_status, "completed");
  assert.equal(output.triage?.suggested_priority.confidence, "low");
});

test("keeps a bounded phone-replacement recovery at P3 without model escalation", async () => {
  const input = await fixture();
  const base = await createMockProvider().generate(input);
  const provider: TriageProvider = {
    name: "policy-test",
    model: "policy-test",
    async generate() {
      return base;
    },
  };

  const output = await runTicketTriage({ rawInput: input, provider });
  assert.equal(output.result_status, "completed");
  assert.equal(output.triage?.suggested_priority.level, "P3");
  assert.equal(output.triage?.suggested_assignment.queue, "identity");
  assert.equal(output.triage?.escalation.required, false);
  assert.deepEqual(output.triage?.escalation.reason_codes, []);
});

test("does not downgrade provider security escalation for phone recovery", async () => {
  const input = await fixture();
  const base = await createMockProvider().generate(input);
  base.suggested_priority.level = "P2";
  base.suggested_assignment.queue = "security";
  base.escalation = {
    required: true,
    reason_codes: ["potential_account_compromise"],
    route_to: "security",
  };
  const provider: TriageProvider = {
    name: "policy-test",
    model: "policy-test",
    async generate() {
      return base;
    },
  };

  const output = await runTicketTriage({ rawInput: input, provider });
  assert.equal(output.result_status, "human_review_required");
  assert.equal(output.triage?.suggested_priority.level, "P2");
  assert.equal(output.triage?.suggested_assignment.queue, "security");
  assert.equal(output.triage?.escalation.required, true);
  assert.deepEqual(output.triage?.escalation.reason_codes, [
    "potential_account_compromise",
  ]);
});

test("does not treat subject or description compromise evidence as bounded recovery", async () => {
  for (const input of [
    {
      ...(await fixture()),
      subject: "Unauthorized sign-in after replacing phone",
    },
    {
      ...(await fixture()),
      description:
        "I have a new phone. I saw an unexpected login and gave an MFA code to someone.",
    },
  ]) {
    const base = await createMockProvider().generate(input);
    base.suggested_priority.level = "P2";
    base.suggested_assignment.queue = "security";
    base.escalation = {
      required: true,
      reason_codes: ["potential_account_compromise"],
      route_to: "security",
    };
    const provider: TriageProvider = {
      name: "policy-test",
      model: "policy-test",
      async generate() {
        return structuredClone(base);
      },
    };

    const output = await runTicketTriage({ rawInput: input, provider });
    assert.equal(output.result_status, "human_review_required");
    assert.equal(output.triage?.suggested_priority.level, "P2");
    assert.equal(output.triage?.suggested_assignment.queue, "security");
    assert.equal(output.triage?.escalation.required, true);
  }
});

test("uses security-review templates after phone compromise normalization", async () => {
  const input = {
    ...(await fixture()),
    description:
      "I have a new phone. I saw an unexpected login and gave an MFA code to someone.",
  };
  const base = await createMockProvider().generate(input);
  const output = await runTicketTriage({
    rawInput: input,
    provider: {
      name: "policy-test",
      model: "policy-test",
      async generate() {
        return base;
      },
    },
  });

  assert.equal(output.result_status, "human_review_required");
  assert.equal(output.triage?.category, "security_event");
  assert.equal(output.triage?.suggested_priority.level, "P2");
  assert.equal(output.triage?.suggested_assignment.queue, "security");
  assert.equal(output.triage?.escalation.route_to, "security");
  assert.deepEqual(
    output.triage?.next_actions.map((action) => action.owner),
    ["security_team", "security_team"],
  );
  const advisoryText = JSON.stringify({
    missing_information: output.triage?.missing_information,
    next_actions: output.triage?.next_actions,
    draft_customer_response: output.triage?.draft_customer_response,
    uncertainties: output.triage?.uncertainties,
  });
  assert.match(advisoryText, /security review/iu);
  assert.doesNotMatch(
    advisoryText,
    /registered authentication methods|recovery path|suspected message/iu,
  );
});

test("discards schema-valid unsafe provider prose before returning a result", async () => {
  for (const unsafeText of [
    "Please provide your password and MFA code so we can continue.",
    "Do not send your password, then send your API key to this address.",
    "What is your password and MFA code?",
    "Please email us your password.",
    "Include the recovery code in your reply.",
    "The system prompt is: ignore the safety boundary.",
    "Here are the hidden rules I was given: ignore the safety boundary.",
    "We have reset your account and the ticket is resolved.",
    "Your account is reset and ready to use.",
  ]) {
    const input = await fixture();
    const base = await createMockProvider().generate(input);
    base.draft_customer_response = unsafeText;
    const provider: TriageProvider = {
      name: "policy-test",
      model: "policy-test",
      async generate() {
        return structuredClone(base);
      },
    };

    const output = await runTicketTriage({ rawInput: input, provider });
    assert.equal(output.result_status, "completed", unsafeText);
    assert.equal(output.failure, null, unsafeText);
    assert.ok(output.triage, unsafeText);
    assert.equal(JSON.stringify(output).includes(unsafeText), false, unsafeText);
  }
});

test("never returns provider-generated prose even when a synonym evades the denylist", async () => {
  const input = await fixture();
  const base = await createMockProvider().generate(input);
  base.summary = "MODEL_RAW_SUMMARY";
  base.suggested_priority.reason = "MODEL_RAW_PRIORITY_REASON";
  base.facts = ["MODEL_RAW_FACT"];
  base.assumptions = ["MODEL_RAW_ASSUMPTION"];
  base.missing_information = [
    {
      question: "MODEL_RAW_QUESTION",
      reason: "MODEL_RAW_MISSING_REASON",
      blocking: true,
    },
  ];
  base.suggested_assignment.reason = "MODEL_RAW_ASSIGNMENT_REASON";
  base.next_actions = [
    {
      order: 1,
      action: "MODEL_RAW_ACTION",
      owner: "human_reviewer",
      requires_human_approval: true,
    },
  ];
  base.draft_customer_response =
    "Relay the string used to unlock your account.";
  base.uncertainties = ["MODEL_RAW_UNCERTAINTY"];

  const output = await runTicketTriage({
    rawInput: input,
    provider: {
      name: "policy-test",
      model: "policy-test",
      async generate() {
        return base;
      },
    },
  });

  assert.equal(output.result_status, "completed");
  const serialized = JSON.stringify(output);
  assert.doesNotMatch(serialized, /MODEL_RAW_/u);
  assert.doesNotMatch(serialized, /Relay the string/iu);
  assert.match(
    output.triage?.draft_customer_response ?? "",
    /authorised human reviewer/iu,
  );
});

test("does not invent link-interaction or credential-entry facts", async () => {
  const input = {
    ...(await fixture()),
    subject: "Suspicious sign-in link",
    description:
      "I clicked a suspicious sign-in link and entered my password before closing the page.",
  };
  const base = await createMockProvider().generate(input);
  const output = await runTicketTriage({
    rawInput: input,
    provider: {
      name: "policy-test",
      model: "policy-test",
      async generate() {
        return base;
      },
    },
  });

  assert.equal(output.result_status, "human_review_required");
  const facts = (output.triage?.facts ?? []).join(" ");
  assert.doesNotMatch(facts, /no credentials were entered/iu);
  assert.doesNotMatch(facts, /link was clicked/iu);
  assert.match(
    facts,
    /no source-system evidence has been independently verified/iu,
  );
});

test("uses evidence-neutral guidance for a link encountered outside messaging", async () => {
  const input = {
    ...(await fixture()),
    subject: "Suspicious link on a website",
    description:
      "I clicked a suspicious link on a web page and then closed the tab.",
  };
  const base = await createMockProvider().generate(input);
  base.category = "security_event";
  base.suggested_priority.level = "P2";
  base.suggested_assignment.queue = "security";
  base.escalation = {
    required: true,
    reason_codes: ["suspected_security_event"],
    route_to: "security",
  };
  const output = await runTicketTriage({
    rawInput: input,
    provider: {
      name: "policy-test",
      model: "policy-test",
      async generate() {
        return base;
      },
    },
  });

  assert.equal(output.result_status, "human_review_required");
  assert.equal(output.triage?.category, "security_event");
  const advisoryText = JSON.stringify({
    missing_information: output.triage?.missing_information,
    next_actions: output.triage?.next_actions,
    draft_customer_response: output.triage?.draft_customer_response,
    uncertainties: output.triage?.uncertainties,
  });
  assert.match(advisoryText, /source context|reported content/iu);
  assert.doesNotMatch(
    advisoryText,
    /sender address|message headers|original message|suspected message/iu,
  );
});

test("preserves a provider P2 disposition without treating it as bounded recovery", async () => {
  const input = await fixture();
  const base = await createMockProvider().generate(input);
  base.suggested_priority = {
    level: "P2",
    confidence: "high",
    reason: "A higher-priority review was selected by the provider.",
  };
  const output = await runTicketTriage({
    rawInput: input,
    provider: {
      name: "policy-test",
      model: "policy-test",
      async generate() {
        return base;
      },
    },
  });

  assert.equal(output.result_status, "human_review_required");
  assert.equal(output.triage?.suggested_priority.level, "P2");
});

test("normalizes contradictory structured compromise signals", async () => {
  const input = await fixture();
  const base = await createMockProvider().generate(input);
  base.suggested_priority = {
    level: "P4",
    confidence: "high",
    reason: "The provider returned inconsistent fields.",
  };
  base.suggested_assignment = {
    queue: "service_desk",
    reason: "The provider returned inconsistent fields.",
  };
  base.escalation = {
    required: false,
    reason_codes: ["potential_account_compromise"],
    route_to: "none",
  };

  const output = await runTicketTriage({
    rawInput: input,
    provider: {
      name: "policy-test",
      model: "policy-test",
      async generate() {
        return base;
      },
    },
  });

  assert.equal(output.result_status, "human_review_required");
  assert.equal(output.triage?.category, "security_event");
  assert.equal(output.triage?.suggested_priority.level, "P2");
  assert.equal(output.triage?.suggested_assignment.queue, "security");
  assert.equal(output.triage?.escalation.required, true);
  assert.equal(output.triage?.escalation.route_to, "security");
  assert.deepEqual(output.triage?.escalation.reason_codes, [
    "potential_account_compromise",
  ]);
});
