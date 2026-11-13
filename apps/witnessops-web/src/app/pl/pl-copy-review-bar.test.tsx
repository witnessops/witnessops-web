import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";

import { PlCopyReviewBar } from "./pl-copy-review-bar";

function renderReviewBar(pathname: string): string {
  return renderToStaticMarkup(
    createElement(PathnameContext.Provider, { value: pathname },
      createElement(PlCopyReviewBar),
    ),
  );
}

test("the Polish homepage omits the public native-review banner", () => {
  assert.equal(renderReviewBar("/pl"), "");
  assert.equal(renderReviewBar("/pl/"), "");
});

test("other Polish routes retain the full native-review banner", () => {
  const html = renderReviewBar("/pl/docs");
  assert.match(html, /PL copy pending native review/);
  assert.match(html, /pl-copy-review/);
  assert.match(html, /py-2/);
  assert.doesNotMatch(html, /\bcompact\b/);
});

test("the Polish agent-action offer retains its compact native-review banner", () => {
  const html = renderReviewBar("/pl/reviews/agent-action-security-review");
  assert.match(html, /PL copy pending native review/);
  assert.match(html, /\bcompact\b/);
  assert.doesNotMatch(html, /py-2/);
});
