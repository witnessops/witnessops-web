import { AdminSlowLoading } from "../../../../components/admin/admin-slow-loading";
import { SkeletonQueue } from "../../../../components/admin/admin-skeleton";

export default function AdminQueueLoading() {
  return <AdminSlowLoading><SkeletonQueue count={5} /></AdminSlowLoading>;
}
