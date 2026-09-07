import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { PublicContactRoute } from "./public-contact-route";

test("Polish contact route localizes buyer guidance and preserves contact contracts", () => {
  const html = renderToStaticMarkup(<PublicContactRoute locale="pl" />);

  assert.match(html, /Omów zakres przeglądu/);
  assert.match(html, /Ścieżka zgłoszenia:/);
  assert.match(
    html,
    /href="\/pl\/review\/request"/,
  );
  assert.match(html, /Kontakt zapasowy:/);
  assert.match(html, /engage@mail\.witnessops\.com/);
  assert.match(html, /Nie wysyłaj haseł/);
  assert.doesNotMatch(html, /Opowiedz nam, co się wydarzyło/);
  assert.doesNotMatch(html, /Tell us what happened|engage@witnessops\.com/);
});

test("English contact route leaves the service choice open", () => {
  const html = renderToStaticMarkup(<PublicContactRoute />);

  assert.match(html, /Scope a review/);
  assert.match(html, /Request path:/);
  assert.match(
    html,
    /href="\/review\/request"/,
  );
  assert.match(html, /engage@mail\.witnessops\.com/);
  assert.match(html, /underline decoration-brand-accent\/50/);
  assert.doesNotMatch(html, /Tell us what happened/);
});

test("compact footer contact route exposes a clear primary action", () => {
  const html = renderToStaticMarkup(<PublicContactRoute compact />);

  assert.match(html, /data-public-contact-variant="footer"/);
  assert.match(html, /What do you need help with\?/);
  assert.match(html, /We agree scope and price before work begins/);
  assert.match(html, /Scope a review/);
  assert.doesNotMatch(html, /Primary paid entry point|Fallback contact:/);
  assert.match(
    html,
    /href="\/review\/request"/,
  );
  assert.match(html, /w-full/);
  assert.match(html, /border-brand-accent bg-brand-accent/);
  assert.match(html, /text-text-inverse/);
  assert.match(html, /Or email:/);
  assert.match(html, /Do not send passwords/);
  assert.doesNotMatch(html, /No secrets/);
});

test("contact route preserves an explicitly selected offer request", () => {
  const selectedHref =
    "/review/request?offerId=bounded-workflow-review&offer=Agent+Action+Security+Review";
  const html = renderToStaticMarkup(
    <PublicContactRoute compact primaryHref={selectedHref} />,
  );

  assert.match(
    html,
    /href="\/review\/request\?offerId=bounded-workflow-review&amp;offer=Agent\+Action\+Security\+Review"/,
  );
});

test("non-compact contact route wraps a selected-offer URL on narrow screens", () => {
  const selectedHref =
    "/review/request?offerId=customer-security-review-sprint&offer=Customer+Security+Review+Sprint";
  const html = renderToStaticMarkup(
    <PublicContactRoute primaryHref={selectedHref} />,
  );

  assert.match(html, /class="break-all text-brand-accent/);
});
