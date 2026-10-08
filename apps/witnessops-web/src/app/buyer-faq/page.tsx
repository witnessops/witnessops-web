import type { Metadata } from "next";
import { BuyerFaq } from "@/components/marketing/buyer-faq";
import { BUYER_FAQ } from "@/lib/buyer-faq";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: BUYER_FAQ.en.title,
  description: BUYER_FAQ.en.description,
  alternates: languageAlternates("/buyer-faq", { en: "/buyer-faq", pl: "/pl/buyer-faq" }),
};

export default function BuyerFaqPage() {
  return <BuyerFaq locale="en" />;
}
