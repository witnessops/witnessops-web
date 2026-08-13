import assert from "node:assert/strict";
import test from "node:test";

import { serializeJsonLd } from "./json-ld";

test("JSON-LD serialization remains valid JSON and escapes HTML tag starts", () => {
  const serialized = serializeJsonLd({
    "@context": "https://schema.org",
    name: "WitnessOps </script><script>alert(1)</script>",
  });

  assert.equal(serialized.includes("</script>"), false);
  assert.doesNotThrow(() => JSON.parse(serialized));
});
