"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { errorTitleForPath } from "@/lib/admin/admin-list-surface";
import { AdminPageError } from "../../../components/admin/admin-page-error";

export default function AdminConsoleError({
  error,
  reset,
}: {
  error: Error & { status?: number };
  reset: () => void;
}) {
  const pathname = usePathname();
  const [occurredAt] = useState(() => new Date().toISOString());
  const statusCode = typeof error.status === "number" ? error.status : null;
  return (
    <AdminPageError
      title={errorTitleForPath(pathname)}
      statusCode={statusCode}
      occurredAt={occurredAt}
      onRetry={reset}
    />
  );
}
