import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s — WitnessOps Library",
    default: "WitnessOps Library",
  },
  description:
    "Reasoning on trust boundaries, verification, failure modes, and governed systems.",
  openGraph: {
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
