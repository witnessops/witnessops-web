import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { Navbar } from "./navbar";

const router = {
  back() {},
  forward() {},
  refresh() {},
  push() {},
  replace() {},
  prefetch() {},
};

function renderAt(path: string): string {
  return renderToStaticMarkup(
    createElement(
      AppRouterContext.Provider,
      { value: router },
      createElement(
        PathnameContext.Provider,
        { value: path },
        createElement(Navbar, {
          links: [],
          cta: { label: "Discuss a review", href: "/contact", variant: "primary" },
          announcement: { enabled: false, text: "", href: "" },
        }) as ReactNode,
      ),
    ),
  );
}

function toggles(html: string): string[] {
  return [...html.matchAll(/<button[^>]*data-theme-toggle[^>]*>[\s\S]*?<\/button>/g)].map((match) => match[0]);
}

test("/pl renders no English theme strings", () => {
  const buttons = toggles(renderAt("/pl"));
  assert.ok(buttons.length >= 1);
  for (const button of buttons) {
    assert.match(button, /w-24/);
    assert.match(button, />Ciemny</);
    assert.match(button, /aria-label="Przełącz na ciemny motyw"/);
    assert.match(button, /title="Przełącz na ciemny motyw"/);
    assert.doesNotMatch(button, /Dark|Light|Switch to dark theme|Switch to light theme/);
  }
});

test("English theme toggle labels stay in English", () => {
  const buttons = toggles(renderAt("/"));
  assert.ok(buttons.length >= 1);
  for (const button of buttons) {
    assert.match(button, /w-24/);
    assert.match(button, />Dark</);
    assert.match(button, /aria-label="Switch to dark theme"/);
    assert.match(button, /title="Switch to dark theme"/);
    assert.doesNotMatch(button, /Ciemny|Jasny|Przełącz/);
  }
});
