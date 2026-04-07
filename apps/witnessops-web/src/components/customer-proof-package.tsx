/**
 * Customer-facing proof package surface (WEB-013).
 *
 * Read-only render of a delivered proof package: identity, delivery facts,
 * and current acceptance disposition (if any). No accept/reject controls —
 * those land in WEB-014.
 */
import type { CustomerProofPackageView } from "@/lib/server/customer-proof-package";

const STAGE_LABEL: Record<CustomerProofPackageView["stage"], string> = {
  not_yet_delivered: "Not yet delivered",
  delivered: "Delivered",
  acknowledged: "Acknowledged",
  accepted: "Accepted",
  rejected: "Rejected",
};

function fmtTs(ts: string | null): string {
  if (!ts) return "—";
  return ts.replace("T", " ").replace("Z", " UTC");
}

export function CustomerProofPackage({
  view,
}: {
  view: CustomerProofPackageView;
}) {
  return (
    <section
      data-testid="customer-proof-package"
      data-stage={view.stage}
      className="space-y-6"
    >
      <header className="rounded border border-zinc-800 bg-zinc-950/60 px-4 py-3">
        <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono mb-1">
          Package status
        </div>
        <div className="text-base text-zinc-100">{STAGE_LABEL[view.stage]}</div>
      </header>

      <div className="rounded border border-zinc-800 bg-zinc-950/60 px-4 py-3">
        <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono mb-2">
          Package identity
        </div>
        <dl className="text-sm text-zinc-300 font-mono space-y-1">
          <div>
            <dt className="inline text-zinc-500">run: </dt>
            <dd className="inline">{view.identity.runId}</dd>
          </div>
          <div>
            <dt className="inline text-zinc-500">bundle: </dt>
            <dd className="inline">{view.identity.bundleId ?? "—"}</dd>
          </div>
          <div>
            <dt className="inline text-zinc-500">artifact: </dt>
            <dd className="inline break-all">
              {view.identity.artifactHash ?? "—"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-950/60 px-4 py-3">
        <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono mb-2">
          Delivery
        </div>
        {view.delivery.delivered ? (
          <dl className="text-sm text-zinc-300 space-y-1">
            <div>
              <dt className="inline text-zinc-500">Delivered at: </dt>
              <dd className="inline font-mono">
                {fmtTs(view.delivery.deliveredAt)}
              </dd>
            </div>
            <div>
              <dt className="inline text-zinc-500">Channel: </dt>
              <dd className="inline font-mono">
                {view.delivery.channel ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="inline text-zinc-500">Recipient: </dt>
              <dd className="inline font-mono">
                {view.delivery.recipient ?? "—"}
              </dd>
            </div>
            {view.delivery.acknowledgedAt ? (
              <div>
                <dt className="inline text-zinc-500">Acknowledged at: </dt>
                <dd className="inline font-mono">
                  {fmtTs(view.delivery.acknowledgedAt)}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <div className="text-sm text-zinc-400">
            This proof package has not yet been delivered.
          </div>
        )}
      </div>

      <div
        data-testid="customer-disposition"
        className="rounded border border-zinc-800 bg-zinc-950/60 px-4 py-3"
      >
        <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono mb-2">
          Customer disposition
        </div>
        {view.disposition ? (
          <dl className="text-sm text-zinc-300 space-y-1">
            <div>
              <dt className="inline text-zinc-500">Status: </dt>
              <dd className="inline">
                {view.disposition.disposition === "accepted"
                  ? "Accepted"
                  : "Rejected"}
              </dd>
            </div>
            <div>
              <dt className="inline text-zinc-500">By: </dt>
              <dd className="inline font-mono">
                {view.disposition.acceptedBy}
              </dd>
            </div>
            <div>
              <dt className="inline text-zinc-500">At: </dt>
              <dd className="inline font-mono">
                {fmtTs(view.disposition.acceptedAt)}
              </dd>
            </div>
            {view.disposition.comment ? (
              <div className="mt-2 rounded border border-zinc-800 bg-black/30 p-2 text-xs text-zinc-200">
                {view.disposition.comment}
              </div>
            ) : null}
            {view.disposition.receipt ? (
              <div
                data-testid="customer-acceptance-receipt"
                className="mt-3 rounded border border-zinc-800 bg-black/30 p-2"
              >
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono mb-1">
                  Acceptance receipt (v{view.disposition.receipt.schemaVersion})
                </div>
                <div className="text-xs text-zinc-200 font-mono break-all">
                  {view.disposition.receipt.receiptHash}
                </div>
              </div>
            ) : null}
          </dl>
        ) : (
          <div className="text-sm text-zinc-400">
            No customer disposition recorded yet.
          </div>
        )}
      </div>
    </section>
  );
}
