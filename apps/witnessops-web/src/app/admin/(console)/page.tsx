import type { Metadata } from "next";
import { AdminCoreDashboard } from "../../../components/admin/admin-core-dashboard";

export const metadata: Metadata = {
  title: "Admin — Overview",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default function AdminOverviewPage() {
  return <AdminCoreDashboard />;
}
