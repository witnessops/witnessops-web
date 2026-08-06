import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("admin login keeps all three auth methods ordered and explicitly labelled", () => {
  const page = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
  const layout = readFileSync(resolve(__dirname, "layout.tsx"), "utf-8");

  assert.match(layout, /robots:\s*{\s*index:\s*false,\s*follow:\s*false\s*}/);
  assert.match(layout, /WitnessOps Admin Login/);
  assert.match(page, /"use client"/);

  const googleIndex = page.indexOf("Continue with Google Workspace");
  const microsoftIndex = page.indexOf("Continue with Microsoft");
  const legacyIndex = page.indexOf(
    '<legend className="legacy-legend">Legacy key authentication</legend>',
  );
  assert.ok(googleIndex >= 0);
  assert.ok(microsoftIndex > googleIndex);
  assert.ok(legacyIndex > microsoftIndex);

  assert.match(page, /\/api\/admin\/google\/start/);
  assert.match(page, /\/api\/admin\/oidc\/start/);
  assert.match(page, /\/api\/admin\/auth/);
  assert.match(page, /Google Workspace preferred/);
  assert.match(page, /Microsoft OIDC and legacy key retained as fallbacks/);
});

test("admin login exposes landmarks, labels, focus, loading, and bounded feedback", () => {
  const page = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(page, /href="#main-content"/);
  assert.match(page, /<main id="main-content" tabIndex={-1}>/);
  assert.match(page, /htmlFor="admin-key-file"/);
  assert.match(page, /id="admin-key-file"/);
  assert.match(page, /htmlFor="admin-key-value"/);
  assert.match(page, /id="admin-key-value"/);
  assert.match(page, /aria-describedby="admin-key-file-help"/);
  assert.match(page, /aria-describedby="admin-key-value-help"/);
  assert.match(page, /aria-invalid=/);
  assert.match(page, /:focus-visible/);
  assert.match(page, /aria-busy={isPending}/);
  assert.match(page, /role={message\?\.kind === "error" \? "alert" : "status"}/);
  assert.match(page, /aria-live={message\?\.kind === "error" \? "assertive" : "polite"}/);
  assert.match(page, /Connecting to Google Workspace…/);
  assert.match(page, /disabled={isPending}/);
  assert.match(page, /navigateAfterStatusAnnouncement/);
  assert.match(page, /PROVIDER_NAVIGATION_DELAY_MS = 100/);
});

test("admin login maps callback errors to generic copy without echoing query input", () => {
  const page = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(page, /errorCode === "google_auth_unavailable"/);
  assert.match(page, /errorCode === "google_auth_failed"/);
  assert.match(page, /Admin sign-in could not be completed/);
  assert.match(page, /setMessage\(callbackMessage\(params\.get\("error"\)\)\)/);
  assert.doesNotMatch(page, /text:\s*params\.get\("error"\)/);
  assert.doesNotMatch(page, /error_description/);
  assert.doesNotMatch(page, /Request one proof run|Package one security workflow|ContactForm|SupportIntake|\/review\/request/);
  assert.doesNotMatch(page, /verified compliance|certified compliance|audit-ready|guarantees compliance/i);
});
