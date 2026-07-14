import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { PublicContactRoute } from "./public-contact-route";

test("Polish contact route localizes buyer guidance and preserves contact contracts", () => {
  const html = renderToStaticMarkup(<PublicContactRoute locale="pl" />);

  assert.match(html, /Opowiedz nam, co się wydarzyło/);
  assert.match(html, /Główna ścieżka:/);
  assert.match(html, /href="\/pl\/review\/request"/);
  assert.match(html, /Kontakt zapasowy:/);
  assert.match(html, /engage@mail\.witnessops\.com/);
  assert.match(html, /Nie wysyłaj haseł/);
  assert.doesNotMatch(html, /Tell us what happened|engage@witnessops\.com/);
});

test("English contact route keeps its existing labels and route", () => {
  const html = renderToStaticMarkup(<PublicContactRoute />);

  assert.match(html, /Tell us what happened/);
  assert.match(html, /href="\/review\/request"/);
  assert.match(html, /engage@mail\.witnessops\.com/);
});
