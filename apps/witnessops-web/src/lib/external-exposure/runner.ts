import { parse } from 'tldts';
import { normalizeExternalHostname, UnsafeTargetError } from './input';
import { createObservationTransport, ObservationError } from './network';
import {
  inspectCertificate, inspectLegacy, inspectHsts, inspectHeaders,
  inspectSecurityTxt, inspectSpf, inspectDmarc, inspectCaa, type Interpretation,
} from './checks';
import {
  CHECK_IDS, EXTERNAL_VERSION, type CheckId, type DnsRecords, type ExternalCheckResultV1,
  type ExternalSnapshotV1, type HttpObservation, type ObservationTransport, type TlsObservation,
} from './contracts';

const BODY_LIMIT = 256 * 1024;
const SECURITY_TEXT_LIMIT = 64 * 1024;
const TITLES: Record<CheckId, string> = {
  'dns.public_target.v1': 'Public DNS target', 'tls.certificate.v1': 'TLS certificate state',
  'tls.legacy_protocols.v1': 'Legacy TLS protocols', 'web.https_redirect.v1': 'HTTP to HTTPS transition',
  'web.hsts.v1': 'HTTP Strict Transport Security', 'web.security_headers.v1': 'Browser security headers',
  'web.security_txt.v1': 'Vulnerability reporting contact', 'mail.spf.v1': 'SPF publication',
  'mail.dmarc.v1': 'DMARC publication', 'dns.caa.v1': 'CAA publication',
};
const METHODS: Record<CheckId, string> = {
  'dns.public_target.v1': 'Controlled A and AAAA resolution; reject every non-global candidate before application traffic.',
  'tls.certificate.v1': 'One TLS handshake to a validated address on 443, with logical hostname SNI and certificate hostname validation.',
  'tls.legacy_protocols.v1': 'At most one TLS 1.0 and one TLS 1.1 attempt, without cipher enumeration.',
  'web.https_redirect.v1': 'GET the HTTP root and follow at most three HTTP/HTTPS redirects, validating each new connection.',
  'web.hsts.v1': 'Parse Strict-Transport-Security from the shared final usable HTTPS response.',
  'web.security_headers.v1': 'Inspect nosniff, framing protection, CSP and Referrer-Policy on the shared HTTPS response.',
  'web.security_txt.v1': 'At most two HTTPS GETs: /.well-known/security.txt, then /security.txt if needed; 64 KiB each.',
  'mail.spf.v1': 'TXT and MX at the submitted hostname. Bounded publication syntax only; no mechanism recursion.',
  'mail.dmarc.v1': 'TXT at _dmarc.hostname and the shared MX observation. No contact with reporting destinations.',
  'dns.caa.v1': 'Recursive resolver CAA lookup and parent inheritance, at most five names, bounded by the PSL registrable domain.',
};

function failure(error: unknown): Interpretation {
  if (error instanceof UnsafeTargetError) throw error;
  const code = error instanceof ObservationError ? error.code : 'observation_error';
  // Network, local protocol limitations and exhausted budgets are uncertainty, never findings.
  const unexpected = code === 'dns_error' || code === 'observation_error';
  return {
    status: unexpected ? 'CHECK_ERROR' : 'UNDETERMINED', observation: { reason: code },
    interpretation: `This observation could not be completed (${code}). No security conclusion follows.`,
    limitations: ['Collection is bounded by the connection, response-size, query and total-time limits of this run.'],
    recommendation: 'Arrange a separately scoped follow-up if this observation is needed.',
  };
}

function unavailable(reason: string): Interpretation {
  return {
    status: 'UNDETERMINED', observation: { reason }, interpretation: reason,
    limitations: ['No usable response was collected for this check.'],
    recommendation: 'Arrange a separately scoped follow-up if this observation is needed.',
  };
}

/** Only selected bounded response metadata enters source evidence, never an HTML response body. */
function responseEvidence(response: HttpObservation) {
  return { url: response.url, status: response.statusCode, address: response.address };
}

function usableHttps(response: HttpObservation | undefined): response is HttpObservation {
  return Boolean(response && new URL(response.url).protocol === 'https:' && response.statusCode >= 200 && response.statusCode < 300);
}

