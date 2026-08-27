import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";

import { WitnessedActionReplay } from "./witnessed-action-replay";
import styles from "./witnessed-action.module.css";

export const metadata: Metadata = {
  title: "Run a witnessed action — recorded CRM specimen",
  description:
    "Replay one completed synthetic CRM action under an explicit boundary, inspect the independent read-back, and verify an unsigned demonstration receipt.",
  alternates: getCanonicalAlternates(
    "witnessops",
    "/review/sample-cases/witnessed-crm-status-change",
  ),
};

export default function WitnessedCrmStatusChangePage() {
  return (
    <main id="main-content" tabIndex={-1} className={styles.page} data-page="witnessed-crm-status-change">
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Run a witnessed action</p>
        <h1>See one bounded action. Inspect every recorded edge.</h1>
        <p className={styles.lead}>
          Review the authority, approve a local replay, watch the fixed action sequence, and inspect the evidence and receipt.
        </p>
        <p className={styles.replayBoundary}>
          Recorded specimen. Demo. Synthetic data. This is a replay of one completed run, not live computer use.
        </p>
      </header>
      <WitnessedActionReplay />
    </main>
  );
}
