/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        brand: {
          primary: "var(--color-brand-primary)",
          "primary-hover": "var(--color-brand-primary-hover)",
          secondary: "var(--color-brand-secondary)",
          accent: "var(--color-brand-accent)",
          muted: "var(--color-brand-muted)",
        },
        surface: {
          bg: "var(--color-surface-bg)",
          "bg-alt": "var(--color-surface-bg-alt)",
          card: "var(--color-surface-card)",
          border: "var(--color-surface-border)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          inverse: "var(--color-text-inverse)",
        },
        signal: {
          green: "var(--color-signal-green)",
          amber: "var(--color-signal-amber)",
          red: "var(--color-signal-red)",
        },
      },
      borderRadius: {
        none: "var(--radius-none)",
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-control)",
        md: "var(--radius-card)",
        lg: "var(--radius-overlay)",
        full: "var(--radius-pill)",
      },
      spacing: {
        section: "var(--spacing-section)",
        "section-sm": "var(--spacing-section-sm)",
      },
      maxWidth: {
        content: "var(--max-width-content)",
        narrow: "var(--max-width-narrow)",
      },
    },
  },
};
