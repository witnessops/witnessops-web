/**
 * Runs before paint. The public site is dark only (Design 2026-11-13, footer bundle B):
 * the system preference and any stored wo-theme value are ignored, and nothing is written.
 */
export const THEME_INIT_SCRIPT =
  '(function(){document.documentElement.setAttribute("data-theme","dark");})();';
