export type SurfaceRegistryEntry = {
  surfaceId:
    | "vaultmesh"
    | "verify"
    | "attest"
    | "status"
    | "hub"
    | "witnessops";
  appName: string;
  hostname: string;
  canonicalUrl: string;
  localPort?: number;
  docsHost?: string;
  contentRoot?: string;
  proofRoot?: string;
  redirectsFrom?: string[];
};

export type SurfaceId = SurfaceRegistryEntry["surfaceId"];
export type DocsSurfaceId = Extract<SurfaceId, "vaultmesh" | "witnessops">;
export type SurfaceUrlMode = "runtime" | "canonical";
export type VaultMeshFooterSurfaceId = Extract<
  SurfaceId,
  "vaultmesh" | "verify" | "attest" | "hub" | "status"
>;
export type VaultMeshSiblingNavSurfaceId = VaultMeshFooterSurfaceId;

export type VaultMeshFooterLink = {
  label: string;
  href: string;
};

export type VaultMeshSiblingNavLink = {
  label: string;
  href: string;
  matchPrefixes?: string[];
};

export type VaultMeshSiblingNavCta = {
  label: string;
  href: string;
  variant: "primary" | "secondary" | "ghost";
  matchPrefixes?: string[];
};

export type VaultMeshSiblingNavContract = {
  surfaceId: VaultMeshSiblingNavSurfaceId;
  links: VaultMeshSiblingNavLink[];
  cta: VaultMeshSiblingNavCta | null;
};

export type VaultMeshFooterContract = {
  surfaceId: VaultMeshFooterSurfaceId;
  brandLine: string;
  subline: string;
  protocolLabel: string;
  domainLabel: string;
  copyright: string;
  partner: VaultMeshFooterLink;
  surfaces: VaultMeshFooterLink[];
  docs: VaultMeshFooterLink[];
  support: VaultMeshFooterLink[];
  legal: VaultMeshFooterLink[];
  strip: VaultMeshFooterLink[];
};

export type WitnessOpsFooterSurfaceId = Extract<SurfaceId, "witnessops">;
export type WitnessOpsFooterLink = VaultMeshFooterLink;
export type WitnessOpsFooterContract = {
  surfaceId: WitnessOpsFooterSurfaceId;
  brandLine: string;
  subline: string;
  protocolLabel: string;
  domainLabel: string;
  copyright: string;
  partner: WitnessOpsFooterLink;
  surfaces: WitnessOpsFooterLink[];
  docs: WitnessOpsFooterLink[];
  support: WitnessOpsFooterLink[];
  legal: WitnessOpsFooterLink[];
  strip: WitnessOpsFooterLink[];
};

export type WitnessOpsSiblingNavSurfaceId = Extract<SurfaceId, "witnessops">;
export type WitnessOpsSiblingNavLink = VaultMeshSiblingNavLink;
export type WitnessOpsSiblingNavCta = VaultMeshSiblingNavCta;
export type WitnessOpsSiblingNavContract = {
  surfaceId: WitnessOpsSiblingNavSurfaceId;
  links: WitnessOpsSiblingNavLink[];
  cta: WitnessOpsSiblingNavCta | null;
};

export const surfaceRegistry = [
  {
    surfaceId: "vaultmesh",
    appName: "vaultmesh-web",
    hostname: "vaultmesh.org",
    canonicalUrl: "https://vaultmesh.org",
    localPort: 3000,
    docsHost: "docs.vaultmesh.org",
    contentRoot: "content/vaultmesh/homepage",
  },
  {
    surfaceId: "verify",
    appName: "verify-web",
    hostname: "verify.vaultmesh.org",
    canonicalUrl: "https://verify.vaultmesh.org",
    localPort: 3003,
    contentRoot: "content/vaultmesh/verify",
    proofRoot: "proofs/vaultmesh/bundles",
  },
  {
    surfaceId: "attest",
    appName: "attest-web",
    hostname: "attest.vaultmesh.org",
    canonicalUrl: "https://attest.vaultmesh.org",
    localPort: 3004,
    contentRoot: "content/vaultmesh/attest",
    proofRoot: "proofs/vaultmesh",
  },
  {
    surfaceId: "status",
    appName: "status-web",
    hostname: "status.vaultmesh.org",
    canonicalUrl: "https://status.vaultmesh.org",
    localPort: 3002,
    contentRoot: "content/vaultmesh/status",
  },
  {
    surfaceId: "hub",
    appName: "hub-web",
    hostname: "hub.vaultmesh.org",
    canonicalUrl: "https://hub.vaultmesh.org",
    localPort: 3005,
    contentRoot: "content/vaultmesh/hub",
  },
  {
    surfaceId: "witnessops",
    appName: "witnessops-web",
    hostname: "witnessops.com",
    canonicalUrl: "https://witnessops.com",
    localPort: 3001,
    docsHost: "docs.witnessops.com",
    contentRoot: "content/witnessops/landing",
  },
] satisfies SurfaceRegistryEntry[];

