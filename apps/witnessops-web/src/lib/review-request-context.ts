import {
  BUYER_SERVICES,
  buyerRequestHref,
  buyerServiceByProductId,
  buyerServiceByPublicOfferId,
  buyerServiceRequestHref,
  type BuyerLocale,
  type BuyerService,
} from "@/lib/buyer-services";

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
  const productId = searchParams.get("productId");
  const productService = productId
    ? buyerServiceByProductId(productId)
    : undefined;
  if (productService) {
    return productService;
  }

  const offerId = searchParams.get("offerId");
  return offerId ? buyerServiceByPublicOfferId(offerId) : undefined;
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

  return requestHref;
}
