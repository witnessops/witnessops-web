import type { ReactNode } from "react";
import styles from "./kb-components.module.css";

export function KBTable({
  headers,
  rows,
  highlight,
}: {
  headers: string[];
  rows: (string | ReactNode)[][];
  highlight?: number;
}) {
  return (
    <table className={styles.docTable}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} className={ri === highlight ? styles.highlighted : undefined}>
            {row.map((cell, ci) => (
              <td key={ci}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
