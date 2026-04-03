/**
 * WitnessOps motion system — proof-state choreography.
 *
 * Principles:
 *  - Duration 160–420 ms
 *  - Opacity-first, transform-second
 *  - One-time entrance reveals
 *  - Honor prefers-reduced-motion
 */

import type { Variants } from "framer-motion";

/* ─── Shared easing ─── */
export const ease = [0.22, 1, 0.36, 1] as const;

/* ─── Duration tokens ─── */
export const duration = {
  sm: 0.18,
  md: 0.28,
  lg: 0.42,
} as const;

/* ─── Stagger tokens ─── */
export const stagger = {
  fast: 0.05,
  md: 0.08,
  slow: 0.1,
} as const;

/* ─── Reusable variants ─── */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.md, ease },
  },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.md, ease },
  },
};

export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.md, ease },
  },
};

export const fadeRight: Variants = {
  hidden: { opacity: 0, x: 12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.md, ease },
  },
};

export const lineReveal: Variants = {
  hidden: { opacity: 0, x: -6 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.985, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.32, ease },
  },
};

export const staggerParent: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: stagger.md,
      delayChildren: 0.04,
    },
  },
};

export const staggerParentFast: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: stagger.fast,
      delayChildren: 0.02,
    },
  },
};

export const staggerParentSlow: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: stagger.slow,
      delayChildren: 0.06,
    },
  },
};

/* ─── Chain / pipeline step ─── */
export const chainNode: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease },
  },
};

export const chainConnector: Variants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.22, ease },
  },
};

/* ─── Reduced-motion helpers ─── */

/** Opacity-only variant for reduced-motion users */
export const fadeOnly: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: duration.sm },
  },
};

/** Instant reveal for reduced-motion users */
export const instant: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};
