import { isIP } from 'node:net';
import type { CheckStatus, DnsRecords, HttpObservation, LegacyObservation, TlsObservation } from './contracts';

// Bounded interpretation only. Syntax references: RFC 6797 section 6.1,
// RFC 7208 sections 4-7, RFC 7489 section 6.4, RFC 9116 section 2,
// and RFC 8659 sections 4.1-4.4. No DNS recursion or network work occurs here.

export type Interpretation = { status: CheckStatus; observation: unknown; interpretation: string; limitations: string[]; recommendation: string | null };
const EXPECTED = 'OBSERVED_EXPECTED', ATTENTION = 'NEEDS_ATTENTION', INFO = 'INFORMATIONAL', UND = 'UNDETERMINED';
const MAX_TEXT = 65_536;
function result(status: CheckStatus, observation: unknown, interpretation: string, limitation: string, recommendation: string | null = null): Interpretation {
  // Observations remain text/data, never markup, and do not alias caller-owned objects.
  return { status, observation: structuredClone(observation), interpretation, limitations: [limitation], recommendation };
}
function header(response: HttpObservation, name: string): string | undefined {
  const matches = Object.entries(response.headers).filter(([key]) => key.toLowerCase() === name);
  return matches.length ? matches.map(([, value]) => value).join(', ') : undefined;
}
function httpUnavailable(response: HttpObservation): boolean { return response.statusCode < 200 || response.statusCode >= 300; }
function uri(value: string): URL | null {
  if (!/^[a-z][a-z0-9+.-]*:[^\s]+$/i.test(value) || /[\x00-\x20\x7f]/.test(value) || /%(?![a-f0-9]{2})/i.test(value)) return null;
  try { return new URL(value); } catch { return null; }
}

export function inspectCertificate(tls: TlsObservation, now: Date): Interpretation {
  const limit = 'One TLS handshake and the local trust store were used; revocation, all endpoints and all cipher suites were not assessed.';
  const start = Date.parse(tls.validFrom), end = Date.parse(tls.validTo), current = now.getTime();
  const observation = { ...tls, daysRemaining: Number.isFinite(end - current) ? (end - current) / 86_400_000 : null };
  if (!tls.handshake) return result(UND, observation, 'No completed handshake supplied a certificate for interpretation.', limit);
  if (!tls.authorized || !tls.hostnameMatch) return result(ATTENTION, observation, 'The observed certificate failed trust or hostname checks.', limit, 'Review the certificate chain and hostname coverage.');
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(current)) return result(UND, observation, 'Certificate validity dates could not be interpreted.', limit);
  if (start > current || end <= current || start >= end) return result(ATTENTION, observation, 'The observed certificate failed current validity checks.', limit, 'Review the certificate validity period.');
  if (end - current <= 30 * 86_400_000) return result(ATTENTION, observation, 'The observed certificate expires within 30 days.', limit, 'Confirm renewal is scheduled and test the renewed certificate.');
  return result(EXPECTED, observation, 'The observed certificate was trusted, matched the hostname and remains valid for more than 30 days.', limit);
}

export function inspectLegacy(probes: LegacyObservation[]): Interpretation {
  const limit = 'Only TLS 1.0 and TLS 1.1 were probed; a local protocol or cipher restriction is not evidence that the peer rejects a protocol.';
  if (probes.some(p => p.outcome === 'negotiated')) return result(ATTENTION, probes, 'A legacy TLS protocol was negotiated.', limit, 'Disable TLS 1.0 and TLS 1.1 after checking client compatibility.');
  if (probes.length === 2 && ['TLSv1', 'TLSv1.1'].every(protocol => probes.some(p => p.protocol === protocol && p.outcome === 'peer_rejected'))) return result(EXPECTED, probes, 'The peer explicitly rejected both tested legacy TLS protocols.', limit);
  return result(UND, probes, 'The probes did not establish explicit peer rejection of both legacy protocols.', limit);
}

