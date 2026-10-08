import { TwoOfferRequest, twoOfferRequestMetadata, type ReviewSearchParams } from "@/components/review-request/two-offer-request";

export const metadata = twoOfferRequestMetadata("en");

export default async function ReviewRequestPage({ searchParams }: { searchParams?: Promise<ReviewSearchParams> }) {
  return <TwoOfferRequest locale="en" params={(await searchParams) ?? {}} />;
}
