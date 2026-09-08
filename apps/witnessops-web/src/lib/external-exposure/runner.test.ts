import assert from 'node:assert/strict';
import test from 'node:test';
import { runSnapshot, observeCaa } from './runner';
import { externalExposureAdapter } from './adapter';
import { ObservationError } from './network';
import { UnsafeTargetError } from './input';
import { CHECK_IDS, type BudgetUsage, type DnsRecords, type HttpObservation, type LegacyObservation, type NetworkEvent, type ObservationTransport, type PublicTarget, type TlsObservation } from './contracts';

const NOW = new Date('2026-09-08T12:00:00Z');
const CERTIFICATE: TlsObservation = {
  handshake: true, authorized: true, authorizationError: null, hostnameMatch: true,
  validFrom: '2026-08-01T00:00:00Z', validTo: '2026-12-01T00:00:00Z', issuer: { CN: 'Synthetic test CA' },
  sans: ['example.com'], fingerprint: 'AB:CD', address: '93.184.216.34', protocol: 'TLSv1.3',
};
const HEADERS = {
  'strict-transport-security': 'max-age=3600; includeSubDomains', 'x-content-type-options': 'nosniff',
  'content-security-policy': "default-src 'self'; frame-ancestors 'none'", 'referrer-policy': 'strict-origin-when-cross-origin',
};

class FixtureTransport implements ObservationTransport {
  usage: BudgetUsage = { dns: 0, normalTls: 0, legacyTls: 0, http: 0, redirects: 0 };
  events: NetworkEvent[] = [];
  closed = false;
  queryCalls: string[] = [];
  requestCalls: { url: string; limit: number }[] = [];
  records = new Map<string, unknown>([
    ['MX example.com', [{ exchange: 'mail.example.com', priority: 10 }]],
    ['TXT example.com', [['v=spf1 -all']]], ['TXT _dmarc.example.com', [['v=DMARC1; p=reject']]],
    ['CAA example.com', [{ critical: 0, issue: 'ca.example.com' }]],
  ]);
  queryError: Error | undefined;
  checkpointError: Error | undefined;
  certificateError: Error | undefined;
  publicResult: PublicTarget = { a: ['93.184.216.34'], aaaa: [], addresses: [{ address: '93.184.216.34', family: 4 }] };
  publicError: Error | undefined;
  legacyResult: LegacyObservation['outcome'] = 'peer_rejected';
  responses = new Map<string, Partial<HttpObservation> | Error>();
  async query<K extends keyof DnsRecords>(kind: K, hostname: string): Promise<DnsRecords[K]> {
    this.checkpoint(); this.usage.dns += 1; this.queryCalls.push(`${kind} ${hostname}`);
    if (this.queryError) throw this.queryError;
    return structuredClone(this.records.get(`${kind} ${hostname}`) ?? []) as DnsRecords[K];
  }
  async publicTarget(): Promise<PublicTarget> { if (this.publicError) throw this.publicError; return this.publicResult; }
  async certificate(): Promise<TlsObservation> { this.usage.normalTls += 1; if (this.certificateError) throw this.certificateError; return structuredClone(CERTIFICATE); }
  async legacy(_hostname: string, protocol: LegacyObservation['protocol']): Promise<LegacyObservation> { this.usage.legacyTls += 1; return { protocol, outcome: this.legacyResult, detail: 'Synthetic explicit peer rejection fixture' }; }
  async request(url: string, bodyLimit: number): Promise<HttpObservation> {
    this.requestCalls.push({ url, limit: bodyLimit }); this.usage.http += 1;
    const override = this.responses.get(url);
    if (override instanceof Error) throw override;
    const body = url.endsWith('security.txt') ? 'Contact: mailto:security@example.com\nExpires: 2027-01-01T00:00:00Z\n' : '<html>Private response body must never enter evidence</html>';
    return {
      url, statusCode: url.startsWith('http:') ? 301 : 200,
      headers: url.startsWith('http:') ? { location: 'https://example.com/' } : HEADERS,
      body, bodyBytes: Buffer.byteLength(body), utf8Valid: true, address: '93.184.216.34', ...override,
    };
  }
  followRedirect() { if (this.usage.redirects >= 3) throw new ObservationError('redirect_budget'); this.usage.redirects += 1; }
  checkpoint() { if (this.checkpointError) throw this.checkpointError; }
  close() { this.closed = true; }
}

const run = (transport = new FixtureTransport()) => runSnapshot('example.com', { transport, now: () => NOW });

