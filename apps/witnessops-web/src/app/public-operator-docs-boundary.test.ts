import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryFiles = [
  "../../../../content/witnessops/docs/security-systems/mesh-federation-and-vmesh.mdx",
  "../../../../docs/P0-GOAL0-CLOSEOUT.md",
  "../../../../docs/ui/HQ_ADMIN_RECONCILIATION_V1.md",
];

const privateMarkers = [
  "/" + "Users" + "/ops",
  "~" + "/DEV",
  "fleet" + "-ops-01",
  "wops" + "-maintainers",
];

test("tracked public and operator docs omit private host and custody paths", async () => {
  for (const relativePath of repositoryFiles) {
    const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
    for (const marker of privateMarkers) {
      assert.equal(
        source.includes(marker),
        false,
        `${relativePath} contains private marker ${marker}`,
      );
    }
  }
});
