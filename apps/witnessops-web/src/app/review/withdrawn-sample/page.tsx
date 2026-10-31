import type { Metadata } from "next";

import { WithdrawnOfferNotice } from "@/components/marketing/withdrawn-offer-notice";
import { withdrawnSampleCopy } from "@/lib/withdrawn-offer-routes";

const copy = withdrawnSampleCopy(false);

export const metadata: Metadata = {
  title: copy.title,
  description: copy.body,
  robots: { index: false, follow: true },
};

export default function WithdrawnSamplePage() {
  return <WithdrawnOfferNotice polish={false} sample />;
}
