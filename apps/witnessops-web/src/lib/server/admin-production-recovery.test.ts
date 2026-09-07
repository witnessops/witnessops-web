import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { afterEach, beforeEach } from "node:test";

let directory: string;
beforeEach(async () => { directory = await mkdtemp(path.join(tmpdir(), "admin-production-recovery-")); });
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

// Fresh processes exercise production settings, persisted state and module reloads.
// No real identity, provider, mailbox or external evidence is used.
function run(code: string, root = directory) {
  const result = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "--input-type=module", "-e", `
    import assert from 'node:assert/strict';
    import fs from 'node:fs/promises';
    import core from './src/lib/server/admin-core-spine.ts';
    import session from './src/lib/server/admin-session.ts';
    import revocations from './src/lib/server/admin-session-revocation.ts';
    import { NextRequest } from 'next/server.js';
    const actor = {actor: 'synthetic-owner', role: 'Founder'};
    const message = {gmailMessageId: 'synthetic-message', gmailThreadId: 'synthetic-thread', sender: 'Avery <avery@example.test>', recipients: ['preview@example.test'], subject: 'CRM access before Friday', excerpt: 'Review one synthetic CRM action.', receivedAt: '2026-09-07T10:00:00Z'};
    const cookie = () => session.createAdminSessionCookie({version:3, identityProvider:'google', issuer:'https://accounts.google.com', subject:'synthetic-owner', actor:'oidc:https://accounts.google.com#synthetic-owner', actorAuthSource:'oidc_session', actorSessionHash:'abcd1234abcd1234', role:'Founder', iat:Date.now(), exp:Date.now()+60000});
    const request = (token) => new NextRequest('https://witnessops.com/admin', {headers:{cookie:'witnessops-admin-session='+token}});
    ${code}
  `], { encoding: "utf8", env: { ...process.env, NODE_ENV: "production", WITNESSOPS_ADMIN_CORE_STORE_DIR: root, WITNESSOPS_ADMIN_SECRET: "synthetic-recovery-signing-secret", WITNESSOPS_LOCAL_ADMIN_BYPASS: "0" } });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

async function initialize() { run("await core.initializeAdminCoreStore();"); }

test("production missing storage fails reads and writes without creating an empty system", async () => {
  const code = `
    await assert.rejects(core.getAdminCoreState(), error => error.code === 'STORE_UNAVAILABLE');
    await assert.rejects(core.importGmailInboxItem(message, actor), error => error.code === 'STORE_UNAVAILABLE');
  `;
  run(code);
  assert.deepEqual(await readdir(directory), []);
  const absent = path.join(directory, "absent-volume");
  run(code, absent);
  await assert.rejects(stat(absent), { code: "ENOENT" });
});

test("explicit initialization never overwrites existing or corrupt state", async () => {
  await initialize();
  const file = path.join(directory, "core-state.json");
  const original = await readFile(file, "utf8");
  run("await assert.rejects(core.initializeAdminCoreStore(), error => error.code === 'STORE_EXISTS');");
  assert.equal(await readFile(file, "utf8"), original);
  assert.equal((await stat(file)).mode & 0o777, 0o600);
  for (const corrupt of ["broken JSON", "null", '{"schemaVersion":1}', original.replace('"inboxItems": []', '"inboxItems": [null]')]) {
    await writeFile(file, corrupt);
    run(`await assert.rejects(core.getAdminCoreState()); await assert.rejects(core.importGmailInboxItem(message, actor)); await assert.rejects(core.initializeAdminCoreStore(), error => error.code === 'STORE_EXISTS');`);
    assert.equal(await readFile(file, "utf8"), corrupt);
  }
});

test("failed write before rename preserves committed bytes and removes temporary files", async () => {
  await initialize();
  const file = path.join(directory, "core-state.json");
  const original = await readFile(file, "utf8");
  run(`
    const {mock} = await import('node:test');
    mock.method(fs, 'rename', async () => {throw new Error('synthetic rename failure');});
    await assert.rejects(core.importGmailInboxItem(message, actor), /synthetic rename failure/);
    mock.restoreAll();
  `);
  assert.equal(await readFile(file, "utf8"), original);
  assert.deepEqual((await readdir(directory)).sort(), ["core-state.json", "revoked-sessions"]);
  run("await core.importGmailInboxItem(message, actor);");
  run("assert.equal((await core.getAdminCoreState()).inboxItems.length, 1);");
});

