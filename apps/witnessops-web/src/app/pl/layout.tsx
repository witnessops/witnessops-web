import { PlCopyReviewBar } from "./pl-copy-review-bar";

/**
 * PL copy pending native review. The banner covers these strings:
 * Dokumentacja, Testujemy agentów zbudowanych na,
 * Materiały prasowe i znak marki:, zestaw dla mediów,
 * Zaloguj się, Przykłady, Zobacz przykłady, Narzędzie, nie przegląd,
 * Nic nie zostało wysłane. Spróbować ponownie?,
 * Podgląd · symulowane przekazanie, Podgląd · symulowany błąd.
 * The homepage hides the public bar; native review remains pending.
 * The agent-action offer uses a shorter bar. Other PL routes keep the full bar.
 */
export default function PolishLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PlCopyReviewBar />
      {children}
    </>
  );
}
