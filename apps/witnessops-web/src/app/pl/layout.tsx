/**
 * PL copy pending native review. The banner covers these strings:
 * Ciemny, Jasny, Przełącz na ciemny motyw, Przełącz na jasny motyw,
 * Motyw na tym urządzeniu, Zapamiętany na tym urządzeniu,
 * Zapisujemy wybór tylko w tej przeglądarce, dopiero po kliknięciu. WitnessOps nie otrzymuje tego wyboru.,
 * Zaloguj się, Przykładowe prace, Zobacz przykłady, Narzędzie, nie przegląd,
 * Podgląd · symulowane przekazanie, Podgląd · symulowany błąd.
 */
export default function PolishLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="pl-copy-review reviewTag border-b border-[var(--line)] bg-[var(--paper-2)] px-4 py-2 text-center text-[var(--ink-dim)]">
        PL copy pending native review
      </p>
      {children}
    </>
  );
}
