import { z } from "zod";

const NonEmptyString = z.string().trim().min(1);

export const ContentSectionSchema = z.enum(["docs", "support", "legal"]);
export const ContentTrustBoundaryVariantSchema = z.enum([
  "default",
  "legal",
  "security",
  "verification",
]);

const ContentPageAnswerLinkSchema = z.object({
  href: NonEmptyString,
  label: NonEmptyString,
});

const ContentPageAnswerSchema = z.object({
  question: NonEmptyString,
  links: z.array(ContentPageAnswerLinkSchema).min(1),
});

export const ContentFrontmatterSchema = z.object({
  title: NonEmptyString,
  description: NonEmptyString,
  section: ContentSectionSchema,
  order: z.number().int().nonnegative(),
  nav_label: NonEmptyString,
  draft: z.boolean(),
  page_answer: ContentPageAnswerSchema.optional(),
  trust_boundary_variant: ContentTrustBoundaryVariantSchema.optional(),
});

export type ContentSection = z.infer<typeof ContentSectionSchema>;
export type ContentTrustBoundaryVariant = z.infer<
  typeof ContentTrustBoundaryVariantSchema
>;
export type ContentFrontmatter = z.infer<typeof ContentFrontmatterSchema>;

export function parseContentFrontmatter(
  data: unknown,
  expectedSection?: ContentSection,
): ContentFrontmatter {
  const frontmatter = ContentFrontmatterSchema.parse(data);

  if (expectedSection && frontmatter.section !== expectedSection) {
    throw new Error(
      `Content section mismatch: expected "${expectedSection}" but found "${frontmatter.section}"`,
    );
  }

  return frontmatter;
}
