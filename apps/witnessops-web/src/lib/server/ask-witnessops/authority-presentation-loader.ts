import "server-only";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const presentationProjection: any = require(
  "@witnessops/ask-authority/v1/source-presentation-projection.json",
);

export interface PresentationSourceRecord {
  readonly source_id: string;
  readonly public_label: string;
  readonly canonical_href: string;
  readonly href_class: string;
  readonly display_permission: string;
  readonly section_display_policy: string;
}

export interface GlobalPresentationRules {
  readonly citation_order: readonly string[];
  readonly max_displayed_sources_per_response: number;
  readonly duplicate_source_suppression: boolean;
  readonly refusal_and_decline_presentation: string;
  readonly route_only_answers: string;
}

export interface PresentationProjectionIdentity {
  readonly projectionId: string;
  readonly projectionVersion: number;
  readonly coreProjectionSha256: string;
  readonly sourcePresentationSha256: string;
}

function buildPresentationLoader(projection: any) {
  if (!projection || projection.projection_id !== "ASK_SOURCE_PRESENTATION_PROJECTION_V1") {
    throw new Error("ask_presentation_loader_init_failed:invalid_projection_id");
  }

  const expectedCore = "8c64e10fbb7e738dc314dfad5fb0df4f74e838600492f8e2c8be7af70a6bfb34";
  const expectedSource = "a886b2183f925275ce42cfebbbf739dad98540919eb5f2ae300a5fc785399a8e";

  if (projection.core_projection_sha256 !== expectedCore) {
    throw new Error("ask_presentation_loader_init_failed:core_binding_mismatch");
  }
  if (projection.source_presentation_sha256 !== expectedSource) {
    throw new Error("ask_presentation_loader_init_failed:source_binding_mismatch");
  }

  const sourceIndex = new Map<string, PresentationSourceRecord>(
    (projection.sources || []).map((s: any) => [
      s.source_id,
      {
        source_id: s.source_id,
        public_label: s.public_label,
        canonical_href: s.canonical_href,
        href_class: s.href_class,
        display_permission: s.display_permission,
        section_display_policy: s.section_display_policy,
      },
    ]),
  );

  const globalRules: GlobalPresentationRules = projection.global_presentation_rules;

  function getPresentationForSource(id: string): PresentationSourceRecord | null {
    if (!id || typeof id !== "string") return null;
    return sourceIndex.get(id) ?? null;
  }

  function getGlobalPresentationRules(): GlobalPresentationRules {
    return globalRules;
  }

  function getPresentationProjectionIdentity(): PresentationProjectionIdentity {
    return {
      projectionId: projection.projection_id,
      projectionVersion: projection.projection_version,
      coreProjectionSha256: projection.core_projection_sha256,
      sourcePresentationSha256: projection.source_presentation_sha256,
    };
  }

  return {
    getPresentationForSource,
    getGlobalPresentationRules,
    getPresentationProjectionIdentity,
  };
}

const loader = buildPresentationLoader(presentationProjection);

export const getPresentationForSource = loader.getPresentationForSource;
export const getGlobalPresentationRules = loader.getGlobalPresentationRules;
export const getPresentationProjectionIdentity = loader.getPresentationProjectionIdentity;
