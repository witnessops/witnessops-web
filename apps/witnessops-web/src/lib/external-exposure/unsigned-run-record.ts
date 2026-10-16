import { canonicalSource } from "../../../../witnessops-app/src/lib/source-digest";
import {
  PUBLIC_EXPOSURE_REVIEW_REQUIRED_CLAIMS,
  PUBLIC_EXPOSURE_REVIEW_REQUIRED_LIMITATIONS,
} from "../../../../../packages/proof/src/receipt/public-exposure-review";
import { CHECK_IDS, type CheckId, type CheckStatus, type ExternalCheckResultV1, type ExternalSnapshotV1 } from "./contracts";

/** Proposed schema id. This is an unsigned run record, not witnessops.receipt.v0. */
export const UNSIGNED_RUN_RECORD_VERSION = "witnessops.run-record.unsigned.v0" as const;
export const UNSIGNED_RUN_RECORD_WORKFLOW = "external_exposure_snapshot" as const;

/**
 * Canonicalization for the integrity digest, reused from
 * apps/witnessops-app/src/lib/source-digest.ts (`canonicalSource`):
 * witnessops-canonical-json-v1. Object keys are sorted by UTF-16 code unit,
 * arrays keep recorded order, strings and numbers use JSON encoding, and the
 * document has no whitespace. The digest is SHA-256 over the UTF-8 bytes of
 * that document for the raw snapshot. It is not a hash of this run record.
 */
export const CANONICALIZATION_ID = "witnessops-canonical-json-v1" as const;

export const RUN_RECORD_WORDING = {
  integrityLabel: "Integrity hash (SHA-256), not yet signed",
  integrityMeaning: "This hash lets you detect if this record changes after it was issued. It does not show who issued it, and it is not independent verification.",
  keepCopy: "Keep a copy; the hash only helps if you hold the original.",
  noIssues: "no issues found by the listed checks",
  /** DRAFT COPY — needs Karol's OK before this sentence is treated as final. */
  scopeLine: "This lists only the checks named here. It does not show that the domain is secure.",
  recheck: "How to re-check: sha256sum of the Download source JSON file.",
} as const;

/** Human labels for the adopted limitation ids. The ids stay in the record. */
export const WHAT_THIS_IS_NOT_LABELS: Record<(typeof PUBLIC_EXPOSURE_REVIEW_REQUIRED_LIMITATIONS)[number], string> = {
  not_a_penetration_test: "Not a penetration test",
  not_a_certification: "Not a certification",
  not_an_attestation: "Not an attestation",
  not_a_compliance_determination: "Not a compliance determination",
  not_proof_of_security: "Not a statement that the domain is secure",
  not_proof_of_completeness: "Not a statement of complete coverage",
  not_proof_of_third_party_acceptance: "Not acceptance by another party",
  not_proof_of_absence_of_vulnerabilities: "Not a statement that vulnerabilities are absent",
};

export type RunRecordOverall = "pass" | "partial" | "fail" | "inconclusive";

export type UnsignedRunRecord = {
  version: typeof UNSIGNED_RUN_RECORD_VERSION;
  workflow_class: typeof UNSIGNED_RUN_RECORD_WORKFLOW;
  run_id: string;
  domain: string;
  timestamp: { utc: string; europe_warsaw: string };
  vantage: { kind: "external"; description: string };
  checks_performed: CheckId[];
  checks_not_run: CheckId[];
  results: Array<{
    check_id: CheckId;
    title: string;
    status: CheckStatus;
    collected: boolean;
    evidence_refs: string[];
  }>;
  overall: RunRecordOverall;
  evidence_refs: string[];
  claims_not_asserted: readonly string[];
  what_this_is_not: readonly string[];
  scope_line: typeof RUN_RECORD_WORDING.scopeLine;
  recheck: typeof RUN_RECORD_WORDING.recheck;
  collected_evidence: { count: number; total: 10 };
  integrity: {
    algorithm: "sha256";
    digest: string;
    signed: false;
    canonicalization: typeof CANONICALIZATION_ID;
  };
};

const VANTAGE = "Public DNS, TLS and HTTP from the WitnessOps collection service. No customer-network position is included.";
const DIGEST = /^(?!f{64}$)[a-f0-9]{64}$/;
const RECORD_KEYS = [
  "version", "workflow_class", "run_id", "domain", "timestamp", "vantage",
  "checks_performed", "checks_not_run", "results", "overall", "evidence_refs",
  "claims_not_asserted", "what_this_is_not", "scope_line", "recheck",
  "collected_evidence", "integrity",
] as const;

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(n: number, x: number) {
  return (x >>> n) | (x << (32 - n));
}

/** SHA-256 of a UTF-8 string. Matches Node crypto for the canonical source bytes. */
export function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;
  const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen >>> 0, false);
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + K[i] + w[i]) >>> 0;
      const s0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map(value => value.toString(16).padStart(8, "0")).join("");
}

export function sourceDigest(snapshot: unknown): string {
  return sha256Hex(canonicalSource(snapshot));
}

