import {
  BUYER_SERVICES,
  buyerRequestHref,
  buyerServiceByProductId,
  buyerServiceFromRequestOffer,
  buyerServiceRequestHref,
  type BuyerLocale,
  type BuyerService,
} from "@/lib/buyer-services";
import { isWithdrawnOfferPath } from "@/lib/withdrawn-offer-routes";

const PARKED_PUBLIC_REQUEST_SERVICE_ID = "external-exposure-assessment";

type SearchParamsReader = Pick<URLSearchParams, "get">;

function serviceForDetailRoute(
  locale: BuyerLocale,
  pathname: string,
): BuyerService | undefined {
  if (isWithdrawnOfferPath(pathname)) return undefined;
  return BUYER_SERVICES.find(
    (service) => service.detailHref[locale] === pathname,
  );
}

function selectedServiceFromRequest(
  searchParams: SearchParamsReader,
): BuyerService | undefined {
  const offerId = searchParams.get("offerId");
  const requestedOffer = buyerServiceFromRequestOffer(
    offerId,
    searchParams.get("offer"),
  );
  if (offerId !== null && requestedOffer) {
    return requestedOffer;
  }

  const productId = searchParams.get("productId");
  const productService = productId
    ? buyerServiceByProductId(productId)
    : undefined;
  if (productService) {
    return productService;
  }

  return requestedOffer;
}

/**
 * Keep a shared-shell review CTA attached to the selectable offer represented
 * by the current detail or request route. Query text is rebuilt from the
 * catalogue authority instead of forwarding arbitrary public parameters.
 */
export function reviewRequestHrefForLocation(
  locale: BuyerLocale,
  pathname: string,
  searchParams: SearchParamsReader,
): string {
  const requestHref = buyerRequestHref(locale);
  const routeService = serviceForDetailRoute(locale, pathname);

  if (routeService && routeService.id !== PARKED_PUBLIC_REQUEST_SERVICE_ID) {
    return buyerServiceRequestHref(locale, routeService);
  }

  if (pathname === requestHref) {
    const selectedService = selectedServiceFromRequest(searchParams);
    if (selectedService && selectedService.id !== PARKED_PUBLIC_REQUEST_SERVICE_ID) {
      return buyerServiceRequestHref(locale, selectedService);
    }
  }

  return requestHref;
}