function redirectUrl(location: string, previous: string): string {
  if (location.length > 2048 || /[\u0000-\u0020\u007f]/u.test(location)) throw new ObservationError('redirect_invalid');
  let url: URL;
  try { url = new URL(location, previous); } catch { throw new ObservationError('redirect_invalid'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) {
    throw new UnsafeTargetError('A redirect used an unsupported protocol, port or credentials.');
  }
  url.hostname = normalizeExternalHostname(url.hostname);
  url.hash = '';
  return url.href;
}

/** The recursive resolver follows aliases; RFC 8659 parent traversal uses the queried name. */
export async function observeCaa(target: string, transport: ObservationTransport): Promise<Interpretation & { collected?: boolean }> {
  const suffix = parse(target, { allowPrivateDomains: true });
  if (!suffix.domain || (!suffix.isIcann && !suffix.isPrivate)) return { ...unavailable('The registrable-domain boundary could not be established from the Public Suffix List.'), collected: false };
  const names: string[] = [];
  let name = target;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const records = await transport.query('CAA', name);
    names.push(name);
    if (records.length) {
      const result = inspectCaa(records);
      return { ...result, observation: { queriedNames: names, effectiveName: name, registrableDomain: suffix.domain, records }, limitations: [...result.limitations, 'Inheritance stops at the PSL registrable domain; no names above that boundary are queried.'] };
    }
    if (name === suffix.domain) return {
      status: 'INFORMATIONAL', observation: { queriedNames: names, effectiveName: null, registrableDomain: suffix.domain, records: [] },
      interpretation: 'No effective CAA restriction was observed within the stated registrable-domain boundary.',
      limitations: ['Absence of CAA does not establish that unauthorized certificates exist.', 'Names above the registrable domain were not queried.'],
      recommendation: null,
    };
    name = name.slice(name.indexOf('.') + 1);
  }
  return { ...unavailable('The five-query CAA limit was reached before the inheritance boundary.'), observation: { queriedNames: names, effectiveName: null, registrableDomain: suffix.domain } };
}

