import { isAdminEntraEnabled } from "@/lib/server/admin-entra-contract";

import { AdminLoginForm } from "./admin-login-form";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return <AdminLoginForm entraEnabled={isAdminEntraEnabled()} />;
}
