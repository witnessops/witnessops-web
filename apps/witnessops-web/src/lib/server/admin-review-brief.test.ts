import assert from "node:assert/strict";
import test, { beforeEach, afterEach } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { NextRequest } from "next/server";
import { REVIEW_BRIEF_FIELDS } from "@/lib/admin-review-brief";
import { POST } from "@/app/api/admin/core/[...path]/route";
import { createAdminSessionCookie } from "./admin-session";
import { addReviewRequestNote, approveReviewRequest, convertInboxItemToReviewRequest, getAdminCoreDashboard, getReviewRequest, importGmailInboxItem, listAuditEvents, listProductContracts, reviewRequestEditVersion, transitionReviewRequest, updateReviewRequestBrief, type ReviewRequestRecord } from "./admin-core-spine";

const owner = { actor: "oidc:https://accounts.google.com#owner", role: "Delegated Operator" as const };
const founder = { actor: "oidc:https://accounts.google.com#founder", role: "Founder" as const };
const names = ["WITNESSOPS_ADMIN_CORE_STORE_DIR", "WITNESSOPS_ADMIN_SECRET", "WITNESSOPS_LOCAL_ADMIN_BYPASS"] as const;
let previous: Array<string | undefined>;
let directory: string;

beforeEach(async () => {
  previous = names.map((name) => process.env[name]);
  directory = await mkdtemp(path.join(tmpdir(), "admin-brief-test-"));
  process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR = directory;
  process.env.WITNESSOPS_ADMIN_SECRET = "synthetic-brief-test-secret";
  delete process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS;
});
afterEach(async () => {
  names.forEach((name, index) => { if (previous[index] === undefined) delete process.env[name]; else process.env[name] = previous[index]; });
  await rm(directory, { recursive: true, force: true });
});
async function fixture() {
  const imported = await importGmailInboxItem({ gmailMessageId: "synthetic-message", gmailThreadId: "synthetic-thread", sender: "Avery <avery@example.test>", recipients: ["preview@example.test"], subject: "Production review", excerpt: "Review CRM write access before Friday.", receivedAt: new Date().toISOString() }, founder);
  return (await convertInboxItemToReviewRequest(imported.item.id, owner)).reviewRequest;
}
function inputFor(request: ReviewRequestRecord) {
  return { ...Object.fromEntries(REVIEW_BRIEF_FIELDS.map(({ name }) => [name, request[name]])), missingInformation: request.missingInformation, expectedVersion: reviewRequestEditVersion(request) };
}
test("qualification persists, records an audit event and leaves lifecycle and authority unchanged", async () => {
  const request = await fixture();
  const updated = await updateReviewRequestBrief(request.id, { ...inputFor(request), scope: "One CRM write path", timing: "Before Friday", nextAction: "Confirm the test account", missingInformation: [" Test access "] }, owner);
  assert.equal(updated.scope, "One CRM write path");
  assert.equal(updated.timing, "Before Friday");
  assert.deepEqual(updated.missingInformation, ["Test access"]);
  assert.equal(updated.owner, request.owner);
  assert.equal(updated.state, request.state);
  assert.equal(updated.productContractVersionId, null);
  assert.equal(updated.proofRunId, null);
  assert.equal((await getReviewRequest(request.id, owner))?.nextAction, "Confirm the test account");
  assert.equal((await listAuditEvents(request.lineageId, owner)).at(-1)?.action, "update_qualification_brief");
  const dashboard = await getAdminCoreDashboard(owner);
  assert.equal(dashboard.counts.inbox, 0, "converted messages are no longer inbox triage work");
  assert.equal(dashboard.nextReviewRequests[0]?.customerName, "Avery");
  assert.equal(dashboard.nextReviewRequests[0]?.nextAction, "Confirm the test account");
  assert.deepEqual((await getAdminCoreDashboard({ actor: "other@test", role: "Delegated Operator" })).nextReviewRequests, []);
});
test("stale qualification saves cannot overwrite intervening edits or notes", async () => {
  const request = await fixture();
  await addReviewRequestNote(request.id, "Buyer confirmed Friday.", owner);
  await assert.rejects(updateReviewRequestBrief(request.id, inputFor(request), owner), /changed while you were editing/);
  const current = (await getReviewRequest(request.id, owner))!;
  const first = await updateReviewRequestBrief(request.id, { ...inputFor(current), nextAction: "First edit" }, owner);
  await assert.rejects(updateReviewRequestBrief(request.id, { ...inputFor(current), nextAction: "Stale edit" }, owner), /changed while you were editing/);
  assert.equal((await getReviewRequest(request.id, owner))?.nextAction, first.nextAction);
});
test("qualification rejects authority fields, malformed values and oversized input without changes", async () => {
  const request = await fixture();
  for (const patch of [{ owner: "other@test" }, { state: "approved_for_proof_run" }, { scope: "" }, { timing: 42 }, { scope: "x".repeat(4097) }, { missingInformation: [123] }, { missingInformation: Array(17).fill("question") }]) {
    await assert.rejects(updateReviewRequestBrief(request.id, { ...inputFor(request), ...patch }, owner));
    assert.deepEqual(await getReviewRequest(request.id, owner), request);
  }
});
test("contract approval locks qualification edits", async () => {
  let request = await fixture();
  for (const nextState of ["triage", "fit_review", "fit_confirmed"] as const) request = await transitionReviewRequest(request.id, nextState, owner);
  const product = (await listProductContracts(founder))[0]!;
  request = await approveReviewRequest(request.id, product.id, owner);
  await assert.rejects(updateReviewRequestBrief(request.id, inputFor(request), owner), /read-only/);
});
test("real API requires authentication and business ownership, returns a fresh edit version", async () => {
  const request = await fixture();
  async function call(subject?: string, role: "Founder" | "Delegated Operator" | "Administrator" = "Delegated Operator") {
    const now = Date.now();
    const cookie = subject ? await createAdminSessionCookie({ version: 3, identityProvider: "google", issuer: "https://accounts.google.com", subject, actor: `oidc:https://accounts.google.com#${subject}`, actorAuthSource: "oidc_session", actorSessionHash: "abcd1234abcd1234", role, iat: now, exp: now + 60_000 }) : null;
    return POST(new NextRequest(`https://witnessops.com/api/admin/core/review-requests/${request.id}/brief`, { method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { cookie: `witnessops-admin-session=${cookie}` } : {}) }, body: JSON.stringify({ ...inputFor(request), nextAction: "Check acceptance case" }) }), { params: Promise.resolve({ path: ["review-requests", request.id, "brief"] }) });
  }
  assert.equal((await call()).status, 401);
  assert.equal((await call("other")).status, 403);
  assert.equal((await call("administrator", "Administrator")).status, 403);
  const response = await call("owner");
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.item.nextAction, "Check acceptance case");
  assert.equal(result.version, reviewRequestEditVersion(result.item));
  assert.notEqual(result.version, reviewRequestEditVersion(request));
});
