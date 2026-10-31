export const PUBLIC_NAV_GROUPS = [
  { label: "Product", description: "Start small. Keep the evidence.", links: [
    { label: "How the app works", href: "/early-access", description: "Checks, saved observations and reports." },
    { label: "Get started", href: "/docs/getting-started", description: "Free signup, email verification and your own workspace." },
  ] },
  { label: "Reviews", description: "One agreed scope. Clear findings.", links: [
    { label: "Agent Action Security Review", href: "/reviews/agent-action-security-review", description: "Review the controls around one agent action." },
    { label: "The review", href: "/reviews", description: "Scope, price and deliverables." },
  ] },
  { label: "Resources", description: "Understand the product and its limits.", links: [
    { label: "Docs", href: "/docs", description: "App guides, CLI setup and reference." },
    { label: "Sample work", href: "/review/sample-cases", description: "Agent-action examples and their evidence limits." },
    { label: "Verify a receipt", href: "/verify", description: "Supported receipt JSON and named checks." },
    { label: "Tool · not a review", href: "/check", description: "A public hostname snapshot. No account needed." },
  ] },
] as const;
