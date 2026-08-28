import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { getSkillVersion, readSkillBytes } from "@/lib/skills/catalog";
import { GET } from "./route";

for (const version of ["1.0.0", "1.0.1"] as const) {
  test(`versioned download preserves immutable governed-agent-verifier ${version} bytes`, async () => {
    const slug = "governed-agent-verifier";
    const skill = getSkillVersion(slug, version);
    assert.ok(skill);
    const response = await GET(
      new Request(`https://witnessops.test/library/${slug}/versions/${version}/download`),
      { params: Promise.resolve({ slug, version }) },
    );
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(response.status, 200);
    assert.deepEqual(bytes, readSkillBytes(slug, version));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), skill.sha256);
    assert.equal(response.headers.get("x-content-sha256"), skill.sha256);
    assert.equal(
      response.headers.get("cache-control"),
      "public, max-age=31536000, immutable",
    );
  });
}

test("unknown historical skill version returns 404", async () => {
  const response = await GET(
    new Request(
      "https://witnessops.test/library/governed-agent-verifier/versions/9.9.9/download",
    ),
    {
      params: Promise.resolve({
        slug: "governed-agent-verifier",
        version: "9.9.9",
      }),
    },
  );
  assert.equal(response.status, 404);
});

test("non-archived skill releases are not presented as immutable snapshots", async () => {
  const response = await GET(
    new Request(
      "https://witnessops.test/library/receipt-first-verifier/versions/1.0.0/download",
    ),
    {
      params: Promise.resolve({
        slug: "receipt-first-verifier",
        version: "1.0.0",
      }),
    },
  );
  assert.equal(response.status, 404);
});
