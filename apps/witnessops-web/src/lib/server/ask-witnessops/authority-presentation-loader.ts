import "server-only";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

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

interface PresentationProjection {
  readonly projection_id: string;
  readonly projection_version: number;
  readonly core_projection_sha256: string;
  readonly source_presentation_sha256: string;
  readonly sources: readonly PresentationSourceRecord[];
  readonly global_presentation_rules: GlobalPresentationRules;
}

function asRecord(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`ask_presentation_loader_init_failed:${code}`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, code: string): string {
  if (typeof value !== "string") {
    throw new Error(`ask_presentation_loader_init_failed:${code}`);
  }
  return value;
}

function parseProjection(value: unknown): PresentationProjection {
  const projection = asRecord(value, "invalid_projection");
  const sources = projection.sources;
  const rules = asRecord(
    projection.global_presentation_rules,
    "invalid_global_presentation_rules",
  );
  if (!Array.isArray(sources) || !Array.isArray(rules.citation_order)) {
    throw new Error("ask_presentation_loader_init_failed:invalid_projection_shape");
  }

  const citationOrder = rules.citation_order.map((entry) =>
    asString(entry, "invalid_citation_order"),
  );
  if (
    typeof rules.max_displayed_sources_per_response !== "number" ||
    typeof rules.duplicate_source_suppression !== "boolean"
  ) {
    throw new Error("ask_presentation_loader_init_failed:invalid_global_presentation_rules");
  }

  return {
    projection_id: asString(projection.projection_id, "invalid_projection_id"),
    projection_version:
      typeof projection.projection_version === "number"
        ? projection.projection_version
        : 0,
    core_projection_sha256: asString(
      projection.core_projection_sha256,
      "invalid_core_projection_sha256",
    ),
    source_presentation_sha256: asString(
      projection.source_presentation_sha256,
      "invalid_source_presentation_sha256",
    ),
    sources: sources.map((entry) => {
      const source = asRecord(entry, "invalid_source");
      return {
        source_id: asString(source.source_id, "invalid_source_id"),
        public_label: asString(source.public_label, "invalid_public_label"),
        canonical_href: asString(source.canonical_href, "invalid_canonical_href"),
        href_class: asString(source.href_class, "invalid_href_class"),
        display_permission: asString(
          source.display_permission,
          "invalid_display_permission",
        ),
        section_display_policy: asString(
          source.section_display_policy,
          "invalid_section_display_policy",
        ),
      };
    }),
    global_presentation_rules: {
      citation_order: citationOrder,
      max_displayed_sources_per_response:
        rules.max_displayed_sources_per_response,
      duplicate_source_suppression: rules.duplicate_source_suppression,
      refusal_and_decline_presentation: asString(
        rules.refusal_and_decline_presentation,
        "invalid_refusal_presentation",
      ),
      route_only_answers: asString(
        rules.route_only_answers,
        "invalid_route_only_answers",
      ),
    },
  };
}

const presentationProjection = parseProjection(
  require("@witnessops/ask-authority/v1/source-presentation-projection.json") as unknown,
);

function buildPresentationLoader(projection: PresentationProjection) {
  if (projection.projection_id !== "ASK_SOURCE_PRESENTATION_PROJECTION_V1") {
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
    projection.sources.map((source) => [
      source.source_id,
      {
        ...source,
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
