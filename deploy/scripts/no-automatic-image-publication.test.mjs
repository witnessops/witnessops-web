import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("a merge to main cannot publish the validated image", async () => {
  const workflow = await readFile(".github/workflows/build-image.yml", "utf8");

  assert.ok(
    workflow.includes(["  push:", '    branches: ["main"]'].join("\n")),
  );

  const publishStart = workflow.indexOf("\n  publish:\n");
  assert.notEqual(publishStart, -1);
  const publishBlock = workflow.slice(publishStart);
  assert.match(
    publishBlock,
    /if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/,
  );
  assert.doesNotMatch(
    publishBlock,
    /if: github\.event_name != 'pull_request'/,
  );
});
