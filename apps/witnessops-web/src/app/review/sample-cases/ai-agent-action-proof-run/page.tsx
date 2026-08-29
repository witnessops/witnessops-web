import type { Metadata } from "next";
import Link from "next/link";
import { getCanonicalAlternates } from "@witnessops/config";
import { buyerPublicOfferRequestHref } from "@/lib/buyer-services";
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/social-metadata";
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
  title: "Synthetic API key rotation — verifiable proof specimen",
  description:
    "Replay a fixed synthetic API-key rotation specimen, verify its pinned bundle and manifest-bound evidence in your browser, then reproduce the verifier verdict offline.",
  alternates: getCanonicalAlternates(
    "witnessops",
    "/review/sample-cases/ai-agent-action-proof-run",
  ),
  openGraph: {
    title: "Synthetic API key rotation — verify the pinned proof specimen",
    description:
      "A fixed, hash-pinned synthetic specimen with browser verification, an offline verifier, and a one-byte tamper challenge.",
    url: "/review/sample-cases/ai-agent-action-proof-run",
    siteName: "WitnessOps",
    type: "website",
    images: DEFAULT_OPEN_GRAPH_IMAGES,
  },
  twitter: {
    card: "summary_large_image",
    title: "Synthetic API key rotation — verifiable proof specimen",
    description:
      "Replay the fixed synthetic specimen, inspect the named checks, and reproduce the verifier verdict offline.",
    images: DEFAULT_TWITTER_IMAGES,
  },
};

export default function ApiKeyRotationSamplePage() {
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroMeta}>
          <strong>Synthetic compromise flag declared</strong>
          <span>Public synthetic specimen</span>
          <span>Fixed run · 2026-08-27</span>
        </div>
        <h1>
          A synthetic key was flagged.
          <br />
          The authorized rotation tool <em>handled it.</em>
        </h1>
        <p className={styles.heroLead}>
          Replay one declared synthetic response: create a replacement, migrate the consumer, check
          the new key, revoke the old key, and check it again. Then verify the pinned bundle digest,
          receipt signature, and manifest-bound evidence with the separately pinned public verifier.
        </p>
        <div className={styles.heroBoundary}>
          <span>Published sample — not live customer evidence</span>
          <p>
            This is a fixed, hash-pinned synthetic specimen. Its evidence contains fingerprints and
            key identifiers, never credential values. No real provider, credential, compromise,
            customer, or production system was used or checked.
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
        <span>PAID REVIEW</span>
        <div>
          <h2 id="rotation-next-step-heading">
            Agent Risk &amp; Control Review — from €1,500 ex VAT.
          </h2>
          <p>
            Bring one consequential workflow. The review maps its authority, permissions, approvals,
            and evidence gaps, then proposes a receipt, verifier, and challenge path. This specimen is
            an example of the proof object a review can shape; no secret or source material is accepted
            in the fit check.
          </p>
        </div>
        <Link href={reviewRequestHref}>Request a non-secret fit check →</Link>
      </section>
    </main>
  );
}
