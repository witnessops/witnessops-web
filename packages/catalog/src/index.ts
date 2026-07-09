import catalogJson from "../catalog.json";
import { CatalogSchema, type Catalog, type CatalogSku } from "./schema";

let cached: Catalog | null = null;

export function loadCatalog(): Catalog {
  if (!cached) {
    cached = CatalogSchema.parse(catalogJson);
  }
  return cached;
}

export function skuSlug(id: string): string {
  return id.toLowerCase();
}

export function resolveSkuId(param: string): string | null {
  const catalog = loadCatalog();
  const upper = param.toUpperCase();
  const hit = catalog.skus.find(
    (s) => s.id === upper || s.id === param || skuSlug(s.id) === param.toLowerCase(),
  );
  return hit?.id ?? null;
}

export function getSku(id: string): CatalogSku | undefined {
  return loadCatalog().skus.find((s) => s.id === id);
}

export function getSkusByTrack(track: CatalogSku["track"]): CatalogSku[] {
  return loadCatalog().skus.filter((s) => s.track === track);
}

export function getWorkflowSkus(): CatalogSku[] {
  return getSkusByTrack("witnessops_workflow");
}

export { CatalogSchema, type Catalog, type CatalogSku };