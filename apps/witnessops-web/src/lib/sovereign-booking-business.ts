import "server-only";
import { BUYER_SERVICES } from "./buyer-services";
import { publicPaidReviews } from "./public-paid-reviews";

// Share the site's active offer selector. The registry also contains retired
// and pilot records; including it wholesale would reopen unsupported offers.
export function bookingBusinessFacts(locale: "en" | "pl") {
  return {
    company: "WitnessOps",
    currentPaidReviews: publicPaidReviews(BUYER_SERVICES).map((offer) => ({
      id: offer.id,
      name: offer.name[locale],
      situation: offer.situation[locale],
      result: offer.result[locale],
      scope: offer.boundary[locale],
      price: offer.price[locale],
      timing: offer.timing[locale],
      source: offer.detailHref[locale],
    })),
    demoCall: {
      durationMinutes: 20,
      purpose: locale === "pl"
        ? "Wstępna rozmowa o jednym działaniu agenta lub automatyzacji i o tym, czy pasuje do zakresu aktualnego przeglądu. Nie jest to przegląd ani zobowiązanie do realizacji."
        : "An introductory conversation about one agent or automation action and whether it fits the current review. It is not the review itself or a delivery commitment.",
      fictional: true,
    },
  };
}
