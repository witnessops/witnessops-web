import type { Metadata } from "next";

import { ExternalExposureSnapshotPage } from "@/components/marketing/external-exposure-snapshot";
import { exposureSnapshotMetadata } from "@/lib/external-exposure/catalog";

export const metadata: Metadata = exposureSnapshotMetadata;

export default function Page() {
  return <ExternalExposureSnapshotPage />;
}
