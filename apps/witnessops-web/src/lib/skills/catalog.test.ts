import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  getSkill,
  listSkills,
  PUBLIC_SKILL_COUNT,
  readSkillBytes,
  readSkillMarkdown,
} from "./catalog";

test("library exposes eleven unique canonical skill contracts", () => {
  const skills = listSkills();
  assert.equal(PUBLIC_SKILL_COUNT, 11);
  assert.equal(skills.length, 11);
  assert.equal(new Set(skills.map(({ slug }) => slug)).size, 11);
  assert.equal(getSkill("unknown-skill"), undefined);
});

test("each displayed hash and string originates from the exact committed bytes", () => {
  for (const skill of listSkills()) {
    const bytes = readSkillBytes(skill.slug);
    const sourceBytes = readFileSync(resolve(process.cwd(), "../../", skill.sourcePath));
    assert.deepEqual(bytes, sourceBytes, skill.slug);
    assert.equal(readSkillMarkdown(skill.slug), bytes.toString("utf8"), skill.slug);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), skill.sha256, skill.slug);
    assert.equal(bytes.byteLength, skill.byteLength, skill.slug);
  }
});

test("featured governed-agent-verifier hash is recomputed from production bytes", () => {
  const skill = getSkill("governed-agent-verifier");
  assert.ok(skill);
  assert.equal(skill.featured, true);
  assert.equal(
    skill.sha256,
    "2a0b2309a1785081ecc20c7e325b3d23454b2bfd65d9641ea82164bf9298aad5",
  );
});

test("runtime image copies the canonical skill byte directory", () => {
  const dockerfile = readFileSync(resolve(process.cwd(), "Dockerfile"), "utf8");
  assert.match(dockerfile, /COPY content\/witnessops\/skills \.\/content\/witnessops\/skills/);
});
