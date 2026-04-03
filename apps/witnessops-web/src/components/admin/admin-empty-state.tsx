import styles from "./admin.module.css";

type EmptyVariant =
  | "empty-queue"
  | "no-filter-results"
  | "no-alerts"
  | "no-reconciliation-history"
  | "no-eligible-actions"
  | "unavailable";

const messages: Record<EmptyVariant, string> = {
  "empty-queue": "No intakes in queue.",
  "no-filter-results": "No items match the current filter.",
  "no-alerts": "No pending alerts.",
  "no-reconciliation-history": "No reconciliation history yet.",
  "no-eligible-actions": "No actions available for current policy state.",
  unavailable: "Data unavailable. Check server logs.",
};

interface AdminEmptyStateProps {
  variant: EmptyVariant;
  detail?: string;
}

export function AdminEmptyState({ variant, detail }: AdminEmptyStateProps) {
  const isError = variant === "unavailable";
  return (
    <div className={isError ? styles.emptyStateError : styles.emptyState}>
      {messages[variant]}
      {detail ? (
        <>
          <br />
          <span className={styles.emptyStateDetail}>{detail}</span>
        </>
      ) : null}
    </div>
  );
}
