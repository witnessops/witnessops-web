import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const appRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const sourceRoot = path.join(appRoot, "src");
const loaderPath = path.join(
  sourceRoot,
  "lib/server/ask-witnessops/authority-loader.ts",
);
const corePath = path.join(
  sourceRoot,
  "lib/server/ask-witnessops/authority-loader-core.ts",
);
const assemblerPath = path.join(
  sourceRoot,
  "lib/server/ask-witnessops/authority-answer-assembler.ts",
);

function walkSource(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkSource(entryPath);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

test("authority projection is imported by the public server-only loader only", () => {
  const runtimeFiles = walkSource(sourceRoot).filter((file) => !/\.test\.tsx?$/.test(file));
  const importers = runtimeFiles.filter((file) =>
    readFileSync(file, "utf8").includes(
      "@witnessops/ask-authority/v1/authority-set.json",
    ),
  );
  assert.deepEqual(importers, [loaderPath]);

  const loader = readFileSync(loaderPath, "utf8");
  assert.match(loader, /^import "server-only";/);
  assert.doesNotMatch(loader, /["']use client["']/);
  assert.doesNotMatch(loader, /node:fs|process\.env|\bfetch\s*\(/);
});

test("no application runtime module consumes the public loader yet", () => {
  const runtimeFiles = walkSource(sourceRoot).filter(
    (file) =>
      !/\.test\.tsx?$/.test(file) && file !== loaderPath && file !== corePath && file !== assemblerPath,
  );
  const importers = runtimeFiles.filter((file) => {
    const source = readFileSync(file, "utf8");
    return /from\s+["'][^"']*authority-loader["']/.test(source);
  });
  assert.deepEqual(importers, []);
});

test("classifier is exposed only through the server-only loader", () => {
  const loader = readFileSync(loaderPath, "utf8");
  assert.match(loader, /export \{ classifyQuestion \}/);
  assert.match(loader, /^import "server-only";/);
});

test("policy executor is exposed only through the server-only loader", () => {
  const loader = readFileSync(loaderPath, "utf8");
  assert.match(loader, /export \{ executePolicy \}/);
  assert.match(loader, /^import "server-only";/);
  assert.doesNotMatch(loader, /from\s+["'][^"']*policy-executor["']/); // only through loader re-export
});

test("public loader runtime exports remain the approved eight queries plus classifier and assembler", () => {
  const loader = readFileSync(loaderPath, "utf8");
  const constExports = [...loader.matchAll(/export const (get[A-Za-z]+)\s*=/g)]
    .map((match) => match[1])
    .sort();
  assert.deepEqual(constExports, [
    "getAuthority",
    "getAuthoritySetIdentity",
    "getPolicyRule",
    "getQuestionClass",
    "getRoute",
    "getSource",
    "getTemplate",
    "getTemplateForQuestionClass",
  ]);

  // classifier and policy executor are re-exported (not const)
  assert.match(loader, /export \{ classifyQuestion \}/);
  assert.match(loader, /export \{ executePolicy \}/);

  // assembler is re-exported (not const)
  assert.match(loader, /export \{ assembleAnswer \}/);
  assert.doesNotMatch(loader, /getClaimRule|getSelectedSection|listAll|search|getByKind/);
});

test("application dependencies are explicit and historical route remains untouched", () => {
  const manifest = JSON.parse(
    readFileSync(path.join(appRoot, "package.json"), "utf8"),
  );
  assert.equal(manifest.dependencies["@witnessops/ask-authority"], "workspace:*");
  assert.equal(manifest.dependencies["server-only"], "0.0.1");

  const historicalRoute = readFileSync(
    path.join(sourceRoot, "app/api/docs-assistant/ask/route.ts"),
    "utf8",
  );
  assert.doesNotMatch(historicalRoute, /ask-authority|authority-loader/);
});

test("assembler is exposed only through the server-only loader", () => {
  const loader = readFileSync(loaderPath, "utf8");
  assert.match(loader, /export \{ assembleAnswer \}/);
  assert.match(loader, /^import "server-only";/);
  assert.doesNotMatch(loader, /from\s+["'][^"']*answer-assembler["']/); // only through loader re-export
});

test("ask-witnessops API route is server-only and does not leak deterministic surfaces directly", () => {
  const askRoutePath = path.join(
    sourceRoot,
    "app/api/ask-witnessops/route.ts",
  );
  const askRouteSource = readFileSync(askRoutePath, "utf8");
  assert.match(askRouteSource, /^import .* from "next\/server";/);
  assert.doesNotMatch(askRouteSource, /["']use client["']/);
  // The route should only import the public loader surface, not core implementation
  assert.match(askRouteSource, /from ["'][^"']*ask-witnessops\/authority-loader["']/);
  assert.doesNotMatch(askRouteSource, /from ["'][^"']*ask-witnessops\/authority-loader-core["']/);
});

test("ask pipeline produces deterministic AssembledAnswer for valid input (malformed, closed, and success paths)", async () => {
  const { normalizeAskRequest } = await import(
    "./ask-request-normalizer.ts"
  );
  const { classifyQuestion, executePolicy, assembleAnswer } = await import(
    "./authority-loader.ts"
  );

  // Malformed input test (via normalizer)
  const bad = normalizeAskRequest({ question: "" });
  assert.equal(bad.ok, false);
  if (!bad.ok) {
    assert.equal(bad.failureClass, "FAILURE_INPUT_MALFORMED");
  }

  // Valid input → full pipeline
  const norm = normalizeAskRequest({ question: "How do I request a fit check?" });
  assert.equal(norm.ok, true);
  if (norm.ok) {
    const classification = classifyQuestion(norm.request.question);
    const decision = executePolicy({ classification });
    const assembled = assembleAnswer({ policyDecision: decision });

    assert.equal(assembled.schema, "witnessops.ask.assembled-answer.v1");
    assert.equal(assembled.status, "success");
    assert.equal(typeof assembled.template.body, "string");
    assert.ok(assembled.template.body.length > 0);
    assert.ok(Array.isArray(assembled.presented_sources));
    assert.ok(assembled.presented_sources.length <= 5);
    assert.equal(assembled.deterministic_replay_hash.startsWith("replay:"), true);
  }

  // Closed result test (outside context should produce closed)
  const outsideNorm = normalizeAskRequest({
    question: "Tell me about your private internal systems.",
  });
  if (outsideNorm.ok) {
    const c = classifyQuestion(outsideNorm.request.question);
    const d = executePolicy({ classification: c });
    const a = assembleAnswer({ policyDecision: d });
    assert.equal(a.status, "closed");
    assert.ok(typeof a.failure_reason === "string" && a.failure_reason.length > 0);
    assert.equal(a.presented_sources.length, 0);
  }
});

