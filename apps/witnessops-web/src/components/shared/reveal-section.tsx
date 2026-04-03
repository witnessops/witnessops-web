"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeUp, fadeOnly, staggerParent } from "@/lib/motion";

interface RevealSectionProps {
  children: ReactNode;
  className?: string;
  /** Wrap children in a stagger parent so direct <motion.div> children cascade */
  stagger?: boolean;
  /** How much of the section must be visible before triggering (0–1) */
  amount?: number;
}

export function RevealSection({
  children,
  className = "",
  stagger = false,
  amount = 0.25,
}: RevealSectionProps) {
  const reduce = useReducedMotion();

  const variants = reduce
    ? fadeOnly
    : stagger
      ? staggerParent
      : fadeUp;

  return (
    <motion.section
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={variants}
    >
      {children}
    </motion.section>
  );
}
