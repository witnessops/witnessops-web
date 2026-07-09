import { z } from "zod";

const PriceSchema = z
  .object({
    anchor_eur: z.number().optional(),
    anchor_eur_min: z.number().optional(),
    anchor_eur_max: z.number().optional(),
    anchor_eur_month: z.number().optional(),
    display: z.string(),
    billing: z.string(),
    settlement: z.array(z.string()).optional(),
    addon: z.boolean().optional(),
  })
  .passthrough();

const SkuSchema = z.object({
  id: z.string(),
  track: z.enum([
    "offsec_proof",
    "offsec_training",
    "witnessops_workflow",
    "operator_saas",
  ]),
  name: z.string(),
  summary: z.string(),
  status: z.string(),
  availability: z.string().optional(),
  buyer_personas: z.array(z.string()).optional(),
  price: PriceSchema,
  deliverables: z.array(z.string()),
  boundaries: z.array(z.string()),
  cta: z.record(z.string().nullable()),
  surfaces: z.array(z.string()),
  stripe_sku_id: z.string().nullable().optional(),
  limits: z.record(z.unknown()).optional(),
});

export const CatalogSchema = z.object({
  schema: z.literal("witnessops.product_catalog.v1"),
  version: z.string(),
  updated_at: z.string(),
  currency: z.string(),
  safe_claim: z.string(),
  tracks: z.record(z.record(z.unknown())),
  skus: z.array(SkuSchema),
  samples: z.array(z.record(z.string())).optional(),
  global_boundaries: z.record(z.array(z.string())).optional(),
  fulfillment_flows: z.record(z.array(z.string())).optional(),
  not_enabled: z.array(z.string()).optional(),
});

export type Catalog = z.infer<typeof CatalogSchema>;
export type CatalogSku = z.infer<typeof SkuSchema>;