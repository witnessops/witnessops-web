import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { loadCatalog, skuSlug } from "@witnessops/catalog";
import { getDocHref, getLegacyDocRedirectSlug, listDocPages } from "@witnessops/content/docs";
import { getSurfaceUrl } from "@witnessops/config";

import { POLISH_DOCS_SECTIONS } from "@/app/pl/docs/docs-navigation";
import { loadSupportIndex } from "@/lib/content";
import { catalogSkuDisposition } from "@/lib/public-commercial-routes";
import { getPolishSkus } from "@/lib/public-i18n";
import { listSkills } from "@/lib/skills/catalog";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const appDir = join(webRoot, "src/app");
const require = createRequire(import.meta.url);

export type PublicRouteStatus = 200 | 308 | 404 | 410;

export type PublicRouteExpectation = {
  path: string;
  status: PublicRouteStatus;
  /** Same-origin path, or an absolute URL when the redirect leaves this app. */
  location?: string;
  /** Pathname that an absolute Location must use when the host is environment-specific. */
  locationPathname?: string;
};

export type PublicRouteOverride = Pick<
  PublicRouteExpectation,
  "status" | "location" | "locationPathname"
>;

const LEGACY_DOC_ALIASES = [
  ["overview"],
  ["governed-execution"],
  ["policy-gates"],
  ["execution-chains"],
  ["receipt-spec"],
  ["security-systems", "mesh-federation-and-vmesh"],
  ["intro"],
  ["verify"],
] as const;

const MISSING_PUBLIC_PATHS = [
  "/this-page-does-not-exist",
  "/pl/this-page-does-not-exist",
  "/reviews",
  "/pl/reviews",
  "/about",
  "/how-it-works",
  "/chronicles",
  "/chronicles/002-reserved",
  "/catalog/not-a-real-offer",
  "/pl/catalog/not-a-real-offer",
  "/docs/not-a-real-document",
  "/support/not-a-real-article",
  "/library/not-a-real-skill",
  "/assessment/not-a-real-issuance",
  "/package/not-a-real-issuance",
] as const;

type NextRedirect = {
  source: string;
  destination: string;
  permanent?: boolean;
};

function collectPageFiles(dir: string, out: string[]) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "admin" || entry.name === "api" || entry.name === "node_modules") {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectPageFiles(full, out);
    else if (entry.name === "page.tsx") out.push(full);
  }
}

export function appPathFromPageFile(file: string): string | null {
  const rel = relative(appDir, file).replaceAll("\\", "/");
  if (rel !== "page.tsx" && !rel.endsWith("/page.tsx")) return null;
  const withoutPage = rel === "page.tsx" ? "" : rel.slice(0, -"/page.tsx".length);
  const segments = withoutPage.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "admin" || segment === "api")) return null;
  if (segments.some((segment) => segment.includes("[") || segment.includes("]"))) return null;
  const visible = segments.filter(
    (segment) => !(segment.startsWith("(") && segment.endsWith(")")),
  );
  return visible.length === 0 ? "/" : `/${visible.join("/")}`;
}

function staticRedirect(source: string): Pick<
  PublicRouteExpectation,
  "location" | "locationPathname"
> | null {
  const literal = source.match(/permanentRedirect\(\s*"([^"]+)"\s*\)/);
  if (literal?.[1]) return { location: literal[1] };

  if (/getSurfaceUrl\(\s*"status"\s*\)/.test(source)) {
    const location = getSurfaceUrl("status");
    return { location, locationPathname: new URL(location).pathname };
  }
  if (/getSurfaceUrl\(\s*"hub"\s*,\s*"\/runbooks"\s*\)/.test(source)) {
    const location = getSurfaceUrl("hub", "/runbooks");
    return { location, locationPathname: new URL(location).pathname };
  }
  if (/getSurfaceUrl\(\s*"hub"\s*\)/.test(source)) {
    const location = getSurfaceUrl("hub");
    return { location, locationPathname: new URL(location).pathname };
  }
  return null;
}

async function configuredRedirects(): Promise<NextRedirect[]> {
  const nextConfig = require(join(webRoot, "next.config.js")) as {
    redirects?: () => Promise<NextRedirect[]>;
  };
  return (await nextConfig.redirects?.()) ?? [];
}

/**
 * Expected HTTP status for every finite public URL: pages, configured redirects,
 * content-backed dynamic routes, and representative missing paths.
 * Caller overrides replace the derived status. They are how a later change can
 * expect 410 without rewriting the page inventory.
 */
