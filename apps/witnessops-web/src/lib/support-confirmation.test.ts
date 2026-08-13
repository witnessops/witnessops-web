import assert from "node:assert/strict";
import test from "node:test";

import {
  consumeSupportConfirmation,
  storeSupportConfirmation,
} from "./support-confirmation";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

test("support confirmation is opaque, bound to a verified intake, and one-time", () => {
  const storage = memoryStorage();
  const marker = storeSupportConfirmation(
    storage,
    "intake_private_identifier",
    "opaque-confirmation-marker",
  );

  assert.equal(marker, "opaque-confirmation-marker");
  assert.equal(consumeSupportConfirmation(storage, "wrong-marker"), false);
  assert.equal(consumeSupportConfirmation(storage, marker), false);

  storeSupportConfirmation(storage, "intake_private_identifier", marker);
  assert.equal(consumeSupportConfirmation(storage, marker), true);
  assert.equal(consumeSupportConfirmation(storage, marker), false);
});
