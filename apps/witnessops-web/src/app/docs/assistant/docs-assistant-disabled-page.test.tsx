import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("docs assistant page is noindex and renders the bounded assistant shell", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(source, /robots:\s*{\s*index:\s*false,\s*follow:\s*false\s*}/);
  assert.match(source, /import\s+{\s*DocsAssistantPage\s*}/);
  assert.match(source, /<DocsAssistantPage\s*\/>/);

  const page = readFileSync(
    resolve(__dirname, "../../../components/docs-assistant/docs-assistant-page.tsx"),
    "utf-8",
  );
  assert.doesNotMatch(page, /trackAskEvent\(\s*"opened"/);
  const mount = page.slice(page.indexOf("useEffect(() => {"), page.indexOf("async function ask"));
  assert.doesNotMatch(mount, /trackAskEvent|fetch\(|fetchAskWitnessOps/);
  assert.match(mount, /requestGenerationRef\.current \+= 1/);

  assert.doesNotMatch(source, /NODE_ENV/);
  assert.doesNotMatch(source, /NEXT_PUBLIC.*DOCS_ASSISTANT/i);
  assert.doesNotMatch(source, /Disabled skeleton|not enabled yet/i);
});
