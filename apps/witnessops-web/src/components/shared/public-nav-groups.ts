export const PUBLIC_NAV_GROUPS = [
  { label: "Product", description: "Start small. Keep the evidence.", links: [
    { label: "How the app works", href: "/early-access", description: "Checks, saved observations and reports." },
    { label: "Free check", href: "/check", description: "A public hostname snapshot. No account needed." },
    { label: "Get started", href: "/docs/getting-started", description: "Free signup and invited workspace access." },
  ] },
  { label: "Expert help", description: "One agreed scope. Clear findings.", links: [
    { label: "Agent Action Security Review", href: "/catalog/workflows", description: "Review one consequential agent action." },
    { label: "One Server Security Check", href: "/catalog/offsec-local-audit", description: "A focused review of one Linux server." },
    { label: "External Attack Surface Review", href: "/catalog/offsec-external-exposure", description: "Review one public-facing system." },
    { label: "All services", href: "/catalog", description: "Find the right scope for your situation." },
  ] },
  { label: "Resources", description: "Understand the product and its limits.", links: [
    { label: "Docs", href: "/docs", description: "App guides, CLI setup and reference." },
    { label: "Understand results", href: "/docs/getting-started/results", description: "Snapshots, reports and signed packages." },
    { label: "Sample work", href: "/library", description: "Illustrative findings and evidence." },
    { label: "Research", href: "/research", description: "Notes on evidence and security decisions." },
    { label: "Verify a receipt", href: "/verify", description: "Supported receipt JSON and named checks." },
  ] },
] as const;
