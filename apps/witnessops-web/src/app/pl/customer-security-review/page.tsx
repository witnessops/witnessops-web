import type { Metadata } from "next";
import Link from "next/link";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";

export const metadata: Metadata = {
  title: "Sprint odpowiedzi na kwestionariusz bezpieczeństwa klienta",
  description:
    "Pakiet odpowiedzi dla jednego kwestionariusza bezpieczeństwa i jednego produktu, przygotowany w ciągu trzech dni roboczych po potwierdzeniu warunków rozpoczęcia.",
  alternates: {
    canonical: "/pl/customer-security-review",
    languages: {
      en: "/customer-security-review",
      pl: "/pl/customer-security-review",
      "x-default": "/customer-security-review",
    },
  },
};

const deliverables = [
  "Macierz odpowiedzi przygotowana do zatwierdzenia przez klienta",
  "Indeks materiałów z datami, właścicielami, zakresem i wspieranymi pytaniami",
  "Mapa statusów twierdzeń i otwartych elementów",
  "Nota przewodnia dla klienta opisująca zakres, ograniczenia i odpowiedzialność",
];

const statuses = [
  "Poparte materiałem",
  "Poparte z zastrzeżeniem",
  "Oświadczenie właściciela",
  "Otwarte",
  "Nie dotyczy — z uzasadnieniem",
];

export default function PolishCustomerSecurityReviewPage() {
  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <header className="grid gap-8 border-b border-surface-border pb-12 md:gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-text-muted">Sprint odpowiedzi na kwestionariusz bezpieczeństwa klienta</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">
              Wyślij nam kwestionariusz bezpieczeństwa, który wstrzymuje Twoją transakcję.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">
              Przygotujemy poparty materiałem pakiet odpowiedzi dla jednego
              kwestionariusza i jednego produktu. Zastrzeżenia, brakujące
              materiały i nierozstrzygnięte elementy pozostaną widoczne.
            </p>
            <Link href="/pl/review/request" className="mt-8 inline-flex min-h-12 items-center justify-center bg-black px-6 text-center text-sm font-semibold leading-5 text-white hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2">
              Przekaż kwestionariusz do wstępnej oceny dopasowania i zakresu.
            </Link>
            <p className="mt-3 max-w-xl text-sm leading-6 text-text-muted">
              Pierwszy kontakt nie może zawierać danych poufnych. Nie wysyłaj
              jeszcze kwestionariusza, plików, logów, zrzutów ekranu, danych
              uwierzytelniających ani materiałów klienta.
            </p>
          </div>
          <aside className="bg-black p-6 text-white sm:p-7">
            <div className="sm:grid sm:grid-cols-2 sm:gap-8 lg:block">
              <div>
                <p className="text-sm font-semibold text-white/60">Granica komercyjna</p>
                <p className="mt-3 text-3xl font-semibold">Od 1 600 €</p>
                <p className="mt-2 text-sm leading-6 text-white/70">Cena potwierdzana po wstępnej, niepoufnej ocenie dopasowania. Jeden kwestionariusz. Jeden produkt.</p>
              </div>
              <div className="mt-6 border-t border-white/20 pt-5 sm:mt-0 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8 lg:mt-6 lg:border-t lg:border-l-0 lg:pt-5 lg:pl-0">
                <p className="text-sm leading-6 text-white/80">
                  Dostawa w ciągu trzech dni roboczych po potwierdzeniu kwestionariusza,
                  zakresu produktu, odpowiedzialnych właścicieli i dostępu do wymaganych materiałów.
                </p>
                <p className="mt-3 text-xs leading-5 text-white/55">Termin nie biegnie, dopóki dokumenty lub właściciele są nadal ustalani.</p>
              </div>
            </div>
          </aside>
        </header>

        <section className="grid gap-10 border-b border-surface-border py-12 md:grid-cols-2 md:gap-8 lg:gap-10">
          <div>
            <h2 className="text-3xl font-semibold text-text-primary">Co otrzymasz</h2>
            <ul className="mt-6 space-y-4 text-base leading-7 text-text-secondary">
              {deliverables.map((item) => <li key={item} className="border-t border-surface-border pt-4">{item}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl font-semibold text-text-primary">Jak klasyfikujemy każdą odpowiedź</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {statuses.map((status) => <li key={status} className="border border-surface-border bg-surface-bg-alt p-4 text-sm text-text-secondary">{status}</li>)}
            </ul>
            <p className="mt-5 text-sm leading-7 text-text-muted">Brakujący materiał pozostaje brakującym materiałem. Nie tworzymy niepopartych odpowiedzi i nie przedstawiamy oświadczenia właściciela jako zweryfikowanego faktu.</p>
          </div>
        </section>

        <section className="border-b border-surface-border py-12">
          <div className="border-2 border-black">
            <p className="bg-black px-5 py-3 text-sm font-semibold tracking-wide text-white">SYNTHETIC DEMONSTRATION — NOT CUSTOMER EVIDENCE</p>
            <div className="grid gap-8 p-6 lg:grid-cols-2 lg:p-8">
              <div><h2 className="text-2xl font-semibold text-text-primary">Przykładowa nota przewodnia</h2><p className="mt-3 text-sm leading-7 text-text-secondary">Ta fikcyjna odpowiedź obejmuje jeden przykładowy produkt i wskazane niżej odwołania. Otwarte elementy wymagają decyzji wskazanego właściciela przed wysłaniem.</p></div>
              <div><h3 className="font-semibold text-text-primary">Przykładowe odwołania</h3><ul className="mt-3 space-y-2 text-sm text-text-muted"><li>Standard architektury — aktualna zatwierdzona wersja</li><li>Procedura przeglądu dostępu — zakres produktu</li><li>Polityka reagowania na incydenty — potwierdzona przez właściciela</li></ul><p className="mt-5 text-sm leading-7 text-text-muted">Zakres i ograniczenie: demonstracja nie przedstawia testów systemu na żywo, certyfikacji ani niezależnego przeliczenia materiałów.</p></div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 py-12 lg:grid-cols-2">
          <div><h2 className="text-3xl font-semibold text-text-primary">Czego ten Sprint nie zastępuje</h2><p className="mt-4 text-sm leading-7 text-text-secondary">Sprint nie zastępuje SOC 2, ISO 27001, testów penetracyjnych, porady prawnej ani certyfikacji wymaganej przez klienta.</p></div>
          <div className="space-y-3 text-sm leading-7 text-text-secondary"><p>Nie gwarantujemy zatwierdzenia przez przedsiębiorstwo ani zamknięcia transakcji. Klient odpowiada za każdą odpowiedź przekazywaną na zewnątrz.</p><p>Oferta nie obejmuje publicznego przyjmowania materiałów, weryfikacji systemu na żywo, rejestracji SaaS, płatności online, marketplace ani samoobsługowego uruchomienia.</p></div>
        </section>

        <div className="border-t border-surface-border pt-10"><PublicContactRoute subject="fit-check" locale="pl" /></div>
      </div>
    </main>
  );
}
