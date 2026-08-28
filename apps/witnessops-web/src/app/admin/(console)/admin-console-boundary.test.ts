import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("admin console layout remains noindex and admin-console only", () => {
  const source = readFileSync(resolve(__dirname, "layout.tsx"), "utf-8");
  const shellSource = readFileSync(resolve(__dirname, "../../../components/admin/admin-console-shell.tsx"), "utf-8");
  const combinedSource = `${source}\n${shellSource}`;

  assert.match(combinedSource, /robots:\s*{\s*index:\s*false,\s*follow:\s*false\s*}/);
  assert.match(combinedSource, /WitnessOps Admin Console/);
  assert.match(combinedSource, /AdminConsoleShell/);
  assert.match(combinedSource, /AdminSidebar/);
  assert.match(combinedSource, /AdminAlertBell/);
  assert.match(combinedSource, /getVerifiedAdminSession/);
  assert.match(combinedSource, /redirect\("\/admin\/login"\)/);
  assert.match(combinedSource, /aria-label=\"Admin navigation\"/);
  assert.match(combinedSource, /Authenticated/);

  assert.doesNotMatch(combinedSource, /ContactForm|SupportIntake|Request one proof run|Package one security workflow|\/review\/request/);
  assert.doesNotMatch(combinedSource, /verified compliance|certified compliance|audit-ready|guarantees compliance/i);
});

test("admin system exposes Google logout without legacy key material", () => {
  const systemPage = readFileSync(resolve(__dirname, "system/page.tsx"), "utf-8");
  const authInfo = readFileSync(
    resolve(__dirname, "../../../components/admin/admin-auth-info.tsx"),
    "utf-8",
  );
  const combinedSource = `${systemPage}\n${authInfo}`;

  assert.match(combinedSource, /End Google Workspace Session/);
  assert.match(combinedSource, /action="\/api\/admin\/logout" method="post"/);
  assert.doesNotMatch(combinedSource, /keyHash|Key hash|payload\.hash/);
});

test("admin separates buyer services from immutable product contracts", () => {
  const page = readFileSync(resolve(__dirname, "products/page.tsx"), "utf-8");
  const sidebar = readFileSync(
    resolve(__dirname, "../../../components/admin/admin-sidebar.tsx"),
    "utf-8",
  );

  assert.match(sidebar, /href: "\/admin\/products", label: "Services"/);
  assert.match(page, /Services & contracts/);
  assert.match(page, /Buyer-facing services/);
  assert.match(page, /Immutable product contracts/);
  assert.match(page, /listAdminBuyerServices/);
  assert.match(page, /listProductContracts/);
  assert.match(page, /selected-offer handoffs/i);
  assert.match(page, /generic handoffs/i);
  assert.doesNotMatch(page, /buyer offer into an immutable execution contract/i);
});
