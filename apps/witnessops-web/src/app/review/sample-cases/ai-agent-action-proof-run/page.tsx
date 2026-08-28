import type { Metadata } from "next";
import Link from "next/link";
import { getCanonicalAlternates } from "@witnessops/config";
import { buyerPublicOfferRequestHref } from "@/lib/buyer-services";
import { ApiKeyRotationDemo } from "./api-key-rotation-demo";
import styles from "./api-key-rotation-demo.module.css";
import {
  publicVerifierSha256,
  sampleBaseUrl,
  sampleBundleSha256,
  sampleCommitShort,
} from "./sample-artifact-contract";

const reviewRequestHref = buyerPublicOfferRequestHref(
  "en",
  "bounded-workflow-review",
);

export const metadata: Metadata = {
  title: "Compromised API key rotation — verifiable demo",
  description:
    "Replay one signed synthetic API-key rotation, verify its Ed25519 receipt and exact evidence in your browser, then reproduce the verdict offline.",
  alternates: getCanonicalAlternates(
    "witnessops",
    "/review/sample-cases/ai-agent-action-proof-run",
  ),
  openGraph: {
    title: "Synthetic key compromise. Watch the agent rotate it — then verify the proof.",
    description:
      "A public, signed synthetic run with exact evidence, browser verification, an offline verifier, and a one-byte tamper challenge.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Compromised API key rotation — verifiable demo",
    description:
      "Replay the signed run, inspect every check, and reproduce the verdict without trusting WitnessOps.",
  },
};

export default function ApiKeyRotationSamplePage() {
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroMeta}>
          <strong>Compromise signal received</strong>
          <span>Public synthetic proof</span>
          <span>Fixed run · 2026-08-27</span>
        </div>
        <h1>
          The key leaked.
          <br />
          The agent <em>rotated it.</em>
        </h1>
        <p className={styles.heroLead}>
          Replay one bounded response: create a replacement, migrate the consumer, prove the new key
          works, revoke the old key, and prove it no longer does. Then verify every byte in the signed bundle yourself.
        </p>
        <div className={styles.heroBoundary}>
          <span>Published sample — not live customer evidence</span>
          <p>
            This is an immutable synthetic specimen. It contains fingerprints and key identifiers,
            never credential values. No real provider, credential, compromise, customer, or
            production system was used or checked.
          </p>
        </div>
      </header>

      <ApiKeyRotationDemo
        bundleSha256={sampleBundleSha256}
        verifierSha256={publicVerifierSha256}
        sourceCommitShort={sampleCommitShort}
        sourceHref={sampleBaseUrl}
      />

      <section className={styles.nextStep} aria-labelledby="rotation-next-step-heading">
        <span>YOUR WORKFLOW</span>
        <div>
          <h2 id="rotation-next-step-heading">Bring one consequential agent action.</h2>
          <p>
            We’ll map its authority, evidence, receipt, public verifier, and challenge path before any
            secret or source material is accepted.
          </p>
        </div>
        <Link href={reviewRequestHref}>Start a review →</Link>
      </section>
    </main>
  );
}
