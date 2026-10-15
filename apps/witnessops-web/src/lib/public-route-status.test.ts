import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";

import {
  appPathFromPageFile,
  publicRouteExpectations,
  redirectChain,
  type PublicRouteExpectation,
} from "./public-route-inventory";
import { WITHDRAWN_OFFER_PATHS } from "./withdrawn-offer-routes";

function routeExpectations() {
  return publicRouteExpectations(
    new Map(WITHDRAWN_OFFER_PATHS.map((path) => [path, { status: 410 as const }])),
  );
}

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

test("public route inventory covers pages, redirects, missing URLs, and withdrawn offers in one hop", async () => {
  const routes = await routeExpectations();
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
  for (const path of WITHDRAWN_OFFER_PATHS) {
    assert.equal(byPath.get(path)?.status, 410, path);
  }
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
      route.status === 200 ||
        route.status === 308 ||
        route.status === 404 ||
        route.status === 410,
      `${route.path} has unexpected status ${route.status}`,
    );
  }
  assert.ok((counts.get(200) ?? 0) > 40);
  assert.ok((counts.get(308) ?? 0) > 10);
  assert.ok((counts.get(404) ?? 0) > 10);
  assert.equal(counts.get(410), WITHDRAWN_OFFER_PATHS.length);
});

test(
  "public URLs return the expected HTTP status",
  { skip: process.env.PUBLIC_ROUTE_BASE_URL ? false : "PUBLIC_ROUTE_BASE_URL is not set" },
  async () => {
    const base = process.env.PUBLIC_ROUTE_BASE_URL;
    assert.ok(base);
    const routes = await routeExpectations();
    const mismatches: string[] = [];
    const baseOrigin = new URL(base).origin;

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
      } else if (route.status === 308 && location) {
        const nextUrl = new URL(location, base);
        if (nextUrl.origin === baseOrigin) {
          const next = await fetch(nextUrl, {
            redirect: "manual",
            headers: { accept: "text/html" },
          });
          if (next.status >= 300 && next.status < 400) {
            mismatches.push(
              `${route.path}: second hop ${next.status} to ${next.headers.get("location")}`,
            );
          }
          await next.body?.cancel();
        }
      }

      if (
        response.status === 410 &&
        (route.path === "/catalog/automation-repair" ||
          route.path === "/pl/catalog/offsec-launch-ready")
      ) {
        const html = await response.text();
        const title = route.path.startsWith("/pl/")
          ? "Ta oferta została wycofana"
          : "This offer has been withdrawn";
        if (!html.includes(title)) {
          mismatches.push(`${route.path}: missing withdrawn-offer heading`);
        }
        if (!html.includes("Agent Action Security Review") || !html.includes("External Attack Surface Review")) {
          mismatches.push(`${route.path}: missing current review links`);
        }
        const contact = route.path.startsWith("/pl/") ? 'href="/pl/contact"' : 'href="/contact"';
        if (!html.includes(contact)) {
          mismatches.push(`${route.path}: missing contact link`);
        }
      } else if (
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

    const slashedPath = "/catalog/offsec-local-audit/";
    const slashed = await fetch(new URL(slashedPath, base), {
      redirect: "manual",
      headers: { accept: "text/html" },
    });
    const slashedLocation = slashed.headers.get("location");
    console.log(
      `${String(slashed.status).padStart(3, " ")} ${slashedPath}${slashedLocation ? ` ${slashedLocation}` : ""}`,
    );
    if (slashed.status === 410) {
      await slashed.body?.cancel();
    } else if (slashed.status === 308 && slashedLocation) {
      const nextUrl = new URL(slashedLocation, base);
      if (nextUrl.origin !== baseOrigin || nextUrl.pathname !== "/catalog/offsec-local-audit") {
        mismatches.push(
          `${slashedPath}: expected one hop to /catalog/offsec-local-audit, got ${slashedLocation}`,
        );
      } else {
        const gone = await fetch(nextUrl, {
          redirect: "manual",
          headers: { accept: "text/html" },
        });
        if (gone.status !== 410) {
          mismatches.push(
            `${slashedPath}: canonical path returned ${gone.status}, expected 410`,
          );
        }
        await gone.body?.cancel();
      }
      await slashed.body?.cancel();
    } else {
      mismatches.push(
        `${slashedPath}: expected 410 or one 308 to the canonical path, got ${slashed.status}`,
      );
      await slashed.body?.cancel();
    }

    console.log(
      `\n${routes.length} public URLs, ${mismatches.length} mismatches`,
    );
    assert.deepEqual(mismatches, []);
  },
);