/** Server-only bounded runner. Injection is a test seam, never part of the public request contract. */
export async function runSnapshot(rawTarget: unknown, options: { transport?: ObservationTransport; now?: () => Date } = {}): Promise<ExternalSnapshotV1> {
  const target = normalizeExternalHostname(rawTarget);
  const now = options.now ?? (() => new Date());
  const started_at = now().toISOString();
  const transport = options.transport ?? createObservationTransport();
  const checks = new Map<CheckId, ExternalCheckResultV1>();

  async function record(id: CheckId, operation: () => Promise<Interpretation & { collected?: boolean }>): Promise<void> {
    const start = now().toISOString();
    let result: Interpretation & { collected?: boolean };
    try { transport.checkpoint(); result = await operation(); }
    catch (error) { result = { ...failure(error), collected: false }; }
    const collected = result.collected ?? result.status !== 'CHECK_ERROR';
    checks.set(id, {
      check_id: id, check_version: EXTERNAL_VERSION, target, started_at: start, finished_at: now().toISOString(),
      title: TITLES[id], method: METHODS[id], status: result.status, observation: result.observation,
      evidence: [`external-exposure-snapshot.json: checks[check_id=${id}]`, 'The source appendix records the bounded observation and connection/query ledger.'],
      interpretation: result.interpretation, limitations: result.limitations, recommendation: result.recommendation, collected,
    });
  }

  try {
    let eligible = false;
    await record('dns.public_target.v1', async () => {
      const resolution = await transport.publicTarget(target);
      eligible = resolution.addresses.length > 0;
      return {
        status: eligible ? 'OBSERVED_EXPECTED' : 'UNDETERMINED', observation: resolution, collected: true,
        interpretation: eligible ? 'Only public connection-eligible addresses were returned by this resolution.' : 'No usable public address was returned. No outbound application connection was attempted.',
        limitations: ['Public resolution is an eligibility observation, not a security conclusion.', 'Every new connection resolves and validates addresses again.'], recommendation: null,
      };
    });
    let certificate: TlsObservation | undefined;
    await record('tls.certificate.v1', async () => {
      if (!eligible) return { ...unavailable('No public target was established for a TLS connection.'), collected: false };
      certificate = await transport.certificate(target);
      return inspectCertificate(certificate, now());
    });

    let httpsResponse: HttpObservation | undefined;
    await record('web.https_redirect.v1', async () => {
      if (!eligible) return { ...unavailable('No public target was established for HTTP.'), collected: false };
      const chain: ReturnType<typeof responseEvidence>[] = [];
      let final: HttpObservation | undefined;
      let httpFailure: unknown;
      try {
        final = await transport.request(`http://${target}/`, BODY_LIMIT);
        while (true) {
          chain.push(responseEvidence(final));
          if (usableHttps(final)) httpsResponse = final;
          if (![301, 302, 303, 307, 308].includes(final.statusCode) || !final.headers.location) break;
          const next = redirectUrl(final.headers.location, final.url);
          const destination = new URL(next);
          transport.followRedirect(new URL(final.url).hostname, destination.hostname, destination.protocol === 'https:' ? 443 : 80);
          final = await transport.request(next, BODY_LIMIT);
        }
      } catch (error) {
        if (error instanceof UnsafeTargetError) throw error;
        httpFailure = error;
      }
      // A single direct HTTPS fallback can also supply the shared header observation.
      if (!httpsResponse && certificate?.authorized && certificate.hostnameMatch) {
        try {
          const response = await transport.request(`https://${target}/`, BODY_LIMIT);
          if (usableHttps(response)) httpsResponse = response;
        } catch (error) { if (error instanceof UnsafeTargetError) throw error; }
      }
      const observation = { chain, directHttpsFallback: httpsResponse && !chain.some(item => item.url === httpsResponse!.url) ? responseEvidence(httpsResponse) : null };
      const limitations = ['Only the root request and this bounded redirect chain were tested. This does not establish redirect behavior for every route.'];
      if (!httpFailure && usableHttps(final)) return { status: 'OBSERVED_EXPECTED', observation, interpretation: 'The HTTP root request transitioned to a usable HTTPS response.', limitations, recommendation: null };
      if (!httpFailure && final && new URL(final.url).protocol === 'http:' && final.statusCode >= 200 && final.statusCode < 300) return { status: 'NEEDS_ATTENTION', observation, interpretation: 'The successful root response remained on HTTP.', limitations, recommendation: 'Review the root HTTP to HTTPS transition for the intended public hostname.' };
      if (!chain.length && httpsResponse) return { status: 'INFORMATIONAL', observation, interpretation: 'HTTP was unavailable during this run, while the bounded direct HTTPS request returned a usable response.', limitations, recommendation: null };
      return { ...unavailable('The bounded HTTP request did not establish a reliable transition to HTTPS.'), observation, collected: chain.length > 0 };
    });
    await record('web.hsts.v1', async () => httpsResponse ? inspectHsts(httpsResponse) : { ...unavailable('No usable HTTPS response was available for HSTS inspection.'), collected: false });
    await record('web.security_headers.v1', async () => httpsResponse ? inspectHeaders(httpsResponse) : { ...unavailable('No usable HTTPS response was available for browser-header inspection.'), collected: false });
    await record('web.security_txt.v1', async () => {
      if (!eligible) return { ...unavailable('No public target was established for security.txt.'), collected: false };
      const primary = await transport.request(`https://${target}/.well-known/security.txt`, SECURITY_TEXT_LIMIT);
      if (![404, 410].includes(primary.statusCode)) return inspectSecurityTxt(primary, now(), true);
      const legacy = await transport.request(`https://${target}/security.txt`, SECURITY_TEXT_LIMIT);
      const result = inspectSecurityTxt(legacy, now(), false);
      return { ...result, observation: { wellKnownStatus: primary.statusCode, legacy: result.observation } };
    });
    await record('tls.legacy_protocols.v1', async () => {
      if (!eligible) return { ...unavailable('No public target was established for legacy protocol probes.'), collected: false };
      const probes = [];
      for (const protocol of ['TLSv1', 'TLSv1.1'] as const) {
        try { probes.push(await transport.legacy(target, protocol)); }
        catch (error) {
          if (error instanceof UnsafeTargetError) throw error;
          probes.push({ protocol, outcome: 'undetermined' as const, detail: error instanceof ObservationError ? error.code : 'observation_error' });
        }
      }
      return { ...inspectLegacy(probes), collected: probes.some(probe => probe.outcome === 'negotiated') || probes.every(probe => probe.outcome !== 'undetermined') };
    });
    let mx: DnsRecords['MX'] | undefined;
    let mxError: unknown;
    try { mx = await transport.query('MX', target); }
    catch (error) { if (error instanceof UnsafeTargetError) throw error; mxError = error; }
    await record('mail.spf.v1', async () => {
      if (!mx) throw mxError;
      return inspectSpf(await transport.query('TXT', target), mx);
    });
    await record('mail.dmarc.v1', async () => {
      if (!mx) throw mxError;
      if (`_dmarc.${target}`.length > 253) return { ...unavailable('The DMARC query name exceeds the DNS name length limit.'), collected: false };
      return inspectDmarc(await transport.query('TXT', `_dmarc.${target}`), mx);
    });
    await record('dns.caa.v1', async () => observeCaa(target, transport));
    return structuredClone({ version: EXTERNAL_VERSION, target, started_at, finished_at: now().toISOString(), checks: CHECK_IDS.map(id => checks.get(id)!), usage: transport.usage, network: transport.events });
  } finally { transport.close(); }
}
