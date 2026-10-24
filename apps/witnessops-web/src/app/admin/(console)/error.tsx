"use client";

import { startTransition, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { errorTitleForPath } from "@/lib/admin/admin-list-surface";
import { AdminPageError } from "../../../components/admin/admin-page-error";

const ERROR_TEXT = "The request failed, so this list may not be empty. Nothing was changed.";

export function AdminConsoleErrorView({
  pathname,
  error,
  occurredAt,
  onRetry,
}: {
  pathname: string;
  error: Error & { status?: number };
  occurredAt: string;
  onRetry: () => void;
}) {
  const statusCode = typeof error.status === "number" ? error.status : null;
  return (
    <AdminPageError
      title={errorTitleForPath(pathname)}
      text={ERROR_TEXT}
      statusCode={statusCode}
      occurredAt={occurredAt}
      onRetry={onRetry}
    />
  );
}

export default function AdminConsoleError({
  error,
  reset,
}: {
  error: Error & { status?: number };
  reset: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [occurredAt] = useState(() => new Date().toISOString());
  return (
    <AdminConsoleErrorView
      pathname={pathname}
      error={error}
      occurredAt={occurredAt}
      onRetry={() => {
        startTransition(() => {
          router.refresh();
          reset();
        });
      }}
    />
  );
}
