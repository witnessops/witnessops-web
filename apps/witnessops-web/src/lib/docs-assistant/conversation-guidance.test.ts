import assert from "node:assert/strict";
import test from "node:test";
import { askLanguage, contextualSuggestions, conversationNextQuestion, visitorStatements } from "./conversation-guidance";
import { applyConversationContract, normalizePublicAskResponse } from "@/lib/server/ask-witnessops/public-answer-runtime";
import { AUTOMATION_REPAIR_OFFER } from "@/lib/commercial-truth";

const first = "Our n8n workflow says success, but leads stopped reaching HubSpot yesterday.";
const diagnostic = "Are leads missing entirely, arriving late, or arriving with the wrong fields?";
const history = [{ role: "user" as const, content: first }, { role: "assistant" as const, content: diagnostic }];
function generated(text: string, service: string | null = null) {
  return normalizePublicAskResponse({ output_text: JSON.stringify({ answer: text, service_id: service, source_ids: [service ? `service.${service}` : "public.overview"] }) })!;
}

test("broken automation gets a narrow discriminator and answerable chips", () => {
  assert.equal(conversationNextQuestion(first), diagnostic);
  assert.deepEqual(contextualSuggestions(diagnostic), ["Missing", "Delayed", "Wrong fields"]);
  assert.deepEqual(contextualSuggestions("What should you prepare?"), []);
});
test("missing/live/deadline does not repeat qualification", () => {
  assert.equal(conversationNextQuestion("Missing. It is live and we need it today.", history), null);
});
test("uncertain visitor gets one easy discriminator", () => {
  const question = conversationNextQuestion("Something is wrong with our automation but I don't know what.");
  assert.match(question!, /stop working, produce the wrong result/);
  assert.equal(question!.match(/\?/g)?.length, 1);
});
test("agent live status is asked only while missing", () => {
  assert.match(conversationNextQuestion("Can I tell my customer you verified our refund agent is safe?")!, /already issuing refunds/);
  assert.equal(conversationNextQuestion("Our refund agent is live."), null);
});
test("three questions exhaust the qualification budget", () => {
  const previous = [{ role: "assistant" as const, content: "Which system? Is it live? What deadline?" }];
  assert.equal(conversationNextQuestion(first, previous), null);
  assert.equal(applyConversationContract(generated("The next step is preparing your request. Another question?"), {question:first,history:previous}).text, "The next step is preparing your request.");
});
test("an identical generated question is not asked again", () => {
  const result = applyConversationContract(generated(`A run does not establish delivery. ${diagnostic}`), {question:"Missing.",history});
  assert.doesNotMatch(result.text, /\?/);
});
test("guarantee and price clarification uses exact catalogue terms, never model fees", () => {
  const result = applyConversationContract(generated("We need to confirm fit.", AUTOMATION_REPAIR_OFFER.id), {question:"Can you guarantee today for €250?",history});
  assert.match(result.text, /^No\./);
  assert.ok(result.text.includes(AUTOMATION_REPAIR_OFFER.price.en));
  assert.ok(result.text.includes(AUTOMATION_REPAIR_OFFER.repairPrice.en));
  assert.match(result.text, /confirm fit and availability/);
  assert.equal(normalizePublicAskResponse({output_text:JSON.stringify({answer:"Guaranteed repair today for €250.",service_id:AUTOMATION_REPAIR_OFFER.id,source_ids:[`service.${AUTOMATION_REPAIR_OFFER.id}`]})}),null);
});
test("Polish selection uses known language signals and approved catalogue terms", () => {
  assert.equal(askLanguage("Czy nasz agent obsługujący zwroty jest bezpieczny?"), "pl");
  const result = applyConversationContract(generated("Trzeba ustalić zakres.", AUTOMATION_REPAIR_OFFER.id), {question:"Czy gwarancja naprawy dzisiaj kosztuje €250?"});
  assert.ok(result.text.includes(AUTOMATION_REPAIR_OFFER.repairPrice.pl));
});
test("handoff selects visitor statements, not questions or invented conclusions", () => {
  const draft = visitorStatements([first,"Missing. It is live and we need it today.","Can you guarantee today for €250?","No, nothing changed. It just stopped reaching HubSpot."]).join("\n");
  assert.match(draft,/yesterday/);assert.match(draft,/live/);assert.match(draft,/today/);assert.match(draft,/nothing changed/);
  assert.doesNotMatch(draft,/guarantee|root cause|configuration change/);
});

