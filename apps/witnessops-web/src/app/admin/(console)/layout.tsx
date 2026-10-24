import { Suspense } from "react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { NextRequest } from "next/server";
import { AdminAlertBell } from "../../../components/admin/admin-alert-bell";
import { AdminConsoleShell } from "../../../components/admin/admin-console-shell";
import { HEALTH_CHIP_UNAVAILABLE, buildHealthCards, healthChip, type HealthChipModel } from "@/lib/admin/admin-health-display";
import { getAdminCoreHealth, listGmailSyncReceipts } from "@/lib/server/admin-core-spine";
import { getAdminPageActor } from "@/lib/server/admin-page-session";
import { getVerifiedAdminSession } from "@/lib/server/admin-session";

export const metadata: Metadata = {
  title: { absolute: "WitnessOps Admin Console" },
  robots: { index: false, follow: false },
};

export default async function AdminConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  const requestHeaders = new Headers(await headers());
  const request = new NextRequest("https://witnessops.com/admin", {
    headers: requestHeaders,
  });
  if (!(await getVerifiedAdminSession(request))) {
    redirect("/admin/login");
  }

  let health: HealthChipModel = HEALTH_CHIP_UNAVAILABLE;
  try {
    const actor = await getAdminPageActor();
    health = healthChip(buildHealthCards(getAdminCoreHealth(), await listGmailSyncReceipts(5, actor)));
  } catch (error) {
    unstable_rethrow(error);
  }

  return (
    <>
      <style>{`
        body { overflow: hidden !important; }
        .skip-link { display: none !important; }
        nav:not([aria-label="Admin navigation"]), footer { display: none !important; }
      `}</style>

      <AdminConsoleShell alert={<Suspense><AdminAlertBell /></Suspense>} health={health}>{children}</AdminConsoleShell>
    </>
  );
}