export async function publicRouteExpectations(
  overrides: ReadonlyMap<string, PublicRouteOverride> = new Map(),
): Promise<PublicRouteExpectation[]> {
  const map = new Map<string, PublicRouteExpectation>();
  const fill = (entry: PublicRouteExpectation) => {
    if (!map.has(entry.path)) map.set(entry.path, entry);
  };
  const force = (entry: PublicRouteExpectation) => {
    map.set(entry.path, entry);
  };

  const pageFiles: string[] = [];
  collectPageFiles(appDir, pageFiles);
  for (const file of pageFiles) {
    const path = appPathFromPageFile(file);
    if (!path) continue;
    const source = readFileSync(file, "utf8");
    if (source.includes("permanentRedirect(")) {
      const parsed = staticRedirect(source);
      if (!parsed) {
        throw new Error(`Unparsed public redirect in ${relative(webRoot, file)}`);
      }
      force({ path, status: 308, ...parsed });
    } else if (source.includes("MAN_WITNESSOPS_PAGE.draft")) {
      const manual = readFileSync(
        join(webRoot, "../../content/witnessops/docs/man/witnessops.mdx"),
        "utf8",
      );
      force({ path, status: /^draft:\s*true\b/m.test(manual) ? 404 : 200 });
    } else {
      force({ path, status: 200 });
    }
  }

  for (const sku of loadCatalog().skus) {
    const slug = skuSlug(sku.id);
    const disposition = catalogSkuDisposition(sku.id);
    const english = `/catalog/${slug}`;
    if (disposition === "current") fill({ path: english, status: 200 });
    else if (disposition === "replacement_available") {
      fill({ path: english, status: 308, location: "/catalog" });
    } else fill({ path: english, status: 404 });
  }

  const polishSlugs = new Set(getPolishSkus().map((sku) => skuSlug(sku.id)));
  for (const sku of loadCatalog().skus) {
    const slug = skuSlug(sku.id);
    const path = `/pl/catalog/${slug}`;
    if (polishSlugs.has(slug)) fill({ path, status: 200 });
    else fill({ path, status: 404 });
  }

  for (const doc of await listDocPages("witnessops")) {
    fill({ path: getDocHref(doc.slug), status: 200 });
  }
  for (const alias of LEGACY_DOC_ALIASES) {
    const target = getLegacyDocRedirectSlug("witnessops", [...alias]);
    if (!target) continue;
    force({
      path: getDocHref([...alias]),
      status: 308,
      location: getDocHref(target),
    });
  }

  for (const doc of loadSupportIndex()) {
    fill({ path: `/support/${doc.slug}`, status: 200 });
  }
  for (const skill of listSkills()) {
    fill({ path: `/library/${skill.slug}`, status: 200 });
  }
  for (const section of POLISH_DOCS_SECTIONS) {
    for (const item of section.items) {
      if (item.href === "/pl/docs" || item.href.startsWith("/pl/docs/")) {
        fill({ path: item.href, status: 200 });
      }
    }
  }

  for (const redirect of await configuredRedirects()) {
    if (redirect.permanent === false) {
      throw new Error(`Public redirect ${redirect.source} is not permanent`);
    }
    if (redirect.source.includes(":path*")) {
      force({
        path: redirect.source.replace(":path*", "child"),
        status: 308,
        location: redirect.destination.replace(":path*", "child"),
      });
      continue;
    }
    force({ path: redirect.source, status: 308, location: redirect.destination });
  }

  force({
    path: "/execution/not-a-real-receipt",
    status: 308,
    location: "/proof-backed-security-systems",
  });

  for (const path of MISSING_PUBLIC_PATHS) {
    fill({ path, status: 404 });
  }
  fill({ path: "/robots.txt", status: 200 });
  fill({ path: "/sitemap.xml", status: 200 });

  for (const [path, override] of overrides) {
    force({ path, ...override });
  }

  return [...map.values()].sort((left, right) => left.path.localeCompare(right.path));
}

export function redirectChain(routes: readonly PublicRouteExpectation[]): string | null {
  const byPath = new Map(routes.map((route) => [route.path, route]));
  for (const route of routes) {
    if (route.status !== 308 || !route.location?.startsWith("/")) continue;
    const target = route.location.split("?")[0] ?? route.location;
    const next = byPath.get(target);
    if (next?.status === 308) {
      return `${route.path} → ${target} → ${next.location ?? next.status}`;
    }
  }
  return null;
}
