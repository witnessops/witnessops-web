import { z } from "zod";

/**
 * Shared enums
 */
export const SiteNameSchema = z.enum(["vaultmesh", "witnessops"]);
export const CtaVariantSchema = z.enum(["primary", "secondary", "ghost"]);
export const HomeVersionSchema = z.literal("1");
export const HomeKindSchema = z.literal("marketing.home");
export const HomeSlugSchema = z.literal("/");

export const VaultMeshSectionTypeSchema = z.enum([
  "proof_strip",
  "problem",
  "category_comparison",
  "why_now",
  "pipeline",
  "artifact_anatomy",
  "proof_object",
  "platform_surfaces",
  "audiences",
  "positioning",
  "offer",
  "expansion_path",
  "io_map",
]);

export const WitnessOpsSectionTypeSchema = z.enum([
  "proof_strip",
  "problem",
  "category_comparison",
  "why_now",
  "pipeline",
  "artifact_anatomy",
  "proof_object",
  "platform_surfaces",
  "audiences",
  "positioning",
  "offer",
  "expansion_path",
  "contract",
  "verifiable_items",
  "boundary",
  "workflows",
]);

export const SharedSectionTypeSchema = WitnessOpsSectionTypeSchema;

export const ReducedVaultMeshSectionTypeSchema = z.enum([
  "problem",
  "category_comparison",
  "pipeline",
  "offer",
  "proof_strip",
  "io_map",
]);

/**
 * Small primitives
 */
const NonEmptyString = z.string().trim().min(1);
const DateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD date string");

const UrlPathOrAbsolute = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) =>
      value.startsWith("/") ||
      value.startsWith("http://") ||
      value.startsWith("https://"),
    {
      message: "Expected a root-relative path or absolute URL",
    },
  );

/**
 * Common shapes
 */
export const CtaSchema = z.object({
  label: NonEmptyString,
  href: UrlPathOrAbsolute,
  variant: CtaVariantSchema,
});

export const LinkSchema = z.object({
  label: NonEmptyString,
  href: UrlPathOrAbsolute,
});

export const TerminalBlockSchema = z.object({
  language: NonEmptyString,
  lines: z.array(z.string()),
});

export const CodeBlockSchema = z.object({
  language: NonEmptyString,
  lines: z.array(z.string()),
});

export const HeroAiNoteSchema = z.object({
  title: NonEmptyString,
  body: z.array(NonEmptyString).min(1),
  microcopy: NonEmptyString.optional(),
});

export const SeoSchema = z.object({
  title: NonEmptyString,
  description: NonEmptyString,
  canonical_url: UrlPathOrAbsolute,
  robots: NonEmptyString,
  og_image: UrlPathOrAbsolute,
  og_title: NonEmptyString,
  og_description: NonEmptyString,
  twitter_card: NonEmptyString,
});

export const StatusSchema = z.object({
  draft: z.boolean(),
  canonical: z.boolean(),
  last_reviewed: DateString,
});

export const ThemeSchema = z.object({
  brand: SiteNameSchema,
  tone: NonEmptyString,
  proof_mark: NonEmptyString,
});

export const NavbarSchema = z.object({
  announcement: z.object({
    enabled: z.boolean(),
    text: z.string(),
    href: z.string(),
  }),
  links: z.array(LinkSchema).min(1),
  cta: CtaSchema,
});

export const HeroSchema = z.object({
  eyebrow: NonEmptyString,
  title: NonEmptyString,
  body: NonEmptyString,
  supporting_points: z.array(NonEmptyString),
  ai_note: HeroAiNoteSchema.optional(),
  primary_cta: CtaSchema,
  secondary_cta: CtaSchema,
  microcopy: z.string().optional(),
  proof_badges: z.array(NonEmptyString),
  media: z.discriminatedUnion("type", [
    z.object({ type: z.literal("terminal"), terminal: TerminalBlockSchema }),
    z.object({ type: z.literal("code_excerpt"), code: CodeBlockSchema }),
  ]),
});

