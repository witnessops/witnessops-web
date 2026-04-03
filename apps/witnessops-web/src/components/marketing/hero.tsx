import { HeroShell } from "@/components/hero/hero-shell";

interface HeroProps {
  eyebrow: string;
  title: string;
  body: string;
  supporting_points: string[];
  primary_cta: { label: string; href: string; variant: string };
  secondary_cta: { label: string; href: string; variant: string };
  proof_badges: string[];
  media: {
    type: string;
    terminal: { language: string; lines: string[] };
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
      trustBar={trustBar}
    />
  );
}
