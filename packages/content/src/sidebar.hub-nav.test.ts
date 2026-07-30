import assert from "node:assert/strict";
import test from "node:test";

import { getDocsSidebar } from "./sidebar";

test("primary docs sidebar is hub-only and stays small", async () => {
  const sidebar = await getDocsSidebar("witnessops");
  const items = sidebar.flatMap((section) => section.items);
  const hrefs = items.map((item) => item.href);

  assert.ok(sidebar.length <= 6, `expected ≤6 sections, got ${sidebar.length}`);
  assert.ok(items.length <= 18, `expected ≤18 primary links, got ${items.length}`);

  // Buyer path stays one click from primary chrome
  assert.ok(
    hrefs.includes("/docs/getting-started/proof-run-buyer-path"),
    "buyer path hub missing",
  );

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