export const VaultMeshHeroSchema = z.object({
  eyebrow: NonEmptyString,
  title: NonEmptyString,
  body: NonEmptyString,
  primary_cta: CtaSchema,
  secondary_cta: CtaSchema,
  supporting_points: z.array(NonEmptyString).optional(),
  proof_badges: z.array(NonEmptyString).optional(),
  media: z
    .object({
      type: z.literal("terminal"),
      terminal: TerminalBlockSchema,
    })
    .optional(),
});

export const TrustBarSchema = z.object({
  enabled: z.boolean(),
  label: NonEmptyString,
  items: z.array(NonEmptyString).min(1),
});

export const FinalCtaSchema = z.object({
  enabled: z.boolean(),
  title: NonEmptyString,
  body: NonEmptyString,
  primary_cta: CtaSchema.optional(),
  secondary_cta: CtaSchema.optional(),
  ctas: z.array(CtaSchema).min(1).optional(),
}).superRefine((data, ctx) => {
  if (data.ctas?.length) {
    return;
  }

  if (!data.primary_cta || !data.secondary_cta) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ctas"],
      message: "Provide ctas or both primary_cta and secondary_cta",
    });
  }
});

export const FooterSchema = z.object({
  brand_line: NonEmptyString,
  subline: NonEmptyString,
  links: z.array(LinkSchema).min(1),
  legal_links: z.array(LinkSchema).min(1),
  protocol_version: NonEmptyString.optional(),
  build_label: NonEmptyString,
  copyright: NonEmptyString,
});

/**
 * Section schemas
 */
const BaseSectionSchema = z.object({
  id: NonEmptyString,
  enabled: z.boolean(),
});

export const ProofStripSectionSchema = BaseSectionSchema.extend({
  type: z.literal("proof_strip"),
  title: NonEmptyString,
  body: NonEmptyString,
  terminal: TerminalBlockSchema,
  cta: CtaSchema.optional(),
});

export const ProblemSectionSchema = BaseSectionSchema.extend({
  type: z.literal("problem"),
  title: NonEmptyString,
  body: NonEmptyString,
  bullets: z.array(NonEmptyString).min(1),
  closing: NonEmptyString,
});

export const CategoryComparisonSectionSchema = BaseSectionSchema.extend({
  type: z.literal("category_comparison"),
  title: NonEmptyString,
  rows: z
    .array(
      z.object({
        left: NonEmptyString,
        right: NonEmptyString,
      }),
    )
    .min(1),
  closing: NonEmptyString,
});

export const WhyNowSectionSchema = BaseSectionSchema.extend({
  type: z.literal("why_now"),
  title: NonEmptyString,
  items: z
    .array(
      z.object({
        title: NonEmptyString,
        body: NonEmptyString,
      }),
    )
    .min(1),
  closing: NonEmptyString,
});

export const PipelineSectionSchema = BaseSectionSchema.extend({
  type: z.literal("pipeline"),
  title: NonEmptyString,
  steps: z
    .array(
      z.object({
        label: NonEmptyString,
        value: NonEmptyString,
      }),
    )
    .min(1),
});

export const ArtifactAnatomySectionSchema = BaseSectionSchema.extend({
  type: z.literal("artifact_anatomy"),
  title: NonEmptyString,
  body: NonEmptyString,
  tree: z.object({
    root: NonEmptyString,
    entries: z.array(NonEmptyString).min(1),
  }),
  bullets: z.array(NonEmptyString).min(1),
  closing: NonEmptyString,
});

export const ProofObjectSectionSchema = BaseSectionSchema.extend({
  type: z.literal("proof_object"),
  title: NonEmptyString,
  body: NonEmptyString,
  code: CodeBlockSchema,
});

