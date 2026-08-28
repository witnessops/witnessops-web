import {
  BUYER_SERVICES,
  buyerServiceRequestHref,
  type BuyerService,
} from "@/lib/buyer-services";

export type AdminServiceRequestContext =
  | {
      kind: "public_offer";
      label: string;
      preservesSelection: true;
    }
  | {
      kind: "catalog_sku";
      label: string;
      preservesSelection: true;
    }
  | {
      kind: "generic";
      label: "generic /review/request";
      preservesSelection: false;
    };

export type AdminBuyerServiceRecord = {
  id: BuyerService["id"];
  name: string;
  price: string;
  timing: string;
  publicHref: string;
  requestHref: string;
  requestContext: AdminServiceRequestContext;
};

function requestContext(service: BuyerService): AdminServiceRequestContext {
  if (service.id === "bounded-workflow-review") {
    return {
      kind: "public_offer",
      label: `offerId=${service.id}`,
      preservesSelection: true,
    };
  }

  if (service.productId) {
    return {
      kind: "catalog_sku",
      label: `productId=${service.productId}`,
      preservesSelection: true,
    };
  }

  return {
    kind: "generic",
    label: "generic /review/request",
    preservesSelection: false,
  };
}

/**
 * Admin projection of the canonical buyer-facing catalogue.
 *
 * The public catalogue remains authoritative for offer names and commercial
 * terms. This projection makes request-handoff gaps visible without turning a
 * buyer offer into an immutable execution contract.
 */
export function listAdminBuyerServices(): AdminBuyerServiceRecord[] {
  return BUYER_SERVICES.map((service) => ({
    id: service.id,
    name: service.name.en,
    price: service.price.en,
    timing: service.timing.en,
    publicHref: service.detailHref.en ?? "/catalog",
    requestHref: buyerServiceRequestHref("en", service),
    requestContext: requestContext(service),
  }));
}
