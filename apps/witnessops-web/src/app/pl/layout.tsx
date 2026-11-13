import { PlCopyReviewBar } from "./pl-copy-review-bar";

/**
 * PL copy pending native review. The banner covers these strings:
 * Ciemny, Jasny, Przełącz na ciemny motyw, Przełącz na jasny motyw,
 * Motyw na tym urządzeniu, Zapamiętany na tym urządzeniu,
 * Zapisujemy wybór tylko w tej przeglądarce, dopiero po kliknięciu. WitnessOps nie otrzymuje tego wyboru.,
 * Zaloguj się, Przykłady, Zobacz przykłady, Narzędzie, nie przegląd,
 * Nic nie zostało wysłane. Spróbować ponownie?,
 * Podgląd · symulowane przekazanie, Podgląd · symulowany błąd.
 * Home and the agent-action offer use a shorter bar. Other PL routes keep the full bar.
 */
export default function PolishLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PlCopyReviewBar />
      {children}
    </>
  );
}
