import assert from "node:assert/strict";
import test from "node:test";

import { BUYER_SERVICES, buyerServiceRequestHref } from "./buyer-services";
import { listAdminBuyerServices } from "./admin-service-catalog";

test("admin services mirror the canonical public catalogue without inventing contracts", () => {
  const services = listAdminBuyerServices();

  assert.deepEqual(
    services.map((service) => service.id),
    BUYER_SERVICES.map((service) => service.id),
  );
  assert.equal(services.length, 8);

  for (const [index, service] of services.entries()) {
    const authority = BUYER_SERVICES[index]!;
    assert.equal(service.name, authority.name.en);
    assert.equal(service.price, authority.price.en);
    assert.equal(service.timing, authority.timing.en);
    assert.equal(service.publicHref, authority.detailHref.en);
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

  assert.equal(contextual.length, BUYER_SERVICES.length);
  assert.deepEqual(generic, []);
});
