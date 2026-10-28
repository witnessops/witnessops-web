import { expect, test as base } from "@playwright/test";
import type { AskWitnessOpsUiAnswer } from "../../apps/witnessops-web/src/components/docs-assistant/ask-witnessops-response";

export type AskRequest = {
  question: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  page_service_id?: string;
  surface?: "sovereign_widget";
};

/** Same generated-answer envelope used by the existing docs-assistant fixtures. */
export function generatedAnswer(
  body: string,
  extra: Pick<AskWitnessOpsUiAnswer, "route" | "presented_sources"> = { route: null, presented_sources: [] },
) {
  return {
    schema: "witnessops.ask.generated-answer.v1",
    status: "success",
    model: "test-model",
    answer_mode: "ai_assisted",
    authority_answer: {
      schema: "witnessops.ask.assembled-answer.v1",
      assembler_contract_id: "ASK_DETERMINISTIC_ANSWER_ASSEMBLER_V1",
      assembler_contract_version: 1,
      deterministic_replay_hash: "local-widget-browser-fixture",
      template: { template_id: "fixture" },
      policy_decision: { template_id: "fixture" },
    },
    template: { template_id: "answer.public_ai.v1", body, source_display: null },
    commercial_fit: {
      schema: "witnessops.ask.commercial-fit.v1",
      result: "unknown",
      intent: "other",
      offer_id: null,
      source: "ask",
      offer: null,
      matching_specimen_id: null,
    },
    recommendation: null,
    ...extra,
  };
}

export const test = base.extend<{ apiIsolation: void }>({
  apiIsolation: [async ({ context }, use) => {
    const unmockedApiCalls: string[] = [];
    // page.route mocks take precedence. An accidentally unmocked request must
    // never reach the local server or an inherited provider configuration.
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname !== "127.0.0.1") return route.abort();
      if (url.pathname.startsWith("/api/")) {
        unmockedApiCalls.push(`${route.request().method()} ${url.pathname}`);
        return route.fulfill({ status: 503, json: { error: "Unmocked browser fixture request" } });
      }
      return route.continue();
    });
    await use();
    expect(unmockedApiCalls, "Every API request must be explicitly mocked in this suite").toEqual([]);
  }, { auto: true }],
});

export { expect };
