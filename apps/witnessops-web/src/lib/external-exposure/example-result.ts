import type { CheckId, CheckStatus } from './contracts';
import type { ExposureCheckSummary } from './next-actions';

/** Deliberately not an ExternalSnapshotV1: no collection time, ledger, digest or report-admission claim. */
const rows: [CheckId, string, CheckStatus, string, string | null][] = [
  ['dns.public_target.v1', 'Public DNS target', 'OBSERVED_EXPECTED', 'The example hostname resolves to a public address.', null],
  ['tls.certificate.v1', 'TLS certificate', 'OBSERVED_EXPECTED', 'The example certificate is in date and matches the hostname.', null],
  ['tls.legacy_protocols.v1', 'Legacy TLS', 'UNDETERMINED', 'The example could not determine whether a legacy TLS connection would be accepted.', null],
  ['web.https_redirect.v1', 'HTTPS redirect', 'OBSERVED_EXPECTED', 'The example HTTP response redirects to HTTPS.', null],
  ['web.hsts.v1', 'HSTS policy', 'NEEDS_ATTENTION', 'The example HTTPS response does not include an HSTS header.', 'Ask the website administrator whether HSTS is appropriate after confirming HTTPS coverage. Review the intended policy and rollout before making a change.'],
  ['web.security_headers.v1', 'Response headers', 'INFORMATIONAL', 'The example records selected response headers; their suitability depends on the application.', null],
  ['web.security_txt.v1', 'Security contact file', 'CHECK_ERROR', 'The example request for security.txt timed out, so its contents are unknown.', null],
  ['mail.spf.v1', 'SPF policy', 'OBSERVED_EXPECTED', 'The example has one syntactically recognizable SPF policy.', null],
  ['mail.dmarc.v1', 'DMARC policy', 'NEEDS_ATTENTION', 'The example publishes a monitoring-only DMARC policy.', 'Ask the email administrator to review legitimate senders, alignment and monitoring results before deciding whether an enforcement change is appropriate.'],
  ['dns.caa.v1', 'Certificate issuer policy', 'OBSERVED_EXPECTED', 'The example publishes a recognizable CAA policy.', null],
];

export const exampleExposureResult = {
  target: 'example.com', started_at: null, finished_at: null,
  checks: rows.map(([check_id, title, status, interpretation, recommendation]): ExposureCheckSummary => ({
    check_id, title, status, interpretation, recommendation,
    evidence: ['Illustrative content only; no DNS, TLS or HTTP request was made.'],
    limitations: ['Synthetic example, not an observation of example.com.'],
  })),
};
