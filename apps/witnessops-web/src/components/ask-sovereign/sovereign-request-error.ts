import { AskWitnessOpsRequestError } from "../docs-assistant/ask-witnessops-response";

/** Describe only what the browser observed; never infer an upstream outage. */
export function sovereignRequestError(reason: unknown, locale: "en" | "pl"): string {
  const pl = locale === "pl";
  if (reason instanceof AskWitnessOpsRequestError) {
    if (reason.status === 429) return pl ? "Za dużo pytań naraz. Poczekaj chwilę i spróbuj ponownie." : "Too many questions at once. Wait a moment, then retry.";
    if (reason.status === 410) return pl ? "Sovereign nie jest tutaj włączony. Twoje pytanie nadal jest w rozmowie." : "Sovereign isn’t enabled here. Your question is still here.";
  }
  if (reason instanceof Error && reason.name === "TimeoutError") return pl ? "Sovereign nie odpowiedział na czas. Twoje pytanie nadal jest w rozmowie." : "Sovereign took too long to respond. Your question is still here.";
  if (reason instanceof TypeError) return pl ? "Nie udało się połączyć z Sovereign. Twoje pytanie nadal jest w rozmowie." : "Couldn’t connect to Sovereign. Your question is still here.";
  if (reason instanceof SyntaxError) return pl ? "Odpowiedź Sovereign jest nieczytelna. Spróbuj ponownie." : "Sovereign returned an unreadable response. Please retry.";
  return pl ? "Sovereign nie mógł teraz odpowiedzieć. Twoje pytanie nadal jest w rozmowie." : "Sovereign couldn’t answer right now. Your question is still here.";
}
