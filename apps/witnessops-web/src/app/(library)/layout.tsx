import type { Metadata } from "next";
import { DEFAULT_OPEN_GRAPH_IMAGES } from "@/lib/social-metadata";

export const metadata: Metadata = {
  title: {
    template: "%s — WitnessOps Library",
    default: "WitnessOps Library",
  },
  description:
    "Reasoning on trust boundaries, verification, failure modes, and governed systems.",
  openGraph: {
    siteName: "WitnessOps",
    images: DEFAULT_OPEN_GRAPH_IMAGES,
  },
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