export function checksPerformedSentence(performed: readonly string[], notRun: readonly string[]): string {
  return `Checks performed: ${performed.length ? performed.join(", ") : "none"}. Not checked: ${notRun.length ? notRun.join(", ") : "none"}.`;
}

export function collectedEvidenceSentence(count: number): string {
  return `Checks with collected evidence: ${count}/10`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasSignatureKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasSignatureKey);
  if (!isRecord(value)) return false;
  if (Object.prototype.hasOwnProperty.call(value, "signature")) return true;
  return Object.values(value).some(hasSignatureKey);
}

function warsawIso(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? "";
  const hour = pick("hour") === "24" ? "00" : pick("hour");
  const offset = pick("timeZoneName").replace(/^GMT/, "") || "Z";
  const ms = String(date.getUTCMilliseconds()).padStart(3, "0");
  return `${pick("year")}-${pick("month")}-${pick("day")}T${hour}:${pick("minute")}:${pick("second")}.${ms}${offset}`;
}

export function recordTimestamp(iso: string): { utc: string; europe_warsaw: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error("Run record timestamp is invalid.");
  return { utc: date.toISOString(), europe_warsaw: warsawIso(date) };
}

function clock(date: Date, timeZone: string, withZone: boolean) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone, day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    timeZoneName: withZone ? "short" : undefined,
  }).format(date);
}

export function displayTimestamp(iso: string): { utc: string; warsaw: string } {
  const date = new Date(iso);
  return { utc: `${clock(date, "UTC", false)} UTC`, warsaw: clock(date, "Europe/Warsaw", true) };
}

export function overallFor(results: readonly { status: CheckStatus }[], notRun: number): RunRecordOverall {
  const attention = results.filter(result => result.status === "NEEDS_ATTENTION").length;
  const gaps = notRun + results.filter(result => result.status === "UNDETERMINED" || result.status === "CHECK_ERROR").length;
  if (attention > 0 && gaps > 0) return "partial";
  if (attention > 0) return "fail";
  if (gaps > 0) return "inconclusive";
  return "pass";
}

function bySchedule(left: { check_id: CheckId }, right: { check_id: CheckId }) {
  return CHECK_IDS.indexOf(left.check_id) - CHECK_IDS.indexOf(right.check_id);
}

export function publicCheckRunId(snapshot: ExternalSnapshotV1): string {
  return `public-check:${sourceDigest(snapshot).slice(0, 24)}`;
}

export function buildUnsignedRunRecord(snapshot: ExternalSnapshotV1, runId: string): UnsignedRunRecord {
  if (!runId || runId.length > 200) throw new Error("Run record id is missing.");
  const present = new Set(snapshot.checks.map(check => check.check_id));
  const checksPerformed = CHECK_IDS.filter(id => present.has(id));
  const checksNotRun = CHECK_IDS.filter(id => !present.has(id));
  const ordered = [...snapshot.checks].sort(bySchedule);
  const results = ordered.map(check => ({
    check_id: check.check_id,
    title: check.title,
    status: check.status,
    collected: check.collected,
    evidence_refs: [...check.evidence],
  }));
  const evidence = [...new Set(results.flatMap(result => result.evidence_refs))];
  const record: UnsignedRunRecord = {
    version: UNSIGNED_RUN_RECORD_VERSION,
    workflow_class: UNSIGNED_RUN_RECORD_WORKFLOW,
    run_id: runId,
    domain: snapshot.target,
    timestamp: recordTimestamp(snapshot.finished_at),
    vantage: { kind: "external", description: VANTAGE },
    checks_performed: checksPerformed,
    checks_not_run: checksNotRun,
    results,
    overall: overallFor(results, checksNotRun.length),
    evidence_refs: evidence,
    claims_not_asserted: PUBLIC_EXPOSURE_REVIEW_REQUIRED_CLAIMS,
    what_this_is_not: PUBLIC_EXPOSURE_REVIEW_REQUIRED_LIMITATIONS,
    scope_line: RUN_RECORD_WORDING.scopeLine,
    recheck: RUN_RECORD_WORDING.recheck,
    collected_evidence: { count: snapshot.checks.filter(check => check.collected).length, total: 10 },
    integrity: {
      algorithm: "sha256",
      digest: sourceDigest(snapshot),
      signed: false,
      canonicalization: CANONICALIZATION_ID,
    },
  };
  const validation = validateUnsignedRunRecord(record);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  return record;
}

function sameList(value: unknown, expected: readonly string[]): boolean {
  return Array.isArray(value) && value.length === expected.length && expected.every((item, index) => value[index] === item);
}

