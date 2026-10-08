import { TwoOfferRequest, twoOfferRequestMetadata, type ReviewSearchParams } from "@/components/review-request/two-offer-request";

export function generateMetadata() {
  return twoOfferRequestMetadata("pl");
}

export default async function PolishReviewRequestPage({ searchParams }: { searchParams?: Promise<ReviewSearchParams> }) {
  return <TwoOfferRequest locale="pl" params={(await searchParams) ?? {}} />;
}
