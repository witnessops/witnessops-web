import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { PublicContactRoute } from "./public-contact-route";

test("Polish contact route localizes buyer guidance and preserves contact contracts", () => {
  const html = renderToStaticMarkup(<PublicContactRoute locale="pl" />);

  assert.match(html, /Rozpocznij przegląd/);
  assert.match(html, /Główna ścieżka:/);
  assert.match(html, /href="\/pl\/review\/request"/);
  assert.match(html, /Kontakt zapasowy:/);
  assert.match(html, /engage@mail\.witnessops\.com/);
  assert.match(html, /Nie wysyłaj haseł/);
  assert.doesNotMatch(html, /Opowiedz nam, co się wydarzyło/);
  assert.doesNotMatch(html, /Tell us what happened|engage@witnessops\.com/);
});

test("English contact route keeps primary CTA heading and route", () => {
  const html = renderToStaticMarkup(<PublicContactRoute />);

  assert.match(html, /Start a review/);
  assert.match(html, /href="\/review\/request"/);
  assert.match(html, /engage@mail\.witnessops\.com/);
  assert.doesNotMatch(html, /Tell us what happened/);
});

test("compact footer contact route exposes a clear primary action", () => {
  const html = renderToStaticMarkup(<PublicContactRoute compact />);

  assert.match(html, /data-public-contact-variant="footer"/);
  assert.match(html, /Primary route/);
  assert.match(html, /href="\/review\/request"/);
  assert.match(html, /w-full/);
  assert.match(html, /bg-text-primary/);
  assert.match(html, /Fallback contact:/);
  assert.match(html, /Do not send passwords/);
  assert.doesNotMatch(html, /No secrets/);
});
