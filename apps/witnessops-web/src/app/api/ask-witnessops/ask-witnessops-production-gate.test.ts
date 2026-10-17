import assert from "node:assert/strict";
import test from "node:test";

import { askWitnessOpsRouteAvailable } from "@/lib/sovereign-release";
import { POST } from "./route";

const saved = {
  node: process.env.NODE_ENV,
  preview: process.env.NEXT_PUBLIC_WO_PREVIEW,
  release: process.env.NEXT_PUBLIC_SOVEREIGN_RELEASE,
};

function restore() {
  Object.assign(process.env, { NODE_ENV: saved.node });
  if (saved.preview === undefined) delete process.env.NEXT_PUBLIC_WO_PREVIEW;
  else process.env.NEXT_PUBLIC_WO_PREVIEW = saved.preview;
  if (saved.release === undefined) delete process.env.NEXT_PUBLIC_SOVEREIGN_RELEASE;
  else process.env.NEXT_PUBLIC_SOVEREIGN_RELEASE = saved.release;
}

function request() {
  return new Request("https://witnessops.com/api/ask-witnessops", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });
}

test("POST /api/ask-witnessops stays closed in production and keeps its handler in development", async () => {
  try {
    const closed = [
      {},
      { NEXT_PUBLIC_WO_PREVIEW: "1" },
      { NEXT_PUBLIC_SOVEREIGN_RELEASE: "1" },
      { NEXT_PUBLIC_WO_PREVIEW: "1", NEXT_PUBLIC_SOVEREIGN_RELEASE: "1" },
    ];
    for (const flags of closed) {
      Object.assign(process.env, { NODE_ENV: "production" });
      delete process.env.NEXT_PUBLIC_WO_PREVIEW;
      delete process.env.NEXT_PUBLIC_SOVEREIGN_RELEASE;
      Object.assign(process.env, flags);
      assert.equal(askWitnessOpsRouteAvailable(), false, JSON.stringify(flags));
      const response = await POST(request());
      assert.equal(response.status, 410, JSON.stringify(flags));
      assert.equal(response.headers.get("cache-control"), "no-store");
    }

    Object.assign(process.env, { NODE_ENV: "development" });
    process.env.NEXT_PUBLIC_WO_PREVIEW = "1";
    delete process.env.NEXT_PUBLIC_SOVEREIGN_RELEASE;
    assert.equal(askWitnessOpsRouteAvailable(), true);
    const open = await POST(request());
    assert.notEqual(open.status, 410);
    assert.notEqual(open.status, 404);
  } finally {
    restore();
  }
});
