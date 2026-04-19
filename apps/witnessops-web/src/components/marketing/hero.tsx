import { HeroShell } from "@/components/hero/hero-shell";

// Receipt excerpt lines sourced from the live receipt at /library/samples/phishing-triage
// Values are truncated per spec §9 (truncated sha256 values are acceptable).
const RECEIPT_EXCERPT_LINES = [
  "{",
  '  "schemaVersion": "tier1-freeze-v2.1",',
  '  "artifactHash": "sha256:9d5e42a8f3c1b7e2...",',
  '  "executionHash": "sha256:3f8c1b2e5a7d094f...",',
  '  "signature": "ed25519:k7x9m3p2q5r8s1t4..."',
  "}",
];

interface HeroProps {
  eyebrow: string;
  title: string;
  body: string;
  supporting_points: string[];
  primary_cta: { label: string; href: string; variant: string };
  secondary_cta: { label: string; href: string; variant: string };
  microcopy?: string;
  proof_badges: string[];
  media: {
    type: string;
    terminal?: { language: string; lines: string[] };
    code?: { language: string; lines: string[] };
  };
  trustBar: {
    enabled: boolean;
    label: string;
    items: string[];
  };
}

export function Hero({
  eyebrow,
  title,
  body,
  supporting_points,
  primary_cta,
  secondary_cta,
  microcopy,
  proof_badges,
  trustBar,
}: HeroProps) {
  return (
    <HeroShell
      eyebrow={eyebrow}
      title={title}
      body={body}
      supportingPoints={supporting_points}
      primaryCta={primary_cta}
      secondaryCta={secondary_cta}
      proofBadges={proof_badges}
      microcopy={microcopy}
      receiptExcerptLines={RECEIPT_EXCERPT_LINES}
      trustBar={trustBar}
    />
  );
}
