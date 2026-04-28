type AssetFoundryVisual = {
  assetId: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  sourcePath?: string;
  sourceRecord?: string;
  sourceStatus?: string;
  sourceCommit?: string;
  sourceSha256?: string;
};

/**
 * Asset Foundry visual lineage:
 * source repo: witnessops-asset-foundry
 * source path: asset_system/image_plates/...
 * source status: per-visual metadata records current website source status
 * text policy: no baked text
 */
export const assetFoundryVisuals = {
  homepageHero: {
    assetId: "hero_home_proof_execution_surface",
    src: "/visuals/asset-foundry/hero_home_proof_execution_surface__hero_1920x640__plate.png",
    width: 1920,
    height: 640,
    alt: "Dark WitnessOps proof execution visual showing orange execution traces entering a hexagonal proof boundary.",
    sourcePath:
      "WITNESSOPS_ASSET_SYSTEM_v3_OPERATOR_GRADE_20260427/assets/image_plates/hero_1920x640/hero_home_proof_execution_surface__hero_1920x640__plate.png",
    sourceRecord:
      "witnessops-asset-foundry/asset_system/source_manifests/retired_v3_plate_replacements.json",
    sourceStatus: "retired accepted v3 image plate reused as decorative website atmosphere",
    sourceCommit: "4d516b3cfc0a6abf20e7ec7c24608fb73e77f5bf",
    sourceSha256: "5ee2f957b75ce86c8dc92b6892c0a49d046569f58549bd5a010158b3ddfc49be",
  },
  proofBundleReceipt: {
    assetId: "01_consequential_decisions_leave_receipts",
    src: "/visuals/asset-foundry/01_consequential_decisions_leave_receipts__linkedin_1200x627__plate.png",
    width: 1200,
    height: 627,
    alt: "Dark receipt asset plate with orange hex seal and stacked proof-bundle surfaces.",
  },
} satisfies Record<string, AssetFoundryVisual>;
