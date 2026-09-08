import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectCertificate, inspectLegacy, inspectHsts, inspectHeaders, inspectSecurityTxt, inspectSpf, inspectDmarc, inspectCaa } from './checks';
import type { CheckStatus, HttpObservation, TlsObservation, DnsRecords } from './contracts';

const now = new Date('2026-09-08T12:00:00Z');
const E: CheckStatus = 'OBSERVED_EXPECTED', A: CheckStatus = 'NEEDS_ATTENTION', I: CheckStatus = 'INFORMATIONAL', U: CheckStatus = 'UNDETERMINED';
const mx: DnsRecords['MX'] = [{ exchange: 'mail.example.test', priority: 10 }];
const tls: TlsObservation = { handshake: true, authorized: true, authorizationError: null, hostnameMatch: true, validFrom: '2026-08-01T00:00:00Z', validTo: '2026-12-01T00:00:00Z', issuer: { CN: 'Synthetic CA' }, sans: ['example.test'], fingerprint: 'fixture', address: '192.0.2.1', protocol: 'TLSv1.3' };
const http = (overrides: Partial<HttpObservation> = {}): HttpObservation => ({ url: 'https://example.test/', statusCode: 200, headers: {}, body: '', bodyBytes: 0, utf8Valid: true, address: '192.0.2.1', ...overrides });
const txt = (record: string): string[][] => [[record]];
const security = 'Contact: mailto:security@example.test\nExpires: 2027-01-01T00:00:00Z\nCanonical: https://example.test/.well-known/security.txt\n';
const securityResponse = (body = security, overrides: Partial<HttpObservation> = {}) => http({ url: 'https://example.test/.well-known/security.txt', body, bodyBytes: Buffer.byteLength(body), ...overrides });

test('an explicit unconditional SPF all remains visible after earlier mechanisms or unsupported macros', () => {
  for (const record of ['v=spf1 -all +all', 'v=spf1 ?all all', 'v=spf1 include:%{d}.example.com +all']) {
    const result = inspectSpf(txt(record), mx);
    assert.equal(result.status, A);
    assert.match(result.interpretation, /reachability.*not evaluated/);
  }
});

test('certificate trust, identity, dates and inclusive 30-day threshold', () => {
  assert.equal(inspectCertificate(tls, now).status, E);
  for (const change of [{ authorized: false }, { hostnameMatch: false }, { validFrom: '2026-10-01T00:00:00Z' }, { validTo: now.toISOString() }, { validTo: new Date(now.getTime() + 30 * 86400000).toISOString() }]) assert.equal(inspectCertificate({ ...tls, ...change }, now).status, A);
  assert.equal(inspectCertificate({ ...tls, validTo: new Date(now.getTime() + 30 * 86400000 + 1).toISOString() }, now).status, E);
  assert.equal(inspectCertificate({ ...tls, handshake: false }, now).status, U);
  assert.equal(inspectCertificate({ ...tls, validTo: 'unknown' }, now).status, U);
  assert.equal(inspectCertificate({ ...tls, authorized: false, validTo: 'unknown' }, now).status, A);
  assert.equal(inspectCertificate(tls, new Date('invalid')).status, U);
});

test('legacy rejection must be explicit for each protocol; local failure is inconclusive', () => {
  assert.equal(inspectLegacy([{ protocol: 'TLSv1', outcome: 'peer_rejected', detail: 'peer protocol alert' }, { protocol: 'TLSv1.1', outcome: 'peer_rejected', detail: 'peer protocol alert' }]).status, E);
  assert.equal(inspectLegacy([{ protocol: 'TLSv1', outcome: 'negotiated', detail: 'negotiated' }]).status, A);
  assert.equal(inspectLegacy([{ protocol: 'TLSv1', outcome: 'undetermined', detail: 'local cipher unavailable' }, { protocol: 'TLSv1.1', outcome: 'peer_rejected', detail: 'peer alert' }]).status, U);
  assert.equal(inspectLegacy([]).status, U);
  assert.equal(inspectLegacy([{ protocol: 'TLSv1', outcome: 'peer_rejected', detail: 'alert' }, { protocol: 'TLSv1', outcome: 'peer_rejected', detail: 'duplicate' }]).status, U);
});