test('exactly ten allowlisted observations, bounded traffic reuse and no HTML body persistence', async () => {
  const transport = new FixtureTransport();
  const result = await run(transport);
  assert.deepEqual(result.checks.map(check => check.check_id), CHECK_IDS);
  assert.equal(result.checks.length, 10);
  assert.ok(result.checks.every(check => check.status === 'OBSERVED_EXPECTED'));
  assert.deepEqual(transport.requestCalls.map(item => item.url), ['http://example.com/', 'https://example.com/', 'https://example.com/.well-known/security.txt']);
  assert.equal(transport.requestCalls[2].limit, 64 * 1024);
  assert.equal(transport.queryCalls.filter(call => call.startsWith('MX ')).length, 1);
  assert.equal(result.usage.normalTls, 1); assert.equal(result.usage.legacyTls, 2);
  assert.equal(JSON.stringify(result).includes('Private response body'), false);
  assert.equal(transport.closed, true);
  transport.usage.http = 999; transport.events.push({ kind: 'http', hostname: 'altered.com', detail: 'changed' });
  assert.equal(result.usage.http, 3); assert.deepEqual(result.network, []);
});

test('no public resolution gives bounded unknowns and no application traffic', async () => {
  const transport = new FixtureTransport(); transport.publicResult = { a: [], aaaa: [], addresses: [] };
  const result = await run(transport);
  assert.equal(result.checks[0].status, 'UNDETERMINED');
  assert.equal(transport.requestCalls.length, 0); assert.equal(transport.usage.normalTls, 0); assert.equal(transport.usage.legacyTls, 0);
  assert.equal(result.checks.length, 10);
});

test('unsafe public-target eligibility rejects whole run before application traffic', async () => {
  const transport = new FixtureTransport(); transport.publicError = new UnsafeTargetError();
  await assert.rejects(run(transport), UnsafeTargetError);
  assert.equal(transport.requestCalls.length, 0); assert.equal(transport.closed, true);
});

test('unexpected DNS error remains CHECK_ERROR; timeout remains UNDETERMINED', async () => {
  for (const [code, expected] of [['dns_error', 'CHECK_ERROR'], ['dns_timeout', 'UNDETERMINED']] as const) {
    const transport = new FixtureTransport(); transport.publicError = new ObservationError(code);
    const result = await run(transport);
    assert.equal(result.checks[0].status, expected); assert.equal(result.checks[0].collected, false);
  }
});

test('timeouts and exhausted total deadline never become attention findings', async () => {
  const transport = new FixtureTransport(); transport.checkpointError = new ObservationError('run_deadline');
  const result = await run(transport);
  assert.ok(result.checks.every(check => check.status === 'UNDETERMINED' && !check.collected));
  assert.equal(transport.requestCalls.length, 0); assert.equal(result.checks.length, 10);
});

test('unavailable HTTP with usable direct HTTPS is informational and reuses that response', async () => {
  const transport = new FixtureTransport(); transport.responses.set('http://example.com/', new ObservationError('http_timeout'));
  const result = await run(transport);
  assert.equal(result.checks.find(check => check.check_id === 'web.https_redirect.v1')!.status, 'INFORMATIONAL');
  assert.equal(result.checks.find(check => check.check_id === 'web.hsts.v1')!.status, 'OBSERVED_EXPECTED');
});

test('successful HTTP left unredirected is attention, regardless of direct HTTPS availability', async () => {
  const transport = new FixtureTransport(); transport.responses.set('http://example.com/', { statusCode: 200, headers: {} });
  const result = await run(transport);
  assert.equal(result.checks.find(check => check.check_id === 'web.https_redirect.v1')!.status, 'NEEDS_ATTENTION');
});

test('HTTP error responses do not invent an HTTPS-transition finding', async () => {
  const transport = new FixtureTransport(); transport.responses.set('http://example.com/', { statusCode: 503, headers: {} });
  const result = await run(transport);
  assert.equal(result.checks.find(check => check.check_id === 'web.https_redirect.v1')!.status, 'UNDETERMINED');
});

test('redirect count is globally bounded and limit exhaustion is undetermined', async () => {
  const transport = new FixtureTransport(); transport.responses.set('http://example.com/', { headers: { location: 'http://example.com/' } });
  const result = await run(transport);
  assert.equal(result.usage.redirects, 3);
  assert.equal(transport.requestCalls.filter(item => item.url.startsWith('http:')).length, 4);
  assert.equal(result.checks.find(check => check.check_id === 'web.https_redirect.v1')!.status, 'UNDETERMINED');
});

test('explicit IP, local host, unsupported scheme, credentials and ports in redirects reject the run', async () => {
  for (const location of ['http://127.0.0.1/', 'http://localhost/', 'https://public.example.com:8443/', 'file:///etc/passwd', 'https://user:pass@example.com/']) {
    const transport = new FixtureTransport(); transport.responses.set('http://example.com/', { headers: { location } });
    await assert.rejects(run(transport), UnsafeTargetError);
    assert.equal(transport.requestCalls.length, 1); assert.equal(transport.closed, true);
  }
});

