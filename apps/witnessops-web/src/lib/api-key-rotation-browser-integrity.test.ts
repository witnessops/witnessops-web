import assert from "node:assert/strict";
import test from "node:test";

import {
  mutateFirstBase64Byte,
  sha256Utf8,
} from "./api-key-rotation-browser-integrity";

test("browser bundle hashing matches the pinned SHA-256 representation", async () => {
  assert.equal(
    await sha256Utf8("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("tamper control changes exactly one decoded evidence byte and stays valid Base64", () => {
  const originalBytes = new TextEncoder().encode('{"state":"active"}\n');
  const original = btoa(String.fromCharCode(...originalBytes));
  const mutated = mutateFirstBase64Byte(original);
  const mutatedBytes = Uint8Array.from(atob(mutated), (character) =>
    character.charCodeAt(0),
  );

  assert.equal(mutatedBytes.byteLength, originalBytes.byteLength);
  assert.equal(mutatedBytes[0], originalBytes[0] ^ 0x01);
  assert.deepEqual(mutatedBytes.slice(1), originalBytes.slice(1));
});

test("tamper control rejects an empty evidence artifact", () => {
  assert.throws(() => mutateFirstBase64Byte(""), /empty evidence artifact/);
});
