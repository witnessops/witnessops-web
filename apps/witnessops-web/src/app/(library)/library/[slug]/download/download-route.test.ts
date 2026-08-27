import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { getSkill, readSkillBytes } from "@/lib/skills/catalog";
import { GET } from "./route";

test("download returns the exact canonical skill bytes and digest", async () => {
  const slug = "governed-agent-verifier";
  const skill = getSkill(slug);
  assert.ok(skill);
  const response = await GET(new Request(`https://witnessops.test/library/${slug}/download`), {
    params: Promise.resolve({ slug }),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(response.status, 200);
  assert.deepEqual(bytes, readSkillBytes(slug));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), skill.sha256);
  assert.equal(response.headers.get("x-content-sha256"), skill.sha256);
});

test("unknown skill download returns 404", async () => {
  const response = await GET(new Request("https://witnessops.test/library/unknown/download"), {
    params: Promise.resolve({ slug: "unknown" }),
  });
  assert.equal(response.status, 404);
});
