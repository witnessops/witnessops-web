import type { Metadata } from "next";

import { BuyerCatalogue } from "@/components/marketing/buyer-catalogue";

export const metadata: Metadata = {
  title: "Security and Operational Review Services",
  description:
    "Choose one of six bounded WitnessOps reviews by situation, result, price and timing.",
  alternates: {
    canonical: "/catalog",
    languages: { en: "/catalog", pl: "/pl/catalog", "x-default": "/catalog" },
  },
};

export default function CatalogIndexPage() {
  return <BuyerCatalogue locale="en" />;
}
