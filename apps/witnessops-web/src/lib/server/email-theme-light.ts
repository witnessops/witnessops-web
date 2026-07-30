/**
 * Shared light / white paper palette for transactional verification emails
 * and related HTML mail chrome. Not used for full marketing site tokens.
 */

export const EMAIL_THEME_LIGHT = {
  bg: "#f7f5f1",
  surface: "#ffffff",
  surfaceAlt: "#faf9f7",
  surfaceHover: "#f0eeea",
  border: "#e4e0d8",
  borderStrong: "#cfc9bd",
  text: "#121212",
  textSecondary: "#3f3c38",
  textMuted: "#6f6a63",
  accent: "#f27a3d",
  trust: "#2f7d82",
  success: "#2f7a4f",
  warning: "#a36b12",
  danger: "#b42318",
} as const;

export type EmailThemeLight = typeof EMAIL_THEME_LIGHT;

/** Inline text color with webkit fill for stubborn clients. */
export function emailTextStyle(color: string): string {
  return `color:${color};-webkit-text-fill-color:${color}`;
}

/** Solid background with gradient fallback for Outlook. */
export function emailBackgroundStyle(color: string): string {
  return `background-color:${color};background:${color};background-image:linear-gradient(${color},${color})`;
}

export const EMAIL_LIGHT_COLOR_SCHEME =
  "color-scheme:light;supported-color-schemes:light;forced-color-adjust:none";
