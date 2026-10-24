import { AdminSlowLoading } from "../../../../components/admin/admin-slow-loading";
import { SkeletonRow } from "../../../../components/admin/admin-skeleton";

export default function AdminReportsLoading() {
  return <AdminSlowLoading><SkeletonRow count={6} /></AdminSlowLoading>;
}