test("missing production revocation storage denies cookies without recreating lost markers", async () => {
  await initialize();
  run(`
    const token = await cookie();
    assert.ok(await session.getVerifiedAdminSession(request(token)));
    await revocations.revokeAdminSessionCookie(token);
    assert.equal(await session.getVerifiedAdminSession(request(token)), null);
    const markerDir = process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR + '/revoked-sessions';
    await fs.rename(markerDir, markerDir + '.saved');
    assert.equal(await session.getVerifiedAdminSession(request(token)), null);
    await assert.rejects(revocations.requireAdminSessionStorage());
    await assert.rejects(fs.stat(markerDir), {code:'ENOENT'});
    await fs.rename(markerDir + '.saved', markerDir);
    assert.equal(await session.getVerifiedAdminSession(request(token)), null);
    await fs.rm(core.getAdminCoreStorePath());
    assert.equal(await session.getVerifiedAdminSession(request(await cookie())), null);
  `);
});

test("restoring an older backup with rotated signing credentials keeps prior sessions invalid", async () => {
  await initialize();
  run(`
    await core.importGmailInboxItem(message, actor);
    const snapshot = process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR + '/snapshot.json';
    const digest = await core.snapshotAdminCoreStore(snapshot);
    const {createHash} = await import('node:crypto');
    assert.equal(createHash('sha256').update(await fs.readFile(snapshot)).digest('hex'), digest);
    await assert.rejects(core.snapshotAdminCoreStore(snapshot), {code:'EEXIST'});
    const token = await cookie();
    await fs.writeFile(process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR + '/synthetic-cookie', token, {mode:0o600});
    await revocations.revokeAdminSessionCookie(token);
  `);
  const restored = path.join(directory, "restored");
  await mkdir(restored);
  await mkdir(path.join(restored, "revoked-sessions"));
  await writeFile(path.join(restored, "core-state.json"), await readFile(path.join(directory, "snapshot.json")), { mode: 0o600 });
  await writeFile(path.join(restored, "synthetic-cookie"), await readFile(path.join(directory, "synthetic-cookie")), { mode: 0o600 });
  run(`
    const oldToken = await fs.readFile(process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR + '/synthetic-cookie', 'utf8');
    // Restored snapshots may lack later revocations. Rotation is mandatory.
    process.env.WITNESSOPS_ADMIN_SECRET = 'synthetic-rotated-recovery-secret';
    assert.equal(await session.getVerifiedAdminSession(request(oldToken)), null);
    assert.ok(await session.getVerifiedAdminSession(request(await cookie())));
    assert.equal((await core.getAdminCoreState()).inboxItems.length, 1);
    assert.equal((await core.importGmailInboxItem(message, actor)).created, false);
  `, restored);
});

test("storage disappearing during marker lookup cannot admit a revoked cookie", async () => {
  await initialize();
  run(`
    const token = await cookie();
    await revocations.revokeAdminSessionCookie(token);
    const {mock} = await import('node:test');
    const originalStat = fs.stat;
    const markerDir = process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR + '/revoked-sessions';
    let injected = false;
    mock.method(fs, 'stat', async (target, ...options) => {
      if (!injected && String(target).startsWith(markerDir + '/')) {
        injected = true;
        await fs.rename(markerDir, markerDir + '.saved');
      }
      return originalStat(target, ...options);
    });
    assert.equal(await session.getVerifiedAdminSession(request(token)), null);
    assert.equal(injected, true);
    mock.restoreAll();
    await assert.rejects(fs.stat(markerDir), {code:'ENOENT'});
    await fs.rename(markerDir + '.saved', markerDir);
    assert.equal(await session.getVerifiedAdminSession(request(token)), null);
    assert.ok(await session.getVerifiedAdminSession(request(await cookie())));
  `);
});

