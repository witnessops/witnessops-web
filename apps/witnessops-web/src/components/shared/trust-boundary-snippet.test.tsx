import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TrustBoundarySnippet } from "./trust-boundary-snippet";

test("renders the shared trust boundary title", () => {
  const html = renderToStaticMarkup(<TrustBoundarySnippet />);
  assert.match(html, /Trust Boundary/);
});
