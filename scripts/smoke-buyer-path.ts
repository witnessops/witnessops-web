import { EXTERNAL_ATTACK_SURFACE_OFFER, PUBLIC_AGENT_ACTION_OFFER } from "../apps/witnessops-web/src/lib/commercial-truth";

type FetchLike = (
  input: string,
  init?: {
    headers?: Record<string, string>;
    redirect?: "follow";
  },
) => Promise<{
  status: number;
  text: () => Promise<string>;
}>;

export type BuyerPathSmokeRoute = {
  path: string;
  requiredMarkers: string[];
  prohibitedMarkers?: string[];
};

export type BuyerPathSmokeResult = {
  path: string;
  url: string;
  status: number;
  ok: boolean;
  missingMarkers: string[];
  prohibitedMarkersPresent: string[];
};

export function escapeAmpersandsForHtml(value: string): string {
  return value.replaceAll("&", "&amp;");
}

export const buyerPathSmokeRoutes: BuyerPathSmokeRoute[] = [
  {
    path: "/",
    requiredMarkers: ["WitnessOps", "Understand what your agents can do and what your systems expose.", "WitnessOps provides focused security reviews for AI agents and internet-facing systems.", "Know what your AI agent can reach—before you rely on it.", "See what your internet-facing system exposes—and what needs attention.", "Scope an AI review", "Scope an external review", escapeAmpersandsForHtml(PUBLIC_AGENT_ACTION_OFFER.name.en), PUBLIC_AGENT_ACTION_OFFER.price.en, EXTERNAL_ATTACK_SURFACE_OFFER.name.en, EXTERNAL_ATTACK_SURFACE_OFFER.price.en, "Illustrative · shape only", "Designed, not executed", "Start a free check", "A public hostname snapshot. No account needed.", "Not a review.", "Record one bounded check", "The app cannot", "Useful evidence.", "Explicit limits.", "Submit non-secret enquiry"],
    prohibitedMarkers: ["VALID_SYNTHETIC_SPECIMEN", "guaranteed fix", "Agent Risk &amp; Control Review", "€1,500"],
  },
  {
    path: "/catalog/automation-repair",
    requiredMarkers: ["Automation Repair &amp; Handover", "€250 diagnosis", "€750 total including diagnosis only if", "about six total delivery hours", "No promise to fix every automation", "operating and recovery instructions", "Want someone to look after it?"],
  },
  {
    path: "/pl/catalog/automation-repair",
    requiredMarkers: ["Naprawa i przejęcie automatyzacji", "€250 za diagnozę", "€750 łącznie z diagnozą tylko wtedy", "Ten przegląd nie jest oferowany dla nowych zleceń."],
    prohibitedMarkers: ["Opisz problem"],
  },
  {
    path: "/review/request?offerId=automation-repair-handover",
    requiredMarkers: [
      "This link does not start a new review",
      "Existing requests and issued agreements keep their original terms.",
      "offerId=agent-action-security-review",
      "productId=OFFSEC-EXTERNAL-EXPOSURE",
      "No work or target-facing check starts from this page.",
    ],
    prohibitedMarkers: [
      'name="intent" value="automation-repair-handover"',
      "€250 diagnosis",
    ],
  },
  {
    path: "/catalog",
    requiredMarkers: [
      "Two focused security reviews.",
      PUBLIC_AGENT_ACTION_OFFER.name.en,
      PUBLIC_AGENT_ACTION_OFFER.price.en,
      PUBLIC_AGENT_ACTION_OFFER.timing.en,
      "Scope an AI review",
      EXTERNAL_ATTACK_SURFACE_OFFER.name.en,
      EXTERNAL_ATTACK_SURFACE_OFFER.price.en,
      "Within 3 working days after payment in full",
      "one focused retest within 30 days",
      "Not a penetration test.",
    ],
    prohibitedMarkers: [
      "Agent Risk &amp; Control Review",
      "Agent Risk & Control Review",
      "From €1,500",
      "from €1,500",
      "€1,500",
      "€1 500",
      "Pilot (entry)",
      "Access Removal Proof",
      "10-Server Security Pilot",
    ],
  },
  {
    path: "/catalog/workflows",
    requiredMarkers: [
      "AI Agent Tools &amp; Access Review",
      "Know which agent tools are visible and what one action can reach.",
      "one selected connection",
      "Starting at €2,500 · excluding VAT",
      "Non-secret fit and scoping request first",
      "One agreed device and OS, one dated system-level inventory, one named agent setup, one selected connection and one consequential action",
      "Target: 10 working days after accepted scope, authority, payment, handling and required inputs are confirmed",
      "Coverage matrix",
      "Observed agent/tool landscape",
      "One action path",
      "Prioritized sourced findings",
      "Fixed report revision",
      "Platform installation or production modification",
      "Continuous monitoring",
      "A security or production-readiness guarantee",
      "This review is not offered for new engagements.",
      "data-legacy-offer-withdrawal=\"agent-tools-access-review\"",
      "historical synthetic one-action example",
      "does not guarantee security",
    ],
    prohibitedMarkers: [
      "Agent Risk &amp; Control Review",
      "Agent Risk & Control Review",
      "From €1,500",
      "from €1,500",
      "€1,500",
      "€1 500",
      "Bounded Workflow Review",
      "certifies that the agent was correct",
      "Request a scope and fixed quote",
    ],
  },
  {
    path: "/docs",
    requiredMarkers: [
      "Documentation",
      "Start with the app",
      "Signup is free. Verify your email to create your own workspace. No card is required.",
      "CLI setup and authentication",
      "Try an example",
      "The default example is indeterminate",
      "were not independently checked",
      "Buyer path",
      "Get started",
      "Verify a receipt",
      "Browse by area",
      "do not claim complete runtime truth",
    ],
  },
  {
    path: "/docs/getting-started/proof-run-buyer-path",
    requiredMarkers: [
      "Buyer path for a security or operational review",
      "Customer Security Review Sprint",
      "External Attack Surface Review",
      "View services",
      "Start a review",
      "receipt-only",
      "non-secret fit check",
      "Mailbox verification is not review start",
      "no customer evidence has been accepted",
      "Stop conditions",
      "broad compliance certification",
      "legal audit opinion",
      "Minimal buyer reading order",
      "AI Agent Tools &amp; Access Review",
      "dated, source-bounded device inventory",
      "starts at €2,500 excluding VAT",
      "10 working days after the documented start gates",
      "secondary catalogue work at €1,900 excluding VAT",
    ],
    prohibitedMarkers: [
      "Agent Risk &amp; Control Review",
      "Agent Risk & Control Review",
      "From €1,500",
      "from €1,500",
      "€1,500",
      "six active services",
      "Package one security workflow",
      "Access Removal Proof",
      "10-Server Security Pilot",
    ],
  },
  {
    path: "/why-witnessops",
    requiredMarkers: ["Understand the finding. Inspect the evidence. Decide what to do.", "Permissions and controls", "Company background", "not evidence of a real provider action", "Scope a review"],
    prohibitedMarkers: ["Meet Karol", "Work directly with Karol"],
  },
  {
    path: "/pl/why-witnessops",
    requiredMarkers: ["Zrozum ustalenia. Sprawdź dowody. Zdecyduj, co dalej.", "Uprawnienia i zabezpieczenia", "Informacje o firmie", "Omów zakres przeglądu"],
    prohibitedMarkers: ["Poznaj Karola", "Pracujesz bezpośrednio z Karolem"],
  },
  {
    path: "/library",
    requiredMarkers: [
      "All Skills Library",
      "Every entry is a committed SKILL.md with one exact byte sequence",
      "Open featured skill",
      "Inspect exact bytes",
      "First-party reference contracts, not customer evidence",
      "A readable contract is not a safety certification.",
      "does not establish that a resulting workflow",
      "Scope a review",
    ],
    prohibitedMarkers: [
      "The public artifact classes here are sample or intake surfaces",
      "Public verifier",
      "Security workflow buyer path",
      "Package one security workflow",
    ],
  },
  {
    path: "/library/governed-agent-verifier",
    requiredMarkers: [
      "governed-agent-verifier",
      "1.0.1",
      "Contract history",
      "Historical drift receipt",
      "Machine-readable v1.0.1 contract",
      "source and contract agreement only",
    ],
    prohibitedMarkers: [
      "Verified safe",
      "Certified safe",
      "production-deployment proof",
    ],
  },
  {
    path: "/samples/governed-agent-verifier-conformance/v1/RECEIPT.json",
    requiredMarkers: [
      "witnessops.governed-agent-verifier-conformance-receipt.v1",
      "CONTRACT_CONFORMANT_IN_SOURCE",
      "2a0b2309a1785081ecc20c7e325b3d23454b2bfd65d9641ea82164bf9298aad5",
      "ccc325d40dc89823adff2d10f81fb02aa583a4edb5fd19bb1501b8512510bdb0",
      "production deployment of this source revision",
    ],
    prohibitedMarkers: [
      "CONTRACT_CONFORMANT_IN_PRODUCTION",
      "skill is safe",
      "certified safe",
    ],
  },
  {
    path: "/support",
    requiredMarkers: [
      "Get help or start a review",
      "Ready for a bounded review?",
      "AI Agent Tools &amp; Access Review",
      "Support is for product help, access issues, and verifier questions.",
      "Choose the right path",
      "Verify a receipt",
    ],
    prohibitedMarkers: [
      "Request an AI Agent Action Proof Run",
      "Request one proof run",
      "Package one security workflow",
    ],
  },
  {
    path: "/verify",
    requiredMarkers: [
      "Verify a WitnessOps receipt",
      "Upload a supported receipt file or paste its JSON",
      "Verify receipt",
      "Try an example",
      "indeterminate receipt-only result",
      "were not independently checked",
      "What this result means",
      "How verification works",
      "Upload receipt",
    ],
    prohibitedMarkers: [
      "verified compliance",
      "certified compliance",
      "audit-ready",
      "audit opinion provided",
      "proves compliance",
      "guarantees compliance",
      "Artifact state matrix",
      "Published first-party proof bundles",
      "Valid PV receipt",
      "Invalid QV receipt",
      "authority binding",
      "artifact-byte revalidation",
    ],
  },
  {
    path: "/pricing",
    requiredMarkers: [
      "Review pricing and scope",
      PUBLIC_AGENT_ACTION_OFFER.name.en,
      PUBLIC_AGENT_ACTION_OFFER.price.en,
      PUBLIC_AGENT_ACTION_OFFER.timing.en,
      "Scope an AI review",
      EXTERNAL_ATTACK_SURFACE_OFFER.name.en,
      EXTERNAL_ATTACK_SURFACE_OFFER.price.en,
      "Within 3 working days after payment in full",
      "An enquiry does not authorise collection or start a review.",
      "No work starts from the enquiry.",
    ],
    prohibitedMarkers: [
      "Agent Risk &amp; Control Review",
      "Agent Risk & Control Review",
      "From €1,500",
      "from €1,500",
      "€1,500",
      "€1 500",
      "Price the package after the workflow is bounded.",
      "Workflow price anchors",
      "verified compliance",
      "certified compliance",
      "audit-ready",
      "audit opinion provided",
      "proves compliance",
      "guarantees compliance",
      "Intended standard price after validation",
      "first three accepted engagements",
      "Within 24 hours after the agreed payment condition",
      "delivery within 24 hours after accepted start conditions",
      "Full payment is recommended",
      "two €950 instalments",
      "Primary fixed-scope offer",
    ],
  },
  {
    path: "/review",
    requiredMarkers: [
      "Bounded review",
      "One bounded technical action. One scoped review package.",
      "For",
      "You get",
      "Do not submit",
      "No dashboard subscription. No vague audit promise.",
      "What the review package contains",
      "Start a review",
      "Inspect sample package",
      "Verify a receipt",
    ],
    prohibitedMarkers: [
      "Request an AI Agent Action Proof Run",
      "One security workflow in. Proof package out.",
      "Request one proof run",
      "Package one security workflow",
    ],
  },
  {
    path: "/customer-security-review",
    requiredMarkers: [
      "Customer Security Review Sprint",
      "Get the questionnaire off your desk.",
      "From €1,600 · excluding VAT",
      "This review is not offered for new engagements.",
      "Proposed answer matrix",
      "Approximately three working days after scope, owners, required inputs and evidence access are confirmed",
      "SYNTHETIC DEMONSTRATION, NOT CUSTOMER EVIDENCE",
      "The customer owns the final answers, approvals and submission.",
    ],
    prohibitedMarkers: [
      "verified compliance",
      "certified compliance",
      "guaranteed approval",
      "security guaranteed",
      "public evidence upload",
      "Scope this review",
    ],
  },
  {
    path: "/pl",
    requiredMarkers: ["Poznaj, co potrafią Twoi agenci i co ujawniają Twoje systemy.", "Omów przegląd agenta AI", PUBLIC_AGENT_ACTION_OFFER.price.pl, "Fikcyjny przykład · Nie testowano systemu", EXTERNAL_ATTACK_SURFACE_OFFER.name.pl],
    prohibitedMarkers: ["VALID_SYNTHETIC_SPECIMEN", "Agent Risk &amp; Control Review", "€1 500"],
  },
  {
    path: "/pl/catalog",
    requiredMarkers: [
      "Dwa konkretne przeglądy bezpieczeństwa.",
      PUBLIC_AGENT_ACTION_OFFER.name.pl,
      PUBLIC_AGENT_ACTION_OFFER.price.pl,
      PUBLIC_AGENT_ACTION_OFFER.timing.pl,
      "Omów przegląd agenta AI",
      EXTERNAL_ATTACK_SURFACE_OFFER.name.pl,
      EXTERNAL_ATTACK_SURFACE_OFFER.price.pl,
      "W ciągu 3 dni roboczych po potwierdzeniu pełnej płatności",
      "jedno sprawdzenie poprawek w ciągu 30 dni",
      "To nie jest test penetracyjny.",
    ],
    prohibitedMarkers: [
      "Co się wydarzyło?",
      "Agent Risk &amp; Control Review",
      "Agent Risk & Control Review",
      "Od 6 500 zł",
      "€1 500",
      "engage@witnessops.com",
      "gwarantujemy zatwierdzenie",
      "certyfikujemy zgodność",
      "Pilotaż przeglądu bezpieczeństwa 10 serwerów",
      "Access Removal Proof",
    ],
  },
  {
    path: "/pl/customer-security-review",
    requiredMarkers: [
      "Customer Security Review Sprint",
      "Zdejmij kwestionariusz z listy zaległości.",
      "Od 7 000 zł (ok. €1 600) · bez VAT",
      "trzech dni roboczych",
      "Ten przegląd nie jest oferowany dla nowych zleceń.",
      "Klient odpowiada za końcowe odpowiedzi, zatwierdzenia i wysyłkę.",
    ],
    prohibitedMarkers: [
      "verified compliance",
      "certified compliance",
      "guaranteed approval",
      "security guaranteed",
    ],
  },
  {
    path: "/pl/library",
    requiredMarkers: [
      "Biblioteka",
      "Publiczne punkty wejścia",
      "Zacznij tutaj",
      "Przeglądaj usługi",
      "Zweryfikuj zapis",
      "Rozpocznij przegląd",
    ],
    prohibitedMarkers: [
      "Package one security workflow",
    ],
  },
  {
    path: "/catalog/offsec-external-exposure",
    requiredMarkers: [
      "External Attack Surface Review",
      "See what your public-facing system exposes.",
      "Review one authorised internet-facing system.",
      "€1,900 · excluding VAT",
      "No sales call required.",
      "Within 3 working days",
      "One authorised public-facing system",
      "Inside that accepted system boundary: up to 1 registrable root domain",
      "Public cloud-hosted services can be included",
      "It uses passive discovery where applicable, followed by explicitly approved, low-impact checks against the signed target schedule.",
      "No exploitation",
      "This is not a penetration test.",
      "Request this review",
      "See a sample review",
    ],
    prohibitedMarkers: [
      "first three accepted engagements",
      "Intended standard price",
      "Check pilot fit",
      "passive discovery plus explicitly approved low-impact",
      "Perform only the accepted passive and low-impact checks",
    ],
  },
  {
    path: "/catalog/professional-public-footprint-audit",
    requiredMarkers: [
      "Professional Public Footprint Audit",
      "Available by request",
      "€4,900 · excluding VAT",
      "7–10 working days",
      "One consenting professional",
      "public professional sources only",
      "what a defined set of public professional sources and repeatable searches supports, contradicts, leaves ambiguous or cannot establish",
      "Private-life investigation",
      "Ongoing monitoring",
      "Legal advice",
      "This review is not offered for new engagements.",
    ],
    prohibitedMarkers: [
      "Buy now",
      "Pay now",
      "Stripe",
      "complete picture of the internet",
      "verified expertise",
      "background check",
      "reputation repair",
    ],
  },
  {
    path: "/pl/catalog/professional-public-footprint-audit",
    requiredMarkers: [
      "Audyt publicznego śladu zawodowego",
      "Dostępny na zapytanie",
      "4 900 EUR · bez VAT",
      "7–10 dni roboczych",
      "Jedna osoba, która wyraziła zgodę",
      "wyłącznie publiczne źródła zawodowe",
      "co zdefiniowany zbiór publicznych źródeł zawodowych i powtarzalnych wyszukiwań wspiera, czemu przeczy, co pozostawia niejednoznaczne lub czego nie pozwala ustalić",
      "Badanie życia prywatnego",
      "Ciągły monitoring",
      "Porady prawne",
      "Ten przegląd nie jest oferowany dla nowych zleceń.",
    ],
    prohibitedMarkers: [
      "Kup teraz",
      "Zapłać teraz",
      "Stripe",
      "pełnego obrazu internetu",
      "zweryfikowane kompetencje",
      "background check",
      "naprawa reputacji",
    ],
  },
  {
    path: "/review/request",
    requiredMarkers: [
      "One question. Non-secret details only.", "Your name", "Work email", "Which review?", "What needs checking?",
      "Do not send passwords, private keys, API keys, recovery codes, session tokens or customer evidence in an initial enquiry.",
      "Next, confirm your email with a code.", "Submit non-secret enquiry",
      'action="/api/review/request"',
      "No work or target-facing check starts from this form.",
    ],
    prohibitedMarkers: [
      "Four fields.",
      "Request an access-change proof run",
      "What access change should we inspect?",
      "access-change-proof-run",
      "Package one security workflow",
      "Proof-Backed Security Workflow",
      "verified compliance",
      "certified compliance",
      "audit-ready",
      "audit opinion provided",
      "platform for AI governance",
      "proves compliance",
      "guarantees compliance",
      'value="automation-repair-handover"',
      'value="agent-tools-access-review"',
      "Not sure",
      "Internet Footprint Review",
    ],
  },
  {
    path: "/review/request?offerId=agent-action-security-review",
    requiredMarkers: [
      "Tell us what you want to check",
      "€2,500 fixed · excluding VAT",
      "What consequential action can the agent or automation take?",
      "One consequential agent or automation action",
      "Within 10 working days after evidence rules are agreed",
      'name="intent" value="agent-action-security-review"',
      "No work or target-facing check starts from this form.",
    ],
    prohibitedMarkers: [
      "Starting at €2,500",
      "Fixed quote after scope",
      "dated system-level inventory",
      'name="intent" value="agent-tools-access-review"',
      "offerId=agent-tools-access-review",
      "Agent Risk &amp; Control Review",
      "€1,500",
    ],
  },
  {
    path: "/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE",
    requiredMarkers: [
      "Tell us what you want to check",
      "Name the authorised internet-facing system and why its external attack surface matters now.",
      "Internet-facing system",
      "Domain, hostname, public IP, API, application, or public cloud endpoint",
      "Authority to request this review",
      "Start a review",
      "€1,900 · excluding VAT",
      "Payment is due in full before the delivery clock starts.",
      "No work or target-facing check starts from this form.",
      "External attack-surface map",
      "What the External Attack Surface Review delivers",
      "This is not a penetration test.",
    ],
    prohibitedMarkers: [
      "This form authorizes testing",
      "Pay now",
      "Upload evidence",
    ],
  },
  {
    path: "/review/request?offerId=agent-tools-access-review",
    requiredMarkers: [
      "This link does not start a new review",
      "Existing requests and issued agreements keep their original terms.",
      "offerId=agent-action-security-review",
      "productId=OFFSEC-EXTERNAL-EXPOSURE",
      "No work or target-facing check starts from this page.",
    ],
    prohibitedMarkers: [
      "Agent Risk &amp; Control Review",
      "Agent Risk & Control Review",
      "From €1,500",
      "from €1,500",
      "€1,500",
      "€1 500",
      'name="intent" value="agent-tools-access-review"',
      "Starting at €2,500",
      "Fixed quote after scope",
      "What the External Attack Surface Review delivers",
      "€1,900 · excluding VAT",
    ],
  },
  {
    path: "/review/request?productId=OFFSEC-PILOT",
    requiredMarkers: [
      "This link does not start a new review",
      "Existing requests and issued agreements keep their original terms.",
      "No work or target-facing check starts from this page.",
    ],
    prohibitedMarkers: [
      "Selected offer:",
      "10-Server Security Pilot",
      "Pilot (entry)",
    ],
  },
  {
    path: "/pl/review/request",
    requiredMarkers: [
      "Opowiedz, co wymaga sprawdzenia",
      "Jedno pytanie. Tylko niepoufne szczegóły.",
      "Który przegląd?",
      "Co wymaga sprawdzenia?",
      "Wyślij niepoufne zgłoszenie",
      "Ten formularz nie rozpoczyna pracy ani kontroli wobec celu.",
    ],
    prohibitedMarkers: ["Opowiedz, co się wydarzyło"],
  },
  {
    path: "/pl/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE",
    requiredMarkers: [
      "External Attack Surface Review",
      "Rozpocznij External Attack Surface Review",
      "Wskaż jeden system publicznie dostępny i podstawę upoważnienia",
      "Rozmowa sprzedażowa nie jest wymagana",
      "Formularz rozpoczyna akceptację zakresu; nie upoważnia do testów ani nie uruchamia trzydniowego terminu.",
      "Wyślij zgłoszenie do akceptacji zakresu",
      "To nie jest test penetracyjny.",
    ],
    prohibitedMarkers: [
      "Opowiedz, co wymaga sprawdzenia",
      "This form authorizes testing",
    ],
  },
  {
    path: "/pl/review/request?offerId=agent-action-security-review",
    requiredMarkers: [
      "Opisz, co chcesz sprawdzić",
      "€2 500: cena stała · bez VAT",
      "Jakie istotne działanie może wykonać agent lub automatyzacja?",
      "Jedno istotne działanie agenta lub automatyzacji",
      'name="intent" value="agent-action-security-review"',
      "Samo zgłoszenie nie rozpoczyna pracy.",
    ],
    prohibitedMarkers: [
      "Od €2 500 · bez VAT",
      "stała wycena po ustaleniu zakresu",
      "Jedno uzgodnione urządzenie i system operacyjny",
      'name="intent" value="agent-tools-access-review"',
      "Agent Risk &amp; Control Review",
      "€1 500",
    ],
  },
  {
    path: "/pl/review/request?offerId=agent-tools-access-review",
    requiredMarkers: [
      "Ten link nie rozpoczyna nowego przeglądu",
      "Istniejące zgłoszenia i wydane uzgodnienia zachowują pierwotne warunki.",
      "offerId=agent-action-security-review",
      "productId=OFFSEC-EXTERNAL-EXPOSURE",
      "Ta strona nie rozpoczyna pracy ani kontroli wobec celu.",
    ],
    prohibitedMarkers: [
      "Agent Risk &amp; Control Review",
      "Agent Risk & Control Review",
      "Od 6 500 zł",
      "€1 500",
      'name="intent" value="agent-tools-access-review"',
      "Od €2 500 · bez VAT",
      "Rozpocznij External Attack Surface Review",
      "€1 900 · bez VAT",
    ],
  },
  {
    path: "/pl/review/request?productId=OFFSEC-PILOT",
    requiredMarkers: [
      "Ten link nie rozpoczyna nowego przeglądu",
      "Istniejące zgłoszenia i wydane uzgodnienia zachowują pierwotne warunki.",
      "Ta strona nie rozpoczyna pracy ani kontroli wobec celu.",
    ],
    prohibitedMarkers: [
      "Wybrana oferta:",
      "Pilotaż przeglądu bezpieczeństwa 10 serwerów",
    ],
  },
  {
    path: "/review/request/confirmed",
    requiredMarkers: [
      "WitnessOps / request record",
      "Loading the browser-held request record…",
    ],
    prohibitedMarkers: [
      "Request verified",
      "Your mailbox is verified",
      "Security workflow request",
      "access-change proof run request",
      "Access-change offer",
      "Governed Recon",
      "Scope Approval",
      "Governed Recon Results",
      "Explicit scope approval is required before governed recon starts",
      "verified compliance",
      "certified compliance",
      "audit-ready",
      "audit opinion provided",
      "platform for AI governance",
      "proves compliance",
      "guarantees compliance",
    ],
  },
  {
    path: "/pl/review/request/confirmed",
    requiredMarkers: [
      "WitnessOps / request record",
      "Wczytywanie zapisu zgłoszenia przechowywanego w przeglądarce…",
    ],
    prohibitedMarkers: [
      "Request verified",
      "Your mailbox is verified",
      "Zweryfikowane zgłoszenie",
      "Twoja skrzynka została zweryfikowana",
    ],
  },
  {
    path: "/review/sample-cases",
    requiredMarkers: [
      "Illustrative reviews, findings and evidence.",
      "Sample cases",
      "Compromised API key rotation",
      "SBOM field checklist (method sample)",
      "Local server security review",
      "Start a review",
      "Verify a receipt",
      "Not a legal compliance claim",
    ],
    prohibitedMarkers: [
      "Published sample cases and proof bundles",
      "Primary sample",
      "proofpack fixture",
      "Package lane",
      "Request one proof run",
      "Package one security workflow",
    ],
  },
  {
    path: "/review/sample-report",
    requiredMarkers: [
      "Sample report",
      "Illustrative sample report",
      "Not live",
      "not a live customer report",
      "not a claim of completed verification",
      "Artifact manifest",
      "Review boundary",
      "Authority map",
      "Execution path observed",
      "Evidence inspected",
      "Replayability judgment",
      "Boundary note",
      "Start a review",
    ],
    prohibitedMarkers: [
      "Request Proof Run",
      "verified compliance",
      "certified compliance",
      "audit-ready",
      "audit opinion provided",
      "proves compliance",
      "guarantees compliance",
    ],
  },
  {
    path: "/review/sample-cases/external-exposure-assessment",
    requiredMarkers: [
      "Synthetic worked example, not customer evidence.",
      "External Attack Surface Review",
      "OFFSEC-EXTERNAL-EXPOSURE",
      "Sample package files",
      "findings.json",
      "evidence-manifest.json",
      "verifier-result.json",
      "package integrity",
      "does not prove that a target is secure",
      "Start a review",
    ],
    prohibitedMarkers: [
      "assessment of WitnessOps",
      "penetration test certificate",
      "verified compliance",
      "the target is secure",
    ],
  },
  {
    path: "/review/sample-cases/approval-gated-containment",
    requiredMarkers: [
      "Approval-gated containment review",
      "Explanatory example only",
      "Not live",
      "not a live customer artifact",
      "Artifact manifest",
      "Review boundary",
      "Authority map",
      "Execution path observed",
      "Evidence inspected",
      "Replayability judgment",
      "Boundary note",
      "Start a review",
    ],
    prohibitedMarkers: [
      "Request Proof Run",
      "verified compliance",
      "certified compliance",
      "audit-ready",
      "audit opinion provided",
      "proves compliance",
      "guarantees compliance",
    ],
  },
  {
    path: "/review/sample-cases/privileged-access-grant",
    requiredMarkers: [
      "Privileged access grant review",
      "Explanatory example only",
      "Not live",
      "not a live customer artifact",
      "Artifact manifest",
      "Review boundary",
      "Authority map",
      "Execution path observed",
      "Evidence inspected",
      "Replayability judgment",
      "Boundary note",
      "Start a review",
    ],
    prohibitedMarkers: [
      "Request Proof Run",
      "verified compliance",
      "certified compliance",
      "audit-ready",
      "audit opinion provided",
      "proves compliance",
      "guarantees compliance",
    ],
  },
  {
    path: "/review/sample-cases/ai-agent-action-proof-run",
    requiredMarkers: [
      "Synthetic demo",
      "No live systems",
      "See a key rotation, step by step.",
      "checks the pinned bundle digest,",
      "Published sample, not live customer evidence",
      "No real provider, credential, compromise, customer, or",
      "Browser verification",
      "VERIFYING EXACT PUBLIC BYTES",
      "Synthetic credential rotation",
      "Northstar API (synthetic)",
      "Declared approval",
      "Play example",
      "Playback only. This click authorizes nothing",
      "Inspect the evidence",
      "Bundle SHA-256",
      "bb921133a6d06db471b0a8f5015fd6f7a734c2c1721de4e0007fa34397c11f9c",
      "Verifier SHA-256",
      "7ac872446e384f40d82eaf63e7a0d5ca4604eb06a0fdb8e872a9240400377f41",
      "d4ad234bd8152b1a01b9adc913f383d1838850b3",
      "What if the evidence changes?",
      "Try changing one byte",
      "Download files and verify offline",
      "node verify.mjs BUNDLE.wops.json DEMO_KEY_REGISTRY.json",
      "BUNDLE.wops.json",
      "verify.mjs",
      "DEMO_KEY_REGISTRY.json",
      "What this sample can show",
      "that an AI agent caused or authorized the tool calls",
      "AI Agent Tools &amp; Access Review",
      "Starting at €2,500 · excluding VAT",
      "This synthetic one-action example is historical",
      "Target: 10 working days after accepted scope, authority, payment, handling and required inputs are confirmed",
      "Request scope and quote",
    ],
    prohibitedMarkers: [
      "Agent Risk &amp; Control Review",
      "Agent Risk & Control Review",
      "From €1,500",
      "from €1,500",
      "€1,500",
      "€1 500",
      "Receipt shape only",
      "receipt shape only",
      "buyer email, and urgency",
      "The key leaked.",
      "Watch the agent rotate it",
      "Credential material is suppressed at source.",
      "witnessops-sample-cases/tree/main/sample-cases/ai-agent-action-proof-run",
      "witnessops-sample-cases/blob/main/sample-cases/ai-agent-action-proof-run",
    ],
  },
];

