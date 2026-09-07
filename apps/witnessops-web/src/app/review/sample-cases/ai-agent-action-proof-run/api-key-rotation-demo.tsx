"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  mutateFirstBase64Byte,
  sha256HexToIntegrity,
  sha256Utf8,
} from "@/lib/api-key-rotation-browser-integrity";
import styles from "./api-key-rotation-demo.module.css";

const specimenRoot = "/samples/api-key-rotation/v1";
const bundleHref = `${specimenRoot}/BUNDLE.wops.json`;
const keyRegistryHref = "/.well-known/witnessops-demo-signing-keys.json";
const verifierHref = `${specimenRoot}/verify.mjs`;

const replayEvents = [
  {
    at: "12:00:11",
    operation: "CREATE REPLACEMENT",
    label: "Create",
    summary: "Create a replacement with a different synthetic fingerprint.",
    title: "Replacement credential created",
    detail:
      "A distinct synthetic fingerprint becomes ACTIVE. Verifier v1 confirms that the supplied evidence contains no forbidden credential-value fields.",
  },
  {
    at: "12:00:12",
    operation: "MIGRATE CONSUMER",
    label: "Migrate",
    summary: "Move the approved consumer to the replacement key.",
    title: "Billing worker reference updated",
    detail: "The only approved consumer moves from the suspected key to the replacement.",
  },
  {
    at: "12:00:13",
    operation: "PROBE REPLACEMENT",
    label: "Check new",
    summary: "Check that the replacement works before revoking the old key.",
    title: "Replacement accepted",
    detail: "The signed synthetic canary records HTTP 200 before any revocation occurs.",
  },
  {
    at: "12:00:14",
    operation: "REVOKE OLD",
    label: "Revoke",
    summary: "Revoke the old key after the consumer has moved.",
    title: "Suspected credential revoked",
    detail: "The old synthetic key transitions from ACTIVE to REVOKED after migration succeeds.",
  },
  {
    at: "12:00:15",
    operation: "PROBE OLD",
    label: "Check old",
    summary: "Check that the old key is now rejected.",
    title: "Old credential rejected",
    detail: "The post-revocation canary records HTTP 401 / credential_revoked.",
  },
  {
    at: "12:00:16",
    operation: "READ BACK STATE",
    label: "Read back",
    summary: "Read back the declared final state from the bundled evidence.",
    title: "Final state reconstructed from bundled evidence",
    detail: "Old revoked. Replacement active. Consumer migrated. State revision 44.",
  },
] as const;

type CheckStatus = "pass" | "fail" | "not_checked";

type VerificationCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
};

type VerificationResult = {
  verdict: string;
  valid: boolean;
  synthetic: boolean;
  proof_run_id: string;
  fixture: string;
  checks: VerificationCheck[];
  failure_code: string | null;
  proves_real_provider_action: boolean;
  limitation: string;
};

type VerifierModule = {
  verifyBundle: (
    bundleText: string,
    keyRegistryText: string,
  ) => Promise<VerificationResult>;
};

type ApiKeyRotationDemoProps = {
  bundleSha256: string;
  verifierSha256: string;
  sourceCommitShort: string;
  sourceHref: string;
  signerFingerprint: string;
  children: ReactNode;
};

const verifierLoadFailure =
  "PUBLIC_VERIFIER_INTEGRITY_OR_LOAD_FAILURE: the verifier did not load under its displayed SHA-256 pin.";

async function importIntegrityCheckedVerifier(
  verifierUrl: string,
  verifierSha256: string,
): Promise<VerifierModule> {
  const script = document.createElement("script");
  script.type = "module";
  script.src = verifierUrl;
  script.integrity = sha256HexToIntegrity(verifierSha256);
  script.crossOrigin = "anonymous";
  script.dataset.witnessopsVerifierIntegrityGate = "true";

  await new Promise<void>((resolve, reject) => {
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      script.remove();
      reject(new Error(verifierLoadFailure));
    };
    const cleanup = () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    document.head.append(script);
  });

  try {
    return (await import(/* webpackIgnore: true */ verifierUrl)) as VerifierModule;
  } catch {
    throw new Error(verifierLoadFailure);
  } finally {
    script.remove();
  }
}

