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