test("unsupported safety claim receives a precise non-verification explanation", async () => {
  const { unsupportedClaimRepair } = await import("./conversation-guidance");
  const result = unsupportedClaimRepair("Can I tell my customer you verified our refund agent is safe?")!;
  assert.match(result, /No review or test has happened/);
  assert.match(result, /exploring a review of the refund approval controls/);
  assert.equal(result.match(/\?/g)?.length, 1);
  assert.doesNotMatch(result, /active incident|catalogue|certification/);
});

for (const repeated of [diagnostic, diagnostic.toUpperCase(), diagnostic.replaceAll(",", "")]) {
  test(`question-only repeat becomes a nonempty next action: ${repeated}`, () => {
    const result = applyConversationContract(generated(repeated), {question: "Missing.", history});
    assert.match(result.text, /prepare an editable request/);
    assert.doesNotMatch(result.text, /\?/);
    assert.deepEqual(contextualSuggestions(result.text), []);
  });
}
test("embedded repeated questions preserve useful text and remove stale chips", () => {
  const result = applyConversationContract(generated(`A run does not establish delivery. ${diagnostic.toUpperCase()}`), {question: "Missing.", history});
  assert.equal(result.text, "A run does not establish delivery.");
  assert.deepEqual(contextualSuggestions(result.text), []);
});
test("a casing/punctuation variant cannot reissue a deterministic follow-up", () => {
  assert.equal(conversationNextQuestion(first, [{role: "assistant", content: diagnostic.toUpperCase().replaceAll(",", "")}]), null);
});

test('correction context is bounded visitor wording and preserves newer supersession order', async()=>{
 const {explicitVisitorCorrections}=await import('./conversation-guidance');
 assert.deepEqual(explicitVisitorCorrections(['No, it is staging.','Actually, it is production.']),['No, it is staging.','Actually, it is production.']);
 assert.equal(explicitVisitorCorrections(Array.from({length:8},(_,i)=>'Correction: '+i)).length,4);
 assert.deepEqual(explicitVisitorCorrections(['The assistant assumes staging.']),[]);
});


