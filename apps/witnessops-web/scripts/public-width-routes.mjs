import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

export function sampleCaseRoutes(appDir) {
  const root = resolve(appDir, "src/app/review/sample-cases");
  const slugs = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(resolve(root, entry.name, "page.tsx")))
    .map((entry) => entry.name)
    .sort();
  const routes = [];
  for (const slug of slugs) {
    routes.push(`/review/sample-cases/${slug}`);
    const polish = resolve(appDir, "src/app/pl/review/sample-cases", slug, "page.tsx");
    if (existsSync(polish)) routes.push(`/pl/review/sample-cases/${slug}`);
  }
  return routes;
}

export function mergeWidthRoutes(sitemapPaths, samplePaths) {
  return [...new Set([...sitemapPaths, ...samplePaths])].filter((path) => path !== "/pl/check").sort();
}