// RFC 6797 permits quoted directive values, including extension values containing semicolons.
function directives(value: string): string[] | null {
  const parts: string[] = []; let start = 0, quoted = false, escaped = false;
  for (let i = 0; i < value.length; i++) {
    if (escaped) { escaped = false; continue; }
    if (quoted && value[i] === '\\') { escaped = true; continue; }
    if (value[i] === '"') quoted = !quoted;
    if (value[i] === ';' && !quoted) { parts.push(value.slice(start, i).trim()); start = i + 1; }
  }
  return quoted || escaped ? null : [...parts, value.slice(start).trim()];
}
export function inspectHsts(response: HttpObservation): Interpretation {
  const value = header(response, 'strict-transport-security');
  const observation: { url: string; statusCode: number; hsts: string | null; maxAge: number | string | null; includeSubDomains: boolean; preload: boolean } = { url: response.url, statusCode: response.statusCode, hsts: value ?? null, maxAge: null, includeSubDomains: false, preload: false };
  const limit = 'This checks the observed HTTPS response only; preload membership and subdomain coverage were not tested.';
  if (httpUnavailable(response) || !response.url.toLowerCase().startsWith('https:') || (value?.length ?? 0) > MAX_TEXT) return result(UND, observation, 'A bounded successful HTTPS response was not available for this check.', limit);
  if (value === undefined) return result(ATTENTION, observation, 'The response did not include HSTS.', limit, 'Consider a suitable Strict-Transport-Security policy after validating HTTPS coverage.');
  const parts = directives(value), seen = new Set<string>(); let age: string | undefined;
  let valid = !!parts;
  for (const part of parts ?? []) {
    if (!part) continue;
    const match = /^([!#$%&'*+.^_`|~\w-]+)(?:\s*=\s*(?:([!#$%&'*+.^_`|~\w-]+)|"((?:[^"\\\r\n]|\\[^\r\n])*)"))?$/.exec(part);
    if (!match) { valid = false; break; }
    const key = match[1].toLowerCase(), parsed = match[2] ?? match[3]?.replace(/\\(.)/g, '$1');
    if (seen.has(key)) valid = false;
    seen.add(key);
    if (key === 'max-age') { age = parsed; if (!age || !/^\d+$/.test(age)) valid = false; }
    if (key === 'includesubdomains' && parsed !== undefined) valid = false;
  }
  observation.maxAge = age && /^\d+$/.test(age) ? (Number.isSafeInteger(Number(age)) ? Number(age) : age) : null;
  observation.includeSubDomains = seen.has('includesubdomains');
  observation.preload = seen.has('preload');
  if (!valid || age === undefined || /^0+$/.test(age)) return result(ATTENTION, observation, 'HSTS was malformed, missing max-age, or disabled with max-age zero.', limit, 'Publish one syntactically valid HSTS policy with a positive max-age.');
  return result(EXPECTED, observation, 'The response included HSTS with a positive max-age.', limit);
}

export function inspectHeaders(response: HttpObservation): Interpretation {
  const nosniff = header(response, 'x-content-type-options'), xfo = header(response, 'x-frame-options'), csp = header(response, 'content-security-policy'), referrer = header(response, 'referrer-policy');
  const observation = { url: response.url, statusCode: response.statusCode, nosniff: nosniff ?? null, frameOptions: xfo ?? null, csp: csp ?? null, referrerPolicy: referrer ?? null };
  const limit = 'This checks header presence and bounded syntax, not policy effectiveness. A permissive frame-ancestors source can still permit embedding; CSP completeness and application security were not assessed.';
  if (httpUnavailable(response) || !response.url.toLowerCase().startsWith('https:') || [nosniff, xfo, csp, referrer].some(v => (v?.length ?? 0) > MAX_TEXT)) return result(UND, observation, 'A bounded successful HTTPS response was not available for header interpretation.', limit);
  const frameAncestors = csp?.split(';').map(v => v.trim()).find(v => /^frame-ancestors(?:\s|$)/i.test(v));
  const sources = frameAncestors?.split(/\s+/).slice(1) ?? [];
  const frameCsp = sources.length > 0 && (sources.length === 1 && sources[0] === "'none'" || sources.every(v => v === "'self'" || v === '*' || /^[a-z][a-z0-9+.-]*:$/i.test(v) || /^(?:https?:\/\/)?(?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*(?::\d+)?\/?$/i.test(v)));
  const frame = /^(DENY|SAMEORIGIN)$/i.test(xfo?.trim() ?? '') || frameCsp;
  if (nosniff?.trim().toLowerCase() === 'nosniff' && !frame && frameAncestors && sources.length > 0) return result(UND, observation, 'A frame-ancestors directive was present with source syntax outside this bounded parser.', limit);
  if (nosniff?.trim().toLowerCase() !== 'nosniff' || !frame) return result(ATTENTION, observation, 'The response lacks recognized nosniff or frame-policy headers.', limit, 'Review X-Content-Type-Options and an appropriate frame-ancestors or X-Frame-Options policy.');
  const recognized = ['no-referrer', 'no-referrer-when-downgrade', 'same-origin', 'origin', 'strict-origin', 'origin-when-cross-origin', 'strict-origin-when-cross-origin', 'unsafe-url'];
  const referrerPresent = referrer?.split(',').some(v => recognized.includes(v.trim().toLowerCase()));
  if (!csp?.trim() || !referrerPresent) return result(INFO, observation, 'Nosniff and a framing-policy declaration were present; CSP or a recognized Referrer-Policy was not observed.', limit, 'Consider CSP and Referrer-Policy appropriate to the application.');
  return result(EXPECTED, observation, 'The response included nosniff, a framing-policy declaration, CSP and a recognized Referrer-Policy.', limit);
}

// Calendar validation prevents Date.parse from accepting invalid day rollover.
function expiry(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) return null;
  const [, y, m, d, h, min, sec, , oh, om] = match;
  const year = Number(y), month = Number(m), day = Number(d);
  const days = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1] || Number(h) > 23 || Number(min) > 59 || Number(sec) > 59 || Number(oh ?? 0) > 23 || Number(om ?? 0) > 59) return null;
  const parsed = Date.parse(value); return Number.isFinite(parsed) ? parsed : null;
}
export function inspectSecurityTxt(response: HttpObservation, now: Date, wellKnown: boolean): Interpretation {
  const observation: { url: string; statusCode: number; bodyBytes: number; utf8Valid: boolean; wellKnown: boolean; contactCount: number; contacts: string[]; expires: string[]; canonical: string[]; expired: boolean | null } = { url: response.url, statusCode: response.statusCode, bodyBytes: response.bodyBytes, utf8Valid: response.utf8Valid, wellKnown, contactCount: 0, contacts: [], expires: [], canonical: [], expired: null };
  const limit = 'The file is a published contact declaration; contact ownership, delivery, signatures and vulnerability handling were not authenticated.';
  if ([404, 410].includes(response.statusCode)) return result(INFO, observation, 'No security.txt file was observed at this location.', limit, 'Consider publishing security.txt at /.well-known/security.txt.');
  if (httpUnavailable(response) || response.bodyBytes > MAX_TEXT || response.body.length > MAX_TEXT || !Number.isFinite(now.getTime())) return result(UND, observation, 'The response could not establish a bounded security.txt file.', limit);
  const encoding = header(response, 'content-encoding');
  if (encoding && encoding.trim().toLowerCase() !== 'identity') return result(UND, observation, 'Content encoding was not decoded by this bounded parser.', limit);
  if (!response.utf8Valid) return result(ATTENTION, observation, 'The published file was not valid UTF-8.', limit, 'Publish a UTF-8 security.txt file with Contact and Expires fields.');
  if (/-----BEGIN PGP (?:SIGNED MESSAGE|MESSAGE|SIGNATURE)-----/.test(response.body)) return result(UND, observation, 'OpenPGP framing is outside this bounded parser.', limit);
  const fields = new Map<string, string[]>(); let malformed = false;
  for (const line of response.body.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    const separator = line.indexOf(':'), name = line.slice(0, separator);
    if (separator < 1 || !/^[A-Za-z][A-Za-z0-9-]*$/.test(name) || /[\x00-\x08\x0b-\x1f\x7f\u2028\u2029]/.test(line)) { malformed = true; continue; }
    const key = name.toLowerCase(), value = line.slice(separator + 1).trim(), values = fields.get(key);
    if (values) values.push(value);
    else fields.set(key, [value]);
  }
  const contacts = fields.get('contact') ?? [], expires = fields.get('expires') ?? [], canonicals = fields.get('canonical') ?? [];
  const contactUrls = contacts.map(uri), canonicalUrls = canonicals.map(uri);
  const exp = expires.length === 1 ? expiry(expires[0]) : null;
  Object.assign(observation, { contactCount: contacts.length, contacts, expires, canonical: canonicals, expired: exp === null ? null : exp <= now.getTime() });
  // RFC 3339 leap seconds are valid syntax, but local Date cannot interpret them reliably.
  if (expires.length === 1 && /T\d\d:\d\d:60(?:[.Z+-])/i.test(expires[0])) return result(UND, observation, 'The expiry uses leap-second syntax outside this parser.', limit);
  if (malformed || !contacts.length || contactUrls.some(v => !v) || exp === null || exp <= now.getTime() || canonicalUrls.some(v => !v || v.protocol !== 'https:')) return result(ATTENTION, observation, 'The file has malformed, missing or expired required fields, or an invalid Canonical URI.', limit, 'Review Contact, Expires and any Canonical fields against RFC 9116.');
  if (contactUrls.some(v => v?.protocol === 'http:')) return result(ATTENTION, observation, 'A web contact URI does not use HTTPS.', limit, 'Use HTTPS for web contact addresses.');
  if (canonicals.length && !canonicals.includes(response.url)) return result(ATTENTION, observation, 'The Canonical field does not include the location from which the file was retrieved.', limit, 'Include the actual HTTPS security.txt location in Canonical.');
  if (!wellKnown) return result(INFO, observation, 'A parseable current security.txt file was found only at the legacy root location.', limit, 'Publish the file at /.well-known/security.txt.');
  return result(EXPECTED, observation, 'The well-known file contained parseable Contact and current Expires fields, with matching Canonical when supplied.', limit);
}

