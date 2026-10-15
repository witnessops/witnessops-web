import type { Metadata } from "next";

import { WithdrawnOfferNotice } from "@/components/marketing/withdrawn-offer-notice";
import { withdrawnOfferCopy } from "@/lib/withdrawn-offer-routes";

const copy = withdrawnOfferCopy(true);

export const metadata: Metadata = {
  title: copy.title,
  description: copy.body,
  robots: { index: false, follow: true },
};

export default function PolishWithdrawnOfferPage() {
  return <WithdrawnOfferNotice polish />;
}
