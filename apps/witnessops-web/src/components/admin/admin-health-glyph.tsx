import type { HealthDisplayKind } from "@/lib/admin/admin-health-display";

export function HealthGlyph({ kind, size = 16 }: { kind: HealthDisplayKind; size?: number }) {
  switch (kind) {
    case "connected":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="#365F4A" />
          <path d="M4.6 8.2 L7 10.5 L11.5 5.6" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "configured":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="5.6" fill="none" stroke="#5B5F57" strokeWidth="1.4" />
          <circle cx="8" cy="8" r="1.7" fill="#5B5F57" />
        </svg>
      );
    case "not_checked":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="5.6" fill="none" stroke="#6A6E65" strokeWidth="1.4" strokeDasharray="2.2 1.8" />
        </svg>
      );
    case "not_set_up":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 2.2 L14.2 14 H1.8 Z" fill="none" stroke="#8B4B48" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      );
    case "failing":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 1.6 L14.6 14.2 H1.4 Z" fill="#8B4B48" />
          <path d="M8 6.2 V9.3" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="11.4" r="0.8" fill="#FFFFFF" />
        </svg>
      );
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}
