import assert from "node:assert/strict";
import test from "node:test";

import { WITHDRAWN_OFFER_PATHS } from "./withdrawn-offer-routes";

const CANONICAL_CONTACT = "https://witnessops.com/contact";
const CANONICAL_PL_CONTACT = "https://witnessops.com/pl/contact";

test(
  "withdrawn offer URLs return 410 inside the site shell",
  { skip: process.env.PUBLIC_ROUTE_BASE_URL ? false : "PUBLIC_ROUTE_BASE_URL is not set" },
  async () => {
    const base = process.env.PUBLIC_ROUTE_BASE_URL;
    assert.ok(base);
    const mismatches: string[] = [];

    async function read(path: string, redirect: RequestRedirect = "manual") {
      const response = await fetch(new URL(path, base), {
        redirect,
        headers: { accept: "text/html" },
      });
      const html = await response.text();
      return { response, html };
    }

    for (const path of WITHDRAWN_OFFER_PATHS) {
      const { response, html } = await read(path);
      if (response.status !== 410) {
        mismatches.push(`${path}: expected 410, got ${response.status}`);
        continue;
      }
      const polish = path.startsWith("/pl/");
      const title = polish ? "Ta oferta została wycofana" : "This offer has been withdrawn";
      const contact = polish ? 'href="/pl/contact"' : 'href="/contact"';
      if (!html.includes(title)) mismatches.push(`${path}: missing withdrawn heading`);
      if (!html.includes("Agent Action Security Review") || !html.includes("External Attack Surface Review")) {
        mismatches.push(`${path}: missing current review links`);
      }
      if (!html.includes(contact)) mismatches.push(`${path}: missing contact link`);
      if (!html.includes("site-footer") || !html.includes("WitnessOps")) {
        mismatches.push(`${path}: 410 page is outside the site shell`);
      }
      if (html.includes("hreflang")) mismatches.push(`${path}: withdrawn page emitted hreflang`);
      if (/Karol|Stefański|€/.test(html)) mismatches.push(`${path}: withdrawn page includes a name or price`);
    }

    const slashed = await fetch(new URL("/catalog/offsec-local-audit/", base), {
      redirect: "manual",
      headers: { accept: "text/html" },
    });
    if (slashed.status === 410) {
      await slashed.body?.cancel();
    } else if (slashed.status === 308) {
      const next = await fetch(new URL(slashed.headers.get("location") ?? "", base), {
        redirect: "manual",
        headers: { accept: "text/html" },
      });
      if (next.status !== 410) {
        mismatches.push(`trailing slash second hop ${next.status}`);
      }
      await next.body?.cancel();
    } else {
      mismatches.push(`trailing slash expected 410 or 308, got ${slashed.status}`);
    }

    const contact = await read("/contact");
    if (contact.response.status !== 200) mismatches.push(`/contact status ${contact.response.status}`);
    if (contact.response.headers.get("location")) mismatches.push("/contact redirected");
    if (!contact.html.includes(`rel="canonical" href="${CANONICAL_CONTACT}"`) && !contact.html.includes(`href="${CANONICAL_CONTACT}"`)) {
      mismatches.push("/contact missing canonical");
    }
    if (contact.html.includes('name="name"') || contact.html.includes("Your name")) {
      mismatches.push("/contact still asks for a name");
    }

    const request = await read("/review/request");
    if (request.response.status !== 200) mismatches.push(`/review/request status ${request.response.status}`);
    if (request.response.headers.get("location")) mismatches.push("/review/request redirected");
    if (!request.html.includes(CANONICAL_CONTACT)) mismatches.push("/review/request does not canonicalize to /contact");

    const polishContact = await read("/pl/contact");
    const polishRequest = await read("/pl/review/request");
    if (polishContact.response.status !== 200 || polishContact.response.headers.get("location")) {
      mismatches.push("/pl/contact is not a direct 200");
    }
    if (polishRequest.response.status !== 200 || polishRequest.response.headers.get("location")) {
      mismatches.push("/pl/review/request is not a direct 200");
    }
    if (!polishContact.html.includes(CANONICAL_PL_CONTACT) || !polishRequest.html.includes(CANONICAL_PL_CONTACT)) {
      mismatches.push("Polish request pages do not canonicalize to /pl/contact");
    }

    assert.deepEqual(mismatches, []);
  },
);
