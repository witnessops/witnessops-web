#!/usr/bin/env node
/**
 * Offline token printer. Writes nothing. Prints the token once on stdout,
 * then one hash line. The token is not written to stderr.
 *
 * Default lifetime is 14 days. Values above 30 days are refused before any
 * token is printed. The server enforces the 30-day cap when the operator
 * installs the hash file.
 */
import { createHash, randomBytes } from "node:crypto";

const SCOPES = new Set([
  "health:read",
  "counts:read",
  "sync:read",
  "reviews:read",
  "deliveries:read",
  "receipts:read",
]);

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const client = process.argv[2] ?? "";
const scopes = (process.argv[3] ?? "health:read").split(",").filter((scope) => scope.length > 0);
const days = process.argv[4] === undefined ? 14 : Number(process.argv[4]);

if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(client)) fail("invalid client id");
if (!Number.isInteger(days) || days < 1) fail("invalid lifetime");
if (days > 30) fail("lifetime exceeds 30 days");
if (scopes.length === 0 || scopes.some((scope) => !SCOPES.has(scope))) fail("invalid scopes");

const issuedAt = new Date();
const expiresAt = new Date(issuedAt.getTime() + days * 24 * 60 * 60 * 1000);
const secret = randomBytes(32).toString("base64url");
const token = `wo_mcp_${client}_${secret}`;
const hash = createHash("sha256").update(token).digest("hex");
process.stdout.write(`${token}\n`);
process.stdout.write(
  `sha256:${hash} client=${client} scopes=${scopes.join(",")} issuedAt=${issuedAt.toISOString()} expiresAt=${expiresAt.toISOString()}\n`,
);
