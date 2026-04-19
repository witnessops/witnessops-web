"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  trackDocsPathExit,
  type DocsPathExitEventType,
} from "@/lib/docs-nav-analytics";

type DocsNavAnchor = HTMLAnchorElement & {
  dataset: DOMStringMap & {
    docsNavSurface?: string;
    docsEventType?: DocsPathExitEventType;
    docsLayerContext?: string;
  };
};

function isPrimaryNavigationClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function findTrackableAnchor(target: EventTarget | null): DocsNavAnchor | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) {
    return null;
  }

  return anchor as DocsNavAnchor;
}

function navSurfaceForAnchor(anchor: DocsNavAnchor): string {
  if (anchor.dataset.docsNavSurface) {
    return anchor.dataset.docsNavSurface;
  }

  const contextualSurface = anchor
    .closest<HTMLElement>("[data-docs-nav-surface]")
    ?.dataset.docsNavSurface;
  if (contextualSurface) {
    return contextualSurface;
  }

  return "docs_content";
}

function eventTypeForAnchor(
  anchor: DocsNavAnchor,
  navSurface: string,
): DocsPathExitEventType {
  if (anchor.dataset.docsEventType) {
    return anchor.dataset.docsEventType;
  }

  const contextualType = anchor
    .closest<HTMLElement>("[data-docs-event-type]")
    ?.dataset.docsEventType as DocsPathExitEventType | undefined;
  if (contextualType) {
    return contextualType;
  }

  if (navSurface === "pagination" || navSurface === "index-handoff") {
    return "next_click";
  }

  if (navSurface === "search") {
    return "search_result_click";
  }

  return "navigation_click";
}

export function DocsPathExitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || !isPrimaryNavigationClick(event)) {
        return;
      }

      const anchor = findTrackableAnchor(event.target);
      if (!anchor) {
        return;
      }

      if (
        anchor.hash &&
        anchor.pathname === window.location.pathname &&
        anchor.search.length === 0
      ) {
        return;
      }

      const toPath = anchor.href;
      if (!toPath) {
        return;
      }

      const navSurface = navSurfaceForAnchor(anchor);
      const layerContext =
        anchor.dataset.docsLayerContext ??
        anchor
          .closest<HTMLElement>("[data-docs-layer-context]")
          ?.dataset.docsLayerContext;

      trackDocsPathExit({
        fromPath: pathname ?? window.location.pathname,
        toPath,
        navSurface,
        eventType: eventTypeForAnchor(anchor, navSurface),
        interactionType: "click",
        layerContext,
      });
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  return null;
}
