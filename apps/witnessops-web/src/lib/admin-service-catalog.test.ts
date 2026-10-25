import assert from "node:assert/strict";
import test from "node:test";

import { BUYER_SERVICES, buyerServiceRequestHref } from "./buyer-services";
import { plainOfferPrice } from "./offer-price-unit";
import { publicPaidReviews } from "./public-paid-reviews";
import { listAdminBuyerServices } from "./admin-service-catalog";

const PUBLIC_ADMIN_SERVICE_IDS = [
  "agent-action-security-review",
  "external-exposure-assessment",
] as const;

/** Historical buyer-registry ids excluded from the admin public-paid projection. */
const RETIRED_BUYER_SERVICE_IDS = [
  "automation-repair-handover",
  "customer-security-review-sprint",
  "agent-tools-access-review",
  "one-server-security-check",
  "launch-readiness-check",
  "key-access-custody-review",
  "incident-readiness-review",
  "professional-public-footprint-audit",
] as const;

test("admin services mirror the two public paid reviews without inventing contracts", () => {
  const services = listAdminBuyerServices();
  const publicServices = publicPaidReviews(BUYER_SERVICES);

  assert.deepEqual(
    services.map((service) => service.id),
    [...PUBLIC_ADMIN_SERVICE_IDS],
  );
  assert.deepEqual(
    publicServices.map((service) => service.id),
    [...PUBLIC_ADMIN_SERVICE_IDS],
  );
  assert.equal(services.length, 2);
  assert.equal(BUYER_SERVICES.length, 10);
  assert.deepEqual(
    BUYER_SERVICES.map((service) => service.id).filter(
      (id) =>
        id !== "agent-action-security-review" &&
        id !== "external-exposure-assessment",
    ),
    [...RETIRED_BUYER_SERVICE_IDS],
  );
  for (const id of RETIRED_BUYER_SERVICE_IDS) {
    assert.equal(
      services.some((service) => service.id === id),
      false,
      id,
    );
  }

  const external = services.find(
    (service) => service.id === "external-exposure-assessment",
  );
  assert.ok(external);
  assert.match(
    external.requestHref,
    /^\/review\/request\?productId=OFFSEC-EXTERNAL-EXPOSURE(?:&|$)/,
  );
  assert.deepEqual(external.requestContext, {
    kind: "catalog_sku",
    label: "productId=OFFSEC-EXTERNAL-EXPOSURE",
    preservesSelection: true,
  });

  const agentAction = services.find(
    (service) => service.id === "agent-action-security-review",
  );
  assert.ok(agentAction);
  assert.match(
    agentAction.requestHref,
    /^\/review\/request\?offerId=agent-action-security-review(?:&|$)/,
  );
  assert.deepEqual(agentAction.requestContext, {
    kind: "public_offer",
    label: "offerId=agent-action-security-review",
    preservesSelection: true,
  });

  for (const [index, service] of services.entries()) {
    const authority = publicServices[index]!;
    assert.equal(service.name, authority.name.en);
    assert.equal(service.price, plainOfferPrice(authority.price.en));
    assert.doesNotMatch(service.price, /\u00A0/);
    assert.equal(service.timing, authority.timing.en);
    assert.equal(service.publicHref, authority.detailHref.en ?? "/catalog");
    assert.equal(service.requestHref, buyerServiceRequestHref("en", authority));
    const params = new URL(
      service.requestHref,
      "https://witnessops.invalid",
    ).searchParams;
    const offerId = params.get("offerId");
    const productId = params.get("productId");
    assert.deepEqual(
      service.requestContext,
      offerId
        ? {
            kind: "public_offer",
            label: `offerId=${offerId}`,
            preservesSelection: true,
          }
        : {
            kind: "catalog_sku",
            label: `productId=${productId}`,
            preservesSelection: true,
          },
    );
  }
});

test("admin services preserve the selected offer for every public service", () => {
  const services = listAdminBuyerServices();
  const contextual = services.filter(
    (service) => service.requestContext.preservesSelection,
  );
  const generic = services.filter(
    (service) => !service.requestContext.preservesSelection,
  );

  assert.equal(services.length, 2);
  assert.equal(contextual.length, 2);
  assert.deepEqual(generic, []);
  assert.ok(
    services.some((service) =>
      service.requestHref.startsWith(
        "/review/request?offerId=agent-action-security-review",
      ),
    ),
  );
  assert.ok(
    services.some((service) =>
      service.requestHref.startsWith(
        "/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE",
      ),
    ),
  );
});
