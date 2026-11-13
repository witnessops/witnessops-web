import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { Navbar } from "./navbar";

const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };

function renderNavbar(pathname: string, appUrl: string | null): string {
  return renderToStaticMarkup(
    createElement(AppRouterContext.Provider, { value: router },
      createElement(PathnameContext.Provider, { value: pathname },
        createElement(Navbar, {
          appUrl,
          links: [],
          cta: { label: "Unused", href: "/contact", variant: "primary" },
          announcement: { enabled: false, text: "", href: "" },
        }) as ReactNode,
      ),
    ),
  );
}

function mobileMenu(html: string): string {
  const start = html.indexOf('id="witnessops-mobile-menu"');
  assert.notEqual(start, -1, "mobile menu is rendered");
  return html.slice(start);
}

test("Polish mobile menu exposes the existing configured login and keeps one review CTA", () => {
  const html = renderNavbar("/pl", "https://app.example.test/");
  const mobile = mobileMenu(html);
  assert.equal((mobile.match(/data-mobile-login/g) ?? []).length, 1);
  assert.match(mobile, /<a(?=[^>]*href="https:\/\/app\.example\.test\/login")(?=[^>]*data-mobile-login)[^>]*>Zaloguj się<\/a>/);
  assert.equal((mobile.match(/Poproś o test przełamania/g) ?? []).length, 1);
  assert.match(html.slice(0, html.indexOf('id="witnessops-mobile-menu"')), /href="https:\/\/app\.example\.test\/login"[^>]*>Zaloguj się<\/a>/);
});

test("Polish mobile menu keeps login absent without a configured app", () => {
  const mobile = mobileMenu(renderNavbar("/pl", null));
  assert.doesNotMatch(mobile, /data-mobile-login|Zaloguj się|\/login/);
  assert.equal((mobile.match(/Poproś o test przełamania/g) ?? []).length, 1);
});

test("English grouped mobile navigation keeps its existing login", () => {
  const mobile = mobileMenu(renderNavbar("/", "https://app.example.test/"));
  assert.doesNotMatch(mobile, /data-mobile-login|Zaloguj się/);
  assert.match(mobile, /href="https:\/\/app\.example\.test\/login"[^>]*>Log in<\/a>/);
});
