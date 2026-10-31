import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AasrStagingWelcome } from "./aasr-staging-welcome";

test("signed-out staging entry offers native sign-in without workflow controls", () => {
  const html = renderToStaticMarkup(createElement(AasrStagingWelcome, { signedIn: false }));
  assert.match(html, /href="\/login"[^>]*>Sign in<\/a>/);
  assert.match(html, /does not identify you or grant a workspace role/);
  assert.doesNotMatch(html, /<select|Accept fixed scope|Record partial-evidence review/);
});

test("unassigned native identity sees access pending, refresh and supplied sign-out", () => {
  const html = renderToStaticMarkup(createElement(AasrStagingWelcome, {
    signedIn: true, sessionActions: createElement("button", null, "Sign out"),
  }));
  assert.match(html, /Staging access pending/);
  assert.match(html, /valid operator-reviewed assignment and current workspace membership/);
  assert.match(html, />Refresh access<\/button>/);
  assert.match(html, />Sign out<\/button>/);
  assert.doesNotMatch(html, /href="\/login"|<select|Accept fixed scope|Record partial-evidence review/);
});

test("rejected native session instructs sign-out before sign-in", () => {
  const html = renderToStaticMarkup(createElement(AasrStagingWelcome, { signedIn: false, sessionRejected: true }));
  assert.match(html, /role="alert"/);
  assert.match(html, /session is no longer valid/);
  assert.match(html, /Sign out, then sign in again/);
});

test("both entry states retain nonproduction, reset and separate-session boundaries", () => {
  for (const signedIn of [false, true]) {
    const html = renderToStaticMarkup(createElement(AasrStagingWelcome, { signedIn }));
    assert.match(html, /Staging simulation/);
    assert.match(html, /not a production service/);
    assert.match(html, /restarting the process loses the engagement/);
    assert.match(html, /Nothing is collected, sent or published/);
    assert.match(html, /separate browser profiles/);
    assert.match(html, /staging access credentials remain/);
  }
});