function publicCheckLabel(check: VerificationCheck): string {
  if (check.id === "secret_material_absent") {
    return "Credential-value fields absent from the supplied bundle";
  }
  if (check.id === "authority_and_scope") {
    return "Supplied synthetic authority and scope records";
  }
  if (check.id === "rotation_semantics") {
    return "Declared synthetic rotation semantics";
  }
  return check.label;
}

function shortFingerprint(value: string): string {
  return `${value.slice(0, 14)}…${value.slice(-10)}`;
}

export function ApiKeyRotationDemo({
  bundleSha256,
  verifierSha256,
  sourceCommitShort,
  sourceHref,
  signerFingerprint,
  children,
}: ApiKeyRotationDemoProps) {
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [completedEvents, setCompletedEvents] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [tamperResult, setTamperResult] = useState<VerificationResult | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [replayAnnouncement, setReplayAnnouncement] = useState("");
  const verifierRef = useRef<VerifierModule["verifyBundle"] | null>(null);
  const specimenTextRef = useRef<{ bundle: string; registry: string } | null>(null);
  const replayButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function verifyPublicSpecimen() {
      try {
        const verifierUrl = new URL(verifierHref, window.location.href);
        verifierUrl.searchParams.set("sha256", verifierSha256);
        const [bundleResponse, registryResponse] = await Promise.all([
          fetch(bundleHref, { cache: "force-cache" }),
          fetch(keyRegistryHref, { cache: "no-cache" }),
        ]);

        if (!bundleResponse.ok || !registryResponse.ok) {
          throw new Error(
            `Public specimen unavailable (${bundleResponse.status}/${registryResponse.status}).`,
          );
        }

        const [bundleText, registryText] = await Promise.all([
          bundleResponse.text(),
          registryResponse.text(),
        ]);
        const actualBundleSha256 = await sha256Utf8(bundleText);
        if (actualBundleSha256 !== bundleSha256) {
          throw new Error(
            `PUBLIC_BUNDLE_DIGEST_MISMATCH: expected ${bundleSha256}; received ${actualBundleSha256}.`,
          );
        }

        const verifierModule = await importIntegrityCheckedVerifier(
          verifierUrl.href,
          verifierSha256,
        );
        const result = await verifierModule.verifyBundle(bundleText, registryText);

        if (!cancelled) {
          verifierRef.current = verifierModule.verifyBundle;
          specimenTextRef.current = { bundle: bundleText, registry: registryText };
          setVerification(result);
        }
      } catch (error) {
        if (!cancelled) {
          setVerificationError(
            error instanceof Error ? error.message : "The browser verifier could not run.",
          );
        }
      }
    }

    void verifyPublicSpecimen();

    return () => {
      cancelled = true;
    };
  }, [bundleSha256, verifierSha256]);

  useEffect(() => {
    if (!isReplaying) {
      return;
    }

    const timer = window.setTimeout(() => {
      const nextEventCount = Math.min(completedEvents + 1, replayEvents.length);
      setCompletedEvents(nextEventCount);
      if (nextEventCount === replayEvents.length) {
        setIsReplaying(false);
        setReplayAnnouncement("Replay complete: 6 of 6 signed events shown.");
        window.requestAnimationFrame(() => replayButtonRef.current?.focus());
        return;
      }

      setReplayAnnouncement(
        `Replay progress: ${nextEventCount} of ${replayEvents.length} signed events shown. ${replayEvents[nextEventCount - 1].title}.`,
      );
    }, completedEvents === 0 ? 300 : 720);

    return () => window.clearTimeout(timer);
  }, [completedEvents, isReplaying]);

  const checkCounts = useMemo(() => {
    const checks = verification?.checks ?? [];
    return {
      passed: checks.filter((check) => check.status === "pass").length,
      failed: checks.filter((check) => check.status === "fail").length,
      notChecked: checks.filter((check) => check.status === "not_checked").length,
    };
  }, [verification]);

  const replayComplete = completedEvents === replayEvents.length;
  const replacementActive = completedEvents >= 1;
  const consumerMigrated = completedEvents >= 2;
  const replacementAccepted = completedEvents >= 3;
  const oldRevoked = completedEvents >= 4;
  const oldRejected = completedEvents >= 5;
  const displayedEventIndex = selectedEvent ?? Math.min(completedEvents, replayEvents.length - 1);
  const displayedEvent = replayEvents[displayedEventIndex];

  function startReplay() {
    setTamperResult(null);
    setSelectedEvent(null);
    setCompletedEvents(0);
    setReplayAnnouncement(`Replay started: 0 of ${replayEvents.length} signed events shown.`);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCompletedEvents(replayEvents.length);
      setIsReplaying(false);
      setReplayAnnouncement("Replay complete: 6 of 6 signed events shown.");
      window.requestAnimationFrame(() => replayButtonRef.current?.focus());
      return;
    }
    setIsReplaying(true);
  }

  async function runTamperTest() {
    const verifyBundle = verifierRef.current;
    const specimen = specimenTextRef.current;
    if (!verifyBundle || !specimen) {
      return;
    }

    const mutatedBundle = JSON.parse(specimen.bundle) as {
      evidence: Array<{ path: string; content: string }>;
    };
    const afterState = mutatedBundle.evidence.find(
      (artifact) => artifact.path === "evidence/AFTER.json",
    );
    if (!afterState) {
      return;
    }

    afterState.content = mutateFirstBase64Byte(afterState.content);
    const result = await verifyBundle(JSON.stringify(mutatedBundle), specimen.registry);
    setTamperResult(result);
  }

  async function copyOfflineCommand() {
    const command = "node verify.mjs BUNDLE.wops.json DEMO_KEY_REGISTRY.json";
    try {
      await navigator.clipboard.writeText(command);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className={styles.demo} data-ui-proof-id="api-key-rotation-demo">
      <section className={styles.replayStage} aria-labelledby="rotation-state-heading">
        <div className={styles.replayControls}>
          <div>
            <h2 id="rotation-state-heading">Key rotation</h2>
            <span className={styles.microLabel}>{completedEvents} of {replayEvents.length} events replayed</span>
          </div>
          <button ref={replayButtonRef} className={styles.replayButton} type="button"
            onClick={startReplay} disabled={!verification?.valid || isReplaying}
            aria-describedby="rotation-replay-boundary">
            {isReplaying ? "Playing…" : replayComplete ? "Replay example" : "Play example"}
          </button>
        </div>
        <p id="rotation-replay-boundary" className={styles.buttonBoundary}>
          Playback only. This click authorizes nothing and makes no provider call.
        </p>
        <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
          {replayAnnouncement}
        </p>

        <div className={styles.stateCards}>
          <article className={styles.keyCard + (oldRevoked ? " " + styles.keyCardRevoked : "")}>
            <h3>Old key</h3>
            <strong className={oldRevoked ? styles.statusRevoked : styles.statusActive}>
              {oldRevoked ? "REVOKED" : "ACTIVE"}
            </strong>
            <span className={styles.probeLabel}>After revocation</span>
            <span className={oldRejected ? styles.probeRejected : styles.probePending}>
              {oldRejected ? "401 · rejected" : "Check pending"}
            </span>
          </article>
          <article className={styles.keyCard + (replacementActive ? " " + styles.keyCardReplacement : "")}>
            <h3>Replacement</h3>
            <strong className={replacementActive ? styles.statusReplacement : styles.statusAbsent}>
              {replacementActive ? "ACTIVE" : "NOT CREATED"}
            </strong>
            <span className={styles.probeLabel}>Before revocation</span>
            <span className={replacementAccepted ? styles.probeAccepted : styles.probePending}>
              {replacementAccepted ? "200 · accepted" : "Check pending"}
            </span>
          </article>
        </div>
        <div className={styles.consumerRail}>
          <span>Consumer</span>
          <strong>{consumerMigrated ? "Moved to replacement" : "Using old key"}</strong>
        </div>

        <ol className={styles.stepRail} aria-label="Signed rotation event replay" aria-busy={isReplaying}>
          {replayEvents.map((event, index) => (
            <li key={event.operation}>
              <button type="button" onClick={() => setSelectedEvent(index)}
                aria-label={"Inspect step " + (index + 1) + ": " + event.title}
                aria-pressed={displayedEventIndex === index} aria-controls="rotation-event-detail"
                className={index < completedEvents ? styles.stepComplete : undefined}>
                <span>{index + 1}</span>
                <span className={styles.stepLabel}>{event.label}</span>
              </button>
            </li>
          ))}
        </ol>
        <div id="rotation-event-detail" className={styles.eventDetail}>
          <div className={styles.eventMeta}>
            <span>Recorded step {displayedEventIndex + 1} of {replayEvents.length}</span>
            <span>{displayedEventIndex < completedEvents ? "Replayed" : "Not replayed yet"}</span>
          </div>
          <h3>{displayedEvent.title}</h3>
          <p>{displayedEvent.summary}</p>
          <details className={styles.eventEvidence} key={displayedEventIndex}>
            <summary>Evidence for this step</summary>
            <p><time>{displayedEvent.at}Z</time> · {displayedEvent.operation}</p>
            <p>{displayedEvent.detail}</p>
          </details>
        </div>
      </section>

      <details className={styles.disclosure}>
        <summary>View sample scope</summary>
        <div className={styles.disclosureBody}>
          <h2 id="rotation-contract-heading">Synthetic credential rotation</h2>
          <p>One suspected key. One consumer. Six permitted operations. Stop on any deviation.</p>
          <dl className={styles.contractGrid}>
            <div><dt>Provider</dt><dd>Northstar API (synthetic)</dd></div>
            <div><dt>Tenant</dt><dd>sandbox_tenant_001</dd></div>
            <div><dt>Consumer</dt><dd>billing_worker_demo</dd></div>
            <div><dt>Authority</dt><dd>Declared approval · 12:00:10Z</dd></div>
            <div><dt>Old key identifier</dt><dd>sk_demo_old_7F2C91</dd></div>
            <div><dt>Replacement identifier</dt><dd>sk_demo_new_C3A901</dd></div>
            <div><dt>Suspected fingerprint</dt><dd>{shortFingerprint("sha256:457612e26457c27e1443f6dfae65c12106f045ecdaed588eba7f43dbf06885d5")}</dd></div>
            <div><dt>Recorded run</dt><dd>2026-08-27 · fixed public specimen</dd></div>
          </dl>
          <div className={styles.scopeColumns}>
            <div><h3>Permitted</h3><p>Create · migrate · probe · revoke · probe · read back</p></div>
            <div><h3>Declared hard stops</h3><p>Wrong target · readable secret · failed canary · 60s timeout</p></div>
          </div>
          <p>This is a fixed, hash-pinned synthetic specimen.
            Its evidence contains fingerprints and key identifiers, never credential values.
            No real provider, credential, compromise, customer, or production system was used or checked.</p>
        </div>
      </details>

      <div className={styles.resultLayout}>
        <section className={styles.resultSummary} aria-label="Sample verification result">
          <div className={styles.verificationBar} role="status" aria-live="polite" aria-atomic="true">
            <span className={styles.microLabel}>Browser verification</span>
            <strong className={verification?.valid ? styles.verificationPass : styles.verificationPending}>
              {verificationError ? "VERIFIER UNAVAILABLE" : verification?.valid ? "VALID SYNTHETIC SPECIMEN"
                : verification ? "VERIFICATION FAILED" : "VERIFYING EXACT PUBLIC BYTES…"}
            </strong>
            <div className={styles.verificationStats}>
              <span>{checkCounts.passed} pass</span><span>{checkCounts.failed} fail</span>
              <span>{checkCounts.notChecked} not checked</span>
            </div>
          </div>
          {verificationError ? <p className={styles.verifierError} role="alert">{verificationError}</p> : null}
          <p className={styles.resultBoundary}>Checks cover this synthetic specimen only. No real provider action was checked.</p>
          <a className={styles.textLink} href="#rotation-proof-heading">Inspect the evidence</a>
        </section>
        <section className={styles.challengeStrip} aria-label="Evidence tamper test">
          <h2>What if the evidence changes?</h2>
          <p>Change one evidence byte. The overall verdict must fail.</p>
          <button type="button" onClick={() => void runTamperTest()} disabled={!verification?.valid}
            className={styles.challengeButton}>Try changing one byte</button>
          <div className={styles.challengeResult} role="status" aria-live="polite" aria-atomic="true">
            {tamperResult ? <>
              <strong className={tamperResult.valid ? styles.challengeUnexpected : styles.challengeExpected}>
                {tamperResult.valid ? "UNEXPECTED PASS" : "REJECTED AS EXPECTED"}
              </strong>
              <code>{tamperResult.failure_code ?? tamperResult.verdict}</code>
            </> : <span>The test runs locally. The published specimen stays unchanged.</span>}
          </div>
        </section>
      </div>

      {children}

      <section className={styles.evidenceSection} aria-labelledby="rotation-proof-heading">
        <header className={styles.evidenceIntro}>
          <h2 id="rotation-proof-heading">Inspect the evidence</h2>
          <p>The browser checks the pinned bundle digest, receipt signature and manifest-bound evidence
            with the separately pinned public verifier.</p>
        </header>
        <details className={styles.disclosure}>
          <summary>See all verification checks</summary>
          <div className={styles.disclosureBody}>
            {verificationError ? <p>Browser verification did not complete. See the error above.</p> : verification ? (
              <div className={styles.checkList}>
                {verification.checks.map((check) => (
                  <div key={check.id} className={styles.checkRow}>
                    <div><strong>{publicCheckLabel(check)}</strong><p>{check.detail}</p></div>
                    <span className={check.status === "pass" ? styles.checkPass : check.status === "fail" ? styles.checkFail : styles.checkLimit}>
                      {check.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            ) : <p>Hashing and verifying the public specimen…</p>}
          </div>
        </details>
        <details className={styles.disclosure}>
          <summary>Inspect hashes and source</summary>
          <div className={styles.disclosureBody}>
            <dl className={styles.digestList}>
              <div><dt>Bundle SHA-256</dt><dd>{bundleSha256}</dd></div>
              <div><dt>Verifier SHA-256</dt><dd>{verifierSha256}</dd></div>
              <div><dt>Demo signer fingerprint</dt><dd>{signerFingerprint}</dd></div>
              <div><dt>Source commit</dt><dd>{sourceCommitShort}</dd></div>
            </dl>
            <p>Browser execution is gated by Subresource Integrity using this displayed pin.</p>
            <a className={styles.textLink} href={sourceHref} target="_blank" rel="noopener noreferrer">
              Inspect the fixed source specimen at commit {sourceCommitShort} ↗
            </a>
            <p>The specimen source commit pins the evidence package. The same-origin browser verifier is
              separately owned by this website and gated by the SHA-256 pin shown above.</p>
          </div>
        </details>
        <details className={styles.disclosure}>
          <summary>Download files and verify offline</summary>
          <div className={styles.disclosureBody}>
            <h3 id="offline-verify-heading">Verify the sample offline</h3>
            <p>Download three files, disconnect networking, and reproduce the same structured verdict
              with Node’s built-in cryptography. No package install. No WitnessOps API.</p>
            <div className={styles.commandBlock}>
              <code>node verify.mjs BUNDLE.wops.json DEMO_KEY_REGISTRY.json</code>
              <button type="button" onClick={() => void copyOfflineCommand()} aria-label="Copy offline verification command">
                {copyState === "copied" ? "Copied" : copyState === "failed" ? "Select command" : "Copy"}
              </button>
            </div>
            <div className={styles.downloadLinks}>
              <a href={bundleHref} download="BUNDLE.wops.json"><span>BUNDLE.wops.json</span><small>Required · signed specimen</small></a>
              <a href={verifierHref} download="verify.mjs"><span>verify.mjs</span><small>Required · verifier source</small></a>
              <a href={keyRegistryHref} download="DEMO_KEY_REGISTRY.json"><span>DEMO_KEY_REGISTRY.json</span><small>Required · public key</small></a>
              <a href={specimenRoot + "/RECEIPT.json"} download="RECEIPT.json"><span>RECEIPT.json</span><small>Optional · raw receipt</small></a>
            </div>
            <p>Reproduced with Node 24.19.0. Exit 0 means valid, 1 means invalid or untrusted, and 2 means
              malformed or unreadable input.</p>
          </div>
        </details>
        <aside className={styles.truthBoundary}>
          <h3>What this sample can show</h3>
          <p>Successful checks establish properties of the signed synthetic specimen. They do not establish
            real-world execution, actor identity or production safety.</p>
          <details className={styles.eventEvidence}>
            <summary>Full verification limits</summary>
            <p><strong>When verification passes:</strong> receipt signature under the purpose-limited demo key,
              manifest-bound file digests, receipt references, supplied synthetic authority and scope
              records, absence of forbidden credential-value fields, and the declared synthetic rotation transition.</p>
            <p><strong>Not verified:</strong> that an AI agent caused or authorized the tool calls;
              real-world actor or approver identity; execution of the declared hard-stop conditions;
              any real provider action, credential, compromise, customer or production system;
              source-system truth; production signing-key custody; or overall safety, correctness,
              compliance, or completeness.</p>
          </details>
        </aside>
      </section>
    </div>
  );
}