for (const [value, expected] of [
  ['max-age=1', E], ['max-age="31536000"; includeSubDomains; preload', E], ['MAX-AGE=0001; custom="a;b"', E],
  ['', A], ['max-age=0', A], ['max-age=000', A], ['includeSubDomains', A], ['max-age=-1', A], ['max-age=1.5', A],
  ['max-age=1; max-age=2', A], ['max-age=1, max-age=2', A], ['max-age="1', A], ['max-age=1; includeSubDomains=yes', A], ['max-age=1; extension="a\\"b"', E],
] as const) test(`HSTS policy ${JSON.stringify(value)}`, () => assert.equal(inspectHsts(http({ headers: { 'Strict-Transport-Security': value } })).status, expected));
test('HSTS missing versus unavailable and bounds', () => {
  assert.equal(inspectHsts(http()).status, A);
  assert.equal(inspectHsts(http({ statusCode: 503 })).status, U);
  assert.equal(inspectHsts(http({ url: 'http://example.test/' })).status, U);
  assert.equal(inspectHsts(http({ headers: { 'strict-transport-security': 'x'.repeat(65537) } })).status, U);
});

test('security headers core and optional combinations', () => {
  const core = { 'x-content-type-options': 'nosniff', 'x-frame-options': 'SAMEORIGIN' };
  assert.equal(inspectHeaders(http()).status, A);
  assert.equal(inspectHeaders(http({ headers: core })).status, I);
  assert.equal(inspectHeaders(http({ headers: { ...core, 'content-security-policy': "default-src 'self'", 'referrer-policy': 'strict-origin-when-cross-origin' } })).status, E);
  assert.equal(inspectHeaders(http({ headers: { 'x-content-type-options': 'nosniff', 'content-security-policy': "frame-ancestors 'none'", 'referrer-policy': 'unrecognized, no-referrer' } })).status, E);
  assert.equal(inspectHeaders(http({ headers: { 'x-content-type-options': 'nosniff', 'content-security-policy': "frame-ancestors 'self' https://trusted.example.test", 'referrer-policy': 'origin' } })).status, E);
  assert.equal(inspectHeaders(http({ headers: { 'x-content-type-options': 'nosniff', 'content-security-policy': 'frame-ancestors *' } })).status, I);
  assert.equal(inspectHeaders(http({ headers: { 'x-content-type-options': 'nosniff', 'content-security-policy': 'frame-ancestors https:', 'referrer-policy': 'no-referrer' } })).status, E);
  assert.equal(inspectHeaders(http({ headers: { 'x-content-type-options': 'nosniff', 'content-security-policy': 'frame-ancestors https://example.test/path' } })).status, U);
  assert.equal(inspectHeaders(http({ headers: { ...core, 'referrer-policy': 'garbage', 'content-security-policy': "default-src 'self'" } })).status, I);
  assert.equal(inspectHeaders(http({ statusCode: 403 })).status, U);
  assert.equal(inspectHeaders(http({ url: 'http://example.test/', headers: { ...core, 'content-security-policy': "default-src 'self'", 'referrer-policy': 'origin' } })).status, U);
  assert.equal(inspectHeaders(http({ headers: { 'content-security-policy': 'x'.repeat(65537) } })).status, U);
});
test('permissive framing-policy presence makes no protection claim', () => {
  const headers = { 'x-content-type-options': 'nosniff', 'content-security-policy': 'frame-ancestors *', 'referrer-policy': 'no-referrer' };
  const observed = inspectHeaders(http({ headers }));
  assert.equal(observed.status, E);
  assert.match(observed.interpretation, /framing-policy declaration/);
  assert.doesNotMatch(observed.interpretation, /protection/i);
});

