import "server-only";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const presentationProjection: unknown = require(
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

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`ask_presentation_loader_init_failed:invalid_${label}`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`ask_presentation_loader_init_failed:invalid_${label}`);
  }
  return value;
}

function buildPresentationLoader(projection: unknown) {
  const projectionRecord = asRecord(projection, "projection");
  if (projectionRecord.projection_id !== "ASK_SOURCE_PRESENTATION_PROJECTION_V1") {
    throw new Error("ask_presentation_loader_init_failed:invalid_projection_id");
  }

  const expectedCore = "8c64e10fbb7e738dc314dfad5fb0df4f74e838600492f8e2c8be7af70a6bfb34";
  const expectedSource = "a886b2183f925275ce42cfebbbf739dad98540919eb5f2ae300a5fc785399a8e";

  if (projectionRecord.core_projection_sha256 !== expectedCore) {
    throw new Error("ask_presentation_loader_init_failed:core_binding_mismatch");
  }
  if (projectionRecord.source_presentation_sha256 !== expectedSource) {
    throw new Error("ask_presentation_loader_init_failed:source_binding_mismatch");
  }

  const sourceIndex = new Map<string, PresentationSourceRecord>(
    (Array.isArray(projectionRecord.sources) ? projectionRecord.sources : []).map((rawSource) => {
      const source = asRecord(rawSource, "source");
      return [
      asString(source.source_id, "source_id"),
      {
        source_id: asString(source.source_id, "source_id"),
        public_label: asString(source.public_label, "public_label"),
        canonical_href: asString(source.canonical_href, "canonical_href"),
        href_class: asString(source.href_class, "href_class"),
        display_permission: asString(source.display_permission, "display_permission"),
        section_display_policy: asString(source.section_display_policy, "section_display_policy"),
      },
      ] as [string, PresentationSourceRecord];
    }),
  );

  const globalRules = projectionRecord.global_presentation_rules as GlobalPresentationRules;

  function getPresentationForSource(id: string): PresentationSourceRecord | null {
    if (!id || typeof id !== "string") return null;
    return sourceIndex.get(id) ?? null;
  }

  function getGlobalPresentationRules(): GlobalPresentationRules {
    return globalRules;
  }

  function getPresentationProjectionIdentity(): PresentationProjectionIdentity {
    return {
      projectionId: asString(projectionRecord.projection_id, "projection_id"),
      projectionVersion: projectionRecord.projection_version as number,
      coreProjectionSha256: asString(projectionRecord.core_projection_sha256, "core_projection_sha256"),
      sourcePresentationSha256: asString(projectionRecord.source_presentation_sha256, "source_presentation_sha256"),
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
