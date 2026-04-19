"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

export function RouteScrollReset() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    resetScroll();

    const rafOne = window.requestAnimationFrame(() => {
      resetScroll();
    });

    return () => {
      window.cancelAnimationFrame(rafOne);
    };
  }, [pathname]);

  return null;
}
