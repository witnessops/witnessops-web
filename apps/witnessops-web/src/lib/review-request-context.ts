import {
  BUYER_SERVICES,
  buyerRequestHref,
  buyerServiceById,
  buyerServiceRequestHref,
  type BuyerLocale,
  type BuyerService,
} from "@/lib/buyer-services";
import { resolveNewReviewSelection } from "@/lib/new-review-request-policy";
import { isPublicPaidReviewId } from "@/lib/public-paid-reviews";

type SearchParamsReader = Pick<URLSearchParams, "get" | "getAll">;

function serviceForDetailRoute(
  locale: BuyerLocale,
  pathname: string,
): BuyerService | undefined {
  const matches = BUYER_SERVICES.filter((service) => service.detailHref[locale] === pathname);
  // Historical catalogue records may share a route with the current one-action
  // review. Never let the older inventory record override a current CTA.
  return matches.find((service) => isPublicPaidReviewId(service.id)) ?? matches[0];
}

function selectedServiceFromRequest(params: SearchParamsReader): BuyerService | undefined {
  const selection: Record<string, unknown> = {};
  for (const key of ["offerId", "productId", "offer", "enquiryPath"] as const) {
    const values = params.getAll(key);
    if (values.length === 1) selection[key] = values[0];
    else if (values.length > 1) selection[key] = values;
  }
  const result = resolveNewReviewSelection(selection);
  return result.kind === "selected" ? buyerServiceById(result.serviceId) : undefined;
}

/** New buyer CTA selection follows the same fail-closed rule as new issuance. */
export function reviewRequestHrefForLocation(
  locale: BuyerLocale,
  pathname: string,
  searchParams: SearchParamsReader,
): string {
  const requestHref = buyerRequestHref(locale);
  const route = serviceForDetailRoute(locale, pathname);
  if (route) return buyerServiceRequestHref(locale, route);
  if (pathname === requestHref) {
    const chosen = selectedServiceFromRequest(searchParams);
    return chosen ? buyerServiceRequestHref(locale, chosen) : requestHref;
  }
  return requestHref;
}
