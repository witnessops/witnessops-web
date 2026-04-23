import type {
  SurfaceId,
  DocsSurfaceId,
  VaultMeshSiblingNavContract,
  VaultMeshFooterContract,
  VaultMeshFooterSurfaceId,
  VaultMeshSiblingNavSurfaceId,
} from "./surfaces";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SurfaceBrand = "vaultmesh" | "witnessops";
export type SurfaceTokenSet = "vaultmesh" | "witnessops";
export type WitnessOpsSurfaceBrand = "witnessops";
export type WitnessOpsSurfaceTokenSet = "witnessops";
export type SurfaceRole =
  | "platform"
  | "verification"
  | "publication"
  | "operator"
  | "status"
  | "security";

export type SurfaceHeaderType = "sibling" | "marketing" | "docs" | "custom";
export type SurfaceFooterType = "vaultmesh-surface" | "witnessops-standalone";
export type WitnessOpsSurfaceFooterType = "witnessops-standalone";

export type SurfaceUIContract = {
  /** Surface identifier */
  surfaceId: SurfaceId;

  /** Identity */
  brand: SurfaceBrand;
  brandLine: string;
  subline: string;
  role: SurfaceRole;

  /** Shell */
  shell: {
    theme: "dark";
    tokenSet: SurfaceTokenSet;
    fonts: string[];
    maxWidth: "content" | "narrow";
  };

  /** Header */
  header: {
    type: SurfaceHeaderType;
    logo: { mark: string; insignia: string };
  };

  /** Footer */
  footer: {
    type: SurfaceFooterType;
  };

  /** Redirects ownership — which surface is the canonical owner for each shared route */
  redirects: {
    contact: SurfaceId;
    pricing: SurfaceId;
    privacy: SurfaceId;
    terms: SurfaceId;
    security: SurfaceId;
    support: SurfaceId;
    docs: DocsSurfaceId;
    proofs: SurfaceId;
    status: SurfaceId;
  };

  /** API capability flags */
  api: {
    verify: boolean;
    verifyCanonical: boolean;
    contact: boolean;
    intake: boolean;
  };
};

// ---------------------------------------------------------------------------
// Contract data
// ---------------------------------------------------------------------------

const VAULTMESH_FONTS = ["Inter", "IBM Plex Mono"];
const WITNESSOPS_FONTS = ["Inter", "IBM Plex Mono", "Barlow Condensed"];

const VAULTMESH_REDIRECTS: SurfaceUIContract["redirects"] = {
  contact: "vaultmesh",
  pricing: "vaultmesh",
  privacy: "vaultmesh",
  terms: "vaultmesh",
  security: "vaultmesh",
  support: "vaultmesh",
  docs: "vaultmesh",
  proofs: "attest",
  status: "status",
};

