import assert from "node:assert/strict";
import test from "node:test";

import { POLISH_DOCS_SECTIONS } from "./docs-navigation";

test("PL docs nav is buyer-oriented without a deep technical stub tree", () => {
  const all = POLISH_DOCS_SECTIONS.flatMap((s) => s.items);
  const technical = POLISH_DOCS_SECTIONS.find((s) => s.id === "technical-en");
  assert.ok(technical, "expected technical-en section");
  assert.equal(
    technical!.items.length,
    1,
    "technical section must be a single EN entry",
  );
  assert.match(
    technical!.items[0]!.href,
    /^https:\/\/witnessops\.com\/docs\/?$|^\/docs\/?$/,
    "EN technical entry should point at apex /docs (not legacy docs.witnessops.com)",
  );
  assert.doesNotMatch(
    technical!.items[0]!.href,
    /docs\.witnessops\.com/,
    "EN technical entry must not use the legacy docs subdomain",
  );
  assert.doesNotMatch(
    technical!.description,
    /docs\.witnessops\.com/,
    "technical section description must not advertise the legacy docs host",
  );

  const stubTechnicalLeaves = all.filter(
    (item) =>
      item.href.startsWith("/pl/docs/") &&
      /technical-architecture|threat-model|receipt-specification|verification-commands|evidence-mapping|integrations$|standards-and-frameworks|delivery-artifact-types|product-catalog/.test(
        item.href,
      ),
  );
  assert.deepEqual(
    stubTechnicalLeaves,
    [],
    `unexpected PL technical stubs in nav: ${stubTechnicalLeaves.map((i) => i.href).join(", ")}`,
  );

  assert.ok(all.length <= 20, `nav still too large: ${all.length}`);
  assert.ok(
    all.some((i) => i.href === "/pl/review/request"),
    "buyer request path missing",
  );
});
