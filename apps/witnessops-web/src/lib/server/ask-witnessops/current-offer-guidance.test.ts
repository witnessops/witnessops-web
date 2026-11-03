import assert from "node:assert/strict";
import test from "node:test";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { polishOfferGuidance, promotesRetiredOffer } from "./current-offer-guidance";

test("Polish catalogue questions, with and without accents, describe only the current review", () => {
  assert.ok(polishOfferGuidance({ question: "Jakie macie oferty?", locale: "en" })?.text.startsWith("Aktualnie"));
  for (const question of ["Jakie macie oferty?", "Jakie usługi oferujecie?", "Jakie uslugi oferujecie?", "Co oferujecie?", "Jaka jest aktualna oferta?", "oferty"]) {
    const answer = polishOfferGuidance({ question, locale: "pl", surface: "sovereign_widget" });
    assert.ok(answer, question);
    assert.equal(answer.recommend, true);
    assert.match(answer.text, /jeden płatny przegląd: Agent Action Security Review/);
    assert.ok(answer.text.includes(PUBLIC_AGENT_ACTION_OFFER.result.pl));
    assert.doesNotMatch(answer.text, /One Server|External Attack|Sprint|Workflow [SML]/);
  }
});

test("current Polish price and timing follow-ups use canonical terms, not old assistant claims", () => {
  const history = [{ role: "user" as const, content: "Jakie macie oferty?" }, { role: "assistant" as const, content: "Polecam One Server Security Check, gotowe w dwa dni." }];
  const price = polishOfferGuidance({ question: "Ile kosztuje?", locale: "pl", history });
  assert.ok(price?.text.includes(PUBLIC_AGENT_ACTION_OFFER.price.pl));
  assert.ok(price?.text.includes(PUBLIC_AGENT_ACTION_OFFER.timing.pl));
  const timing = polishOfferGuidance({ question: "A ile to trwa?", locale: "pl", history: [...history, { role: "user", content: "Ile kosztuje?" }] });
  assert.ok(timing?.text.includes(PUBLIC_AGENT_ACTION_OFFER.timing.pl));
  assert.doesNotMatch(timing?.text ?? "", /dwa dni|10 dni|One Server/);
});

test("retired Polish inquiries and their follow-ups cannot revive a service", () => {
  for (const question of ["Co obejmuje One Server Security Check?", "Czy oferujecie Naprawa i przejęcie automatyzacji?", "Ile kosztuje External Attack Surface Review?", "Co obejmuje Workflow S?"]) {
    const answer = polishOfferGuidance({ question, locale: "pl" });
    assert.equal(answer?.recommend, false);
    assert.match(answer?.text ?? "", /nie jest już dostępna dla nowych zleceń/);
  }
  const history = [{ role: "user" as const, content: "Chcę One Server Security Check." }];
  assert.equal(polishOfferGuidance({ question: "A ile kosztuje?", locale: "pl", history })?.recommend, false);
  assert.equal(polishOfferGuidance({ question: "Ile kosztuje Agent Action Security Review?", locale: "pl", history })?.recommend, true);
  assert.equal(polishOfferGuidance({ question: "Ile kosztuje?", locale: "pl", page_service_id: "one-server-security-check" })?.recommend, false);
});

test("model output can explain withdrawals but cannot recommend retired English or Polish offers", () => {
  for (const text of ["Polecam One Server Security Check.", "Oferujemy Naprawa i przejęcie automatyzacji.", "Wybierz Workflow S.", "One Server Security Check is retired, but we can still sell it.", "External Attack Surface Review jest wycofany, ale możemy go wykonać."]) {
    assert.equal(promotesRetiredOffer(text), true, text);
  }
  for (const text of ["One Server Security Check nie jest już dostępny.", "Nie oferujemy Customer Security Review Sprint.", "External Attack Surface Review is no longer available.", "The workflow started successfully.", "Agent Action Security Review covers one action."]) {
    assert.equal(promotesRetiredOffer(text), false, text);
  }
});

test("noncommercial Polish requests are left to their own answer and safety paths", () => {
  for (const question of ["Jak odzyskać dostęp do konta?", "Czy mogę sprawdzić domenę za darmo?", "Napisz przepis na ciasto.", "Jak sprawdzacie dowody wykonania?"]) {
    assert.equal(polishOfferGuidance({ question, locale: "pl", surface: "sovereign_widget" }), null);
  }
});
