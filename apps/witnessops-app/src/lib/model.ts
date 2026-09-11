import { CHECK_IDS, EXTERNAL_VERSION, type ExternalSnapshotV1, type CheckStatus } from "../../../witnessops-web/src/lib/external-exposure/contracts";
export { CHECK_IDS, EXTERNAL_VERSION, SNAPSHOT_BOUNDARY } from "../../../witnessops-web/src/lib/external-exposure/contracts";
export type { ExternalSnapshotV1, ExternalCheckResultV1 } from "../../../witnessops-web/src/lib/external-exposure/contracts";

export const RECOMMENDED_PROFILE = { id: "bounded-hostname", version: EXTERNAL_VERSION, checkIds: [...CHECK_IDS] } as const;
export type Asset = { id: string; hostname: string; type: "domain" | "hostname" | "linux_server"; createdAt: string };
export type Run = { id: string; assetId: string; createdAt: string; sourceDigest: string; profile: { id: string; version: string; checkIds: readonly string[] }; snapshot: ExternalSnapshotV1 };
export type WorkspaceSummary = { id: string; name: string; slug: string; role: "owner" | "viewer" };
export type LinuxCheckRun = { id: string; assetId: string; createdAt: string; sourceDigest: string;
  proofRunId: string; verifierVersion: string; profileId: string; outcome: string; synthetic: boolean;
  observedHostname: string; observedAt: string; sourceAssetId: string; machineIdentity: unknown };
export type Workspace = WorkspaceSummary & { assets: Asset[]; runs: Run[]; linuxRuns?: LinuxCheckRun[]; members: Array<{ id: string; displayName: string | null; role: "owner" | "viewer" }> };
export type WorkspaceState = { user: { id: string; displayName: string | null }; workspaces: WorkspaceSummary[]; workspace: Workspace | null };
export const STATUS_LABEL: Record<CheckStatus, string> = { OBSERVED_EXPECTED: "Clear", NEEDS_ATTENTION: "Needs attention", INFORMATIONAL: "Informational", UNDETERMINED: "Undetermined", CHECK_ERROR: "Undetermined" };
export const CHECK_LABELS: Record<typeof CHECK_IDS[number], string> = {
  "dns.public_target.v1": "Public DNS target", "tls.certificate.v1": "TLS certificate state",
  "tls.legacy_protocols.v1": "Legacy TLS protocols", "web.https_redirect.v1": "HTTP to HTTPS transition",
  "web.hsts.v1": "HTTP Strict Transport Security", "web.security_headers.v1": "Browser security headers",
  "web.security_txt.v1": "Vulnerability reporting contact", "mail.spf.v1": "SPF publication",
  "mail.dmarc.v1": "DMARC publication", "dns.caa.v1": "CAA publication",
};

/** Stable source-value comparison: collection timestamps and key order are not target changes. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export type ChangeSummary = { baseline: boolean; environment: string[]; coverage: string[]; uncertainty: string[] };
export function compareRuns(current: Run, previous?: Run): ChangeSummary {
  const out: ChangeSummary = { baseline: !previous, environment: [], coverage: [], uncertainty: [] };
  if (!previous || previous.assetId !== current.assetId || previous.snapshot.target !== current.snapshot.target) return { ...out, baseline: true };
  const profileChanged = current.profile.id !== previous.profile.id || current.profile.version !== previous.profile.version;
  if (profileChanged) out.coverage.push("Recommended-check method or version changed.");
  const old = new Map(previous.snapshot.checks.map(c => [c.check_id, c]));
  for (const check of current.snapshot.checks) {
    const prior = old.get(check.check_id); old.delete(check.check_id);
    if (!prior) { out.coverage.push(`${check.title}: newly checked.`); continue; }
    if (profileChanged || prior.check_version !== check.check_version || prior.method !== check.method) {
      out.coverage.push(`${check.title}: method changed; target comparison not established.`); continue;
    }
    if (!check.collected || !prior.collected || [check.status, prior.status].some(s => s === "CHECK_ERROR" || s === "UNDETERMINED")) {
      out.uncertainty.push(`${check.title}: collection is not comparable.`); continue;
    }
    if (check.status !== prior.status || observationKey(check.check_id, check.observation) !== observationKey(prior.check_id, prior.observation)) out.environment.push(`${check.title}: observed state changed.`);
  }
  for (const c of old.values()) out.coverage.push(`${c.title}: no longer checked.`);
  return out;
}

// Certificate countdown is derived from collection time, not a target mutation.
function observationKey(id: string, value: unknown): string {
  if (id === "tls.certificate.v1" && value && typeof value === "object" && !Array.isArray(value)) {
    const copy = { ...value } as Record<string, unknown>; delete copy.daysRemaining; return canonical(copy);
  }
  return canonical(value);
}
