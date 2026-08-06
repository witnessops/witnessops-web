import type { Metadata } from "next";
import { AdminSystem } from "../../../../components/admin/admin-system";
import { AdminAuthInfo } from "../../../../components/admin/admin-auth-info";
import { AdminKbLink } from "../../../../components/admin/admin-kb-link";

export const metadata: Metadata = {
  title: "Admin — System",
  robots: { index: false, follow: false },
};

export default function AdminSystemPage() {
  return (
    <>
      <AdminSystem />
      <AdminAuthInfo />
      <AdminKbLink />
    </>
  );
}