test('security.txt valid UTF-8 fields and optional Canonical', () => {
  assert.equal(inspectSecurityTxt(securityResponse(), now, true).status, E);
  assert.equal(inspectSecurityTxt(securityResponse(security.replace(/^Canonical:.*\n/m, '')), now, true).status, E);
  assert.equal(inspectSecurityTxt(securityResponse(security + 'Contact: tel:+1-201-555-0123\n# comment\nX-Future: value\n'), now, true).status, E);
  assert.equal(inspectSecurityTxt(securityResponse(security.replace('2027-01-01T00:00:00Z', '2027-01-01T00:00:00+02:00')), now, true).status, E);
  const legacy = security.replace('/.well-known/security.txt', '/security.txt');
  assert.equal(inspectSecurityTxt(securityResponse(legacy, { url: 'https://example.test/security.txt' }), now, false).status, I);
});
test('security.txt distinguishes absence, unavailable, unsupported framing and malformed content', () => {
  for (const statusCode of [404, 410]) assert.equal(inspectSecurityTxt(securityResponse('', { statusCode }), now, true).status, I);
  for (const statusCode of [301, 302, 403, 500, 503]) assert.equal(inspectSecurityTxt(securityResponse('', { statusCode }), now, true).status, U);
  assert.equal(inspectSecurityTxt(securityResponse('-----BEGIN PGP SIGNED MESSAGE-----\nHash: SHA256\n' + security), now, true).status, U);
  assert.equal(inspectSecurityTxt(securityResponse(security.replace('00:00:00Z', '00:00:60Z')), now, true).status, U);
  assert.equal(inspectSecurityTxt(securityResponse(security, { utf8Valid: false }), now, true).status, A);
  assert.equal(inspectSecurityTxt(securityResponse(security, { utf8Valid: false, headers: { 'content-encoding': 'gzip' } }), now, true).status, U);
  assert.equal(inspectSecurityTxt(securityResponse('x'.repeat(65537)), now, true).status, U);
  for (const body of [
    '', '<html>not a security.txt file</html>', security.replace('Contact:', 'MissingContact:'), security + 'Expires: 2027-01-02T00:00:00Z\n',
    security.replace('2027-01-01', '2026-02-30'), security.replace('2027-01-01', '2026-01-01'), security.replace('2027-01-01T00:00:00Z', now.toISOString()),
    security.replace('mailto:security@example.test', 'security@example.test'), security.replace('mailto:security@example.test', 'http://example.test/contact'),
    security.replace('https://example.test/.well-known/security.txt', 'https://other.example.test/security.txt'),
    security.replace('Canonical: https:', 'Canonical: http:'),
  ]) assert.equal(inspectSecurityTxt(securityResponse(body), now, true).status, A, body);
});

for (const [value, expected] of [
  ['v=spf1 -all', E], ['v=spf1 ~all', E], ['v=spf1 include:example.test -all', E], ['v=spf1 redirect=example.test', E], ['v=spf1', E],
  ['v=spf1 a mx a:example.test/24//64 mx//64 ip4:192.0.2.0/24 ip6:2001:db8::/32 -all', E], ['v=spf1 ptr:example.test exists:example.test x-extension=value -all', E],
  ['v=spf1 all', A], ['v=spf1 +all', A], ['v=spf1 ?all', I], ['v=spf1 ip4:999.1.1.1 -all', A], ['v=spf1 ip6:2001:db8::/129 -all', A],
  ['v=spf1 include: -all', A], ['v=spf1 a/33 -all', A], ['v=spf1 mx//129 -all', A], ['v=spf1 unknown:example.test -all', A],
  ['v=spf1 redirect=a.test redirect=b.test', A], ['v=spf1 -all:example.test', A], ['v=spf1 include:%{d} -all', U],
] as const) test(`SPF ${value}`, () => assert.equal(inspectSpf(txt(value), mx).status, expected));
test('SPF DNS strings join without separators and absence accounts for MX and null MX', () => {
  assert.equal(inspectSpf([['v=spf1 ', 'include:example.test ', '-all']], mx).status, E);
  assert.equal(inspectSpf([['v=spf1 -all'], ['v=spf1 -all']], mx).status, A);
  assert.equal(inspectSpf([], mx).status, A);
  assert.equal(inspectSpf([], []).status, I);
  assert.equal(inspectSpf([], [{ exchange: '.', priority: 0 }]).status, I);
  assert.equal(inspectSpf(txt('x'.repeat(65537)), mx).status, U);
});
test('SPF literal domain labels are bounded while root dots and underscores remain supported', () => {
  assert.equal(inspectSpf(txt(`v=spf1 include:${'a'.repeat(63)}.example.test -all`), mx).status, E);
  assert.equal(inspectSpf(txt(`v=spf1 include:${'a'.repeat(64)}.example.test -all`), mx).status, A);
  assert.equal(inspectSpf(txt('v=spf1 include:_spf.example.test. -all'), mx).status, E);
  assert.equal(inspectSpf(txt(`v=spf1 redirect=${'a'.repeat(64)}.example.test`), mx).status, A);
});

