import { getCanonicalDocsUrl } from "@witnessops/config";
import type { DocsSurface } from "./docs";

export function getDocCanonicalUrl(surface: DocsSurface, slug: string[]) {
  return getCanonicalDocsUrl(surface, slug.join("/"));
}
