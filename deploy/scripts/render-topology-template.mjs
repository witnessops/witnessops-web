#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const [, , inputPath, outputPath, ...variableNames] = process.argv;
if (!inputPath || !outputPath || variableNames.length === 0) {
  throw new Error(
    "usage: render-topology-template.mjs <input> <output> <VARIABLE>...",
  );
}

let rendered = await readFile(inputPath, "utf8");
for (const name of variableNames) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
    throw new Error("invalid topology variable name");
  }
  const value = process.env[name];
  if (!value) {
    throw new Error(`required topology variable is unset: ${name}`);
  }
  rendered = rendered.replaceAll(`\${${name}}`, value);
}

const unresolved = rendered.match(/\$\{[A-Z][A-Z0-9_]*\}/g);
if (unresolved) {
  throw new Error("topology template contains unresolved variables");
}

await writeFile(outputPath, rendered, { encoding: "utf8", mode: 0o600 });
