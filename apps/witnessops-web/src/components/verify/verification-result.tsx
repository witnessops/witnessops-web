import Link from "next/link";
import type { VerifyResponse } from "@/lib/verify-contract";
import type { ReceiptMeta } from "@/lib/verify-receipt-meta";

const VERDICT_TONE: Record<
  "valid" | "invalid" | "indeterminate",
  { badge: string; panel: string; title: string; plain: string }
> = {
  valid: {
    badge: "border-signal-green/30 bg-signal-green/10 text-signal-green",
    panel: "border-signal-green/20 bg-signal-green/5",
    title: "Receipt valid",
    plain: "Valid",
  },
  invalid: {
    badge: "border-signal-red/30 bg-signal-red/10 text-signal-red",
    panel: "border-signal-red/20 bg-signal-red/5",
    title: "Receipt invalid",
    plain: "Invalid",
  },
  indeterminate: {
    badge: "border-signal-amber/30 bg-signal-amber/10 text-signal-amber",
    panel: "border-signal-amber/20 bg-signal-amber/5",
    title: "Verification incomplete",
    plain: "Incomplete",
  },
};

const CHECK_TONE: Record<"verified" | "unverified" | "not_applicable", string> =
  {
    verified: "border-signal-green/20 bg-signal-green/5 text-signal-green",
    unverified: "border-signal-red/20 bg-signal-red/5 text-signal-red",
    not_applicable: "border-surface-border bg-surface-bg text-text-muted",
  };

const CHECK_STATUS_LABEL: Record<
  "verified" | "unverified" | "not_applicable",
  string
> = {
  verified: "Passed",
  unverified: "Failed",
  not_applicable: "Not applicable",
};

/** Map internal check ids to short buyer-facing labels. */
function humanizeCheckName(name: string): string {
  const map: Record<string, string> = {
    schema: "Structure",
    schema_version: "Structure",
    signature: "Signature",
    signatures: "Signature",
    integrity: "Integrity",
    digest: "Integrity",
    record_digest: "Integrity",
    timestamp: "Timestamp",
    anchoring: "Timestamp / anchoring",
    witnesses: "Witnesses",
    stage: "Receipt type",
    proof_stage: "Receipt type",
    authority_binding: "Authority binding",
  };
  const key = name.toLowerCase().replace(/[\s-]+/g, "_");
  if (map[key]) {
    return map[key];
  }
  // Drop PV/QV-style stage prefixes and snake_case → words
  return name
    .replace(/^(pv|qv|wv)[_-]?/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || name;
}

function formatScope(scope: string): string {
  return scope
    .replace(/_/g, " ")
    .replace(/\breceipt first\b/i, "receipt-scoped")
    .replace(/\breceipt-first\b/i, "receipt-scoped");
}

interface VerificationResultProps {
  response: VerifyResponse;
  receiptMeta?: ReceiptMeta;
}

function MetaRow({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null;
  }
  return (
    <div className="border border-surface-border bg-surface-bg px-4 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 break-all font-mono text-xs text-text-primary">
        {value}
      </dd>
    </div>
  );
}

export function VerificationResult({
  response,
  receiptMeta,
}: VerificationResultProps) {
  if (!response.ok) {
    return (
      <section className="border border-signal-red/20 bg-signal-red/5 p-5 sm:p-6">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-signal-red">
          Could not verify
        </div>
        <h3 className="text-xl font-semibold text-text-primary">
          {response.failureClass === "FAILURE_INPUT_UNSUPPORTED"
            ? "Unsupported receipt"
            : "Invalid or unreadable input"}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          {response.message}
        </p>
        <p className="mt-4 text-sm text-text-muted">
          Check that you pasted a complete receipt JSON document. Technical
          detail:{" "}
          <Link
            href="/docs/how-it-works/verification"
            className="text-brand-accent underline-offset-4 hover:underline"
          >
            how verification works
          </Link>
          .
        </p>
      </section>
    );
  }

  const tone = VERDICT_TONE[response.verdict];
  const passed = response.checks.filter((c) => c.status === "verified");
  const failed = response.checks.filter((c) => c.status === "unverified");

  return (
    <section className={`border p-5 sm:p-6 ${tone.panel}`}>
      <div
        className={`inline-flex items-center border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${tone.badge}`}
      >
        {tone.plain}
      </div>
      <h3 className="mt-3 text-2xl font-semibold text-text-primary">
        {tone.title}
      </h3>
      <p className="mt-2 max-w-[40rem] text-sm leading-relaxed text-text-secondary">
        {response.summary}
      </p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <MetaRow label="Receipt ID" value={receiptMeta?.receiptId} />
        <MetaRow label="Issuer" value={receiptMeta?.issuer} />
        <MetaRow label="Created" value={receiptMeta?.createdAt} />
        <MetaRow label="Subject" value={receiptMeta?.subject} />
        <MetaRow label="Scope" value={formatScope(response.scope)} />
      </dl>

      {passed.length > 0 ? (
        <div className="mt-6">
          <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            Checks passed
          </h4>
          <ul className="mt-3 space-y-2">
            {passed.map((check) => (
              <li
                key={check.name}
                className="flex items-start justify-between gap-3 border border-surface-border bg-surface-bg px-4 py-3 text-sm"
              >
                <span className="text-text-primary">
                  {humanizeCheckName(check.name)}
                </span>
                <span
                  className={`shrink-0 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${CHECK_TONE.verified}`}
                >
                  {CHECK_STATUS_LABEL.verified}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {failed.length > 0 || response.breaches.length > 0 ? (
        <div className="mt-6">
          <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            Issues
          </h4>
          <ul className="mt-3 space-y-2">
            {failed.map((check) => (
              <li
                key={check.name}
                className="border border-surface-border bg-surface-bg px-4 py-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-text-primary">
                    {humanizeCheckName(check.name)}
                  </span>
                  <span
                    className={`shrink-0 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${CHECK_TONE.unverified}`}
                  >
                    {CHECK_STATUS_LABEL.unverified}
                  </span>
                </div>
                {check.detail ? (
                  <p className="mt-2 text-text-muted">{check.detail}</p>
                ) : null}
              </li>
            ))}
            {response.breaches.map((breach) => (
              <li
                key={`${breach.code}:${breach.checkName}`}
                className="border-l-2 border-signal-red bg-surface-bg px-4 py-3 text-sm text-text-secondary"
              >
                {breach.detail}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 border border-surface-border bg-surface-bg p-4 text-sm leading-relaxed text-text-muted">
        <p className="font-semibold text-text-secondary">Limitations</p>
        <p className="mt-2">
          A valid result confirms the checks named in the receipt. It does not
          prove that every underlying action was correct, that remote systems
          remain unchanged, or that a full engagement story is complete.
        </p>
      </div>

      <p className="mt-5 text-sm text-text-muted">
        <Link
          href="/docs/how-it-works/verification"
          className="text-brand-accent underline-offset-4 hover:underline"
        >
          Technical details
        </Link>
        {" · "}
        <Link
          href="/docs/evidence/receipts"
          className="text-brand-accent underline-offset-4 hover:underline"
        >
          Receipts
        </Link>
        {" · "}
        <Link
          href="/library"
          className="text-brand-accent underline-offset-4 hover:underline"
        >
          Library
        </Link>
      </p>
    </section>
  );
}

export default VerificationResult;
