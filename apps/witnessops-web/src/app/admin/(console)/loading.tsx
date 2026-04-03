import { SkeletonCards, SkeletonRow } from "../../../components/admin/admin-skeleton";

export default function AdminOverviewLoading() {
  return (
    <>
      <SkeletonCards count={6} />
      <SkeletonRow count={4} />
    </>
  );
}
