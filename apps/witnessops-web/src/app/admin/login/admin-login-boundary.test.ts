import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { sanitizeAdminReturnTo } from "../../../lib/admin-return-path";
import { AdminLoginForm } from "./admin-login-form";

test("admin login keeps Google as the default and shows Entra only when enabled", () => {
  const page = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
  const form = readFileSync(resolve(__dirname, "admin-login-form.tsx"), "utf-8");
  const layout = readFileSync(resolve(__dirname, "layout.tsx"), "utf-8");

  assert.match(layout, /robots:\s*{\s*index:\s*false,\s*follow:\s*false\s*}/);
  assert.match(layout, /WitnessOps Admin Login/);
  assert.match(form, /"use client"/);
  assert.match(page, /export const dynamic = "force-dynamic"/);
  assert.match(page, /entraEnabled=\{isAdminEntraEnabled\(\)\}/);
  assert.doesNotMatch(page, /entraEnabled=\{true\}/);
  assert.doesNotMatch(page, /WITNESSOPS_ENTRA_OIDC_|CLIENT_SECRET|OID_ALLOWLIST/);

  assert.match(form, /Continue with Google Workspace/);
  assert.match(form, /\/api\/admin\/google\/start/);
  assert.match(form, /Google Workspace is the only admin sign-in method/);
  assert.match(form, /\{entraEnabled \? \([\s\S]*Continue with Microsoft Entra/);
  assert.match(form, /\/api\/admin\/entra\/start/);
  assert.doesNotMatch(form, /legacy key|\/api\/admin\/auth|\/api\/admin\/oidc/i);
  assert.doesNotMatch(form, /type="password"|name="password"/);

  const flagOff = renderToStaticMarkup(
    createElement(AdminLoginForm, { entraEnabled: false }),
  );
  assert.match(flagOff, /Continue with Google Workspace/);
  assert.match(flagOff, /Google Workspace is the only admin sign-in method/);
  assert.match(flagOff, /Use an explicitly authorized Google Workspace identity\./);
  assert.doesNotMatch(flagOff, /Microsoft|Entra/i);
  assert.doesNotMatch(flagOff, /type="password"/);

  const flagOn = renderToStaticMarkup(
    createElement(AdminLoginForm, { entraEnabled: true }),
  );
  assert.match(flagOn, /Continue with Google Workspace/);
  assert.match(flagOn, /Continue with Microsoft Entra/);
  assert.match(flagOn, /Google Workspace remains the default admin sign-in method/);
  assert.doesNotMatch(flagOn, /type="password"/);
});

test("admin login exposes landmarks, labels, focus, loading, and bounded feedback", () => {
  const page = readFileSync(resolve(__dirname, "admin-login-form.tsx"), "utf-8");

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
  const page = readFileSync(resolve(__dirname, "admin-login-form.tsx"), "utf-8");

  assert.match(page, /errorCode === "google_auth_unavailable"/);
  assert.match(page, /Google Workspace sign-in could not be completed/);
  assert.match(
    page,
    /setMessage\(callbackMessage\(params\.get\("error"\), entraEnabled\)\)/,
  );
  assert.match(page, /errorCode === "entra_not_configured"/);
  assert.match(page, /That admin sign-in method is not configured\./);
  assert.doesNotMatch(page, /text:\s*params\.get\("error"\)/);
  assert.doesNotMatch(page, /error_description/);
  assert.doesNotMatch(page, /Request one proof run|Package one security workflow|ContactForm|SupportIntake|\/review\/request/);
  assert.doesNotMatch(page, /verified compliance|certified compliance|audit-ready|guarantees compliance/i);
});
