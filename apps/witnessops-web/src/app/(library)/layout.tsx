import type { Metadata } from "next";
import { DEFAULT_OPEN_GRAPH_IMAGES } from "@/lib/social-metadata";

export const metadata: Metadata = {
  title: {
    template: "%s — WitnessOps Skills",
    default: "WitnessOps Skills",
  },
  description:
    "Reasoning on trust boundaries, verification, failure modes, and governed systems.",
  openGraph: {
    images: DEFAULT_OPEN_GRAPH_IMAGES,
    siteName: "WitnessOps",
  },
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
