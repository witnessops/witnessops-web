import assert from "node:assert/strict";
import test from "node:test";

import { decodeXmlText } from "./verify-public-seo-xml";

test("XML decoding is single-pass for nested entity text", () => {
  assert.equal(decodeXmlText("&amp;quot;"), "&quot;");
  assert.equal(decodeXmlText("&quot;&amp;&apos;&lt;&gt;"), '"&\'<>');
});
