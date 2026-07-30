import assert from "node:assert/strict";
import test from "node:test";

import { getDocsSidebar } from "./sidebar";

test("primary docs sidebar is hub-only and stays small", async () => {
  const sidebar = await getDocsSidebar("witnessops");
  const items = sidebar.flatMap((section) => section.items);
  const hrefs = items.map((item) => item.href);

  assert.ok(sidebar.length <= 6, `expected ≤6 sections, got ${sidebar.length}`);
  assert.ok(
    items.length <= 24,
    `expected ≤24 primary links (tier-1 hub), got ${items.length}`,
  );

  // Buyer path stays one click from primary chrome
  assert.ok(
    hrefs.includes("/docs/getting-started/proof-run-buyer-path"),
    "buyer path hub missing",
  );

  // Session 3 tier-1 hubs
  for (const hub of [
    "/docs/faq",
    "/docs/governance",
    "/docs/evidence",
    "/docs/audiences",
  ]) {
    assert.ok(hrefs.includes(hub), `tier-1 hub missing: ${hub}`);
  }

  // Security-education leaves must not flood primary nav
  const leafPollution = hrefs.filter(
    (href) =>
      href.includes("/security-education/") ||
      href.includes("/password-reuse") ||
      href.includes("/phishing-tricks") ||
      href.includes("/evidence-mapping/"),
  );
  assert.deepEqual(leafPollution, [], `unexpected leaves in primary nav: ${leafPollution.join(", ")}`);

  // Hub for education remains
  assert.ok(hrefs.includes("/docs/security-education"));
});
