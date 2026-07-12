"use client";

import { useEffect } from "react";

export function PolishLocaleBoundary({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = "pl";
    return () => {
      document.documentElement.lang = "en";
    };
  }, []);

  return children;
}
