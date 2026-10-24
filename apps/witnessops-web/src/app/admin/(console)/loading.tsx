import { AdminSlowLoading } from "../../../components/admin/admin-slow-loading";
import { SkeletonCards, SkeletonRow } from "../../../components/admin/admin-skeleton";

export default function AdminOverviewLoading() {
  return (
    <AdminSlowLoading>
      <SkeletonCards count={6} />
      <SkeletonRow count={4} />
    </AdminSlowLoading>
  );
}
