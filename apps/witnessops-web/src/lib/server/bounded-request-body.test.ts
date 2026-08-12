import assert from "node:assert/strict";
import test from "node:test";

import {
  InvalidRequestBodyEncodingError,
  readBoundedRequestJson,
  readBoundedRequestText,
  RequestBodyTooLargeError,
} from "./bounded-request-body";

test("bounded reader rejects invalid UTF-8 with a typed error", async () => {
  await assert.rejects(
    readBoundedRequestText(
      new Request("https://example.test", {
        method: "POST",
        body: new Uint8Array([0xc3, 0x28]),
      }),
      64,
    ),
    InvalidRequestBodyEncodingError,
  );
});

test("bounded reader rejects an oversized declared body", async () => {
  await assert.rejects(
    readBoundedRequestText(
      new Request("https://example.test", {
        method: "POST",
        headers: { "content-length": "65" },
        body: "{}",
      }),
      64,
    ),
    RequestBodyTooLargeError,
  );
});

test("bounded reader stops an oversized streamed body", async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(40));
      controller.enqueue(new Uint8Array(40));
      controller.close();
    },
  });
  await assert.rejects(
    readBoundedRequestText(
      new Request("https://example.test", {
        method: "POST",
        body,
        duplex: "half",
      } as RequestInit & { duplex: "half" }),
      64,
    ),
    RequestBodyTooLargeError,
  );
});

test("bounded JSON reader parses an in-limit body", async () => {
  assert.deepEqual(
    await readBoundedRequestJson(
      new Request("https://example.test", { method: "POST", body: '{"ok":true}' }),
      64,
    ),
    { ok: true },
  );
});
