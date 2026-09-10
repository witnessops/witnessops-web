"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Ask is a conversation, while the rest of /docs keeps its existing navigation. */
export function DocsLayoutFrame({ children, navigation, sidebar }: {
  children: ReactNode; navigation: ReactNode; sidebar: ReactNode;
}) {
  const pathname = usePathname();
  if (pathname.replace(/\/$/, "") === "/docs/assistant") return <>{children}</>;
  return <div className="min-h-screen">{navigation}<div className="flex min-h-screen">
    {sidebar}<div className="min-w-0 flex-1 px-6 py-10 lg:px-12 lg:py-12">{children}</div>
  </div></div>;
}