test('transport revalidation of redirect hostname rejects a private destination and stops remaining observations', async () => {
  const transport = new FixtureTransport(); transport.responses.set('http://example.com/', { headers: { location: 'https://metadata.example.com/' } });
  transport.responses.set('https://metadata.example.com/', new UnsafeTargetError());
  await assert.rejects(run(transport), UnsafeTargetError);
  assert.equal(transport.queryCalls.length, 0); assert.equal(transport.closed, true);
});

test('missing primary security.txt permits exactly one fallback with the stricter body limit', async () => {
  const transport = new FixtureTransport(); transport.responses.set('https://example.com/.well-known/security.txt', { statusCode: 404 });
  const result = await run(transport);
  assert.equal(transport.requestCalls.filter(item => item.url.endsWith('security.txt')).length, 2);
  assert.ok(transport.requestCalls.filter(item => item.url.endsWith('security.txt')).every(item => item.limit === 65536));
  assert.equal(result.checks.find(check => check.check_id === 'web.security_txt.v1')!.status, 'INFORMATIONAL');
});

test('security.txt body limit and legacy runtime limitation remain undetermined', async () => {
  const transport = new FixtureTransport(); transport.responses.set('https://example.com/.well-known/security.txt', new ObservationError('body_limit'));
  transport.legacyResult = 'undetermined';
  const result = await run(transport);
  for (const id of ['web.security_txt.v1', 'tls.legacy_protocols.v1']) {
    const check = result.checks.find(item => item.check_id === id)!;
    assert.equal(check.status, 'UNDETERMINED'); assert.equal(check.collected, false);
  }
});

test('CAA traverses original queried-name parents only to a real PSL registrable domain', async () => {
  const transport = new FixtureTransport();
  const result = await observeCaa('a.b.example.co.uk', transport);
  assert.deepEqual(transport.queryCalls, ['CAA a.b.example.co.uk', 'CAA b.example.co.uk', 'CAA example.co.uk']);
  assert.equal(result.status, 'INFORMATIONAL');
});

test('CAA honors private PSL suffixes and never queries the tenant boundary above them', async () => {
  const transport = new FixtureTransport(); await observeCaa('www.tenant.github.io', transport);
  assert.deepEqual(transport.queryCalls, ['CAA www.tenant.github.io', 'CAA tenant.github.io']);
});

test('CAA stops at first nonempty RRset even when it contains only iodef', async () => {
  const transport = new FixtureTransport(); transport.records.set('CAA www.example.com', [{ critical: 0, iodef: 'mailto:security@example.com' }]);
  const result = await observeCaa('www.example.com', transport);
  assert.equal(result.status, 'INFORMATIONAL'); assert.deepEqual(transport.queryCalls, ['CAA www.example.com']);
});

test('CAA recursive-resolver alias answer is used without manually chasing alias domains', async () => {
  const transport = new FixtureTransport(); transport.records.set('CAA alias.example.com', [{ critical: 0, issue: 'ca.example.net' }]);
  const result = await observeCaa('alias.example.com', transport);
  assert.equal(result.status, 'OBSERVED_EXPECTED'); assert.deepEqual(transport.queryCalls, ['CAA alias.example.com']);
});

test('CAA query ceiling and unknown suffix are explicitly undetermined', async () => {
  const transport = new FixtureTransport();
  assert.equal((await observeCaa('a.b.c.d.e.f.example.com', transport)).status, 'UNDETERMINED');
  assert.equal(transport.queryCalls.length, 5);
  const unknown = new FixtureTransport(); assert.equal((await observeCaa('example.invalidtld', unknown)).status, 'UNDETERMINED');
  assert.deepEqual(unknown.queryCalls, []);
});

test('actual runner output is admitted without inventing severity across expected, attention and incomplete runs', async () => {
  for (const scenario of ['expected', 'attention', 'timeout', 'dns-error', 'legacy-ambiguous'] as const) {
    const transport = new FixtureTransport();
    if (scenario === 'attention') transport.responses.set('http://example.com/', { statusCode: 200, headers: {} });
    if (scenario === 'timeout') transport.checkpointError = new ObservationError('run_timeout');
    if (scenario === 'dns-error') transport.queryError = new ObservationError('dns_error');
    if (scenario === 'legacy-ambiguous') transport.legacyResult = 'undetermined';
    const snapshot = await run(transport);
    const model = externalExposureAdapter(snapshot);
    assert.ok(model.summary.checks, scenario);
    assert.equal(model.summary.checks.total, 10, scenario);
    assert.equal(model.summary.coverage.undetermined, snapshot.checks.filter(check => !check.collected).length, scenario);
    assert.equal(model.summary.findings.needsAttention, snapshot.checks.filter(check => check.status === 'NEEDS_ATTENTION').length, scenario);
    assert.ok(model.findings.every(finding => finding.severity === null), scenario);
    assert.deepEqual(model.summary.findings.severities, {}, scenario);
  }
});
