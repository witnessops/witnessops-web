import styles from "./admin.module.css";

export function SkeletonRow({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.skeletonRow}>
          <div className={styles.skeletonBlock} style={{ width: "30%" }} />
          <div className={styles.skeletonBlock} style={{ width: "15%" }} />
        </div>
      ))}
    </>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className={styles.overviewStatGrid}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.skeletonCard}>
          <div className={styles.skeletonBlock} style={{ width: "60%", height: "10px" }} />
          <div className={styles.skeletonBlock} style={{ width: "40%", height: "20px", marginTop: "8px" }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonQueue({ count = 5 }: { count?: number }) {
  return (
    <>
      <div className={styles.skeletonFilterBar}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={styles.skeletonPill} />
        ))}
      </div>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.skeletonQueueItem}>
          <div className={styles.skeletonBlock} style={{ width: "50%", height: "12px" }} />
          <div className={styles.skeletonBlock} style={{ width: "80%", height: "10px", marginTop: "10px" }} />
          <div className={styles.skeletonBlock} style={{ width: "60%", height: "10px", marginTop: "6px" }} />
        </div>
      ))}
    </>
  );
}
