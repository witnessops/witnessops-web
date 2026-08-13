import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { afterEach } from "node:test";
import { NextRequest } from "next/server";

import { createAdminSessionCookie } from "@/lib/server/admin-session";
import {
  convertInboxItemToReviewRequest,
  importGmailInboxItem,
  resetAdminCoreStoreForTests,
} from "@/lib/server/admin-core-spine";
import { GET } from "./[...path]/route";

const founder = { actor: "founder@test", role: "Founder" as const };

async function cookieFor(subject: string, role: "Founder" | "Delegated Operator") {
  process.env.WITNESSOPS_ADMIN_SECRET = "test-admin-secret";
  const now = Date.now();
  return createAdminSessionCookie({
    version: 3,
    identityProvider: "google",
    issuer: "https://accounts.google.com",
    subject,
    actor: `oidc:https://accounts.google.com#${subject}`,
    actorAuthSource: "oidc_session",
    actorSessionHash: "abcd1234abcd5678",
    role,
    iat: now,
    exp: now + 60_000,
  });
}

function context(...pathParts: string[]) {
  return { params: Promise.resolve({ path: pathParts }) };
}

afterEach(async () => {
  delete process.env.WITNESSOPS_ADMIN_SECRET;
  await resetAdminCoreStoreForTests();
});

test("admin core API hides foreign direct IDs and list records", async () => {
  process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-admin-core-api-read-"),
  );
  const bob = {
    actor: "oidc:https://accounts.google.com#bob",
    role: "Delegated Operator" as const,
  };
  const imported = await importGmailInboxItem({
    gmailMessageId: "gmail-bob-only",
    gmailThreadId: "thread-bob-only",
    sender: "Bob Buyer <bob@example.com>",
    recipients: ["engage@mail.witnessops.com"],
    subject: "Bob private request",
    receivedAt: "2026-08-13T08:00:00Z",
    excerpt: "Private bounded request",
  }, founder);
  const converted = await convertInboxItemToReviewRequest(imported.item.id, bob);
  const aliceCookie = await cookieFor("alice", "Delegated Operator");
  const aliceRequest = (pathParts: string[]) =>
    new NextRequest(`https://witnessops.com/api/admin/core/${pathParts.join("/")}`, {
      headers: { cookie: `witnessops-admin-session=${aliceCookie}` },
    });

  const direct = await GET(
    aliceRequest(["review-requests", converted.reviewRequest.id]),
    context("review-requests", converted.reviewRequest.id),
  );
  assert.equal(direct.status, 404);

  const list = await GET(
    aliceRequest(["review-requests"]),
    context("review-requests"),
  );
  assert.equal(list.status, 200);
  assert.deepEqual((await list.json() as { items: unknown[] }).items, []);

  const founderCookie = await cookieFor("founder", "Founder");
  const founderList = await GET(
    new NextRequest("https://witnessops.com/api/admin/core/review-requests", {
      headers: { cookie: `witnessops-admin-session=${founderCookie}` },
    }),
    context("review-requests"),
  );
  assert.equal(founderList.status, 200);
  assert.equal((await founderList.json() as { items: unknown[] }).items.length, 1);
});
