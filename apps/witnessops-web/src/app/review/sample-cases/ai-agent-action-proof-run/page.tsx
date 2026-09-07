import type { Metadata } from "next";
import Link from "next/link";
import { getCanonicalAlternates } from "@witnessops/config";
import { buyerPublicOfferRequestHref } from "@/lib/buyer-services";
import { PRIMARY_OFFER } from "@/lib/commercial-truth";
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/social-metadata";
import { ApiKeyRotationDemo } from "./api-key-rotation-demo";
import styles from "./api-key-rotation-demo.module.css";
import {
  publicVerifierSha256,
  sampleBaseUrl,
  sampleBundleSha256,
  sampleCommitShort,
  sampleSignerFingerprint,
} from "./sample-artifact-contract";

const reviewRequestHref = buyerPublicOfferRequestHref(
  "en",
  PRIMARY_OFFER.id,
);

export const metadata: Metadata = {
  title: "Synthetic API key rotation: verifiable proof specimen",
  description:
    "Replay a fixed synthetic API-key rotation specimen, verify its pinned bundle and manifest-bound evidence in your browser, then reproduce the verifier verdict offline.",
  alternates: getCanonicalAlternates(
    "witnessops",
    "/review/sample-cases/ai-agent-action-proof-run",
  ),
  openGraph: {
    title: "Synthetic API key rotation: verify the pinned proof specimen",
    description:
      "A fixed, hash-pinned synthetic specimen with browser verification, an offline verifier, and a one-byte tamper challenge.",
    url: "/review/sample-cases/ai-agent-action-proof-run",
    siteName: "WitnessOps",
    type: "website",
    images: DEFAULT_OPEN_GRAPH_IMAGES,
  },
  twitter: {
    card: "summary_large_image",
    title: "Synthetic API key rotation: verifiable proof specimen",
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
          <strong>Synthetic demo</strong>
          <span>No live systems</span>
        </div>
        <h1>
          See a key rotation, step by step.
        </h1>
        <p className={styles.heroLead}>
          Replay a synthetic run. See what changed, what was checked, and what remains unproven.
        </p>
        <p className={styles.sampleNote}>Published sample, not live customer evidence</p>
      </header>

      <ApiKeyRotationDemo
        bundleSha256={sampleBundleSha256}
        verifierSha256={publicVerifierSha256}
        sourceCommitShort={sampleCommitShort}
        sourceHref={sampleBaseUrl}
        signerFingerprint={sampleSignerFingerprint}
      >
        <section className={styles.nextStep} aria-labelledby="rotation-next-step-heading">
          <div>
            <span className={styles.eyebrow}>{PRIMARY_OFFER.name.en}</span>
            <h2 id="rotation-next-step-heading">Want your own agent action reviewed?</h2>
            <p>One consequential agent or automation action. Prioritised fixes.</p>
            <strong className={styles.offerPrice}>{PRIMARY_OFFER.price.en}</strong>
            <p className={styles.offerTiming}>{PRIMARY_OFFER.timing.en}.</p>
          </div>
          <div className={styles.offerAction}>
            <Link href={reviewRequestHref}>Check fit</Link>
            <span>Non-secret fit check first.</span>
          </div>
        </section>
      </ApiKeyRotationDemo>
    </main>
  );
}
