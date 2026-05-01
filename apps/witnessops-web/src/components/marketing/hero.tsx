import { HeroShell } from "@/components/hero/hero-shell";

interface HeroProps {
  eyebrow: string;
  title: string;
  body: string;
  supporting_points: string[];
  ai_note?: {
    title: string;
    body: string[];
    microcopy?: string;
  };
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
  ai_note,
  primary_cta,
  secondary_cta,
  microcopy,
  proof_badges,
  media,
  trustBar,
}: HeroProps) {
  return (
    <HeroShell
      eyebrow={eyebrow}
      title={title}
      body={body}
      supportingPoints={supporting_points}
      aiNote={ai_note}
      primaryCta={primary_cta}
      secondaryCta={secondary_cta}
      proofBadges={proof_badges}
      microcopy={microcopy}
      media={media}
      trustBar={trustBar}
    />
  );
}
