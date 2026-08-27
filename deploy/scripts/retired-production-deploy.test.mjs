import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

const retiredCommand = "node deploy/scripts/retired-production-deploy.mjs";

test("routine legacy production aliases fail through the retired-path guard", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  for (const name of ["deploy:k3s:build", "deploy:k3s:prod", "deploy:k3s:both"]) {
    assert.equal(packageJson.scripts[name], retiredCommand);
  }

  const result = spawnSync(process.execPath, ["deploy/scripts/retired-production-deploy.mjs"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /RETIRED_PRODUCTION_DEPLOY_PATH/);
  assert.match(result.stderr, /immutable ECR/);
  assert.equal(result.stdout, "");
});
