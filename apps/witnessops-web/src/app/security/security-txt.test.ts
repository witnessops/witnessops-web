import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

function fields(path: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf(":");
    assert.ok(separator > 0, `malformed security.txt line: ${trimmed}`);
    const name = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1).trim();
    map.set(name, [...(map.get(name) ?? []), value]);
  }
  return map;
}

test("published security.txt files keep contact, a future expiry, canonical and languages", () => {
  const files = [
    {
      path: resolve(__dirname, "../../../public/.well-known/security.txt"),
      canonical: "https://witnessops.com/.well-known/security.txt",
    },
    {
      path: resolve(__dirname, "../../../../witnessops-app/public/.well-known/security.txt"),
      canonical: "https://app.witnessops.com/.well-known/security.txt",
    },
  ];

  for (const file of files) {
    const parsed = fields(file.path);
    const source = readFileSync(file.path, "utf8");
    assert.deepEqual(parsed.get("Contact"), ["mailto:security@witnessops.com"]);
    assert.deepEqual(parsed.get("Canonical"), [file.canonical]);
    assert.deepEqual(parsed.get("Preferred-Languages"), ["en, pl"]);
    assert.deepEqual(parsed.get("Policy"), ["https://witnessops.com/support/responsible-disclosure"]);
    const expires = parsed.get("Expires")?.[0] ?? "";
    assert.match(expires, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    assert.ok(Date.parse(expires) > Date.parse("2026-10-15T00:00:00Z"), `${file.path} Expires is in the past`);
    assert.equal(parsed.has("Encryption"), false);
    assert.doesNotMatch(source, /Karol|Stefańsk|stefanski/i);
  }
});
