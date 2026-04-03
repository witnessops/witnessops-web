import { getDocCanonicalUrl, listDocPages, type DocsSurface } from "./docs";

export async function getDocsSitemapEntries(surface: DocsSurface) {
  const docs = await listDocPages(surface);

  return docs.map((doc) => ({
    url: getDocCanonicalUrl(surface, doc.slug),
    lastModified: doc.lastModified,
  }));
}