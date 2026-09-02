import {
  BUYER_SERVICES,
  buyerRequestHref,
  buyerPublicOfferRequestHref,
  buyerServiceByProductId,
  buyerServiceFromRequestOffer,
  buyerServiceRequestHref,
  type BuyerLocale,
  type BuyerService,
} from "@/lib/buyer-services";
import { PRIMARY_OFFER } from "@/lib/commercial-truth";

type SearchParamsReader = Pick<URLSearchParams, "get">;

function serviceForDetailRoute(
  locale: BuyerLocale,
  pathname: string,
): BuyerService | undefined {
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
  if (offerId !== null && requestedOffer?.id === PRIMARY_OFFER.id) {
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

  if (routeService) {
    return buyerServiceRequestHref(locale, routeService);
  }

  if (pathname === requestHref) {
    const selectedService = selectedServiceFromRequest(searchParams);
    if (selectedService) {
      return buyerServiceRequestHref(locale, selectedService);
    }
  }

  return buyerPublicOfferRequestHref(locale, PRIMARY_OFFER.id);
}
