import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import test from "node:test";

import {
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_GENERAL_HREF,
  PUBLIC_CONTACT_PRIMARY_HREF,
  PUBLIC_CONTACT_SUBJECTS,
  PUBLIC_NO_SECRETS_NOTE,
  PUBLIC_SALES_REVIEW_EMAIL,
  productContactSubject,
  publicContactMailto,
  salesReviewMailto,
} from "./public-contact";
import { getMailboxConfig } from "./mailboxes";
import { PRIMARY_OFFER } from "./commercial-truth";

test("public contact route uses a general inquiry path and fallback email", () => {
  assert.equal(PUBLIC_CONTACT_EMAIL, "engage@mail.witnessops.com");
  assert.equal(PUBLIC_CONTACT_GENERAL_HREF, "/review/request");
  assert.equal(
    PUBLIC_CONTACT_PRIMARY_HREF,
    "/review/request",
  );
  assert.doesNotMatch(PUBLIC_CONTACT_PRIMARY_HREF, /Agent.Risk|1%2C500/);
  assert.equal(PUBLIC_CONTACT_SUBJECTS.general, "WitnessOps request");
  assert.equal(PUBLIC_CONTACT_SUBJECTS.fitCheck, "WitnessOps fit check");
  assert.equal(
    PRIMARY_OFFER.mailSubject,
    "WitnessOps request — AI Agent Tools & Access Review",
  );
  assert.equal(
    PUBLIC_NO_SECRETS_NOTE,
    "Do not send passwords, private keys, API keys, recovery codes, session tokens or other secrets.",
  );
  assert.equal(
    publicContactMailto(PUBLIC_CONTACT_SUBJECTS.general),
    "mailto:engage@mail.witnessops.com?subject=WitnessOps%20request",
  );
  assert.equal(
    publicContactMailto(PUBLIC_CONTACT_SUBJECTS.fitCheck),
    "mailto:engage@mail.witnessops.com?subject=WitnessOps%20fit%20check",
  );
  assert.equal(
    publicContactMailto(productContactSubject("AI Agent Action Proof Run")),
    "mailto:engage@mail.witnessops.com?subject=WitnessOps%20request%20%E2%80%94%20AI%20Agent%20Action%20Proof%20Run",
  );
  assert.equal(
    publicContactMailto(PRIMARY_OFFER.mailSubject),
    "mailto:engage@mail.witnessops.com?subject=WitnessOps%20request%20%E2%80%94%20AI%20Agent%20Tools%20%26%20Access%20Review",
  );
});

test("sales review display uses the public contact address and leaves operational mailboxes there", () => {
  assert.equal(PUBLIC_CONTACT_EMAIL, "engage@mail.witnessops.com");
  assert.equal(PUBLIC_SALES_REVIEW_EMAIL, PUBLIC_CONTACT_EMAIL);
  assert.equal(salesReviewMailto(), `mailto:${PUBLIC_CONTACT_EMAIL}`);
  assert.equal(
    salesReviewMailto(PUBLIC_CONTACT_SUBJECTS.fitCheck),
    "mailto:engage@mail.witnessops.com?subject=WitnessOps%20fit%20check",
  );
  assert.equal(
    salesReviewMailto(PUBLIC_CONTACT_SUBJECTS.fitCheck).slice("mailto:".length).split("?")[0],
    PUBLIC_CONTACT_EMAIL,
  );
  assert.doesNotMatch(PUBLIC_SALES_REVIEW_EMAIL, /karol\.stefanski@/);

  const previous = {
    engage: process.env.WITNESSOPS_MAILBOX_ENGAGE,
    hello: process.env.WITNESSOPS_MAILBOX_HELLO,
    support: process.env.WITNESSOPS_MAILBOX_SUPPORT,
  };
  delete process.env.WITNESSOPS_MAILBOX_ENGAGE;
  delete process.env.WITNESSOPS_MAILBOX_HELLO;
  delete process.env.WITNESSOPS_MAILBOX_SUPPORT;
  try {
    const mailboxes = getMailboxConfig();
    assert.equal(mailboxes.engage, PUBLIC_CONTACT_EMAIL);
    assert.equal(mailboxes.hello, PUBLIC_CONTACT_EMAIL);
    assert.equal(mailboxes.support, PUBLIC_CONTACT_EMAIL);
    assert.equal(mailboxes.engage, "engage@mail.witnessops.com");
    assert.doesNotMatch(mailboxes.engage, /karol\.stefanski@/);
    assert.doesNotMatch(mailboxes.support, /karol\.stefanski@/);
  } finally {
    if (previous.engage === undefined) delete process.env.WITNESSOPS_MAILBOX_ENGAGE;
    else process.env.WITNESSOPS_MAILBOX_ENGAGE = previous.engage;
    if (previous.hello === undefined) delete process.env.WITNESSOPS_MAILBOX_HELLO;
    else process.env.WITNESSOPS_MAILBOX_HELLO = previous.hello;
    if (previous.support === undefined) delete process.env.WITNESSOPS_MAILBOX_SUPPORT;
    else process.env.WITNESSOPS_MAILBOX_SUPPORT = previous.support;
  }
});

const webRoot = resolve(__dirname, "../..");
const repoRoot = resolve(webRoot, "../..");
const PERSONAL_PUBLIC_MAILBOX = `${"karol"}.${"stefanski"}@mail.witnessops.com`;
const PUBLIC_TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".md",
  ".mdx",
  ".yaml",
  ".yml",
  ".json",
  ".html",
]);

function isPublicWebsiteFile(path: string): boolean {
  const rel = relative(repoRoot, path).split("\\").join("/");
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(rel)) return false;
  if (rel.includes("/admin/") || rel.startsWith("apps/witnessops-web/src/app/admin")) return false;
  if (rel.includes("/src/lib/server/")) return false;
  return PUBLIC_TEXT_EXTENSIONS.has(extname(path));
}

function collectFiles(path: string): string[] {
  const info = statSync(path);
  if (info.isFile()) return isPublicWebsiteFile(path) ? [path] : [];
  const files: string[] = [];
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "admin") continue;
    files.push(...collectFiles(join(path, entry.name)));
  }
  return files;
}

test("public website sources do not show the personal mailbox", () => {
  const roots = [
    resolve(webRoot, "src/app"),
    resolve(webRoot, "src/components"),
    resolve(webRoot, "src/lib"),
    resolve(repoRoot, "content/witnessops"),
    resolve(repoRoot, "scripts/smoke-buyer-path.ts"),
  ];
  const hits = roots
    .flatMap((root) => collectFiles(root))
    .filter((path) => readFileSync(path, "utf8").includes(PERSONAL_PUBLIC_MAILBOX))
    .map((path) => relative(repoRoot, path).split("\\").join("/"));

  assert.deepEqual(hits, []);
  assert.equal(PUBLIC_SALES_REVIEW_EMAIL, "engage@mail.witnessops.com");
});