function txtRecords(txt: string[][]): string[] | null {
  if (txt.length > 200 || txt.some(parts => parts.length > 200 || parts.some(p => p.length > MAX_TEXT))) return null;
  const records = txt.map(parts => parts.join(''));
  return records.reduce((sum, v) => sum + v.length, 0) <= MAX_TEXT ? records : null;
}
function hasMx(mx: DnsRecords['MX']): boolean { return mx.some(m => m.exchange !== '.' && m.exchange !== ''); }
function domain(value: string): boolean {
  const name = value.replace(/\.$/, '');
  return name.length <= 253 && name.split('.').every(label => label.length <= 63) && /^(?:[a-z0-9_](?:[a-z0-9_-]*[a-z0-9_])?\.)*[a-z0-9_](?:[a-z0-9_-]*[a-z0-9_])?\.?$/i.test(value);
}
export function inspectSpf(txt: string[][], mx: DnsRecords['MX']): Interpretation {
  const records = txtRecords(txt), selected = records?.filter(r => /^v=spf1(?: |$)/i.test(r)) ?? [];
  const observation: { records: string[]; mxPresent: boolean; terminalAll: string | null } = { records: selected, mxPresent: hasMx(mx), terminalAll: null };
  const limit = 'Only published SPF syntax was checked. Includes, redirects, macros, DNS lookup limits and actual sender authorization were not evaluated.';
  if (!records) return result(UND, { bounded: false }, 'TXT data exceeded the interpretation bound.', limit);
  if (!selected.length) return result(hasMx(mx) ? ATTENTION : INFO, observation, 'No SPF record was observed for this hostname.', limit, 'Confirm whether this hostname sends mail before publishing an SPF policy.');
  if (selected.length !== 1) return result(ATTENTION, observation, 'Multiple SPF records were published.', limit, 'Publish a single SPF record for the hostname.');
  const tokens = selected[0].split(/ +/).slice(1).filter(Boolean), modifiers = new Set<string>();
  observation.terminalAll = /^[+?~-]?all$/i.test(tokens.at(-1) ?? '') ? tokens.at(-1)!.toLowerCase() : null;
  let unsupported = false, invalid = false, unconditionalAll = false, all: string | undefined;
  for (const token of tokens) {
    if (token.includes('%')) { unsupported = true; continue; }
    const modifier = /^([a-z][a-z0-9_.-]*)=(\S+)$/i.exec(token);
    if (modifier) {
      const key = modifier[1].toLowerCase();
      if (['redirect', 'exp'].includes(key)) { if (modifiers.has(key) || !domain(modifier[2])) invalid = true; modifiers.add(key); }
      continue; // Unknown modifiers are ignored by RFC 7208.
    }
    const match = /^([+?~-]?)([a-z0-9]+)(.*)$/i.exec(token);
    if (!match) { invalid = true; continue; }
    const [, qualifier, mechanism, suffix] = match, name = mechanism.toLowerCase();
    if (name === 'all') { if (suffix) invalid = true; all ??= qualifier || '+'; if (!qualifier || qualifier === '+') unconditionalAll = true; }
    else if (name === 'ip4' || name === 'ip6') {
      const ip = /^:([^/]+)(?:\/(\d+))?$/.exec(suffix), family = name === 'ip4' ? 4 : 6;
      if (!ip || isIP(ip[1]) !== family || (ip[2] !== undefined && Number(ip[2]) > (family === 4 ? 32 : 128))) invalid = true;
    } else if (['include', 'exists'].includes(name)) { if (!suffix.startsWith(':') || !domain(suffix.slice(1))) invalid = true; }
    else if (name === 'ptr') { if (suffix && (!suffix.startsWith(':') || !domain(suffix.slice(1)))) invalid = true; }
    else if (name === 'a' || name === 'mx') {
      const matchSuffix = /^(?::([^/]+))?(?:\/(\d+))?(?:\/\/(\d+))?$/.exec(suffix);
      if (!matchSuffix || (matchSuffix[1] && !domain(matchSuffix[1])) || Number(matchSuffix?.[2] ?? 0) > 32 || Number(matchSuffix?.[3] ?? 0) > 128) invalid = true;
    } else invalid = true;
  }
  if (invalid) return result(ATTENTION, observation, 'The SPF record contains an objective syntax error in the supported grammar.', limit, 'Review the published SPF syntax.');
  if (unconditionalAll) return result(ATTENTION, observation, 'The SPF record includes an unconditional pass mechanism. Its reachability through earlier mechanisms was not evaluated.', limit, 'Review whether the published all mechanism is intentional.');
  if (unsupported) return result(UND, observation, 'SPF macro syntax is outside this bounded parser.', limit);
  if (all === '?') return result(INFO, observation, 'The SPF record ends evaluation with a neutral all mechanism.', limit, 'Review whether neutral treatment matches the mail policy.');
  return result(EXPECTED, observation, 'One SPF record was parseable and no unconditional pass mechanism was observed.', limit);
}

