import { Fragment, type ReactNode } from "react";

import { bindOfferPriceUnits, OFFER_PRICE_UNIT_PATTERN } from "./offer-price-unit";

export {
  AGENT_PRICE_EN,
  AGENT_PRICE_PL,
  bindOfferPriceUnits,
  EXTERNAL_PRICE_EN,
  EXTERNAL_PRICE_PL,
  isOfferPriceUnit,
  OFFER_PRICE_UNIT_PATTERN,
  PRICE_UNIT_GAP,
} from "./offer-price-unit";

export function PriceUnit({ value, className, offer = false }: { value: string; className?: string; offer?: boolean }) {
  return (
    <span data-price-unit="" data-offer-price={offer ? "" : undefined} className={className} style={{ whiteSpace: "nowrap" }}>
      {value}
    </span>
  );
}

/** Wrap each locked offer price so a parent `overflow-wrap: anywhere` cannot split it. */
export function PriceText({ text }: { text: string }): ReactNode {
  const bound = bindOfferPriceUnits(text);
  const parts: ReactNode[] = [];
  let last = 0;
  const pattern = new RegExp(OFFER_PRICE_UNIT_PATTERN.source, "g");
  for (const match of bound.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(bound.slice(last, index));
    parts.push(<PriceUnit key={`${index}-${match[0]}`} value={match[0]} />);
    last = index + match[0].length;
  }
  if (last === 0) return bound;
  if (last < bound.length) parts.push(bound.slice(last));
  return <Fragment>{parts}</Fragment>;
}
