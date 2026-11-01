import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
test("preview microphone and media permissions never relax production headers", async () => {
  const prior = { NODE_ENV: process.env.NODE_ENV, NEXT_PUBLIC_WO_PREVIEW: process.env.NEXT_PUBLIC_WO_PREVIEW };
  const configPath = require.resolve("../../next.config.js");
  const headersPath = require.resolve("../../../../packages/config/next/security-headers.js");
  const get = async (mode: string, flag: string) => {
    Object.assign(process.env, { NODE_ENV: mode, NEXT_PUBLIC_WO_PREVIEW: flag });
    delete require.cache[configPath]; delete require.cache[headersPath];
    const config = require(configPath);
    assert.ok(config.serverExternalPackages.includes("ws"), "Use native ws so optional bufferutil is not replaced with a bundler stub");
    return (await config.headers()).find((entry: { source: string }) => entry.source === "/:path*").headers as { key: string; value: string }[];
  };
  try {
    const production = await get("production", "0");
    assert.deepEqual(await get("production", "1"), production);
    assert.equal(production.find((header) => header.key === "Permissions-Policy")?.value, "camera=(), microphone=(), geolocation=()");
    const preview = await get("development", "1");
    assert.equal(preview.find((header) => header.key === "Permissions-Policy")?.value, "camera=(), microphone=(self), geolocation=()");
    assert.match(preview.find((header) => header.key === "Content-Security-Policy")!.value, /media-src 'self' blob:/);
    assert.equal((await get("development", "0")).find((header) => header.key === "Permissions-Policy")?.value, "camera=(), microphone=(), geolocation=()");
  } finally {
    for (const [key, value] of Object.entries(prior)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    delete require.cache[configPath]; delete require.cache[headersPath];
  }
});
