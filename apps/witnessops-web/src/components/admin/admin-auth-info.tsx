import styles from "./admin.module.css";

export function AdminAuthInfo() {
  return (
    <>
      <div className={styles.sectionHeader}>Auth</div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Logout</span>
        <form action="/api/admin/logout" method="post">
          <button className={styles.rowAction} type="submit">
            End Google Workspace Session
          </button>
        </form>
      </div>
    </>
  );
}
