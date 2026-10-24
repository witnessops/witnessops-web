import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const adminRoot = path.resolve(__dirname);
const appAdminRoot = path.resolve(__dirname, "../../app/admin");
const banned = /ea5b2a|b94721|ff6b35|aa6613|b9433a|147a73|234,\s*91,\s*42|amber-/i;

function filesUnder(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "login") continue;
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) filesUnder(full, acc);
    else if (/\.(css|tsx|ts)$/.test(name) && !name.endsWith(".test.ts")) acc.push(full);
  }
  return acc;
}

test("admin surfaces keep the brass tokens and drop orange, amber, and teal accents", () => {
  const css = readFileSync(path.join(adminRoot, "admin.module.css"), "utf8");
  for (const token of ["#6C5631", "#594626", "#4A3A1F", "#EFE6D0", "#B89B62", "#CBB27D", "#8B4B48", "#365F4A"]) {
    assert.match(css, new RegExp(token, "i"));
  }
  const sources = filesUnder(adminRoot).concat(filesUnder(appAdminRoot));
  const offenders = sources.filter((file) => banned.test(readFileSync(file, "utf8")));
  assert.deepEqual(offenders, []);
});