export const PlatformSurfacesSectionSchema = BaseSectionSchema.extend({
  type: z.literal("platform_surfaces"),
  title: NonEmptyString,
  cards: z
    .array(
      z.object({
        title: NonEmptyString,
        body: NonEmptyString,
      }),
    )
    .min(1),
});

export const AudiencesSectionSchema = BaseSectionSchema.extend({
  type: z.literal("audiences"),
  title: NonEmptyString,
  cards: z
    .array(
      z.object({
        title: NonEmptyString,
        body: NonEmptyString,
      }),
    )
    .min(1),
});

export const PositioningSectionSchema = BaseSectionSchema.extend({
  type: z.literal("positioning"),
  title: NonEmptyString,
  body: NonEmptyString,
  points: z.array(NonEmptyString).min(1),
});

export const OfferSectionSchema = BaseSectionSchema.extend({
  type: z.literal("offer"),
  title: NonEmptyString,
  price_label: z.string(),
  delivery_label: z.string(),
  includes: z.array(NonEmptyString).min(1),
  body: NonEmptyString,
  cta: CtaSchema.optional(),
  ctas: z.array(CtaSchema).min(1).optional(),
});

const IoMapProofStructureSchema = z.object({
  title: NonEmptyString,
  lines: z.array(z.string()).min(1),
});

const IoMapPresetSchema = z.object({
  id: NonEmptyString,
  label: NonEmptyString,
  inputs: z.array(NonEmptyString).min(1),
  outputs: z.array(NonEmptyString).min(1),
  examples: z.array(NonEmptyString).optional(),
  proof_structure: IoMapProofStructureSchema.optional(),
});

export const IoMapSectionSchema = BaseSectionSchema.extend({
  type: z.literal("io_map"),
  title: NonEmptyString,
  body: NonEmptyString,
  presets: z.array(IoMapPresetSchema).min(1),
  default_preset: NonEmptyString.optional(),
});

export const ExpansionPathSectionSchema = BaseSectionSchema.extend({
  type: z.literal("expansion_path"),
  title: NonEmptyString,
  body: NonEmptyString,
  ctas: z.array(CtaSchema).min(1),
});

// ── Phase 4 new section schemas ──────────────────────────────────────────────

export const ContractStepSchema = z.object({
  label: NonEmptyString,
  body: NonEmptyString,
});

export const ContractSectionSchema = BaseSectionSchema.extend({
  type: z.literal("contract"),
  title: NonEmptyString,
  lede: NonEmptyString,
  steps: z.array(ContractStepSchema).min(1),
  closing: NonEmptyString,
  cta: CtaSchema.optional(),
});

export const VerifiableItemSchema = z.object({
  title: NonEmptyString,
  body: NonEmptyString,
  proof_link: NonEmptyString,
  proof_link_label: NonEmptyString,
});

export const VerifiableItemsSectionSchema = BaseSectionSchema.extend({
  type: z.literal("verifiable_items"),
  title: NonEmptyString,
  lede: NonEmptyString,
  items: z.array(VerifiableItemSchema).min(1),
  closing: NonEmptyString,
  cta: CtaSchema.optional(),
  ctas: z.array(CtaSchema).min(1).optional(),
});

export const BoundaryItemSchema = z.object({
  title: NonEmptyString,
  body: NonEmptyString,
});

export const BoundarySectionSchema = BaseSectionSchema.extend({
  type: z.literal("boundary"),
  title: NonEmptyString,
  lede: NonEmptyString,
  items: z.array(BoundaryItemSchema).min(1),
  closing: NonEmptyString,
});

export const WorkflowCardSchema = z.object({
  title: NonEmptyString,
  body: NonEmptyString,
  proof_link: NonEmptyString,
  proof_link_label: NonEmptyString,
});

export const WorkflowSurfaceSchema = z.object({
  title: NonEmptyString,
  body: NonEmptyString,
});

