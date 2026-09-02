export const PUBLIC_B2B_VAT_LABEL = {
  en: "excluding VAT",
  pl: "bez VAT",
} as const;

/** Canonical public display for B2B net prices. */
export function publicB2bPrice(en: string, pl: string) {
  return {
    en: `${en} · ${PUBLIC_B2B_VAT_LABEL.en}`,
    pl: `${pl} · ${PUBLIC_B2B_VAT_LABEL.pl}`,
  } as const;
}
