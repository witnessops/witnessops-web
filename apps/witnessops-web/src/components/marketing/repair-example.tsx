import { ChevronRight } from "lucide-react";
import type { BuyerLocale } from "@/lib/buyer-services";
export function RepairExample({ locale }: { locale: BuyerLocale }) {
  const pl = locale === "pl";
  return <article className="reviewFinding_finding" id="repair-example">
    <p className="reviewFinding_specimenLabel">{pl ? "Fikcyjny przykład · Nie testowano systemu" : "Fictional example · No system tested"}</p>
    <p className="reviewFinding_findingMeta">{pl ? "Formularz → CRM → Powiadomienie" : "Lead form → CRM → Notification"}</p>
    <h3 className="reviewFinding_findingTitle">{pl ? "Proces jest zielony. Leada nie ma w CRM." : "The run is green. The lead is missing."}</h3>
    <dl className="reviewFinding_findingFacts">
      <div><dt>{pl ? "Problem" : "Problem"}</dt><dd>{pl ? "Kontakt nie trafia do handlowca, mimo że proces zgłasza sukces." : "Sales never receives the contact, even though the workflow reports success."}</dd></div>
      <div><dt>{pl ? "Test odbioru" : "Acceptance"}</dt><dd>{pl ? "Właściwy kontakt i pola w CRM. Powiadomienie z tym samym leadem. Ponowienie bez duplikatu." : "The right contact and fields in the CRM. A matching notification. A retry without a duplicate."}</dd></div>
    </dl>
    <details className="reviewFinding_findingEvidence"><summary><span>{pl ? "Co sprawdzamy i przekazujemy" : "What we check and hand over"}</span><ChevronRight size={18} aria-hidden="true" /></summary><p className="pt-6 text-sm leading-7">{pl ? "Porównujemy uzgodniony przykład wejściowy z rzeczywistym rekordem docelowym. Dołączamy wynik testu, aktualny eksport, sposób powtórzenia testu i kroki odzyskiwania. Ten przykład nie przedstawia wykonanej naprawy ani wyniku klienta." : "Compare an agreed test input with the actual destination record. Include the test result, updated export, steps to rerun the case and recovery instructions. This illustration does not represent a completed repair or customer result."}</p></details>
  </article>;
}