export function getSurface(surfaceId: SurfaceId) {
  return surfaceRegistry.find((surface) => surface.surfaceId === surfaceId);
}

function shouldUseLocalSurfaceOrigins() {
  return process.env.NODE_ENV !== "production";
}

function getLocalSurfaceOrigin(surface: SurfaceRegistryEntry) {
  if (!surface.localPort) {
    return null;
  }

  return `http://localhost:${surface.localPort}`;
}

function normalizePathname(pathname = "/") {
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function toLocalDocsPathname(pathname = "/") {
  const normalizedPath = normalizePathname(pathname);

  if (normalizedPath === "/" || normalizedPath === "") {
    return "/docs";
  }

  if (normalizedPath === "/docs" || normalizedPath.startsWith("/docs/")) {
    return normalizedPath;
  }

  return `/docs${normalizedPath}`;
}

export function getSurfaceOrigin(
  surfaceId: SurfaceId,
  options: { mode?: SurfaceUrlMode } = {},
) {
  const surface = getSurface(surfaceId);

  if (!surface) {
    throw new Error(`Unknown surface: ${surfaceId}`);
  }

  if (options.mode === "canonical" || !shouldUseLocalSurfaceOrigins()) {
    return surface.canonicalUrl;
  }

  return getLocalSurfaceOrigin(surface) ?? surface.canonicalUrl;
}

export function getSurfaceUrl(
  surfaceId: SurfaceId,
  pathname = "/",
  options: { mode?: SurfaceUrlMode } = {},
) {
  return new URL(normalizePathname(pathname), getSurfaceOrigin(surfaceId, options)).toString();
}

export function getCanonicalSurfaceUrl(surfaceId: SurfaceId, pathname = "/") {
  return getSurfaceUrl(surfaceId, pathname, { mode: "canonical" });
}

export function getDocsOrigin(
  surfaceId: DocsSurfaceId,
  options: { mode?: SurfaceUrlMode } = {},
) {
  const surface = getSurface(surfaceId);

  if (!surface) {
    throw new Error(`Unknown surface: ${surfaceId}`);
  }

  if (!surface.docsHost) {
    throw new Error(`Surface does not define a docs host: ${surfaceId}`);
  }

  if (options.mode === "canonical" || !shouldUseLocalSurfaceOrigins()) {
    return `https://${surface.docsHost}`;
  }

  return getSurfaceOrigin(surfaceId, options);
}

export function getDocsUrl(
  surfaceId: DocsSurfaceId,
  pathname = "/",
  options: { mode?: SurfaceUrlMode } = {},
) {
  const docsPath =
    options.mode === "canonical" || !shouldUseLocalSurfaceOrigins()
      ? normalizePathname(pathname)
      : toLocalDocsPathname(pathname);

  return new URL(docsPath, getDocsOrigin(surfaceId, options)).toString();
}

export function getCanonicalDocsUrl(surfaceId: DocsSurfaceId, pathname = "/") {
  return getDocsUrl(surfaceId, pathname, { mode: "canonical" });
}

import { getSurfaceUIContract } from "./surface-ui-contract";

const protocolLabelBySurface: Record<VaultMeshFooterSurfaceId, string> = {
  vaultmesh: "VaultMesh Protocol v1",
  verify: "Verification surface",
  attest: "Publication surface",
  hub: "Operator surface",
  status: "Status surface",
};

const copyrightBySurface: Record<VaultMeshFooterSurfaceId, string> = {
  vaultmesh: "© VaultMesh Foundation",
  verify: "VaultMesh public verification surface",
  attest: "VaultMesh publication surface",
  hub: "VaultMesh operator launcher surface",
  status: "VaultMesh status surface",
};

export function getVaultMeshFooterContract(
  surfaceId: VaultMeshFooterSurfaceId,
): VaultMeshFooterContract {
  const ui = getSurfaceUIContract(surfaceId);
  const surface = getSurface(surfaceId);

  return {
    surfaceId,
    brandLine: ui.brandLine,
    subline: ui.subline,
    protocolLabel: protocolLabelBySurface[surfaceId],
    domainLabel: surface?.hostname ?? surfaceId,
    copyright: copyrightBySurface[surfaceId],
    partner: {
      label: "Portable proof for governed events",
      href: getSurfaceUrl("vaultmesh"),
    },
    surfaces: [
      { label: "VaultMesh", href: getSurfaceUrl("vaultmesh") },
      { label: "Verify", href: getSurfaceUrl("verify") },
      { label: "Published Proofs", href: getSurfaceUrl("vaultmesh", "/proofs") },
      { label: "Attest", href: getSurfaceUrl("attest") },
      { label: "Hub", href: getSurfaceUrl("hub") },
      { label: "Status", href: getSurfaceUrl("status") },
    ],
    docs: [
      { label: "Docs", href: getDocsUrl("vaultmesh") },
      { label: "Architecture", href: getDocsUrl("vaultmesh", "/architecture") },
      { label: "Protocol", href: getDocsUrl("vaultmesh", "/protocol") },
      { label: "Verification", href: getDocsUrl("vaultmesh", "/verification") },
      { label: "Reference", href: getDocsUrl("vaultmesh", "/reference") },
    ],
    support: [
      { label: "Contact", href: getSurfaceUrl("vaultmesh", "/contact") },
      { label: "Support", href: getSurfaceUrl("vaultmesh", "/support") },
    ],
    legal: [
      { label: "Privacy", href: getSurfaceUrl("vaultmesh", "/privacy") },
      { label: "Terms", href: getSurfaceUrl("vaultmesh", "/terms") },
      { label: "Security", href: getSurfaceUrl("vaultmesh", "/security") },
    ],
    strip: [
      { label: "vaultmesh.org", href: getSurfaceUrl("vaultmesh") },
      { label: "verify.vaultmesh.org", href: getSurfaceUrl("verify") },
      { label: "attest.vaultmesh.org", href: getSurfaceUrl("attest") },
      { label: "hub.vaultmesh.org", href: getSurfaceUrl("hub") },
      { label: "status.vaultmesh.org", href: getSurfaceUrl("status") },
    ],
  };
}

export function getVaultMeshSiblingNavContract(
  surfaceId: VaultMeshSiblingNavSurfaceId,
): VaultMeshSiblingNavContract {
  const sharedDocsHref = getDocsUrl("vaultmesh");
  const sharedContactCta: VaultMeshSiblingNavCta = {
    label: "Contact",
    href: getSurfaceUrl("vaultmesh", "/contact"),
    variant: "primary",
  };

  switch (surfaceId) {
    case "vaultmesh":
      return {
        surfaceId,
        links: [
          { label: "Published Proofs", href: "/proofs", matchPrefixes: ["/proofs"] },
          { label: "Verify", href: getSurfaceUrl("verify") },
          { label: "Attest", href: getSurfaceUrl("attest") },
          { label: "Hub", href: getSurfaceUrl("hub") },
          { label: "Docs", href: sharedDocsHref, matchPrefixes: ["/docs"] },
          { label: "Status", href: getSurfaceUrl("status") },
        ],
        cta: {
          label: "Verify",
          href: getSurfaceUrl("verify"),
          variant: "primary",
        },
      };
    case "verify":
      return {
        surfaceId,
        links: [
          { label: "Verify", href: "/", matchPrefixes: ["/"] },
          { label: "Published Proofs", href: getSurfaceUrl("attest", "/proofs") },
          { label: "Attest", href: getSurfaceUrl("attest") },
          { label: "Hub", href: getSurfaceUrl("hub") },
          { label: "Docs", href: sharedDocsHref },
          { label: "Status", href: getSurfaceUrl("status") },
        ],
        cta: sharedContactCta,
      };
    case "attest":
      return {
        surfaceId,
        links: [
          { label: "Attest", href: "/", matchPrefixes: ["/"] },
          { label: "Published Proofs", href: "/proofs", matchPrefixes: ["/proofs"] },
          { label: "Verify", href: getSurfaceUrl("verify") },
          { label: "Hub", href: getSurfaceUrl("hub") },
          { label: "Docs", href: sharedDocsHref },
          { label: "Status", href: getSurfaceUrl("status") },
        ],
        cta: sharedContactCta,
      };
    case "hub":
      return {
        surfaceId,
        links: [
          {
            label: "Hub",
            href: "/",
            matchPrefixes: ["/", "/install", "/launcher", "/runbooks", "/knowledge-base"],
          },
          { label: "Published Proofs", href: getSurfaceUrl("attest", "/proofs") },
          { label: "Verify", href: getSurfaceUrl("verify") },
          { label: "Attest", href: getSurfaceUrl("attest") },
          { label: "Docs", href: sharedDocsHref },
          { label: "Status", href: getSurfaceUrl("status") },
        ],
        cta: sharedContactCta,
      };
    case "status":
      return {
        surfaceId,
        links: [
          { label: "Status", href: "/", matchPrefixes: ["/", "/incidents"] },
          { label: "Published Proofs", href: getSurfaceUrl("attest", "/proofs") },
          { label: "Verify", href: getSurfaceUrl("verify") },
          { label: "Attest", href: getSurfaceUrl("attest") },
          { label: "Hub", href: getSurfaceUrl("hub") },
          { label: "Docs", href: sharedDocsHref },
        ],
        cta: null,
      };
  }
}

export function getWitnessOpsFooterContract(
  surfaceId: WitnessOpsFooterSurfaceId = "witnessops",
): WitnessOpsFooterContract {
  const ui = getSurfaceUIContract(surfaceId);
  const surface = getSurface(surfaceId);

  return {
    surfaceId,
    brandLine: ui.brandLine,
    subline: ui.subline,
    protocolLabel: "WitnessOps public surface",
    domainLabel: surface?.hostname ?? surfaceId,
    copyright: "© WITNESSOPS Foundation",
    partner: {
      label: "Proof-backed security operations",
      href: getSurfaceUrl("witnessops"),
    },
    surfaces: [{ label: "WitnessOps", href: getSurfaceUrl("witnessops") }],
    docs: [
      { label: "Docs", href: getDocsUrl("witnessops") },
      { label: "How It Works", href: getDocsUrl("witnessops", "/how-it-works") },
      { label: "Evidence", href: getDocsUrl("witnessops", "/evidence") },
      { label: "Governance", href: getDocsUrl("witnessops", "/governance") },
      { label: "Reference", href: getDocsUrl("witnessops", "/reference") },
    ],
    support: [
      { label: "Contact", href: getSurfaceUrl("witnessops", "/contact") },
      { label: "Support", href: getSurfaceUrl("witnessops", "/support") },
    ],
    legal: [
      { label: "Privacy", href: getSurfaceUrl("witnessops", "/privacy") },
      { label: "Terms", href: getSurfaceUrl("witnessops", "/terms") },
      { label: "Security", href: getSurfaceUrl("witnessops", "/security") },
    ],
    strip: [
      { label: "witnessops.com", href: getSurfaceUrl("witnessops") },
      { label: "docs.witnessops.com", href: getDocsUrl("witnessops") },
    ],
  };
}

export function getWitnessOpsSiblingNavContract(
  surfaceId: WitnessOpsSiblingNavSurfaceId = "witnessops",
): WitnessOpsSiblingNavContract {
  const sharedDocsHref = getDocsUrl("witnessops");

  return {
    surfaceId,
    links: [
      { label: "How It Works", href: "/why-witnessops", matchPrefixes: ["/why-witnessops"] },
      { label: "Docs", href: sharedDocsHref, matchPrefixes: ["/docs"] },
      { label: "Support", href: getSurfaceUrl("witnessops", "/support"), matchPrefixes: ["/support"] },
    ],
    cta: {
      label: "Engage",
      href: getSurfaceUrl("witnessops", "/contact"),
      variant: "primary",
    },
  };
}
