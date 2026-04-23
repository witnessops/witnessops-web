import type { Metadata } from "next";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { renderHomeSections } from "@/components/marketing/home-section-registry";
import { loadHomeContent } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const home = loadHomeContent();

export const metadata: Metadata = buildMetadata(home.seo);

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} data-page="home">
      <Hero
        eyebrow={home.hero.eyebrow}
        title={home.hero.title}
        body={home.hero.body}
        supporting_points={home.hero.supporting_points}
        ai_note={home.hero.ai_note}
        primary_cta={home.hero.primary_cta}
        secondary_cta={home.hero.secondary_cta}
        proof_badges={home.hero.proof_badges}
        media={home.hero.media}
        trustBar={home.trust_bar}
        microcopy={home.hero.microcopy}
      />

      {renderHomeSections(home.sections)}

      {home.final_cta.enabled && (
        <FinalCta
          enabled={home.final_cta.enabled}
          title={home.final_cta.title}
          body={home.final_cta.body}
          primary_cta={home.final_cta.primary_cta}
          secondary_cta={home.final_cta.secondary_cta}
          ctas={home.final_cta.ctas}
        />
      )}
    </main>
  );
}
