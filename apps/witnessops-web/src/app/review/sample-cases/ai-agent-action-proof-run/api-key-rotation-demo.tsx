"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
    title: "Replacement credential created",
    detail:
      "A distinct synthetic fingerprint becomes ACTIVE. Verifier v1 confirms that the supplied evidence contains no forbidden credential-value fields.",
  },
  {
    at: "12:00:12",
    operation: "MIGRATE CONSUMER",
    title: "Billing worker reference updated",
    detail: "The only approved consumer moves from the suspected key to the replacement.",
  },
  {
    at: "12:00:13",
    operation: "PROBE REPLACEMENT",
    title: "Replacement accepted",
    detail: "The signed synthetic canary records HTTP 200 before any revocation occurs.",
  },
  {
    at: "12:00:14",
    operation: "REVOKE OLD",
    title: "Suspected credential revoked",
    detail: "The old synthetic key transitions from ACTIVE to REVOKED after migration succeeds.",
  },
  {
    at: "12:00:15",
    operation: "PROBE OLD",
    title: "Old credential rejected",
    detail: "The post-revocation canary records HTTP 401 / credential_revoked.",
  },
  {
    at: "12:00:16",
    operation: "READ BACK STATE",
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
}: ApiKeyRotationDemoProps) {
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [completedEvents, setCompletedEvents] = useState(0);
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

  function startReplay() {
    setTamperResult(null);
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
      <section className={styles.verificationBar} role="status" aria-live="polite" aria-atomic="true">
        <div className={styles.verificationIdentity}>
          <span
            className={`${styles.verificationPulse} ${
              verification?.valid ? styles.verificationPulsePass : ""
            }`}
            aria-hidden="true"
          />
          <div>
            <span className={styles.microLabel}>Browser verification</span>
            <strong>
              {verificationError
                ? "VERIFIER UNAVAILABLE"
                : verification?.valid
                  ? "VALID SYNTHETIC SPECIMEN"
                  : verification
                    ? "VERIFICATION FAILED"
                    : "VERIFYING EXACT PUBLIC BYTES…"}
            </strong>
          </div>
        </div>
        <div className={styles.verificationStats}>
          <span>{checkCounts.passed} PASS</span>
          <span>{checkCounts.failed} FAIL</span>
          <span>{checkCounts.notChecked} NOT CHECKED</span>
        </div>
      </section>

      <div className={styles.consoleGrid}>
        <section className={styles.contractPanel} aria-labelledby="rotation-contract-heading">
          <div className={styles.panelHeader}>
            <span>01 / BOUNDED CONTRACT</span>
            <span className={styles.syntheticTag}>SYNTHETIC</span>
          </div>
          <div className={styles.panelBody}>
            <h2 id="rotation-contract-heading">Synthetic credential rotation</h2>
            <p className={styles.contractLead}>
              One suspected key. One consumer. Six permitted operations. Stop on any deviation.
            </p>

            <dl className={styles.contractGrid}>
              <div>
                <dt>Provider</dt>
                <dd>Northstar API (synthetic)</dd>
              </div>
              <div>
                <dt>Tenant</dt>
                <dd>sandbox_tenant_001</dd>
              </div>
              <div>
                <dt>Consumer</dt>
                <dd>billing_worker_demo</dd>
              </div>
              <div>
                <dt>Authority</dt>
                <dd>Declared approval · 12:00:10Z</dd>
              </div>
              <div className={styles.contractWide}>
                <dt>Suspected fingerprint</dt>
                <dd title="sha256:457612e26457c27e1443f6dfae65c12106f045ecdaed588eba7f43dbf06885d5">
                  {shortFingerprint(
                    "sha256:457612e26457c27e1443f6dfae65c12106f045ecdaed588eba7f43dbf06885d5",
                  )}
                </dd>
              </div>
            </dl>

            <div className={styles.scopeColumns}>
              <div>
                <span className={styles.microLabel}>Permitted</span>
                <p>Create · migrate · probe · revoke · probe · read back</p>
              </div>
              <div>
                <span className={styles.microLabel}>Hard stop</span>
                <p>Wrong target · readable secret · failed canary · 60s timeout</p>
              </div>
            </div>

            <button
              ref={replayButtonRef}
              className={styles.replayButton}
              type="button"
              onClick={startReplay}
              disabled={!verification?.valid || isReplaying}
              aria-describedby="rotation-replay-boundary"
            >
              <span>{isReplaying ? "REPLAYING SIGNED RUN" : replayComplete ? "REPLAY SIGNED RUN AGAIN" : "ACKNOWLEDGE SCOPE & REPLAY"}</span>
              <span aria-hidden="true">→</span>
            </button>
            <p id="rotation-replay-boundary" className={styles.buttonBoundary}>
              Playback only. This click authorizes nothing and makes no provider call.
            </p>
            <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
              {replayAnnouncement}
            </p>
          </div>
        </section>

        <section className={styles.statePanel} aria-labelledby="rotation-state-heading">
          <div className={styles.panelHeader}>
            <span>02 / STATE TRANSITION</span>
            <span>{completedEvents}/{replayEvents.length} EVENTS</span>
          </div>
          <div className={styles.panelBody}>
            <h2 id="rotation-state-heading">Credential state</h2>
            <div className={styles.stateCards}>
              <article className={`${styles.keyCard} ${oldRevoked ? styles.keyCardRevoked : ""}`}>
                <div className={styles.keyCardTopline}>
                  <span>OLD / SUSPECTED</span>
                  <span className={oldRevoked ? styles.statusRevoked : styles.statusActive}>
                    {oldRevoked ? "REVOKED" : "ACTIVE"}
                  </span>
                </div>
                <strong>sk_demo_old_7F2C91</strong>
                <code>457612e26457…f06885d5</code>
                <div className={styles.probeLine}>
                  <span>POST-ROTATION PROBE</span>
                  <b className={oldRejected ? styles.probeRejected : styles.probePending}>
                    {oldRejected ? "401 REJECTED" : "PENDING"}
                  </b>
                </div>
              </article>

              <div className={styles.rotationArrow} aria-hidden="true">→</div>

              <article className={`${styles.keyCard} ${replacementActive ? styles.keyCardReplacement : ""}`}>
                <div className={styles.keyCardTopline}>
                  <span>NEW / REPLACEMENT</span>
                  <span className={replacementActive ? styles.statusReplacement : styles.statusAbsent}>
                    {replacementActive ? "ACTIVE" : "ABSENT"}
                  </span>
                </div>
                <strong>{replacementActive ? "sk_demo_new_C3A901" : "not created"}</strong>
                <code>{replacementActive ? "2d31ebd63621…df4a241e" : "—"}</code>
                <div className={styles.probeLine}>
                  <span>PRE-REVOCATION PROBE</span>
                  <b className={replacementAccepted ? styles.probeAccepted : styles.probePending}>
                    {replacementAccepted ? "200 ACCEPTED" : "PENDING"}
                  </b>
                </div>
              </article>
            </div>

            <div className={styles.consumerRail}>
              <span className={styles.microLabel}>Consumer reference</span>
              <div className={styles.consumerTrack}>
                <span className={styles.consumerOld}>OLD KEY</span>
                <span className={`${styles.consumerMarker} ${consumerMigrated ? styles.consumerMarkerMoved : ""}`} />
                <span className={styles.consumerNew}>NEW KEY</span>
              </div>
              <strong>{consumerMigrated ? "MIGRATED BEFORE REVOCATION" : "AWAITING MIGRATION"}</strong>
            </div>

            <ol
              className={styles.timeline}
              aria-label="Signed rotation event replay"
              aria-busy={isReplaying}
            >
              {replayEvents.map((event, index) => {
                const complete = index < completedEvents;
                const active = isReplaying && index === completedEvents;
                return (
                  <li
                    key={event.operation}
                    className={`${complete ? styles.timelineComplete : ""} ${active ? styles.timelineActive : ""}`}
                  >
                    <span className={styles.timelineIndex}>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.timelineTime}>{event.at}</span>
                    <div>
                      <span className={styles.timelineOperation}>{event.operation}</span>
                      <strong>{event.title}</strong>
                      <p>{event.detail}</p>
                    </div>
                    <span className={styles.timelineResult}>{complete ? "PASS" : active ? "RUN" : "—"}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      </div>

      <section className={styles.proofPanel} aria-labelledby="rotation-proof-heading">
        <div className={styles.panelHeader}>
          <span>03 / INDEPENDENT VERIFICATION</span>
          <span>NO SERVER-SIDE VERDICT</span>
        </div>
        <div className={styles.proofLayout}>
          <div className={styles.proofIntro}>
            <span className={styles.microLabel}>Computed in this browser</span>
            <h2 id="rotation-proof-heading">
              Don’t trust the animation. Verify the bytes.
            </h2>
            <p>
              The page downloads a fixed bundle and public demo key, then the same dependency-free
              verifier available below checks the receipt signature, manifest-bound file digests,
              receipt references, supplied authority and scope records, forbidden credential-value
              fields, and the declared synthetic rotation state machine locally.
            </p>
            <dl className={styles.digestList}>
              <div>
                <dt>Bundle SHA-256</dt>
                <dd>{bundleSha256}</dd>
              </div>
              <div>
                <dt>Verifier SHA-256</dt>
                <dd>
                  {verifierSha256}
                  <span className={styles.digestNote}>
                    Browser execution is gated by Subresource Integrity using this displayed pin.
                  </span>
                </dd>
              </div>
              <div>
                <dt>Demo signer fingerprint</dt>
                <dd>72a03b6fdacaad90dfc58c0e782ec51e111dfecbc1b841b6cb7a68d0a557f6e4</dd>
              </div>
              <div>
                <dt>Source commit</dt>
                <dd>{sourceCommitShort}</dd>
              </div>
            </dl>
          </div>

          <div className={styles.checkList}>
            {verificationError ? (
              <div className={styles.verifierError} role="alert">
                <strong>Browser verification did not complete</strong>
                <p>{verificationError}</p>
              </div>
            ) : verification ? (
              verification.checks.map((check) => (
                <div key={check.id} className={styles.checkRow}>
                  <span
                    className={`${styles.checkMark} ${
                      check.status === "pass"
                        ? styles.checkPass
                        : check.status === "fail"
                          ? styles.checkFail
                          : styles.checkLimit
                    }`}
                  >
                    {check.status === "pass" ? "✓" : check.status === "fail" ? "×" : "—"}
                  </span>
                  <div>
                    <strong>{publicCheckLabel(check)}</strong>
                    <p>{check.detail}</p>
                  </div>
                  <span className={styles.checkStatus}>{check.status.replace("_", " ")}</span>
                </div>
              ))
            ) : (
              <div className={styles.verifierLoading}>
                <span />
                <p>Hashing and verifying the public specimen…</p>
              </div>
            )}
          </div>
        </div>

        <div className={styles.challengeStrip}>
          <div>
            <span className={styles.microLabel}>Built-in negative control</span>
            <strong>Change one evidence byte. The overall verdict must fail.</strong>
            <p>The mutation stays in this browser and never alters the published specimen.</p>
          </div>
          <button
            type="button"
            onClick={() => void runTamperTest()}
            disabled={!verification?.valid}
            className={styles.challengeButton}
          >
            RUN ONE-BYTE TAMPER TEST
          </button>
          <div className={styles.challengeResult} role="status" aria-live="polite" aria-atomic="true">
            {tamperResult ? (
              <>
                <span className={tamperResult.valid ? styles.challengeUnexpected : styles.challengeExpected}>
                  {tamperResult.valid ? "UNEXPECTED PASS" : "REJECTED AS EXPECTED"}
                </span>
                <code>{tamperResult.failure_code ?? tamperResult.verdict}</code>
              </>
            ) : (
              <span>AWAITING CHALLENGE</span>
            )}
          </div>
        </div>
      </section>

      <section className={styles.downloadPanel} aria-labelledby="offline-verify-heading">
        <div>
          <span className={styles.microLabel}>Portable proof</span>
          <h2 id="offline-verify-heading">Take the verifier away from us.</h2>
          <p>
            Download three files, disconnect networking, and reproduce the same structured verdict
            with Node’s built-in cryptography. No package install. No WitnessOps API.
          </p>
        </div>
        <div className={styles.commandBlock}>
          <code>node verify.mjs BUNDLE.wops.json DEMO_KEY_REGISTRY.json</code>
          <button
            type="button"
            onClick={() => void copyOfflineCommand()}
            aria-label="Copy offline verification command"
          >
            {copyState === "copied" ? "COPIED" : copyState === "failed" ? "SELECT COMMAND" : "COPY"}
          </button>
        </div>
        <div className={styles.downloadLinks}>
          <a href={bundleHref} download="BUNDLE.wops.json">
            <span>BUNDLE.wops.json</span>
            <small>REQUIRED · SIGNED SPECIMEN ↓</small>
          </a>
          <a href={verifierHref} download="verify.mjs">
            <span>verify.mjs</span>
            <small>REQUIRED · VERIFIER SOURCE ↓</small>
          </a>
          <a href={keyRegistryHref} download="DEMO_KEY_REGISTRY.json">
            <span>DEMO_KEY_REGISTRY.json</span>
            <small>REQUIRED · PUBLIC KEY ↓</small>
          </a>
          <a href={`${specimenRoot}/RECEIPT.json`} download="RECEIPT.json">
            <span>RECEIPT.json</span>
            <small>OPTIONAL · RAW RECEIPT ↓</small>
          </a>
        </div>
        <a className={styles.sourceLink} href={sourceHref} target="_blank" rel="noopener noreferrer">
          Inspect the fixed source specimen at commit {sourceCommitShort} ↗
        </a>
        <p className={styles.sourceBoundary}>
          The specimen source commit pins the evidence package. The same-origin browser verifier is
          separately owned by this website and gated by the SHA-256 pin shown above.
        </p>
        <p className={styles.runtimeNote}>
          Reproduced with Node 24.19.0. Exit 0 means valid, 1 means invalid or untrusted, and 2 means
          malformed or unreadable input.
        </p>
      </section>

      <aside className={styles.truthBoundary}>
        <span>PROOF BOUNDARY</span>
        <div>
          <p>
            <strong>Verified:</strong> receipt signature under the purpose-limited demo key,
            manifest-bound file digests, receipt references, supplied synthetic authority and scope
            records, absence of forbidden credential-value fields, and the declared synthetic
            rotation transition.
          </p>
          <p>
            <strong>Not verified:</strong> that an AI agent caused or authorized the tool calls;
            real-world actor or approver identity; execution of the declared hard-stop conditions;
            any real provider action, credential, compromise, customer or production system;
            source-system truth; production signing-key custody; or overall safety, correctness,
            compliance, or completeness.
          </p>
        </div>
      </aside>
    </div>
  );
}