export function normalizeBaseUrl(input: string): string {
  const url = new URL(input);
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

export function evaluateBuyerPathRoute(
  route: BuyerPathSmokeRoute,
  baseUrl: string,
  status: number,
  body: string,
): BuyerPathSmokeResult {
  const missingMarkers = route.requiredMarkers.filter(
    (marker) => !body.includes(marker),
  );
  const prohibitedMarkersPresent = (route.prohibitedMarkers ?? []).filter(
    (marker) => body.includes(marker),
  );

  return {
    path: route.path,
    url: new URL(route.path, `${baseUrl}/`).toString(),
    status,
    ok:
      status === 200 &&
      missingMarkers.length === 0 &&
      prohibitedMarkersPresent.length === 0,
    missingMarkers,
    prohibitedMarkersPresent,
  };
}

export async function runBuyerPathSmoke(
  baseUrl: string,
  routes: BuyerPathSmokeRoute[] = buyerPathSmokeRoutes,
  fetchImpl: FetchLike = fetch,
): Promise<BuyerPathSmokeResult[]> {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const results: BuyerPathSmokeResult[] = [];

  for (const route of routes) {
    const url = new URL(route.path, `${normalizedBaseUrl}/`).toString();
    const response = await fetchImpl(url, {
      headers: {
        "cache-control": "no-cache",
        pragma: "no-cache",
        "user-agent": "witnessops-buyer-path-smoke/1.0",
      },
      redirect: "follow",
    });
    const body = await response.text();
    results.push(
      evaluateBuyerPathRoute(route, normalizedBaseUrl, response.status, body),
    );
  }

  return results;
}

function parseArgs(argv: string[]) {
  const args = [...argv];
  let baseUrl = process.env.WITNESSOPS_SMOKE_BASE_URL ?? "https://witnessops.com";
  let json = false;

  while (args.length > 0) {
    const arg = args.shift();

    if (arg === "--") {
      continue;
    }

    if (arg === "--base-url") {
      const value = args.shift();
      if (!value) {
        throw new Error("--base-url requires a value");
      }
      baseUrl = value;
      continue;
    }

    if (arg === "--json") {
      json = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { baseUrl, json };
}

function formatResult(result: BuyerPathSmokeResult): string {
  const details = [
    result.missingMarkers.length > 0
      ? `missing=${result.missingMarkers.join(", ")}`
      : null,
    result.prohibitedMarkersPresent.length > 0
      ? `prohibited=${result.prohibitedMarkersPresent.join(", ")}`
      : null,
  ].filter(Boolean);

  return [
    result.ok ? "PASS" : "FAIL",
    result.path,
    String(result.status),
    details.length > 0 ? details.join("; ") : null,
  ]
    .filter(Boolean)
    .join(" ");
}

async function main() {
  const { baseUrl, json } = parseArgs(process.argv.slice(2));
  const results = await runBuyerPathSmoke(baseUrl);
  const ok = results.every((result) => result.ok);

  if (json) {
    console.log(
      JSON.stringify(
        {
          ok,
          baseUrl: normalizeBaseUrl(baseUrl),
          results,
        },
        null,
        2,
      ),
    );
  } else {
    for (const result of results) {
      console.log(formatResult(result));
    }
  }

  if (!ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith("smoke-buyer-path.ts")) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Buyer path smoke failed.",
    );
    process.exitCode = 1;
  });
}
