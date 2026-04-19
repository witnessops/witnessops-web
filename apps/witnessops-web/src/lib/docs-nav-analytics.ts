import { trackEvent } from "@/lib/analytics";

const LOCAL_ANALYTICS_ORIGIN = "https://local.witnessops.invalid";
const DOCS_PATH_PREFIX = "/docs";

export const DOCS_PATH_EXIT_EVENT = "docs_path_exit";

export type DocsPathExitEventType =
  | "navigation_click"
  | "next_click"
  | "previous_click"
  | "search_result_click"
  | "search_result_enter";

export type DocsPathExitInteractionType = "click" | "keyboard";

export interface DocsPathExitInput {
  fromPath: string;
  toPath: string;
  navSurface: string;
  eventType: DocsPathExitEventType;
  interactionType: DocsPathExitInteractionType;
  layerContext?: string;
  eventTimestamp?: string;
}

export interface DocsPathExitPayload extends Record<string, string> {
  event_type: string;
  event_timestamp: string;
  from_route: string;
  to_route: string;
  nav_surface: string;
  interaction_type: string;
  layer_context: string;
  from_layer: string;
  to_layer: string;
  from_journey: string;
  to_journey: string;
}

function docsPathAnalyticsEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_DOCS_NAV_PATH_ANALYTICS?.trim().toLowerCase();
  return flag !== "0" && flag !== "false";
}

function normalizePathname(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, "/");
  if (collapsed === "/") {
    return "/";
  }

  const trimmed = collapsed.endsWith("/") ? collapsed.slice(0, -1) : collapsed;
  return trimmed || "/";
}

function isOwnedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "witnessops.com" ||
    normalized.endsWith(".witnessops.com") ||
    normalized === "localhost" ||
    normalized === "127.0.0.1"
  );
}

function externalLabelFromProtocol(protocol: string): string {
  return `external:${protocol.replace(":", "").toLowerCase()}`;
}

function normalizeContextToken(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9/_-]/g, "");

  return normalized || "unknown";
}

function docsSegments(route: string): string[] {
  if (!route.startsWith(DOCS_PATH_PREFIX)) {
    return [];
  }

  return route.slice(DOCS_PATH_PREFIX.length).split("/").filter(Boolean);
}

export function normalizeDocsAnalyticsRoute(route: string): string {
  const trimmed = route.trim();
  if (!trimmed) {
    return "/";
  }

  const fallbackBase = `${LOCAL_ANALYTICS_ORIGIN}/`;

  try {
    const parsed = trimmed.startsWith("/")
      ? new URL(trimmed, fallbackBase)
      : new URL(trimmed, fallbackBase);
    const protocol = parsed.protocol.toLowerCase();

    if (protocol !== "http:" && protocol !== "https:") {
      return externalLabelFromProtocol(protocol);
    }

    if (
      parsed.origin !== LOCAL_ANALYTICS_ORIGIN &&
      !isOwnedHostname(parsed.hostname)
    ) {
      return `external:${parsed.hostname.toLowerCase()}`;
    }

    return normalizePathname(parsed.pathname);
  } catch {
    const rawPath = trimmed.split(/[?#]/, 1)[0];
    if (!rawPath || rawPath === "#") {
      return "/";
    }

    const normalized = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    return normalizePathname(normalized);
  }
}

export function getDocsLayer(route: string): string {
  const normalized = normalizeDocsAnalyticsRoute(route);
  const segments = docsSegments(normalized);
  if (segments.length === 0) {
    return normalized === DOCS_PATH_PREFIX ? "docs_home" : "outside_docs";
  }

  return normalizeContextToken(segments[0]);
}

export function getDocsJourney(route: string): string {
  const normalized = normalizeDocsAnalyticsRoute(route);
  const segments = docsSegments(normalized);
  if (segments.length === 0) {
    return normalized === DOCS_PATH_PREFIX ? "docs_home" : "outside_docs";
  }

  return normalizeContextToken(segments.slice(0, 2).join("/"));
}

export function buildDocsPathExitPayload(
  input: DocsPathExitInput,
): DocsPathExitPayload | null {
  const fromRoute = normalizeDocsAnalyticsRoute(input.fromPath);
  const toRoute = normalizeDocsAnalyticsRoute(input.toPath);

  if (!fromRoute.startsWith(DOCS_PATH_PREFIX) || fromRoute === toRoute) {
    return null;
  }

  const fromLayer = getDocsLayer(fromRoute);
  const toLayer = getDocsLayer(toRoute);
  const fromJourney = getDocsJourney(fromRoute);
  const toJourney = getDocsJourney(toRoute);
  const layerContext = normalizeContextToken(input.layerContext ?? fromLayer);

  return {
    event_type: input.eventType,
    event_timestamp: input.eventTimestamp ?? new Date().toISOString(),
    from_route: fromRoute,
    to_route: toRoute,
    nav_surface: normalizeContextToken(input.navSurface),
    interaction_type: input.interactionType,
    layer_context: layerContext,
    from_layer: fromLayer,
    to_layer: toLayer,
    from_journey: fromJourney,
    to_journey: toJourney,
  };
}

export function trackDocsPathExit(input: DocsPathExitInput): void {
  if (!docsPathAnalyticsEnabled()) {
    return;
  }

  const payload = buildDocsPathExitPayload(input);
  if (!payload) {
    return;
  }

  trackEvent(DOCS_PATH_EXIT_EVENT, payload);
}
