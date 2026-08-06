import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { sanitizeAdminReturnTo } from "../../../lib/admin-return-path";

test("admin login exposes Google Workspace as the only authentication method", () => {
  const page = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
  const layout = readFileSync(resolve(__dirname, "layout.tsx"), "utf-8");

  assert.match(layout, /robots:\s*{\s*index:\s*false,\s*follow:\s*false\s*}/);
  assert.match(layout, /WitnessOps Admin Login/);
  assert.match(page, /"use client"/);

  assert.match(page, /Continue with Google Workspace/);
  assert.match(page, /\/api\/admin\/google\/start/);
  assert.match(page, /Google Workspace is the only admin sign-in method/);
  assert.doesNotMatch(page, /Microsoft|Entra/i);
  assert.doesNotMatch(page, /legacy key|\/api\/admin\/auth|\/api\/admin\/oidc/i);
});

test("admin login exposes landmarks, labels, focus, loading, and bounded feedback", () => {
  const page = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(page, /href="#main-content"/);
  assert.match(page, /<main id="main-content" tabIndex={-1}>/);
  assert.match(page, /:focus-visible/);
  assert.match(page, /aria-busy={pending}/);
  assert.match(page, /role={message\?\.kind === "error" \? "alert" : "status"}/);
  assert.match(page, /aria-live={message\?\.kind === "error" \? "assertive" : "polite"}/);
  assert.match(page, /Connecting to Google Workspace…/);
  assert.match(page, /disabled={pending}/);
  assert.match(page, /navigateAfterStatusAnnouncement/);
  assert.match(page, /PROVIDER_NAVIGATION_DELAY_MS = 100/);
  assert.match(
    page,
    /setReturnTo\(sanitizeAdminReturnTo\(params\.get\("returnTo"\)\)\)/,
  );
  assert.doesNotMatch(page, /function safeAdminReturnPath/);
  assert.match(
    page,
    /body > \.skip-link,\s*body > nav,\s*body > footer \{ display: none !important; \}/,
  );
  assert.match(page, /<footer className="auth-footer">/);
  assert.doesNotMatch(page, /body > \.auth-footer/);
});

test("admin login return paths remain inside the normalized admin subtree", () => {
  assert.equal(sanitizeAdminReturnTo("/admin"), "/admin");
  assert.equal(
    sanitizeAdminReturnTo("/admin/queue?state=open#current"),
    "/admin/queue?state=open#current",
  );
  assert.equal(
    sanitizeAdminReturnTo("/admin/queue/../products"),
    "/admin/products",
  );

  for (const unsafe of [
    "/admin/../public",
    "/admin/%2e%2e/public",
    "/admin/%252e%252e/public",
    "/admin/..%2fpublic",
    "/admin/%5c..%5cpublic",
    "//evil.example/admin",
    "https://evil.example/admin",
    "/admin/%",
    "/admin/%0aqueue",
  ]) {
    assert.equal(sanitizeAdminReturnTo(unsafe), "/admin");
  }
});

test("admin login maps callback errors to generic copy without echoing query input", () => {
  const page = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(page, /errorCode === "google_auth_unavailable"/);
  assert.match(page, /Google Workspace sign-in could not be completed/);
  assert.match(page, /setMessage\(callbackMessage\(params\.get\("error"\)\)\)/);
  assert.doesNotMatch(page, /text:\s*params\.get\("error"\)/);
  assert.doesNotMatch(page, /error_description/);
  assert.doesNotMatch(page, /Request one proof run|Package one security workflow|ContactForm|SupportIntake|\/review\/request/);
  assert.doesNotMatch(page, /verified compliance|certified compliance|audit-ready|guarantees compliance/i);
});
