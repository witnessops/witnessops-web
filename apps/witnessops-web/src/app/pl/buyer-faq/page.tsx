import type { Metadata } from "next";
import { BuyerFaq } from "@/components/marketing/buyer-faq";
import { BUYER_FAQ } from "@/lib/buyer-faq";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: BUYER_FAQ.pl.title,
  description: BUYER_FAQ.pl.description,
  alternates: languageAlternates("/pl/buyer-faq", { en: "/buyer-faq", pl: "/pl/buyer-faq" }),
};

export default function PolishBuyerFaqPage() {
  return <BuyerFaq locale="pl" />;
}