const contracts: Record<SurfaceId, SurfaceUIContract> = {
  vaultmesh: {
    surfaceId: "vaultmesh",
    brand: "vaultmesh",
    brandLine: "VaultMesh",
    subline: "Verification infrastructure for governed systems.",
    role: "platform",
    shell: {
      theme: "dark",
      tokenSet: "vaultmesh",
      fonts: VAULTMESH_FONTS,
      maxWidth: "content",
    },
    header: {
      type: "marketing",
      logo: { mark: "φ", insignia: "01" },
    },
    footer: { type: "vaultmesh-surface" },
    redirects: {
      ...VAULTMESH_REDIRECTS,
      contact: "vaultmesh",
    },
    api: {
      verify: true,
      verifyCanonical: true,
      contact: true,
      intake: true,
    },
  },

  verify: {
    surfaceId: "verify",
    brand: "vaultmesh",
    brandLine: "VaultMesh Verify",
    subline: "Independent proof verification surface",
    role: "verification",
    shell: {
      theme: "dark",
      tokenSet: "vaultmesh",
      fonts: VAULTMESH_FONTS,
      maxWidth: "content",
    },
    header: {
      type: "sibling",
      logo: { mark: "φ", insignia: "01" },
    },
    footer: { type: "vaultmesh-surface" },
    redirects: VAULTMESH_REDIRECTS,
    api: {
      verify: true,
      verifyCanonical: true,
      contact: true,
      intake: true,
    },
  },

  attest: {
    surfaceId: "attest",
    brand: "vaultmesh",
    brandLine: "VaultMesh Attest",
    subline: "Canonical proof publication surface",
    role: "publication",
    shell: {
      theme: "dark",
      tokenSet: "vaultmesh",
      fonts: VAULTMESH_FONTS,
      maxWidth: "content",
    },
    header: {
      type: "sibling",
      logo: { mark: "φ", insignia: "01" },
    },
    footer: { type: "vaultmesh-surface" },
    redirects: VAULTMESH_REDIRECTS,
    api: {
      verify: true,
      verifyCanonical: false,
      contact: true,
      intake: true,
    },
  },

  hub: {
    surfaceId: "hub",
    brand: "vaultmesh",
    brandLine: "VaultMesh Hub",
    subline: "Operator launcher and runbook surface",
    role: "operator",
    shell: {
      theme: "dark",
      tokenSet: "vaultmesh",
      fonts: VAULTMESH_FONTS,
      maxWidth: "content",
    },
    header: {
      type: "sibling",
      logo: { mark: "φ", insignia: "01" },
    },
    footer: { type: "vaultmesh-surface" },
    redirects: VAULTMESH_REDIRECTS,
    api: {
      verify: true,
      verifyCanonical: false,
      contact: true,
      intake: true,
    },
  },

  status: {
    surfaceId: "status",
    brand: "vaultmesh",
    brandLine: "VaultMesh Status",
    subline: "Published status snapshots for VaultMesh infrastructure.",
    role: "status",
    shell: {
      theme: "dark",
      tokenSet: "vaultmesh",
      fonts: VAULTMESH_FONTS,
      maxWidth: "narrow",
    },
    header: {
      type: "sibling",
      logo: { mark: "φ", insignia: "01" },
    },
    footer: { type: "vaultmesh-surface" },
    redirects: VAULTMESH_REDIRECTS,
    api: {
      verify: false,
      verifyCanonical: false,
      contact: false,
      intake: false,
    },
  },

  witnessops: {
    surfaceId: "witnessops",
    brand: "witnessops",
    brandLine: "WITNESSOPS",
    subline: "Portable proof for consequential security work.",
    role: "security",
    shell: {
      theme: "dark",
      tokenSet: "witnessops",
      fonts: WITNESSOPS_FONTS,
      maxWidth: "content",
    },
    header: {
      type: "custom",
      logo: { mark: "hex", insignia: "WITNESSOPS" },
    },
    footer: { type: "witnessops-standalone" },
    redirects: {
      contact: "witnessops",
      pricing: "witnessops",
      privacy: "witnessops",
      terms: "witnessops",
      security: "witnessops",
      support: "witnessops",
      docs: "witnessops",
      proofs: "attest",
      status: "status",
    },
    api: {
      verify: false,
      verifyCanonical: false,
      contact: true,
      intake: true,
    },
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getSurfaceUIContract(surfaceId: SurfaceId): SurfaceUIContract {
  return contracts[surfaceId];
}

/**
 * Type guard: true if the surface uses the VaultMesh sibling navbar.
 */
export function isVaultMeshNavSurface(
  surfaceId: SurfaceId,
): surfaceId is VaultMeshSiblingNavSurfaceId {
  return contracts[surfaceId].brand === "vaultmesh";
}

/**
 * Type guard: true if the surface uses the WitnessOps sibling navbar.
 */
export function isWitnessOpsNavSurface(
  surfaceId: SurfaceId,
): surfaceId is Extract<SurfaceId, "witnessops"> {
  return contracts[surfaceId].brand === "witnessops";
}

/**
 * Type guard: true if the surface uses the VaultMesh surface footer.
 */
export function isVaultMeshFooterSurface(
  surfaceId: SurfaceId,
): surfaceId is VaultMeshFooterSurfaceId {
  return contracts[surfaceId].footer.type === "vaultmesh-surface";
}

/**
 * Type guard: true if the surface uses the WitnessOps standalone footer.
 */
export function isWitnessOpsFooterSurface(
  surfaceId: SurfaceId,
): surfaceId is Extract<SurfaceId, "witnessops"> {
  return contracts[surfaceId].footer.type === "witnessops-standalone";
}