export function validateUnsignedRunRecord(input: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!isRecord(input)) return { valid: false, errors: ["Run record must be an object."] };
  if (hasSignatureKey(input)) errors.push("Run record must not carry a signature.");
  const keys = Object.keys(input);
  if (keys.length !== RECORD_KEYS.length || RECORD_KEYS.some(key => !Object.prototype.hasOwnProperty.call(input, key))) errors.push("Run record fields do not match the unsigned schema.");
  if (input.version !== UNSIGNED_RUN_RECORD_VERSION) errors.push("Run record version is not the unsigned schema.");
  if (input.workflow_class !== UNSIGNED_RUN_RECORD_WORKFLOW) errors.push("Run record workflow class is not the external snapshot.");
  if (typeof input.run_id !== "string" || input.run_id.length < 1 || input.run_id.length > 200) errors.push("Run id is invalid.");
  if (typeof input.domain !== "string" || input.domain.length < 1 || input.domain.length > 253) errors.push("Domain is invalid.");
  if (!isRecord(input.timestamp) || typeof input.timestamp.utc !== "string" || typeof input.timestamp.europe_warsaw !== "string") errors.push("Timestamp must include UTC and Europe/Warsaw.");
  if (!isRecord(input.vantage) || input.vantage.kind !== "external" || input.vantage.description !== VANTAGE) errors.push("Vantage is invalid.");
  if (!Array.isArray(input.checks_performed) || !Array.isArray(input.checks_not_run)) errors.push("Check lists are invalid.");
  const performed = new Set(Array.isArray(input.checks_performed) ? input.checks_performed : []);
  const notRun = new Set(Array.isArray(input.checks_not_run) ? input.checks_not_run : []);
  if (performed.size + notRun.size !== CHECK_IDS.length || CHECK_IDS.some(id => performed.has(id) === notRun.has(id))) errors.push("Performed and not-run checks must partition the ten checks.");
  if (!Array.isArray(input.results)) errors.push("Results are missing.");
  else if (input.results.length !== performed.size) errors.push("Each performed check needs one result.");
  if (!["pass", "partial", "fail", "inconclusive"].includes(String(input.overall))) errors.push("Overall outcome is invalid.");
  if (!Array.isArray(input.evidence_refs)) errors.push("Evidence refs are missing.");
  if (!sameList(input.claims_not_asserted, PUBLIC_EXPOSURE_REVIEW_REQUIRED_CLAIMS)) errors.push("Claim list must be the adopted public exposure review claims, not asserted.");
  if (!sameList(input.what_this_is_not, PUBLIC_EXPOSURE_REVIEW_REQUIRED_LIMITATIONS)) errors.push("What-this-is-not list must be the adopted limitation ids.");
  if (input.scope_line !== RUN_RECORD_WORDING.scopeLine) errors.push("Scope line does not match the draft copy.");
  if (input.recheck !== RUN_RECORD_WORDING.recheck) errors.push("Re-check note is missing.");
  if (!isRecord(input.collected_evidence) || input.collected_evidence.total !== 10 || typeof input.collected_evidence.count !== "number") errors.push("Collected evidence count is invalid.");
  if (!isRecord(input.integrity) || input.integrity.algorithm !== "sha256" || input.integrity.signed !== false || input.integrity.canonicalization !== CANONICALIZATION_ID || typeof input.integrity.digest !== "string" || !DIGEST.test(input.integrity.digest)) errors.push("Integrity must be an unsigned SHA-256 digest.");
  return { valid: errors.length === 0, errors };
}

const ALLOWED_WORDING = [
  "not yet signed",
  "\"signed\": false",
  "\"signed\":false",
  "signed: false",
  ...PUBLIC_EXPOSURE_REVIEW_REQUIRED_CLAIMS,
  ...PUBLIC_EXPOSURE_REVIEW_REQUIRED_LIMITATIONS,
];

const FORBIDDEN_WORDING: Array<[string, RegExp]> = [
  ["verified", /\bverified\b/i],
  ["certified", /\bcertified\b/i],
  ["proof", /\bproof\b/i],
  ["signed", /\bsigned\b/i],
  ["tamper-proof", /tamper-proof/i],
  ["independently verified", /independently verified/i],
  ["guaranteed", /\bguaranteed\b/i],
  ["your domain is secure", /your domain is secure/i],
  ["check mark", /[✓✔✅]/],
  ["Declared", /\bDeclared\b/],
  ["Not proven", /Not proven/],
];

/** Wording lint for UI copy, the run record, and the print document. */
export function wordingViolations(text: string): string[] {
  let scrubbed = text;
  for (const snippet of ALLOWED_WORDING) scrubbed = scrubbed.split(snippet).join(" ");
  return FORBIDDEN_WORDING.filter(([, pattern]) => pattern.test(scrubbed)).map(([name]) => name);
}

export function resultGroups(checks: readonly ExternalCheckResultV1[]) {
  const ordered = [...checks].sort(bySchedule);
  return {
    attention: ordered.filter(check => check.status === "NEEDS_ATTENTION"),
    ok: ordered.filter(check => check.status === "OBSERVED_EXPECTED"),
    informational: ordered.filter(check => check.status === "INFORMATIONAL"),
    undetermined: ordered.filter(check => check.status === "UNDETERMINED" || check.status === "CHECK_ERROR"),
  };
}
