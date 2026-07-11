import { Suspense } from "react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminAlertBell } from "../../../components/admin/admin-alert-bell";
import { AdminConsoleShell } from "../../../components/admin/admin-console-shell";

export const metadata: Metadata = {
  title: "WitnessOps Admin Console",
  robots: { index: false, follow: false },
};

export default function AdminConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <style>{`
        body { overflow: hidden !important; }
        .skip-link { display: none !important; }
        nav:not([aria-label="Admin navigation"]), footer { display: none !important; }
      `}</style>

      <AdminConsoleShell alert={<Suspense><AdminAlertBell /></Suspense>}>{children}</AdminConsoleShell>
    </>
  );
}
