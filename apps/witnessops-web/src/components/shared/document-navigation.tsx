"use client";

import NextLink from "next/link";
import {
  createContext,
  useContext,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";

const DocumentNavigationContext = createContext(false);

/** Workspace links leave through a new document, without route prefetching. */
export function DocumentNavigation({ children }: { children: ReactNode }) {
  return (
    <DocumentNavigationContext.Provider value={true}>
      {children}
    </DocumentNavigationContext.Provider>
  );
}

type PublicNavigationLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & { href: string };

export function PublicNavigationLink(props: PublicNavigationLinkProps) {
  const documentNavigation = useContext(DocumentNavigationContext);
  return documentNavigation ? <a {...props} /> : <NextLink {...props} />;
}
