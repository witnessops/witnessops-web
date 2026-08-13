import assert from "node:assert/strict";
import test from "node:test";

import {
  DOCUMENT_LANGUAGE_HEADER,
  documentLanguageForPathname,
  parseDocumentLanguage,
} from "./request-language";

test("Polish routes select Polish for the initial server document", () => {
  assert.equal(DOCUMENT_LANGUAGE_HEADER, "x-witnessops-document-language");
  assert.equal(documentLanguageForPathname("/pl"), "pl");
  assert.equal(documentLanguageForPathname("/pl/catalog"), "pl");
  assert.equal(documentLanguageForPathname("/plenty"), "en");
  assert.equal(documentLanguageForPathname("/catalog"), "en");
});

test("the root layout language parser fails safely to English", () => {
  assert.equal(parseDocumentLanguage("pl"), "pl");
  assert.equal(parseDocumentLanguage("en"), "en");
  assert.equal(parseDocumentLanguage(null), "en");
  assert.equal(parseDocumentLanguage("unexpected"), "en");
});