test("synthetic client journey survives restart and resolves an uncertain send without duplication", async () => {
  await initialize();
  run(`
    const imported = await core.importGmailInboxItem(message, actor);
    const {reviewRequest} = await core.convertInboxItemToReviewRequest(imported.item.id, actor);
    await core.updateReviewRequestBrief(reviewRequest.id, {
      expectedVersion:core.reviewRequestEditVersion(reviewRequest), scope:'One synthetic CRM write path', desiredOutcome:'Observe the correct synthetic CRM record', timing:'Before Friday', commercialStatus:'Synthetic agreed scope, no payment', nextAction:'Run the acceptance case', workflowBoundary:'Synthetic fixture only', authorityBoundary:'No production authority', evidencePosture:'Synthetic references only', missingInformation:[]
    }, actor);
    for (const state of ['triage','fit_review','fit_confirmed']) await core.transitionReviewRequest(reviewRequest.id,state,actor);
    const product = (await core.listProductContracts(actor))[0];
    await core.approveReviewRequest(reviewRequest.id,product.id,actor);
    const proof = await core.createProofRunForRequest(reviewRequest.id,product.id,actor);
    for (const state of ['ready','running','operator_review']) await core.transitionProofRun(proof.id,state,actor);
    await assert.rejects(core.transitionProofRun(proof.id,'complete',actor), error => error.code === 'PROOF_NOT_READY');
    await core.updateProofRun(proof.id,{scopeComplete:true,evidenceState:'complete',outputReferences:[...proof.requiredOutputs],evidenceReferences:['synthetic://crm-result'],knownGaps:[],verificationInstructions:'Inspect the synthetic CRM fixture. No real system verified.',customerWordingReviewed:true,unsupportedClaims:[]},actor);
    await core.transitionProofRun(proof.id,'complete',actor);
    const delivery = await core.prepareDelivery(proof.id,actor);
    await core.updateDeliveryDraft(delivery.id,{subject:'Synthetic review result',body:'Synthetic acceptance completed; no real customer message.'},actor);
    await core.linkReceiptToDelivery(delivery.id,{receiptId:'synthetic-recovery-receipt',claimScope:'Synthetic fixture only',structurallyValid:true,evidenceReferences:['synthetic://crm-result'],verifierMechanism:'synthetic-test-only',verifierResult:'valid',limitations:['No real provider or verifier executed'],archiveLocation:'synthetic://archive'},actor);
    await core.transitionDelivery(delivery.id,'ready_for_operator_review',actor);
    const reservation = await core.reserveDeliverySend(delivery.id,actor,'synthetic-send');
    assert.equal(reservation.kind,'reserved');
    await core.markDeliverySendOutcomeUnknown(delivery.id,reservation.reservationToken,actor);
  `);
  // Second process has no module state from the journey or send reservation.
  run(`
    const state = await core.getAdminCoreState();
    assert.equal(state.reviewRequests[0].timing,'Before Friday');
    const delivery = state.deliveries[0];
    const retry = await core.reserveDeliverySend(delivery.id,actor,'synthetic-send');
    assert.equal(retry.kind,'in_progress', 'an uncertain send must not reserve another send');
    await core.reconcileDeliverySendReservation(delivery.id,{outcome:'sent',provider:'file',providerMessageId:'synthetic-provider-accepted',sentAt:new Date().toISOString(),note:'Synthetic provider acceptance fixture; no external send.'},actor);
    const replay = await core.reserveDeliverySend(delivery.id,actor,'synthetic-send');
    assert.equal(replay.kind,'replay');
    const finished = await core.getAdminCoreState();
    assert.equal(finished.deliveries[0].providerMessageId,'synthetic-provider-accepted');
    assert.equal(finished.deliveries.length,1);
    assert.ok(finished.auditEvents.some(event => event.action === 'update_qualification_brief'));
    assert.ok(finished.auditEvents.some(event => event.action === 'reconcile_send_sent'));
  `);
});
