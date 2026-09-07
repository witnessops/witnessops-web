import type { Metadata } from "next";
import { BuyerServiceDetail } from "@/components/marketing/buyer-service-detail";
import { buyerServiceById } from "@/lib/buyer-services";
import { languageAlternates } from "@/lib/public-seo";

const service = buyerServiceById("customer-security-review-sprint");

export const metadata: Metadata = {
  title: "Customer Security Review Sprint",
  description:
    "WitnessOps bierze jeden kwestionariusz i jeden zakres produktu, ustala, które proponowane odpowiedzi mają wsparcie w dostarczonych materiałach, oddziela oświadczenia kierownictwa i otwarte kwestie, a następnie przekazuje pakiet odpowiedzi do zatwierdzenia.",
  alternates: languageAlternates("/pl/customer-security-review", {
    en: "/customer-security-review",
    pl: "/pl/customer-security-review",
  }),
};

export default function PolishCustomerSecurityReviewPage() {
  return <BuyerServiceDetail locale="pl" service={service} />;
}
