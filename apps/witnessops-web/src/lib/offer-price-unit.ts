/**
 * The two public review prices as one unbreakable unit.
 * Amounts stay 2500 and 1900. Other catalogue VAT lines are left alone.
 */
export const PRICE_UNIT_GAP = "\u00A0";

export const AGENT_PRICE_EN = `€2,500${PRICE_UNIT_GAP}excl.${PRICE_UNIT_GAP}VAT`;
export const AGENT_PRICE_PL = `€2${PRICE_UNIT_GAP}500${PRICE_UNIT_GAP}bez${PRICE_UNIT_GAP}VAT`;
export const EXTERNAL_PRICE_EN = `€1,900${PRICE_UNIT_GAP}excl.${PRICE_UNIT_GAP}VAT`;
export const EXTERNAL_PRICE_PL = `€1${PRICE_UNIT_GAP}900${PRICE_UNIT_GAP}bez${PRICE_UNIT_GAP}VAT`;

const OFFER_PRICE_UNITS = [AGENT_PRICE_EN, EXTERNAL_PRICE_EN, AGENT_PRICE_PL, EXTERNAL_PRICE_PL] as const;

/** Exact unit, after loose spacing and a middot have been folded in. */
export const OFFER_PRICE_UNIT_PATTERN = /€(?:2,500\u00A0excl\.\u00A0VAT|1,900\u00A0excl\.\u00A0VAT|2\u00A0500\u00A0bez\u00A0VAT|1\u00A0900\u00A0bez\u00A0VAT)/g;

const LOOSE_OFFER_PRICES: Array<[RegExp, string]> = [
  [/(?<![\d€])€2,500(?:[\s\u00A0]+)excl\.(?:[\s\u00A0]+)VAT/gi, AGENT_PRICE_EN],
  [/(?<![\d€])€1,900(?:[\s\u00A0]+)excl\.(?:[\s\u00A0]+)VAT/gi, EXTERNAL_PRICE_EN],
  [/(?<!od )(?<![\d€–-])€2(?:[\s\u00A0])500(?:[\s\u00A0]*·[\s\u00A0]*)?bez(?:[\s\u00A0]+)VAT/gi, AGENT_PRICE_PL],
  [/(?<!od )(?<![\d€–-])€1(?:[\s\u00A0])900(?:[\s\u00A0]*·[\s\u00A0]*)?bez(?:[\s\u00A0]+)VAT/gi, EXTERNAL_PRICE_PL],
];

/** Fold spacing and a middot for these two prices only. Other VAT lines stay as written. */
export function bindOfferPriceUnits(text: string): string {
  let next = text;
  for (const [pattern, unit] of LOOSE_OFFER_PRICES) {
    next = next.replace(new RegExp(pattern.source, pattern.flags), unit);
  }
  return next;
}

export function isOfferPriceUnit(text: string): boolean {
  return (OFFER_PRICE_UNITS as readonly string[]).includes(text);
}

/** API, JSON, email, and other plain-text output. Rendered HTML keeps the NBSP unit. */
export function plainOfferPrice(value: string): string {
  return value.replaceAll("\u00A0", " ");
}
