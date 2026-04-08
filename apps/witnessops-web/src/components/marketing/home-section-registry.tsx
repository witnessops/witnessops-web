import type { WitnessOpsHomeSection } from "@witnessops/content";
import { ProofStrip } from "@/components/marketing/proof-strip";
import { ProblemSection } from "@/components/marketing/problem-section";
import { CategorySection } from "@/components/marketing/category-section";
import { WhyNowSection } from "@/components/marketing/why-now-section";
import { PipelineSection } from "@/components/marketing/pipeline-section";
import { ArtifactSection } from "@/components/marketing/artifact-section";
import { ProofObjectSection } from "@/components/marketing/proof-object-section";
import { PlatformSurfacesSection } from "@/components/marketing/platform-surfaces-section";
import { AudienceSection } from "@/components/marketing/audience-section";
import { PositioningSection } from "@/components/marketing/positioning-section";
import { OfferSection } from "@/components/marketing/offer-section";
import { ExpansionPathSection } from "@/components/marketing/expansion-path-section";

type SectionRendererMap = {
  [K in WitnessOpsHomeSection["type"]]: (
    section: Extract<WitnessOpsHomeSection, { type: K }>,
  ) => React.ReactNode;
};

const sectionRenderers: SectionRendererMap = {
  proof_strip: (section) => <ProofStrip key={section.id} {...section} />,
  problem: (section) => <ProblemSection key={section.id} {...section} />,
  category_comparison: (section) => (
    <CategorySection key={section.id} {...section} />
  ),
  why_now: (section) => <WhyNowSection key={section.id} {...section} />,
  pipeline: (section) => <PipelineSection key={section.id} {...section} />,
  artifact_anatomy: (section) => <ArtifactSection key={section.id} {...section} />,
  proof_object: (section) => <ProofObjectSection key={section.id} {...section} />,
  platform_surfaces: (section) => (
    <PlatformSurfacesSection key={section.id} {...section} />
  ),
  audiences: (section) => <AudienceSection key={section.id} {...section} />,
  positioning: (section) => <PositioningSection key={section.id} {...section} />,
  offer: (section) => <OfferSection key={section.id} {...section} />,
  expansion_path: (section) => (
    <ExpansionPathSection key={section.id} {...section} />
  ),
};

export function renderHomeSections(sections: WitnessOpsHomeSection[]) {
  return sections.map((section) => {
    if (!section.enabled) {
      return null;
    }

    return sectionRenderers[section.type](section as never);
  });
}