for (const [statement, repeated, dimension] of [
  ["It is live.", "Is it already live?", "lifecycle"],
  ["It is planned for pre-launch testing.", "Is this in production or still planned?", "lifecycle"],
  ["It is staging.", "Is it production or staging?", "environment"],
  ["No, I meant the production agent, not staging.", "Which environment is involved?", "environment"],
  ["We need it today.", "When do you need this?", "deadline"],
  ["Our Linux server needs review.", "What system is involved?", "system"],
  ["Our Linux server needs review.", "Include which systems are involved.", "system"],
  ["Missing.", diagnostic, "outcome"],
]) test(`known ${dimension} suppresses a qualification re-ask: ${statement}`, async () => {
  const {visitorQualificationFacts, asksKnownQualification} = await import("./conversation-guidance");
  const facts = visitorQualificationFacts([statement]);
  assert.equal(asksKnownQualification(repeated, facts), true);
  const result = applyConversationContract(generated(`Prepare an editable request. ${repeated}`), {question:"What next?",history:[{role:"user",content:statement}]});
  assert.equal(result.text, "Prepare an editable request.");
  const only = applyConversationContract(generated(repeated), {question:"What next?",history:[{role:"user",content:statement}]});
  assert.match(only.text, /prepare an editable request/);
});
test("later qualification updates supersede earlier statements without accepting assistant assertions", async () => {
  const {visitorQualificationFacts} = await import("./conversation-guidance");
  assert.equal(visitorQualificationFacts(["It is planned.","Actually, it is live."]).lifecycle?.value,"live");
  assert.equal(visitorQualificationFacts(["It is live.","It is not live yet."]).lifecycle?.value,"planned/not live");
  assert.equal(visitorQualificationFacts(["It is staging.","No, I meant the production agent, not staging."]).environment?.value,"production");
  assert.equal(visitorQualificationFacts(["We need it today.","New deadline: tomorrow."]).deadline?.value,"New deadline: tomorrow.");
  assert.deepEqual(visitorQualificationFacts(["Is it live?"]),{});
});
test("known status suppresses an embedded request with no question mark, but preserves statements", () => {
  const args={question:"What should we prepare?",history:[{role:"user" as const,content:"Missing. It is live and we need it today."}]};
  assert.match(applyConversationContract(generated("Prepare a summary, including whether it is still live."),args).text,/prepare an editable request/);
  assert.equal(applyConversationContract(generated("A live workflow needs a bounded diagnosis."),args).text,"A live workflow needs a bounded diagnosis.");
});
test("obsolete Free Check label is removed without an empty turn", () => {
  const a=normalizePublicAskResponse({output_text:JSON.stringify({answer:"Use Open free check.",service_id:null,source_ids:["public.external-exposure-snapshot"]})})!;
  assert.equal(applyConversationContract(a,{question:"Can you check my website externally?"}).text,"You can start the free External Exposure Snapshot here.");
});


for (const statement of ["Nothing changed.", "No recent changes.", "We didn't change the workflow."]) {
  test(`explicit no-change state blocks change-history requests two turns later: ${statement}`, async () => {
    const {visitorQualificationFacts,asksKnownQualification}=await import("./conversation-guidance");
    const facts=visitorQualificationFacts([statement]);assert.equal(facts.change_status?.value,"no_known_change");
    const history=[{role:"user" as const,content:statement},{role:"assistant" as const,content:"What outcome stopped?"},{role:"user" as const,content:"Missing."},{role:"assistant" as const,content:"What is the deadline?"},{role:"user" as const,content:"Today."}];
    for(const request of ["Did anything change recently?","Were there any recent changes?","Did the workflow/configuration change?","Prepare a summary and include any recent changes to the workflow, connected apps, or credentials."]) {
      assert.equal(asksKnownQualification(request,facts),true);
      const result=applyConversationContract(generated(request),{question:"What next?",history});
      assert.match(result.text,/prepare an editable request/);assert.doesNotMatch(result.text,/recent changes|configuration change/);
    }
    for(const question of ["When did the failure begin?","What outcome stopped?","Is it live?","What system is affected?"]) assert.equal(asksKnownQualification(question,facts),false,question);
  });
}
test("change state follows explicit visitor updates, not failure timing or assumptions", async () => {
  const {visitorQualificationFacts,asksKnownQualification}=await import("./conversation-guidance");
  assert.equal(visitorQualificationFacts(["It stopped yesterday."]).change_status,undefined);
  assert.equal(visitorQualificationFacts(["Maybe something changed yesterday."]).change_status,undefined);
  assert.equal(visitorQualificationFacts(["We changed the HubSpot mapping yesterday."]).change_status?.value,"changed");
  assert.equal(visitorQualificationFacts(["This started after a deployment."]).change_status?.value,"changed");
  const updated=visitorQualificationFacts(["Nothing changed.","Actually, we deployed a new mapping yesterday."]);
  assert.equal(updated.change_status?.value,"changed");assert.equal(asksKnownQualification("What changed?",updated),false);
  assert.equal(visitorQualificationFacts(["We changed the mapping.","Nothing changed."]).change_status?.value,"no_known_change");
  assert.equal(visitorQualificationFacts(["Nothing changed.","I don't know whether anything changed."]).change_status?.value,"unknown");
});
