import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { PublicContactRoute } from "./public-contact-route";

test("Polish contact route localizes buyer guidance and preserves contact contracts", () => {
  const html = renderToStaticMarkup(<PublicContactRoute locale="pl" />);

  assert.match(html, /Agent Action Security Review/);
  assert.match(html, /Główny płatny punkt wejścia:/);
  assert.match(
    html,
    /href="\/pl\/review\/request\?offerId=bounded-workflow-review&amp;offer=Agent\+Action\+Security\+Review"/,
  );
  assert.match(html, /Kontakt zapasowy:/);
  assert.match(html, /engage@mail\.witnessops\.com/);
  assert.match(html, /Nie wysyłaj haseł/);
  assert.doesNotMatch(html, /Opowiedz nam, co się wydarzyło/);
  assert.doesNotMatch(html, /Tell us what happened|engage@witnessops\.com/);
});

test("English contact route keeps the primary paid offer heading and route", () => {
  const html = renderToStaticMarkup(<PublicContactRoute />);

  assert.match(html, /Agent Action Security Review/);
  assert.match(html, /Primary paid entry point:/);
  assert.match(
    html,
    /href="\/review\/request\?offerId=bounded-workflow-review&amp;offer=Agent\+Action\+Security\+Review"/,
  );
  assert.match(html, /engage@mail\.witnessops\.com/);
  assert.match(html, /underline decoration-brand-accent\/50/);
  assert.doesNotMatch(html, /Tell us what happened/);
});

test("compact footer contact route exposes a clear primary action", () => {
  const html = renderToStaticMarkup(<PublicContactRoute compact />);

  assert.match(html, /data-public-contact-variant="footer"/);
  assert.match(html, /Agent Action Security Review/);
  assert.match(html, /Primary paid entry point/);
  assert.match(html, /Start a non-secret fit check/);
  assert.match(
    html,
    /href="\/review\/request\?offerId=bounded-workflow-review&amp;offer=Agent\+Action\+Security\+Review"/,
  );
  assert.match(html, /w-full/);
  assert.match(html, /border-brand-accent bg-brand-accent/);
  assert.match(html, /text-text-inverse/);
  assert.match(html, /Fallback contact:/);
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