export const WorkflowsSectionSchema = BaseSectionSchema.extend({
  type: z.literal("workflows"),
  title: NonEmptyString,
  lede: NonEmptyString,
  cards: z.array(WorkflowCardSchema).min(1),
  surfaces: z.array(WorkflowSurfaceSchema).min(1),
  internal_surfaces_disclosure: NonEmptyString,
  cta: CtaSchema.optional(),
  ctas: z.array(CtaSchema).min(1).optional(),
});

export const HomeSectionSchema = z.discriminatedUnion("type", [
  ProofStripSectionSchema,
  ProblemSectionSchema,
  CategoryComparisonSectionSchema,
  WhyNowSectionSchema,
  PipelineSectionSchema,
  ArtifactAnatomySectionSchema,
  ProofObjectSectionSchema,
  PlatformSurfacesSectionSchema,
  AudiencesSectionSchema,
  PositioningSectionSchema,
  OfferSectionSchema,
  ExpansionPathSectionSchema,
  IoMapSectionSchema,
  ContractSectionSchema,
  VerifiableItemsSectionSchema,
  BoundarySectionSchema,
  WorkflowsSectionSchema,
]);

export const WitnessOpsHomeSectionSchema = z.discriminatedUnion("type", [
  ProofStripSectionSchema,
  ProblemSectionSchema,
  CategoryComparisonSectionSchema,
  WhyNowSectionSchema,
  PipelineSectionSchema,
  ArtifactAnatomySectionSchema,
  ProofObjectSectionSchema,
  PlatformSurfacesSectionSchema,
  AudiencesSectionSchema,
  PositioningSectionSchema,
  OfferSectionSchema,
  ExpansionPathSectionSchema,
  ContractSectionSchema,
  VerifiableItemsSectionSchema,
  BoundarySectionSchema,
  WorkflowsSectionSchema,
]);

/**
 * Order rules
 */
const REQUIRED_SECTION_ORDER = [
  "proof_strip",
  "problem",
  "category_comparison",
  "why_now",
  "pipeline",
  "artifact_anatomy",
  "proof_object",
  "platform_surfaces",
  "audiences",
  "positioning",
  "offer",
  "expansion_path",
  "io_map",
] as const;

const REQUIRED_WITNESSOPS_SECTION_ORDER = [
  "proof_strip",
  "problem",
  "category_comparison",
  "why_now",
  "pipeline",
  "artifact_anatomy",
  "proof_object",
  "platform_surfaces",
  "audiences",
  "positioning",
  "offer",
  "expansion_path",
] as const;

const REQUIRED_VAULTMESH_SECTION_ORDER = [
  "offer",
  "io_map",
  "proof_strip",
  "category_comparison",
  "pipeline",
  "problem",
] as const;

type RequiredSectionType = (typeof REQUIRED_SECTION_ORDER)[number];

function validateUniqueSectionIds(
  sections: z.infer<typeof HomeSectionSchema>[],
  ctx: z.RefinementCtx,
) {
  const seen = new Map<string, number>();

  sections.forEach((section, index) => {
    const existingIndex = seen.get(section.id);
    if (existingIndex !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sections", index, "id"],
        message: `Duplicate section id "${section.id}" also used at index ${existingIndex}`,
      });
      return;
    }
    seen.set(section.id, index);
  });
}

function validateAllowedSectionTypes(
  sections: z.infer<typeof HomeSectionSchema>[],
  allowed: readonly string[],
  ctx: z.RefinementCtx,
) {
  sections.forEach((section, index) => {
    if (!allowed.includes(section.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sections", index, "type"],
        message: `Section type "${section.type}" is not allowed for this site`,
      });
    }
  });
}

function validateRequiredSectionPresence(
  sections: z.infer<typeof HomeSectionSchema>[],
  required: readonly RequiredSectionType[],
  ctx: z.RefinementCtx,
) {
  const present = new Set(sections.map((s) => s.type));
  required.forEach((type) => {
    if (!present.has(type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sections"],
        message: `Missing required section type "${type}"`,
      });
    }
  });
}

