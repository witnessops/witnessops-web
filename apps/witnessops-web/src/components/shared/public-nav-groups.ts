export const PUBLIC_NAV_GROUPS = [
  { label: "Product", description: "Start small. Keep the evidence.", links: [
    { label: "How the app works", href: "/early-access", description: "Checks, saved observations and reports." },
    { label: "Get started", href: "/docs/getting-started", description: "Free signup, email verification and your own workspace." },
  ] },
  { label: "Resources", description: "Understand the product and its limits.", links: [
    { label: "Docs", href: "/docs", description: "App guides, CLI setup and reference." },
    { label: "Understand results", href: "/docs/getting-started/results", description: "Snapshots, reports and signed packages." },
    { label: "Sample work", href: "/review/sample-cases", description: "Illustrative findings and evidence." },
    { label: "Research", href: "/research", description: "Notes on evidence and security decisions." },
    { label: "The Sovereign Chronicles", href: "/chronicles", description: "Fiction from the WitnessOps desk. Preview." },
    { label: "Verify a receipt", href: "/verify", description: "Supported receipt JSON and named checks." },
    { label: "Tool · not a review", href: "/check", description: "A public hostname snapshot. No account needed." },
  ] },
] as const;
