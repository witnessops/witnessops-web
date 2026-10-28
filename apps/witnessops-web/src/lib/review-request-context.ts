import type { BuyerLocale } from "@/lib/buyer-services";
import { newSalesRequestHref } from "@/lib/new-review-request-policy";

/**
 * Shared navigation always starts the current review's non-secret fit check.
 * Historical detail pages and request records retain their own identities;
 * they must not turn the shared sales CTA into a retired-service enquiry.
 */
export function reviewRequestHrefForLocation(
  locale: BuyerLocale,
  _pathname: string,
  _searchParams: Pick<URLSearchParams, "get">,
): string {
  return newSalesRequestHref(locale);
}