export function inspectDmarc(txt: string[][], mx: DnsRecords['MX']): Interpretation {
  const records = txtRecords(txt), selected = records?.filter(r => /^v\s*=\s*DMARC1(?:\s*;|\s*$)/i.test(r)) ?? [];
  const observation: { records: string[]; mxPresent: boolean; p: string | null; sp: string | null; pct: number | null; rua: string[]; ruf: string[] } = { records: selected, mxPresent: hasMx(mx), p: null, sp: null, pct: null, rua: [], ruf: [] };
  const limit = 'Only this hostname’s published DMARC syntax was checked; organizational-domain fallback, report authorization, delivery and alignment were not evaluated.';
  if (!records) return result(UND, { bounded: false }, 'TXT data exceeded the interpretation bound.', limit);
  if (!selected.length) return result(hasMx(mx) ? ATTENTION : INFO, observation, 'No DMARC record was observed at the queried name.', limit, 'Confirm the mail policy and whether a parent-domain policy applies.');
  if (selected.length !== 1) return result(ATTENTION, observation, 'Multiple DMARC records were published.', limit, 'Publish a single DMARC policy at the queried name.');
  const tags = new Map<string, string>(); let invalid = false, unsupported = false;
  for (const part of selected[0].split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf('='), key = trimmed.slice(0, separator).trim().toLowerCase();
    if (separator < 1 || !/^[a-z][a-z0-9_]*$/.test(key) || tags.has(key)) { invalid = true; continue; }
    const value = trimmed.slice(separator + 1).trim();
    tags.set(key, ['p', 'sp', 'adkim', 'aspf', 'fo'].includes(key) ? value.toLowerCase() : value);
  }
  Object.assign(observation, { p: tags.get('p') ?? null, sp: tags.get('sp') ?? null, pct: /^\d{1,3}$/.test(tags.get('pct') ?? '100') ? Number(tags.get('pct') ?? 100) : null, rua: tags.get('rua')?.split(',').map(v => v.trim()) ?? [], ruf: tags.get('ruf')?.split(',').map(v => v.trim()) ?? [] });
  if (tags.get('v') !== 'DMARC1' || !['none', 'quarantine', 'reject'].includes(tags.get('p') ?? '')) invalid = true;
  if ([...tags.keys()][1] !== 'p') invalid = true;
  if (tags.has('sp') && !['none', 'quarantine', 'reject'].includes(tags.get('sp')!)) invalid = true;
  if (tags.has('pct') && (!/^\d{1,3}$/.test(tags.get('pct')!) || Number(tags.get('pct')) > 100)) invalid = true;
  for (const key of ['adkim', 'aspf']) if (tags.has(key) && !['r', 's'].includes(tags.get(key)!)) invalid = true;
  if (tags.has('ri') && !/^\d+$/.test(tags.get('ri')!)) invalid = true;
  if (tags.has('fo') && !/^[01ds](?::[01ds])*$/.test(tags.get('fo')!)) invalid = true;
  for (const key of ['rua', 'ruf']) if (tags.has(key)) {
    for (const value of tags.get(key)!.split(',')) {
      const boundedUri = /^([^!]*)(?:!(\d+)[kmgt]?)?$/i.exec(value.trim());
      const size = boundedUri?.[2]?.replace(/^0+/, '') || '0';
      if (!boundedUri || size.length > 20 || BigInt(size) > 18446744073709551615n) { invalid = true; continue; }
      const target = boundedUri[1];
      const parsed = uri(target);
      if (!parsed) invalid = true;
      else if (parsed.protocol !== 'mailto:') unsupported = true;
      else if (!/^[^\s@]+@[^\s@]+$/.test(parsed.pathname)) invalid = true;
    }
  }
  if (invalid) return result(ATTENTION, observation, 'The DMARC record has missing, duplicate or malformed policy fields.', limit, 'Review DMARC tags, policy values and reporting URIs.');
  if (unsupported) return result(UND, observation, 'A reporting URI scheme is outside this bounded DMARC parser.', limit);
  if (tags.get('p') === 'none') return result(INFO, observation, 'DMARC requests monitoring without quarantine or rejection.', limit, 'Review reports before choosing an enforcement policy.');
  return result(EXPECTED, observation, 'A parseable DMARC quarantine or reject policy was observed.', limit);
}