function validateSectionOrder(
  sections: z.infer<typeof HomeSectionSchema>[],
  requiredOrder: readonly RequiredSectionType[],
  ctx: z.RefinementCtx,
) {
  const typeToIndex = new Map<string, number>();
  sections.forEach((section, index) => {
    if (!typeToIndex.has(section.type)) {
      typeToIndex.set(section.type, index);
    }
  });

  for (let i = 0; i < requiredOrder.length - 1; i += 1) {
    const current = requiredOrder[i];
    const next = requiredOrder[i + 1];
    const currentIndex = typeToIndex.get(current);
    const nextIndex = typeToIndex.get(next);

    if (currentIndex === undefined || nextIndex === undefined) {
      continue;
    }

    if (currentIndex > nextIndex) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sections"],
        message: `Section "${current}" must appear before "${next}"`,
      });
    }
  }
}

function validateNoDuplicateSectionTypes(
  sections: z.infer<typeof HomeSectionSchema>[],
  ctx: z.RefinementCtx,
) {
  const seen = new Map<string, number>();
  sections.forEach((section, index) => {
    const existingIndex = seen.get(section.type);
    if (existingIndex !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sections", index, "type"],
        message: `Duplicate section type "${section.type}" is not allowed`,
      });
      return;
    }
    seen.set(section.type, index);
  });
}

function validateOfferActions(
  sections: z.infer<typeof HomeSectionSchema>[],
  ctx: z.RefinementCtx,
) {
  sections.forEach((section, index) => {
    if (section.type !== "offer") {
      return;
    }

    if (section.cta || section.ctas?.length) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sections", index, "ctas"],
      message: 'Offer section requires "cta" or "ctas"',
    });
  });
}

/**
 * Shared home base schema
 */
export const BaseHomeSchema = z.object({
  version: HomeVersionSchema,
  kind: HomeKindSchema,
  site: SiteNameSchema,
  slug: HomeSlugSchema,
  status: StatusSchema,
  seo: SeoSchema,
  theme: ThemeSchema,
  navbar: NavbarSchema,
  hero: HeroSchema,
  trust_bar: TrustBarSchema,
  sections: z.array(HomeSectionSchema),
  final_cta: FinalCtaSchema,
  footer: FooterSchema,
});

const VaultMeshHomeSectionSchema = z.discriminatedUnion("type", [
  ProblemSectionSchema,
  CategoryComparisonSectionSchema,
  PipelineSectionSchema,
  OfferSectionSchema,
  ProofStripSectionSchema,
  IoMapSectionSchema,
]);

/**
 * VaultMesh schema
 */
export const VaultMeshHomeSchema = z.object({
  version: HomeVersionSchema,
  kind: HomeKindSchema,
  site: z.literal("vaultmesh"),
  slug: HomeSlugSchema,
  status: StatusSchema,
  seo: SeoSchema,
  theme: ThemeSchema.extend({
    brand: z.literal("vaultmesh"),
  }),
  navbar: NavbarSchema,
  hero: VaultMeshHeroSchema,
  sections: z.array(VaultMeshHomeSectionSchema),
  footer: FooterSchema,
}).superRefine((data, ctx) => {
  validateUniqueSectionIds(data.sections, ctx);
  validateNoDuplicateSectionTypes(data.sections, ctx);
  validateOfferActions(data.sections, ctx);
  validateAllowedSectionTypes(
    data.sections,
    ReducedVaultMeshSectionTypeSchema.options,
    ctx,
  );
  validateRequiredSectionPresence(
    data.sections,
    REQUIRED_VAULTMESH_SECTION_ORDER,
    ctx,
  );
  validateSectionOrder(data.sections, REQUIRED_VAULTMESH_SECTION_ORDER, ctx);

  if (data.hero.primary_cta.href === data.hero.secondary_cta.href) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["hero", "secondary_cta", "href"],
      message:
        "Hero primary_cta and secondary_cta must not target the same href",
    });
  }

  if (
    data.hero.media &&
    !data.hero.media.terminal.lines.some((line) => line.includes("verified"))
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["hero", "media", "terminal", "lines"],
      message: 'VaultMesh hero terminal should include a "verified" line',
    });
  }
});

