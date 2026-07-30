import type { Metadata } from "next";
import Link from "next/link";

type PolishLibraryGroup = {
  title: string;
  description: string;
  primary?: boolean;
  links: ReadonlyArray<readonly [string, string, string]>;
};

const groups: PolishLibraryGroup[] = [
  {
    title: "Zacznij tutaj",
    description: "Wybierz drogę odpowiadającą decyzji, którą musisz podjąć.",
    primary: true,
    links: [
      ["Przeglądaj usługi", "/pl/catalog", "Porównaj przeglądy według sytuacji, rezultatu, ceny i terminu."],
      ["Rozpocznij przegląd", "/pl/review/request", "Opisz sytuację bez wysyłania plików ani danych poufnych."],
      ["Sprint kwestionariusza bezpieczeństwa", "/pl/customer-security-review", "Przygotuj popartą materiałem odpowiedź na jeden kwestionariusz."],
    ],
  },
  {
    title: "Przewodniki dla kupujących",
    description: "Zrozum zakres, przekazanie wyniku i ograniczenia ustaleń.",
    primary: true,
    links: [
      ["Dlaczego WitnessOps", "/pl/why-witnessops", "Jak praca o określonym zakresie staje się zrozumiała i możliwa do sprawdzenia."],
      ["Dokumentacja po polsku", "/pl/docs", "Techniczne objaśnienia dostępne w zatwierdzonej polskiej wersji."],
    ],
  },
  {
    title: "Przykładowe rezultaty",
    description: "Zobacz jasno oznaczone przykłady przed wyborem usługi.",
    primary: true,
    links: [
      ["Przykład Sprintu kwestionariusza", "/pl/customer-security-review", "Fikcyjna nota, odwołania i ograniczenia pod wyraźnym oznaczeniem demonstracji."],
      ["Zweryfikuj zapis", "/pl/verify", "Prześlij lub wklej JSON zapisu i odczytaj wynik."],
    ],
  },
  {
    title: "Objaśnienia usług",
    description: "Poznaj szczegóły dostępnych rodzin usług.",
    links: [["Katalog usług", "/pl/catalog", "Natywne polskie opisy zatwierdzonych ofert i ich granic."]],
  },
  {
    title: "Weryfikacja",
    description: "Sprawdź zapis, który otrzymałeś, i zobacz, co wynik potwierdza.",
    links: [
      ["Zweryfikuj zapis", "/pl/verify", "Prześlij lub wklej JSON zapisu i odczytaj wynik."],
      ["Jak działa weryfikacja (EN)", "/docs/how-it-works/verification", "Szczegóły techniczne: co wynik ustala, a czego nie."],
    ],
  },
  {
    title: "Materiały techniczne",
    description: "Przejdź do dokumentacji, gdy potrzebujesz szczegółów modelu i granic zaufania.",
    links: [["Dokumentacja", "/pl/docs", "Techniczne pojęcia, sposób działania i granice zaufania."]],
  },
];

export const metadata: Metadata = {
  title: "Biblioteka WitnessOps",
  description: "Przewodniki dla kupujących, przykładowe rezultaty, objaśnienia usług, weryfikacja i materiały techniczne WitnessOps.",
  alternates: {
    canonical: "/pl/library",
    languages: { en: "/library", pl: "/pl/library", "x-default": "/library" },
  },
};

export default function PolishLibraryPage() {
  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:py-20">
        <header className="max-w-5xl border-b border-surface-border pb-10">
          <p className="text-sm font-semibold text-text-muted">Biblioteka</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.03em] text-text-primary md:text-5xl lg:text-6xl">Proste drogi do usług, przykładów i szczegółów technicznych.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">Zacznij od decyzji, którą musisz podjąć. Przejdź do weryfikacji lub dokumentacji technicznej dopiero wtedy, gdy te szczegóły są potrzebne.</p>
        </header>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {groups.map((group) => (
            <section key={group.title} className={group.primary ? "border-2 border-black bg-white p-5 sm:p-6" : "border border-surface-border bg-surface-bg-alt p-5 sm:p-6"}>
              <h2 className="text-2xl font-semibold text-text-primary">{group.title}</h2>
              <p className="mt-3 text-sm leading-6 text-text-muted">{group.description}</p>
              <ul className="mt-6 space-y-5">
                {group.links.map(([label, href, note]) => <li key={href} className="border-t border-surface-border pt-4"><Link href={href} className="inline-flex min-h-11 w-full items-center font-semibold text-text-primary underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2">{label}</Link><p className="mt-2 text-sm leading-6 text-text-muted">{note}</p></li>)}
              </ul>
            </section>
          ))}
        </div>
        <p className="mt-10 max-w-3xl text-sm leading-7 text-text-muted">Przykłady są oznaczone jako demonstracje lub ilustracje. Nie są materiałem klienta ani certyfikacją zgodności.</p>
      </div>
    </main>
  );
}
