import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Footer } from "../components/marketing/footer";
import { AppPricing } from "../components/marketing/app-pricing";
import { getWorkspaceAppUrl } from "./workspace-access";
const originBefore = process.env.WITNESSOPS_EARLY_ACCESS_APP_URL;
const modeBefore = process.env.NODE_ENV;
test.afterEach(() => {
  if (originBefore === undefined) delete process.env.WITNESSOPS_EARLY_ACCESS_APP_URL;
  else process.env.WITNESSOPS_EARLY_ACCESS_APP_URL = originBefore;
  if (modeBefore === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
  else Object.assign(process.env, { NODE_ENV: modeBefore });
});
test("production app links stay absent without configuration", () => {
  Object.assign(process.env, { NODE_ENV: "production" });
  delete process.env.WITNESSOPS_EARLY_ACCESS_APP_URL;
  assert.equal(getWorkspaceAppUrl(), null);
  assert.equal(getWorkspaceAppUrl("/signup"), null);
  const html = renderToStaticMarkup(createElement(AppPricing, { signupUrl: getWorkspaceAppUrl("/signup") }));
  assert.doesNotMatch(html, /Create an account/);
  assert.match(html, /Illustrative/);
});
test("configured production and staging signup destinations are preserved", () => {
  Object.assign(process.env, { NODE_ENV: "production" });
  for (const origin of ["https://app.witnessops.com", "https://staging.example", "http://127.0.0.1:3020"]) {
    process.env.WITNESSOPS_EARLY_ACCESS_APP_URL = origin;
    assert.equal(getWorkspaceAppUrl(), `${origin}/`);
    const signupUrl = getWorkspaceAppUrl("/signup");
    assert.equal(signupUrl, `${origin}/signup`);
    assert.ok(renderToStaticMarkup(createElement(AppPricing, { signupUrl })).includes(`href="${origin}/signup"`));
  }
});
test("development uses loopback and invalid configured origins fail closed", () => {
  Object.assign(process.env, { NODE_ENV: "development" });
  delete process.env.WITNESSOPS_EARLY_ACCESS_APP_URL;
  assert.equal(getWorkspaceAppUrl("/signup"), "http://127.0.0.1:3020/signup");
  for (const origin of ["javascript:alert(1)", "https://user:password@example.com", "https://example.com/path", "https://example.com/?token=secret", "https://example.com/#secret", "http://example.com", "broken"]) {
    process.env.WITNESSOPS_EARLY_ACCESS_APP_URL = origin;
    assert.equal(getWorkspaceAppUrl("/signup"), null);
  }
});

test("footer emits only the configured app destinations, or none", () => {
  for (const appUrl of [null, "https://staging.example/", "http://127.0.0.1:3020/"]) {
    const html = renderToStaticMarkup(createElement(Footer, { appUrl, brand_line: "WitnessOps", build_label: "", copyright: "WitnessOps", subline: "", links: [], legal_links: [] }));
    assert.doesNotMatch(html, /https:\/\/app\.witnessops\.com/);
    for (const path of ["signup", "login", "assets", "reports", "settings"]) {
      if (appUrl) assert.ok(html.includes(`href="${appUrl}${path}"`));
      else assert.ok(!html.includes(`href="/${path}"`));
    }
  }
});