/**
 * WitnessOps schema
 */
export const WitnessOpsHomeSchema = BaseHomeSchema.extend({
  site: z.literal("witnessops"),
  theme: ThemeSchema.extend({
    brand: z.literal("witnessops"),
  }),
  sections: z.array(WitnessOpsHomeSectionSchema),
}).superRefine((data, ctx) => {
  validateUniqueSectionIds(data.sections, ctx);
  validateNoDuplicateSectionTypes(data.sections, ctx);
  validateOfferActions(data.sections, ctx);
  validateAllowedSectionTypes(
    data.sections,
    WitnessOpsSectionTypeSchema.options,
    ctx,
  );
  validateRequiredSectionPresence(
    data.sections,
    REQUIRED_WITNESSOPS_SECTION_ORDER,
    ctx,
  );
  validateSectionOrder(data.sections, REQUIRED_WITNESSOPS_SECTION_ORDER, ctx);

  if (data.hero.primary_cta.href === data.hero.secondary_cta.href) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["hero", "secondary_cta", "href"],
      message:
        "Hero primary_cta and secondary_cta must not target the same href",
    });
  }

  // "verified" line check only applies to terminal media
  if (
    data.hero.media.type === "terminal" &&
    !data.hero.media.terminal.lines.some((line) => line.includes("verified"))
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["hero", "media", "terminal", "lines"],
      message: 'WitnessOps hero terminal should include a "verified" line',
    });
  }
});

/**
 * Union schema for loader entrypoints
 * Note: Using z.union instead of z.discriminatedUnion because superRefine
 * wraps schemas in ZodEffects, which is incompatible with discriminatedUnion.
 */
export const MarketingHomeSchema = z.union([
  VaultMeshHomeSchema,
  WitnessOpsHomeSchema,
]);

/**
 * Types
 */
export type Cta = z.infer<typeof CtaSchema>;
export type HomeSection = z.infer<typeof HomeSectionSchema>;
export type WitnessOpsHomeSection = z.infer<typeof WitnessOpsHomeSectionSchema>;
export type VaultMeshHome = z.infer<typeof VaultMeshHomeSchema>;
export type WitnessOpsHome = z.infer<typeof WitnessOpsHomeSchema>;
export type MarketingHome = z.infer<typeof MarketingHomeSchema>;
export type ContractSection = z.infer<typeof ContractSectionSchema>;
export type VerifiableItemsSection = z.infer<typeof VerifiableItemsSectionSchema>;
export type BoundarySection = z.infer<typeof BoundarySectionSchema>;
export type WorkflowsSection = z.infer<typeof WorkflowsSectionSchema>;

/**
 * Parse helpers
 */
export function parseVaultMeshHome(input: unknown): VaultMeshHome {
  return VaultMeshHomeSchema.parse(input);
}

export function parseWitnessOpsHome(input: unknown): WitnessOpsHome {
  return WitnessOpsHomeSchema.parse(input);
}

export function parseMarketingHome(input: unknown): MarketingHome {
  return MarketingHomeSchema.parse(input);
}

/**
 * Safe parse helpers
 */
export function safeParseVaultMeshHome(input: unknown) {
  return VaultMeshHomeSchema.safeParse(input);
}

export function safeParseWitnessOpsHome(input: unknown) {
  return WitnessOpsHomeSchema.safeParse(input);
}

export function safeParseMarketingHome(input: unknown) {
  return MarketingHomeSchema.safeParse(input);
}