for (const [value, expected] of [
  ['v=DMARC1; p=none', I], ['v=DMARC1; p=reject', E], ['v=DMARC1; p=quarantine; sp=none; pct=25; rua=mailto:reports@example.test!10m; ruf=mailto:forensics@example.test', E],
  ['v=DMARC1; p=reject; adkim=s; aspf=r; ri=86400; fo=0:1:d:s; rf=afrf; x_future=value', E], ['v=DMARC1; p=reject; pct=0', E],
  ['v=DMARC1; p=reject; p=none', A], ['v=DMARC1; p=reject; rua=mailto:a@example.test; rua=mailto:b@example.test', A],
  ['v=DMARC1', A], ['v=DMARC1; p=bogus', A], ['v=DMARC1; p=reject; sp=bogus', A], ['v=DMARC1; p=reject; pct=101', A],
  ['v=DMARC1; p=reject; pct=2.5', A], ['v=DMARC1; p=reject; rua=', A], ['v=DMARC1; p=reject; rua=plain-text', A], ['v=DMARC1; p=reject; ruf=mailto:broken', A],
  ['v=DMARC1; p=reject; rua=https://example.test/reports', U], ['v=DMARC1; p=reject; adkim=x', A], ['v=DMARC1; p=reject; ri=-1', A], ['v=DMARC1; p=reject; fo=x', A],
  ['v=DMARC1; P=REJECT; SP=QUARANTINE; ADKIM=S', E], ['v=DMARC1; rua=mailto:a@example.test; p=reject', A],
  ['v=DMARC1; p=reject; rua=mailto:a@example.test!bad', A], ['v=DMARC1; p=reject; rua=mailto:a@example.test!18446744073709551616', A],
  ['v=DMARC1; p=reject; rua=mailto:a@example.test!18446744073709551615', E],
  ['v=DMARC1; p=reject; rua=mailto:a@example.test!0000000000000000000000000000000001', E],
] as const) test(`DMARC ${value}`, () => assert.equal(inspectDmarc(txt(value), mx).status, expected));
test('DMARC TXT segmentation, count and absence bounds', () => {
  assert.equal(inspectDmarc([['v=DMARC1; ', 'p=reject']], mx).status, E);
  assert.equal(inspectDmarc([['v=DMARC1; p=none'], ['v=DMARC1; p=reject']], mx).status, A);
  assert.equal(inspectDmarc([], mx).status, A);
  assert.equal(inspectDmarc([], []).status, I);
  assert.equal(inspectDmarc(txt('x'.repeat(65537)), mx).status, U);
});
test('DMARC accepts a bounded unknown tag with a long internal whitespace value', () => {
  const record = 'v=DMARC1; p=reject; x=X' + ' '.repeat(60000) + 'Y';
  assert.ok(Buffer.byteLength(record) < 65536);
  const observed = inspectDmarc(txt(record), mx);
  assert.equal(observed.status, E);
  const fields = observed.observation as Record<string, unknown>;
  assert.equal(fields.p, 'reject');
  assert.deepEqual(fields.records, [record]);
  assert.equal(Object.hasOwn(fields, 'x'), false);
});

test('CAA issuer syntax, empty issuer denial, parameters and wildcard records', () => {
  for (const value of ['ca.example.test', ';', '', 'ca.example.test; accounturi=https://ca.example.test/acct/123', 'ca.example.test; validationmethods=dns-01']) assert.equal(inspectCaa([{ critical: 0, issue: value }]).status, E, value);
  assert.equal(inspectCaa([{ critical: 128, issuewild: ';' }]).status, E);
  assert.equal(inspectCaa([{ critical: 0, ISSUE: 'ca.example.test' }]).status, E);
  assert.equal(inspectCaa([{ critical: 0, issue: ';' }, { critical: 0, issue: 'ca.example.test' }]).status, E);
  assert.equal(inspectCaa([{ critical: 0, iodef: 'mailto:reports@example.test' }]).status, I);
  assert.equal(inspectCaa([]).status, I);
  assert.equal(inspectCaa([{ critical: 0, future: 'unknown' }]).status, I);
  assert.equal(inspectCaa([{ critical: 128, future: 'unknown' }]).status, U);
  for (const records of [[{ critical: 0, issue: '%%%' }], [{ critical: 0, issue: 'ca.example.test; invalid' }], [{ critical: 256, issue: 'ca.example.test' }], [{ critical: 0, iodef: 'invalid' }], [{ critical: 0, issue: 'ca.example.test', iodef: 'mailto:x@example.test' }]]) assert.equal(inspectCaa(records).status, A);
  assert.equal(inspectCaa([{ critical: 0, future: 'x'.repeat(65537) }]).status, U);
});
test('CAA issuer DNS labels cannot exceed 63 characters', () => {
  assert.equal(inspectCaa([{ critical: 0, issue: `${'a'.repeat(63)}.example.test` }]).status, E);
  assert.equal(inspectCaa([{ critical: 0, issue: `${'a'.repeat(64)}.example.test` }]).status, A);
  assert.equal(inspectCaa([{ critical: 0, issuewild: `${'a'.repeat(64)}.example.test` }]).status, A);
});

