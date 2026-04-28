type AssetFoundryVisual = {
  assetId: string;
  src: string;
  width: number;
  height: number;
  alt: string;
};

/**
 * Asset Foundry visual lineage:
 * source repo: witnessops-asset-foundry
 * source path: asset_system/image_plates/...
 * source status: accepted v3 image plate
 * text policy: no baked text
 */
export const assetFoundryVisuals = {
  homepageHero: {
    assetId: "hero_home_proof_execution_surface",
    src: "/visuals/asset-foundry/hero_home_proof_execution_surface__hero_1920x640__plate.png",
    width: 1920,
    height: 640,
    alt: "Dark WitnessOps proof execution visual showing orange execution traces entering a hexagonal proof boundary.",
  },
  proofBundleReceipt: {
    assetId: "01_consequential_decisions_leave_receipts",
    src: "/visuals/asset-foundry/01_consequential_decisions_leave_receipts__linkedin_1200x627__plate.png",
    width: 1200,
    height: 627,
    alt: "Dark receipt asset plate with orange hex seal and stacked proof-bundle surfaces.",
  },
} satisfies Record<string, AssetFoundryVisual>;
