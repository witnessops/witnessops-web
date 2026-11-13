import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import PolishDocsPage, { generateMetadata } from "./[...slug]/page";
import { POLISH_DOCS_SECTIONS } from "./docs-navigation";

const guidance = {
  "understand-the-service": /jedno istotne działanie/i,
  "how-witnessops-works": /nie daje upoważnienia/i,
  "what-you-receive": /pisemny raport/i,
  faq: /Ile działań obejmuje przegląd/i,
  "buyer-approver-guide": /Pytania dla osoby zatwierdzającej/i,
  "is-witnessops-right-for-this": /Kiedy potrzebujesz innej usługi/i,
  "what-you-need-to-provide": /Nie wysyłaj materiałów poufnych/i,
};

const pendingProofGuides = ["how-receipts-work", "evidence-and-limitations", "glossary"];

function props(slug: string) {
  return { params: Promise.resolve({ slug: [slug] }) };
}

test("the Polish buyer guides provide topic-specific answers and retain English technical access", async () => {
  const links = POLISH_DOCS_SECTIONS.flatMap((section) => section.items).map((item) => item.href);
  for (const [slug, expected] of Object.entries(guidance)) {
    assert.ok(links.includes(`/pl/docs/${slug}`), `${slug} is linked from the docs navigation`);
    const html = renderToStaticMarkup(await PolishDocsPage(props(slug)));
    assert.match(html, expected, slug);
    assert.doesNotMatch(html, /Szczegółowa dokumentacja techniczna jest dostępna po angielsku/, slug);
    assert.match(html, /Otwórz dokumentację techniczną \(EN\)/, slug);
    assert.doesNotMatch(html, /Nie wykonujemy (?:tego|badanego) działania|Nie wykonujemy go|wyłącznie.*odczyt/);
    assert.deepEqual((await generateMetadata(props(slug))).robots, { index: false, follow: true });
  }
});

test("proof-related and unknown guide URLs keep the existing noindex fallback", async () => {
  for (const slug of [...pendingProofGuides, "not-a-published-guide"]) {
    const html = renderToStaticMarkup(await PolishDocsPage(props(slug)));
    assert.match(html, /Szczegółowa dokumentacja techniczna jest dostępna po angielsku/, slug);
    assert.deepEqual((await generateMetadata(props(slug))).robots, { index: false, follow: true });
  }
});

test("buyer guides keep the one-action boundary and do not treat an enquiry as authorisation", async () => {
  const scope = renderToStaticMarkup(await PolishDocsPage(props("understand-the-service")));
  assert.match(scope, /jednego wybranego działania/);
  assert.match(scope, /Przykład: zwrot płatności/);
  assert.match(scope, /To przykład, a nie opis rzeczywistego klienta/);
  assert.match(scope, /aktywnie testuje jedno istotne działanie/);
  assert.match(scope, /upoważnienie przed zmianą/);
  assert.match(scope, /Nie jest to test penetracyjny/);
  const workflow = renderToStaticMarkup(await PolishDocsPage(props("how-witnessops-works")));
  assert.match(workflow, /nie rozpoczyna przeglądu i nie daje upoważnienia/);
  assert.match(workflow, /Próbujemy doprowadzić do uzgodnionych niedozwolonych skutków/);
  const report = renderToStaticMarkup(await PolishDocsPage(props("what-you-receive")));
  assert.match(report, /warunki odtworzenia/);
  assert.match(report, /wykazane przełamanie zabezpieczenia, odparcie w warunkach testu, wynik nierozstrzygający albo brak testu/);
});
