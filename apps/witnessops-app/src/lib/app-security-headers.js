const { randomBytes } = require("node:crypto");
const { securityHeaders } = require("../../../../packages/config/next/security-headers");

const APP_REFERRER_POLICY = "no-referrer";
const SHARED_FORM_ACTION = "form-action 'self'";
const APP_FORM_ACTION = "form-action 'self' https://api.workos.com";
const NONCE_PATTERN = /^[A-Za-z0-9+/_-]+={0,2}$/;

function sharedContentSecurityPolicy() {
  const header = securityHeaders.find((item) => item.key === "Content-Security-Policy");
  if (!header) throw new Error("Shared security headers are missing Content-Security-Policy.");
  return header.value;
}

function sharedDirective(name) {
  const directive = sharedContentSecurityPolicy()
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));
  if (!directive) throw new Error(`Shared Content-Security-Policy is missing ${name}.`);
  return directive;
}

/** Throws when the shared policy no longer contains the exact form-action directive the app extends. */
function extendFormAction(policy) {
  const directives = policy.split(";").map((part) => part.trim()).filter(Boolean);
  const count = directives.filter((directive) => directive === SHARED_FORM_ACTION).length;
  if (count !== 1) {
    throw new Error(
      `Refusing to build the app Content-Security-Policy: expected exactly one "${SHARED_FORM_ACTION}" directive, found ${count}. The WorkOS form-action extension was not applied.`,
    );
  }
  return directives.map((directive) => (directive === SHARED_FORM_ACTION ? APP_FORM_ACTION : directive)).join("; ");
}

function createCspNonce() {
  const nonce = randomBytes(16).toString("base64");
  if (!NONCE_PATTERN.test(nonce)) throw new Error("Generated CSP nonce is not a single header token.");
  return nonce;
}

/**
 * Report-only policy for the app. script-src has no 'unsafe-inline'.
 * img-src is 'self' only: the app renders no img/next/image, no CSS image urls,
 * and no data: or blob: image loads (blob: is used for file downloads, not images).
 * style-src stays 'unsafe-inline' until a later nonce or hash pass.
 * form-action, frame-ancestors, base-uri, and object-src follow the shared policy,
 * with the app's existing WorkOS form-action extension applied out loud.
 */
function appReportOnlyContentSecurityPolicy(nonce) {
  if (typeof nonce !== "string" || !NONCE_PATTERN.test(nonce)) {
    throw new Error("CSP nonce must be a single base64 token.");
  }
  const scriptSources = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (process.env.NODE_ENV === "development") scriptSources.push("'unsafe-eval'");
  const scriptSrc = `script-src ${scriptSources.join(" ")}`;
  if (scriptSrc.includes("unsafe-inline")) {
    throw new Error("Report-only script-src must not include unsafe-inline.");
  }
  return extendFormAction([
    sharedDirective("default-src"),
    scriptSrc,
    sharedDirective("style-src"),
    "img-src 'self'",
    "font-src 'self'",
    sharedDirective("connect-src"),
    sharedDirective("object-src"),
    sharedDirective("base-uri"),
    sharedDirective("form-action"),
    sharedDirective("frame-ancestors"),
  ].join("; "));
}

function appSecurityHeaders(source = securityHeaders) {
  let referrerCount = 0;
  const headers = source.map((header) => {
    if (header.key === "Content-Security-Policy") {
      return { key: header.key, value: extendFormAction(header.value) };
    }
    if (header.key === "Referrer-Policy") {
      referrerCount += 1;
      return { key: "Referrer-Policy", value: APP_REFERRER_POLICY };
    }
    return { key: header.key, value: header.value };
  });
  if (referrerCount !== 1) {
    throw new Error(`Refusing to build app security headers: expected exactly one shared Referrer-Policy, found ${referrerCount}.`);
  }
  headers.push(
    { key: "Cache-Control", value: "no-store" },
    { key: "X-Robots-Tag", value: "noindex, nofollow" },
  );
  return headers;
}

module.exports = {
  APP_FORM_ACTION,
  APP_REFERRER_POLICY,
  SHARED_FORM_ACTION,
  appReportOnlyContentSecurityPolicy,
  appSecurityHeaders,
  createCspNonce,
  extendFormAction,
};
