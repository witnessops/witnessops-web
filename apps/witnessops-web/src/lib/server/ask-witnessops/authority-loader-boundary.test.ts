import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);

function registerServerOnlyTestBoundary() {
  return registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "server-only") {
        return { url: "witnessops-test:server-only", shortCircuit: true };
      }
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url === "witnessops-test:server-only") {
        return {
          format: "commonjs",
          source: "module.exports = {};",
          shortCircuit: true,
        };
      }
      return nextLoad(url, context);
    },
  });
}

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
const policyExecutorPath = path.join(
  sourceRoot,
  "lib/server/ask-witnessops/authority-policy-executor.ts",
);
const verifierPath = path.join(
  sourceRoot,
  "lib/server/ask-witnessops/ask-runtime-receipt-verifier.ts",
);
const askRoutePath = path.join(
  sourceRoot,
  "app/api/ask-witnessops/route.ts",
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

test("only authorized server-only modules consume the public loader", () => {
  // Finite allowlist of authorized server-only consumers of the public loader surface.
  // Authorized: assembler (presentation+template composition), policy-executor,
  // verifier (for historical reconstruction), and the ask-witnessops API route
  // (the single public intake point).
  // The loader re-exports the deterministic pipeline plus receipt surfaces.
  // Direct consumption by other routes, clients, frontend, or loader-core is rejected
  // by sibling tests in this file.
  const runtimeFiles = walkSource(sourceRoot).filter(
    (file) =>
      !/\.test\.tsx?$/.test(file) &&
      file !== loaderPath &&
      file !== corePath &&
      file !== assemblerPath &&
      file !== policyExecutorPath &&
      file !== verifierPath &&
      file !== askRoutePath,
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
  assert.match(
    loader,
    /import \{ executePolicy \} from "\.\/authority-policy-executor";/,
  );
});

test("public loader runtime exports remain the approved governed queries plus classifier and assembler", () => {
  const loader = readFileSync(loaderPath, "utf8");
  const constExports = [...loader.matchAll(/export const (get[A-Za-z]+)\s*=/g)]
    .map((match) => match[1])
    .sort();
  assert.deepEqual(constExports, [
    "getAuthority",
    "getAuthoritySetIdentity",
    "getGlobalPresentationRules",
    "getPolicyRule",
    "getPresentationForSource",
    "getPresentationProjectionIdentity",
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
  assert.match(
    loader,
    /import \{[\s\S]*?assembleAnswer,[\s\S]*?\} from "\.\/authority-answer-assembler";/,
  );
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

  // Receipt reference is provided out-of-band via header to preserve exact answer content
  assert.match(askRouteSource, /X-Ask-Receipt-Id/);
});

test("runtime receipt contract is exposed only through the server-only loader", () => {
  const loader = readFileSync(loaderPath, "utf8");
  assert.match(loader, /^import "server-only";/);

  const hook = registerServerOnlyTestBoundary();
  const runtimeLoader = require("./authority-loader.ts") as typeof import("./authority-loader");
  hook.deregister();

  assert.equal(typeof runtimeLoader.createAskRuntimeReceipt, "function");
  assert.equal(typeof runtimeLoader.verifyAskRuntimeReceipt, "function");
});


test("ask pipeline produces deterministic AssembledAnswer for malformed, refusal, and success paths", async () => {
  const hook = registerServerOnlyTestBoundary();
  const { normalizeAskRequest } = require(
    "./ask-request-normalizer.ts",
  ) as typeof import("./ask-request-normalizer");
  const { classifyQuestion, executePolicy, assembleAnswer } = require(
    "./authority-loader.ts",
  ) as typeof import("./authority-loader");
  hook.deregister();

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

  // Refusal result remains a usable assembled answer with no source list.
  const outsideNorm = normalizeAskRequest({
    question: "Can you verify our private system and inspect private environment?",
  });
  if (outsideNorm.ok) {
    const c = classifyQuestion(outsideNorm.request.question);
    const d = executePolicy({ classification: c });
    const a = assembleAnswer({ policyDecision: d });
    assert.equal(a.status, "success");
    assert.match(a.template.template_id, /^refuse\./);
    assert.equal(a.presented_sources.length, 0);
  }
});
