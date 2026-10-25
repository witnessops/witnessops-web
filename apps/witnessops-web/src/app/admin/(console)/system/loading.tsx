import { AdminSlowLoading } from "../../../../components/admin/admin-slow-loading";
import { SkeletonRow } from "../../../../components/admin/admin-skeleton";

export default function AdminSystemLoading() {
  return <AdminSlowLoading><SkeletonRow count={5} /></AdminSlowLoading>;
}
