/** Product-specific observations. This is not a second generic report model. */
export const EXTERNAL_VERSION = 'external-demo-v0.1' as const;
export const CHECK_IDS = [
  'dns.public_target.v1', 'tls.certificate.v1', 'tls.legacy_protocols.v1',
  'web.https_redirect.v1', 'web.hsts.v1', 'web.security_headers.v1',
  'web.security_txt.v1', 'mail.spf.v1', 'mail.dmarc.v1', 'dns.caa.v1',
] as const;
export type CheckId = typeof CHECK_IDS[number];
export type CheckStatus = 'OBSERVED_EXPECTED' | 'NEEDS_ATTENTION' | 'INFORMATIONAL' | 'UNDETERMINED' | 'CHECK_ERROR';
export type ExternalCheckResultV1 = {
  check_id: CheckId; check_version: typeof EXTERNAL_VERSION; target: string;
  started_at: string; finished_at: string; status: CheckStatus; method: string;
  title: string; observation: unknown; evidence: string[]; interpretation: string;
  limitations: string[]; recommendation: string | null; collected: boolean;
};
export type BudgetUsage = { dns: number; normalTls: number; legacyTls: number; http: number; redirects: number };
/** Operation/attempt ledger, not proof of returned DNS records, connected sockets or HTTP responses. */
export type NetworkEvent = { kind: 'dns' | 'connect' | 'http' | 'redirect'; hostname: string; detail: string; address?: string; port?: 80 | 443 };
export type ExternalSnapshotV1 = {
  version: typeof EXTERNAL_VERSION; target: string; started_at: string; finished_at: string;
  checks: ExternalCheckResultV1[]; usage: BudgetUsage; network: NetworkEvent[];
};
export type DnsRecords = {
  A: string[]; AAAA: string[]; TXT: string[][];
  MX: { exchange: string; priority: number }[];
  CAA: { critical: number; issue?: string; issuewild?: string; iodef?: string; [key: string]: string | number | undefined }[];
};
export type PublicTarget = { addresses: { address: string; family: 4 | 6 }[]; a: string[]; aaaa: string[] };
export type TlsObservation = {
  handshake: boolean; authorized: boolean; authorizationError: string | null; hostnameMatch: boolean;
  validFrom: string; validTo: string; issuer: Record<string, string>; sans: string[];
  fingerprint: string; address: string; protocol: string | null;
  validationFailure?: never;
} | {
  /** Strict validation stopped the handshake; peer metadata was not collected. */
  handshake: false; authorized: false; authorizationError: string;
  validationFailure: { code: string; message: string };
  certificateMetadata: null;
};
export type LegacyObservation = { protocol: 'TLSv1' | 'TLSv1.1'; outcome: 'negotiated' | 'peer_rejected' | 'undetermined'; detail: string };
/** A collected HTTP response; request attempts alone never produce this observation. */
export type HttpObservation = { url: string; statusCode: number; headers: Record<string, string>; body: string; bodyBytes: number; utf8Valid: boolean; address: string };
export interface ObservationTransport {
  query<K extends keyof DnsRecords>(kind: K, hostname: string): Promise<DnsRecords[K]>;
  publicTarget(hostname: string): Promise<PublicTarget>;
  certificate(hostname: string): Promise<TlsObservation>;
  legacy(hostname: string, protocol: 'TLSv1' | 'TLSv1.1'): Promise<LegacyObservation>;
  request(url: string, bodyLimit: number): Promise<HttpObservation>;
  followRedirect(fromHostname: string, toHostname: string, destinationPort: 80 | 443): void;
  checkpoint(): void;
  readonly usage: BudgetUsage;
  readonly events: NetworkEvent[];
  close(): void;
}
export const SNAPSHOT_BOUNDARY = 'This snapshot covers ten defined public observations against the submitted hostname at the recorded time. It does not establish the absence of vulnerabilities and does not constitute a penetration test, complete attack-surface assessment, certification, compliance assessment, or assurance opinion.';
export const EXCLUSIONS = [
  'Application vulnerability exploitation', 'Authenticated functionality', 'Credentials and brute force',
  'Ports other than 80/443', 'Internal infrastructure', 'Cloud/IAM configuration',
  'Complete subdomain discovery', 'Agent permissions and internal controls', 'Malware',
  'Full TLS/cipher audit', 'Complete mail architecture',
] as const;
