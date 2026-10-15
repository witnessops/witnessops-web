import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";

import {
  appPathFromPageFile,
  publicRouteExpectations,
  redirectChain,
  type PublicRouteExpectation,
} from "./public-route-inventory";

function locationMatches(
  expected: PublicRouteExpectation,
  header: string | null,
  base: string,
): boolean {
  if (!header) return false;
  const actual = new URL(header, base);
  if (expected.locationPathname) {
    return actual.pathname === expected.locationPathname;
  }
  if (!expected.location) return false;
  if (expected.location.startsWith("/")) {
    return actual.pathname + actual.search === expected.location;
  }
  return actual.toString() === new URL(expected.location).toString();
}

test("public route inventory covers pages, redirects, and missing URLs in one hop", async () => {
  const routes = await publicRouteExpectations();
  const byPath = new Map(routes.map((route) => [route.path, route]));

  assert.ok(routes.length > 80, `expected a full public inventory, got ${routes.length}`);
  assert.equal(byPath.size, routes.length);
  assert.equal(redirectChain(routes), null);
  assert.equal(byPath.get("/")?.status, 200);
  assert.deepEqual(byPath.get("/contact"), {
    path: "/contact",
    status: 308,
    location: "/review/request",
  });
  assert.equal(byPath.get("/pl/contact")?.status, 308);
  assert.equal(byPath.get("/pl/contact")?.location, "/pl/review/request");
  assert.equal(byPath.get("/catalog/offsec")?.status, 308);
  assert.equal(byPath.get("/catalog/offsec")?.location, "/catalog");
  assert.equal(byPath.get("/catalog/workflow-s")?.status, 308);
  assert.equal(byPath.get("/catalog/workflow-s")?.location, "/catalog");
  assert.equal(byPath.get("/catalog/offsec-access-removed")?.status, 308);
  assert.equal(byPath.get("/catalog/offsec-external-exposure")?.status, 200);
  assert.equal(byPath.get("/catalog")?.status, 200);
  assert.equal(byPath.get("/reviews")?.status, 404);
  assert.equal(byPath.get("/this-page-does-not-exist")?.status, 404);
  assert.equal(byPath.get("/pl/this-page-does-not-exist")?.status, 404);
  assert.equal(byPath.get("/docs/intro")?.status, 308);
  assert.equal(byPath.get("/docs/getting-started")?.status, 200);
  assert.equal(byPath.get("/docs/man/witnessops")?.status, 404);
  assert.equal(
    appPathFromPageFile(
      join(__dirname, "../app/(marketing)/pricing/page.tsx"),
    ),
    "/pricing",
  );

  const counts = new Map<number, number>();
  for (const route of routes) {
    counts.set(route.status, (counts.get(route.status) ?? 0) + 1);
    assert.ok(
      route.status === 200 || route.status === 308 || route.status === 404,
      `${route.path} has unexpected status ${route.status}`,
    );
  }
  assert.ok((counts.get(200) ?? 0) > 40);
  assert.ok((counts.get(308) ?? 0) > 10);
  assert.ok((counts.get(404) ?? 0) > 10);
});

test(
  "public URLs return the expected HTTP status",
  { skip: process.env.PUBLIC_ROUTE_BASE_URL ? false : "PUBLIC_ROUTE_BASE_URL is not set" },
  async () => {
    const base = process.env.PUBLIC_ROUTE_BASE_URL;
    assert.ok(base);
    const routes = await publicRouteExpectations();
    const mismatches: string[] = [];

    for (const route of routes) {
      const response = await fetch(new URL(route.path, base), {
        redirect: "manual",
        headers: { accept: "text/html" },
      });
      const location = response.headers.get("location");
      const shown = location ? ` ${location}` : "";
      const line = `${String(response.status).padStart(3, " ")} ${route.path}${shown}`;
      console.log(line);

      if (response.status !== route.status) {
        mismatches.push(
          `${route.path}: expected ${route.status}, got ${response.status}${shown}`,
        );
      } else if (
        route.status === 308 &&
        !locationMatches(route, location, base)
      ) {
        mismatches.push(
          `${route.path}: expected location ${route.location ?? route.locationPathname}, got ${location}`,
        );
      }

      if (
        response.status === 404 &&
        (route.path === "/this-page-does-not-exist" ||
          route.path === "/pl/this-page-does-not-exist")
      ) {
        const html = await response.text();
        if (route.path.startsWith("/pl/")) {
          if (!html.includes("Nie znaleziono strony")) {
            mismatches.push(`${route.path}: missing Polish 404 heading`);
          }
          if (!html.includes('href="/pl/contact"')) {
            mismatches.push(`${route.path}: missing Polish contact link`);
          }
        } else if (!html.includes("Page not found") || !html.includes('href="/contact"')) {
          mismatches.push(`${route.path}: missing English 404 heading or contact link`);
        }
        if (!html.includes("Agent Action Security Review")) {
          mismatches.push(`${route.path}: missing Agent Action Security Review link`);
        }
        if (!html.includes("External Attack Surface Review")) {
          mismatches.push(`${route.path}: missing External Attack Surface Review link`);
        }
      } else {
        await response.body?.cancel();
      }
    }

    console.log(
      `\n${routes.length} public URLs, ${mismatches.length} mismatches`,
    );
    assert.deepEqual(mismatches, []);
  },
);
