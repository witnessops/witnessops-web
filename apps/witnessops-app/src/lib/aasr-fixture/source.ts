import 'server-only';
import { createHash } from 'node:crypto';

// Exact synthetic source bytes from WOPS-AASR-CODEX-HANDOFF-20261031. Never a customer upload.
export const RAW_SOURCE = "{\n  \"fixture\": true,\n  \"source\": \"SYNTHETIC_TEST_DATA\",\n  \"schema\": \"witnessops.aasr.fixture.evidence.v0.1\",\n  \"engagementId\": \"SYN-AASR-001\",\n  \"workspaceId\": \"SYN-NORTHSTAR\",\n  \"agentId\": \"northstar-followup-agent\",\n  \"actionId\": \"crm.contact.update\",\n  \"collectedAt\": \"2026-10-31T10:00:04.000Z\",\n  \"collectionMethod\": \"fictional-customer-export\",\n  \"evidence\": [\n    {\n      \"id\": \"SYN-EV-POLICY\",\n      \"kind\": \"policy_snapshot\",\n      \"declaredValue\": \"human approval required before crm.contact.update\",\n      \"independentlyVerified\": false\n    },\n    {\n      \"id\": \"SYN-EV-ACTION\",\n      \"kind\": \"execution_trace\",\n      \"declaredValue\": \"approved=true; simulated tool returned success for FAKE-CONTACT-001\",\n      \"independentlyVerified\": false\n    },\n    {\n      \"id\": \"SYN-EV-MISSING\",\n      \"kind\": \"coverage_gap\",\n      \"declaredValue\": \"no independent runtime proof that disapproved updates are prevented\",\n      \"independentlyVerified\": false\n    }\n  ],\n  \"secretsIncluded\": false,\n  \"customerDataIncluded\": false\n}\n";
export const RAW_SOURCE_DIGEST = "sha256:ddfe3a9edfb241f7984faa583c992f60e46a1c2b2aff32f3657b91fa17a97e27";
export const CANONICAL_SOURCE_DIGEST = "sha256:8d9009edff2413b520d343950290f1e42ba7829671119405520bc725fdf32267";
export const SCOPE = Object.freeze({
  "fixture": true,
  "workspaceId": "SYN-NORTHSTAR",
  "engagementId": "SYN-AASR-001",
  "agentId": "northstar-followup-agent",
  "actionId": "crm.contact.update",
  "environment": "synthetic",
  "target": "FAKE-CONTACT-001",
  "approvedOperations": Object.freeze(["read synthetic policy", "inspect synthetic event log", "prepare simulated report"] as const),
  "excludedOperations": Object.freeze(["execute customer agent", "contact real CRM", "send report", "deploy software", "access production"] as const),
  "customerAuthority": "SYN-CUSTOMER-APPROVAL-001"
} as const);

export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
}
export function digest(value: unknown): string {
  return hashBytes(canonical(value));
}
export function hashBytes(raw: string): string {
  return `sha256:${createHash('sha256').update(raw, 'utf8').digest('hex')}`;
}
export interface SyntheticEvidence {
  fixture: true; source: 'SYNTHETIC_TEST_DATA'; schema: string;
  engagementId: string; workspaceId: string; agentId: string; actionId: string;
  collectedAt: string; collectionMethod: string;
  evidence: { id: string; kind: string; declaredValue: string; independentlyVerified: false }[];
  secretsIncluded: false; customerDataIncluded: false;
}
export function validateSource(raw: string, claimedDigest: string = CANONICAL_SOURCE_DIGEST) {
  if (typeof raw !== 'string' || Buffer.byteLength(raw, 'utf8') > 8192) throw new Error('invalid_source_size');
  // Check bytes before parsing. This rejects alternate schemas, duplicate keys, real data and malformed input.
  if (hashBytes(raw) !== RAW_SOURCE_DIGEST) throw new Error('source_bytes_mismatch');
  const parsed = JSON.parse(raw) as SyntheticEvidence;
  if (digest(parsed) !== CANONICAL_SOURCE_DIGEST || claimedDigest !== CANONICAL_SOURCE_DIGEST) throw new Error('source_digest_mismatch');
  return { rawBytes: raw, parsed, rawDigest: RAW_SOURCE_DIGEST, canonicalDigest: CANONICAL_SOURCE_DIGEST,
    claimedDigest, claimedMetadata: { collectedAt: parsed.collectedAt, collectionMethod: parsed.collectionMethod } };
}
