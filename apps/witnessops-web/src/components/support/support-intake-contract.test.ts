import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const supportIntake = readFileSync(
  resolve(__dirname, "support-intake.tsx"),
  "utf8",
);
const polishSupport = readFileSync(
  resolve(__dirname, "../../app/pl/support/page.tsx"),
  "utf8",
);
const pricing = readFileSync(
  resolve(__dirname, "../../app/(marketing)/pricing/page.tsx"),
  "utf8",
);

test("support validates and normalizes email before advancing", () => {
  assert.match(supportIntake, /normalizedEmailSchema\.safeParse\(email\)/);
  assert.match(supportIntake, /<form id="si-email-form" onSubmit=\{handleEmailStep\} noValidate>/);
  assert.match(supportIntake, /type="submit"[\s\S]*?form="si-email-form"/);
  const formStart = supportIntake.indexOf('<form id="si-email-form"');
  const formEnd = supportIntake.indexOf("</form>", formStart);
  const searchInput = supportIntake.indexOf('id="si-search"');
  assert.ok(formStart >= 0 && formEnd > formStart);
  assert.ok(searchInput > formEnd, "docs search must stay outside the email form");
  assert.match(supportIntake, /id="si-email-error"[\s\S]*?role="alert"/);
  assert.match(supportIntake, />Email address<\/label>/);
  assert.match(supportIntake, /Enter a valid email address\./);
  assert.doesNotMatch(supportIntake, /work email/i);
  assert.doesNotMatch(supportIntake, /if \(email\.trim\(\)\) setStatus\("form"\)/);
});

test("support verification code describes its instructions and conditional error", () => {
  assert.match(supportIntake, /id="si-verification-instructions"/);
  assert.match(
    supportIntake,
    /\? "si-verification-instructions si-verification-error"[\s\S]*?: "si-verification-instructions"/,
  );
  assert.match(supportIntake, /id="si-verification-error" role="alert"/);
});

test("Polish support uses an explicit support mailbox lane, not the sales contact block", () => {
  assert.match(polishSupport, /Kontakt ze wsparciem/);
  assert.match(polishSupport, /SUPPORT_MAILTO/);
  assert.match(polishSupport, /PUBLIC_CONTACT_EMAIL/);
  assert.doesNotMatch(polishSupport, /PublicContactRoute/);
});

test("pricing leaves brand suffixing to the root metadata template", () => {
  assert.match(pricing, /title: "Agent and Security Review Pricing",/);
  assert.doesNotMatch(
    pricing,
    /export const metadata: Metadata = \{\s*title: "Agent and Security Review Pricing \| WitnessOps",/,
  );
  assert.match(
    pricing,
    /openGraph:[\s\S]*?title: "Agent and Security Review Pricing \| WitnessOps"/,
  );
});
