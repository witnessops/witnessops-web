import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminSystem } from "../../../../components/admin/admin-system";
import { AdminAuthInfo } from "../../../../components/admin/admin-auth-info";
import { AdminKbLink } from "../../../../components/admin/admin-kb-link";

export const metadata: Metadata = {
  title: "Admin — System",
  robots: { index: false, follow: false },
};

function extractKeyHash(cookieValue: string | undefined): string {
  if (!cookieValue) return "";
  try {
    const dotIndex = cookieValue.lastIndexOf(".");
    if (dotIndex === -1) return "";
    const payloadB64 = cookieValue.slice(0, dotIndex);
    const payload = JSON.parse(atob(payloadB64));
    return typeof payload.hash === "string" ? payload.hash : "";
  } catch {
    return "";
  }
}

export default async function AdminSystemPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("witnessops-admin-session")?.value;
  const keyHash = extractKeyHash(sessionCookie);

  return (
    <>
      <AdminSystem />
      <AdminAuthInfo keyHash={keyHash} />
      <AdminKbLink />
    </>
  );
}
