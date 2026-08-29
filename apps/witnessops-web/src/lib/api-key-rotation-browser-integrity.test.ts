import assert from "node:assert/strict";
import test from "node:test";

import {
  mutateFirstBase64Byte,
  sha256HexToIntegrity,
  sha256Utf8,
} from "./api-key-rotation-browser-integrity";

test("browser bundle hashing matches the pinned SHA-256 representation", async () => {
  assert.equal(
    await sha256Utf8("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("browser verifier pin converts to the standard SRI representation", () => {
  assert.equal(
    sha256HexToIntegrity(
      "7ac872446e384f40d82eaf63e7a0d5ca4604eb06a0fdb8e872a9240400377f41",
    ),
    "sha256-eshyRG44T0DYLq9j56DVykYE6wag/bjocqkkBAA3f0E=",
  );
});

test("browser verifier SRI conversion rejects a malformed or non-canonical pin", () => {
  assert.throws(() => sha256HexToIntegrity("7ac8"), /lowercase 32-byte/);
  assert.throws(
    () =>
      sha256HexToIntegrity(
        "7AC872446E384F40D82EAF63E7A0D5CA4604EB06A0FDB8E872A9240400377F41",
      ),
    /lowercase 32-byte/,
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
