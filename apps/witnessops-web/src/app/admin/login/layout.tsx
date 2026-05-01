import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "WitnessOps Admin Login",
  robots: { index: false, follow: false },
};

export default function AdminLoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
