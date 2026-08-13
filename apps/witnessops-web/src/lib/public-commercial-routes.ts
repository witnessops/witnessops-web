export const CURRENT_PUBLIC_CATALOG_SKU_IDS = [
  "OFFSEC-LOCAL-AUDIT",
  "OFFSEC-EXTERNAL-EXPOSURE",
  "OFFSEC-LAUNCH-READY",
  "OFFSEC-CUSTODY-OPS",
  "OFFSEC-INCIDENT-READY",
] as const;

export const PRIVATE_PREVIEW_CATALOG_SKU_IDS = [
  "WORKFLOW-FIT",
  "SAAS-DEMO",
  "SAAS-OPERATOR",
  "SAAS-TEAM",
  "SAAS-FLEET",
  "ADDON-SEATS-10",
  "ADDON-GOAL0-READER",
] as const;

export const REPLACED_CATALOG_SKU_IDS = [
  "WORKFLOW-S",
  "WORKFLOW-M",
  "WORKFLOW-L",
  "WORKFLOW-RERUN",
] as const;

export const UNRESOLVED_CATALOG_SKU_IDS = [
  "OFFSEC-PILOT",
  "OFFSEC-RETAINER",
  "OFFSEC-PROOF-INFRA",
  "OFFSEC-TRAINING-VM-LAB",
  "OFFSEC-TRAINING-COURSE-FULL",
  "OFFSEC-TRAINING-MODULE-POSTURE",
  "OFFSEC-TRAINING-MODULE-RECEIPT",
  "OFFSEC-TRAINING-MODULE-DRIFT",
  "OFFSEC-TRAINING-MODULE-PROOF-PACK",
  "OFFSEC-TRAINING-MODULE-PILOT",
  "SBOM-MIN-ELEMENTS",
] as const;

type CatalogSkuDisposition =
  | "current"
  | "private_preview"
  | "replacement_available"
  | "unresolved";

export function catalogSkuDisposition(id: string): CatalogSkuDisposition {
  if ((CURRENT_PUBLIC_CATALOG_SKU_IDS as readonly string[]).includes(id)) {
    return "current";
  }
  if ((PRIVATE_PREVIEW_CATALOG_SKU_IDS as readonly string[]).includes(id)) {
    return "private_preview";
  }
  if ((REPLACED_CATALOG_SKU_IDS as readonly string[]).includes(id)) {
    return "replacement_available";
  }
  if ((UNRESOLVED_CATALOG_SKU_IDS as readonly string[]).includes(id)) {
    return "unresolved";
  }
  return "unresolved";
}

export function isCurrentPublicCatalogSku(id: string): boolean {
  return catalogSkuDisposition(id) === "current";
}
