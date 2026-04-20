import type { Metadata } from "next";
import { AdminAdmissionQueue } from "../../../../components/admin/admin-admission-queue";

export const metadata: Metadata = {
  title: "Admin — Queue",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ filter?: string; selected?: string }>;
}

export default async function AdminQueuePage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <AdminAdmissionQueue
      initialFilter={params.filter ?? null}
      selectedIntakeId={params.selected ?? null}
    />
  );
}