test('interpreters preserve untrusted text as data without mutating or aliasing observations', () => {
  const original = { ...tls, issuer: { CN: '<img src=x onerror=alert(1)>' } };
  const interpretation = inspectCertificate(original, now);
  assert.deepEqual(original.issuer, { CN: '<img src=x onerror=alert(1)>' });
  original.issuer.CN = 'changed';
  assert.equal((interpretation.observation as TlsObservation).issuer.CN, '<img src=x onerror=alert(1)>');
  assert.ok(interpretation.limitations.length);
  assert.equal(interpretation.recommendation, null);
});

test('parsed observation fields are retained and security.txt raw bodies are never retained', () => {
  const certificate = inspectCertificate(tls, now).observation as { daysRemaining: number };
  assert.equal(certificate.daysRemaining, (Date.parse(tls.validTo) - now.getTime()) / 86400000);
  assert.deepEqual(inspectHsts(http({ headers: { 'strict-transport-security': 'max-age=3600; includeSubDomains; preload' } })).observation, { url: 'https://example.test/', statusCode: 200, hsts: 'max-age=3600; includeSubDomains; preload', maxAge: 3600, includeSubDomains: true, preload: true });
  assert.equal((inspectSpf(txt('v=spf1 -all'), mx).observation as { terminalAll: string }).terminalAll, '-all');
  const dmarc = inspectDmarc(txt('v=DMARC1; p=reject; sp=none; pct=50; rua=mailto:a@example.test; ruf=mailto:b@example.test'), mx).observation as Record<string, unknown>;
  assert.deepEqual({ p: dmarc.p, sp: dmarc.sp, pct: dmarc.pct, rua: dmarc.rua, ruf: dmarc.ruf }, { p: 'reject', sp: 'none', pct: 50, rua: ['mailto:a@example.test'], ruf: ['mailto:b@example.test'] });
  const parsed = inspectSecurityTxt(securityResponse(), now, true).observation as Record<string, unknown>;
  assert.deepEqual({ contacts: parsed.contacts, contactCount: parsed.contactCount, expires: parsed.expires, canonical: parsed.canonical, expired: parsed.expired }, { contacts: ['mailto:security@example.test'], contactCount: 1, expires: ['2027-01-01T00:00:00Z'], canonical: ['https://example.test/.well-known/security.txt'], expired: false });
  const invalid = inspectSecurityTxt(securityResponse('<html>PRIVATE PAGE BODY</html>'), now, true);
  assert.equal(invalid.status, A);
  assert.equal(Object.hasOwn(parsed, 'body'), false);
  assert.equal(JSON.stringify(invalid).includes('PRIVATE PAGE BODY'), false);
  assert.equal((inspectSecurityTxt(securityResponse(security.replace('2027-01-01', '2026-01-01')), now, true).observation as { expired: boolean }).expired, true);
});
test('security.txt handles repeated fields at the 64 KiB bound without retaining body or extension values', () => {
  const available = 65536 - Buffer.byteLength(security);
  const body = security + 'X:\n'.repeat(Math.floor(available / 3)) + ' '.repeat(available % 3);
  assert.equal(Buffer.byteLength(body), 65536);
  const baseline = inspectSecurityTxt(securityResponse(), now, true);
  const repeated = inspectSecurityTxt(securityResponse(body), now, true);
  assert.equal(repeated.status, E);
  const observation = repeated.observation as Record<string, unknown>;
  assert.deepEqual(observation, { ...baseline.observation as Record<string, unknown>, bodyBytes: 65536 });
  assert.equal(Object.hasOwn(observation, 'body'), false);
  assert.equal(Object.hasOwn(observation, 'x'), false);
  assert.ok(JSON.stringify(repeated).length < 2000);
});
test('security.txt rejects a bounded field with long whitespace and a Unicode line separator', () => {
  const body = security + 'X:' + ' '.repeat(60000) + '\u2028Y';
  assert.ok(Buffer.byteLength(body) < 65536);
  const observed = inspectSecurityTxt(securityResponse(body), now, true);
  assert.equal(observed.status, A);
  assert.equal(Object.hasOwn(observed.observation as object, 'body'), false);
  assert.ok(JSON.stringify(observed).length < 2000);
});