export function inspectCaa(records: DnsRecords['CAA']): Interpretation {
  const limit = 'This interprets the supplied CAA records only; CA-specific parameters, issuance history and DNSSEC were not evaluated.';
  if (records.length > 200 || JSON.stringify(records).length > MAX_TEXT) return result(UND, { bounded: false }, 'CAA data exceeded the interpretation bound.', limit);
  let restriction = false, invalid = false, unknownCritical = false;
  for (const record of records) {
    if (!Number.isInteger(record.critical) || record.critical < 0 || record.critical > 255) invalid = true;
    const entries = Object.entries(record).filter(([key]) => key !== 'critical');
    if (entries.length !== 1) invalid = true;
    for (const [originalTag, value] of entries) {
      const tag = originalTag.toLowerCase();
      if (!/^[a-z0-9]{1,15}$/i.test(tag) || typeof value !== 'string') { invalid = true; continue; }
      if (tag === 'issue' || tag === 'issuewild') {
        restriction = true;
        const [issuer, ...params] = value.split(';');
        if (issuer.trim() && (!domain(issuer.trim()) || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/i.test(issuer.trim()))) invalid = true;
        if (params.some((p, i) => !(params.length === 1 && i === 0 && !p.trim()) && !/^\s*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\s*=\s*[\x21-\x3a\x3c-\x7e]*\s*$/i.test(p))) invalid = true;
      } else if (tag === 'iodef') {
        const parsed = uri(value); if (!parsed || !['mailto:', 'https:', 'http:'].includes(parsed.protocol)) invalid = true;
      } else if ((record.critical & 128) !== 0) unknownCritical = true;
    }
  }
  if (invalid) return result(ATTENTION, records, 'CAA contains an objective syntax error; malformed issue values can prohibit issuance.', limit, 'Review the CAA flags, tags and values before the next certificate issuance.');
  if (unknownCritical) return result(UND, records, 'An unknown critical CAA property prevents this interpreter from determining the policy.', limit);
  if (restriction) return result(EXPECTED, records, 'CAA issuance restrictions were observed, including empty issuer values when present.', limit);
  return result(INFO, records, records.length ? 'CAA records were present without an issue or issuewild restriction.' : 'No CAA issuance restriction was observed.', limit, 'Consider CAA issuance restrictions appropriate to the certificate providers.');
}
