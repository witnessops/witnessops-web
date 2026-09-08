import 'server-only';
import { Resolver } from 'node:dns/promises';
import { BlockList, connect as netConnect, isIP, type Socket, type TcpNetConnectOpts } from 'node:net';
import { connect as tlsConnect, checkServerIdentity, type TLSSocket, type ConnectionOptions } from 'node:tls';
import { Agent as HttpAgent, request as httpRequest, type ClientRequest, type RequestOptions, type IncomingMessage } from 'node:http';
import { Agent as HttpsAgent, request as httpsRequest } from 'node:https';
import { domainToASCII } from 'node:url';
import type { BudgetUsage, DnsRecords, HttpObservation, LegacyObservation, NetworkEvent, ObservationTransport, PublicTarget, TlsObservation } from './contracts';
import { normalizeExternalHostname, UnsafeTargetError } from './input';
export { UnsafeTargetError } from './input';

export class ObservationError extends Error {
  constructor(readonly code: string, message = 'This observation could not be completed within its limits.') {
    super(message);
    this.name = 'ObservationError';
  }
}

const privateV4 = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) privateV4.addSubnet(address, prefix, 'ipv4');
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');
const specialV6 = new BlockList();
for (const [address, prefix] of [['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20]] as const) {
  specialV6.addSubnet(address, prefix, 'ipv6');
}

/** Conservative public-unicast policy. IPv4-mapped, translation and transition IPv6 are excluded. */
export function isPublicAddress(address: string): boolean {
  if (typeof address !== 'string' || address.includes('%')) return false;
  const family = isIP(address);
  if (family === 4) return !privateV4.check(address, 'ipv4');
  return family === 6 && globalV6.check(address, 'ipv6') && !specialV6.check(address, 'ipv6');
}

export interface ExternalResolver {
  resolve4(hostname: string): Promise<string[]>;
  resolve6(hostname: string): Promise<string[]>;
  resolveTxt(hostname: string): Promise<string[][]>;
  resolveMx(hostname: string): Promise<{ exchange: string; priority: number }[]>;
  resolveCaa(hostname: string): Promise<{ critical: number; issue?: string; issuewild?: string; iodef?: string }[]>;
  cancel(): void;
}
type RequestFactory = (options: RequestOptions, callback: (response: IncomingMessage) => void) => ClientRequest;
export type NetworkOptions = {
  resolver?: ExternalResolver;
  connectTcp?: (options: TcpNetConnectOpts) => Socket;
  connectTls?: (options: ConnectionOptions) => TLSSocket;
  httpRequest?: RequestFactory;
  httpsRequest?: RequestFactory;
  /** Tests may shorten limits; production ceilings can never be increased. */
  timeouts?: Partial<{ dns: number; tcp: number; tls: number; http: number; run: number }>;
};
const MAX_DNS_ANSWERS = 64;
const MAX_BODY_BYTES = 256 * 1024;
const RESPONSE_HEADERS = new Set(['location', 'strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'content-type', 'content-encoding']);

function normalizeQueryHostname(value: string): string {
  const hostname = domainToASCII(value.toLowerCase());
  if (!hostname || hostname.length > 253 || hostname.split('.').some(label => !/^[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?$/u.test(label))) {
    throw new UnsafeTargetError('The DNS name is invalid.');
  }
  return hostname;
}
function boundedDns<K extends keyof DnsRecords>(kind: K, value: DnsRecords[K]): DnsRecords[K] {
  if (!Array.isArray(value) || value.length > MAX_DNS_ANSWERS || JSON.stringify(value).length > 65536) throw new ObservationError('dns_response_limit');
  for (const record of value) {
    if (kind === 'A' || kind === 'AAAA') {
      if (typeof record !== 'string' || isIP(record) !== (kind === 'A' ? 4 : 6) || record.includes('%')) throw new ObservationError('dns_invalid_response');
    } else if (kind === 'TXT') {
      if (!Array.isArray(record) || record.length > 128 || record.some(chunk => typeof chunk !== 'string' || chunk.length > 4096)) throw new ObservationError('dns_invalid_response');
    } else if (kind === 'MX') {
      const mx = record as DnsRecords['MX'][number];
      if (!mx || typeof mx.exchange !== 'string' || mx.exchange.length > 253 || !Number.isInteger(mx.priority) || mx.priority < 0 || mx.priority > 65535) throw new ObservationError('dns_invalid_response');
    } else {
      const caa = record as DnsRecords['CAA'][number];
      if (!caa || typeof caa !== 'object' || !Number.isInteger(caa.critical) || caa.critical < 0 || caa.critical > 255 || Object.keys(caa).length > 8 || Object.values(caa).some(field => typeof field !== 'string' && typeof field !== 'number') || Object.values(caa).some(field => typeof field === 'string' && field.length > 4096)) throw new ObservationError('dns_invalid_response');
    }
  }
  return value;
}
function failure(error: unknown, code: string): Error {
  return error instanceof UnsafeTargetError || error instanceof ObservationError ? error : new ObservationError(code);
}
function peerProtocolRejection(error: unknown): boolean {
  const value = error as { code?: string; message?: string };
  return /ALERT_PROTOCOL_VERSION$/u.test(value.code ?? '') || /alert protocol version.*SSL alert number 70/isu.test(value.message ?? '');
}

class BoundedObservationTransport implements ObservationTransport {
  readonly usage: BudgetUsage = { dns: 0, normalTls: 0, legacyTls: 0, http: 0, redirects: 0 };
  readonly events: NetworkEvent[] = [];
  private readonly resolver: ExternalResolver;
  private readonly sockets = new Set<Socket>();
  private readonly addresses = new WeakMap<Socket, string>();
  private readonly options: NetworkOptions;
  private readonly limits: { dns: number; tcp: number; tls: number; http: number; run: number };
  private readonly deadline: number;
  private readonly deadlineTimer: ReturnType<typeof setTimeout>;
  private readonly plainAgent: HttpAgent;
  private readonly secureAgent: HttpsAgent;
  private closed = false;
  private expired = false;
  private warmSocket: TLSSocket | null = null;
  private certificateHostname: string | null = null;
  private certificateValue: TlsObservation | null = null;
  private httpsPermitted = false;
  private requestInFlight = false;
  private activeHttpSignal: AbortSignal | undefined;

  constructor(options: NetworkOptions = {}) {
    this.options = options;
    const ceiling = { dns: 3000, tcp: 3000, tls: 5000, http: 5000, run: 30000 };
    this.limits = { ...ceiling };
    for (const key of Object.keys(ceiling) as (keyof typeof ceiling)[]) {
      const selected = options.timeouts?.[key];
      if (selected !== undefined && Number.isFinite(selected) && selected > 0) this.limits[key] = Math.min(selected, ceiling[key]);
    }
    this.resolver = options.resolver ?? new Resolver({ timeout: this.limits.dns, tries: 1 });
    this.deadline = Date.now() + this.limits.run;
    this.deadlineTimer = setTimeout(() => { this.expired = true; this.close(); }, this.limits.run);
    this.deadlineTimer.unref();
    this.plainAgent = new HttpAgent({ keepAlive: true, maxSockets: 1, maxTotalSockets: 1, maxFreeSockets: 1 });
    this.secureAgent = new HttpsAgent({ keepAlive: true, maxSockets: 1, maxTotalSockets: 1, maxFreeSockets: 1, maxCachedSessions: 0 });
    // Agent.createConnection is the supported extension point. No agent-internal pool manipulation.
    this.plainAgent.createConnection = (connectionOptions, callback) => {
      const hostname = String(connectionOptions.hostname ?? connectionOptions.host ?? '');
      const signal = this.activeHttpSignal;
      void this.dial(hostname, 80, signal).then(socket => callback!(null, socket), error => callback!(failure(error, 'tcp_error'), undefined as never));
      return undefined as never;
    };
    this.secureAgent.createConnection = (connectionOptions, callback) => {
      const hostname = String(connectionOptions.servername ?? connectionOptions.hostname ?? connectionOptions.host ?? '');
      const socket = this.warmSocket;
      this.warmSocket = null;
      if (!this.httpsPermitted || hostname !== this.certificateHostname || !socket || socket.destroyed) {
        socket?.destroy();
        queueMicrotask(() => callback!(new ObservationError('normal_tls_budget'), undefined as never));
      } else {
        queueMicrotask(() => callback!(null, socket));
      }
      return undefined as never;
    };
  }

  checkpoint(): void {
    if (this.expired || Date.now() >= this.deadline) throw new ObservationError('run_timeout');
    if (this.closed) throw new ObservationError('transport_closed');
  }
  private duration(kind: 'dns' | 'tcp' | 'tls' | 'http'): number {
    this.checkpoint();
    return Math.max(1, Math.min(this.limits[kind], this.deadline - Date.now()));
  }
  private event(event: NetworkEvent): void {
    if (this.events.length < 100) this.events.push(event);
  }
  private track<T extends Socket>(socket: T, address: string): T {
    this.sockets.add(socket);
    this.addresses.set(socket, address);
    socket.once('close', () => this.sockets.delete(socket));
    // Warm/idle sockets can fail outside an awaited operation. Keep those errors local.
    socket.on('error', () => {});
    return socket;
  }
  async query<K extends keyof DnsRecords>(kind: K, hostname: string): Promise<DnsRecords[K]> {
    this.checkpoint();
    const name = normalizeQueryHostname(hostname);
    if (this.usage.dns >= 20) throw new ObservationError('dns_budget');
    this.usage.dns++;
    this.event({ kind: 'dns', hostname: name, detail: kind });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const operation = (() => {
        switch (kind) {
          case 'A': return this.resolver.resolve4(name);
          case 'AAAA': return this.resolver.resolve6(name);
          case 'TXT': return this.resolver.resolveTxt(name);
          case 'MX': return this.resolver.resolveMx(name);
          case 'CAA': return this.resolver.resolveCaa(name);
        }
      })();
      const value = await Promise.race([
        operation,
        new Promise<never>((_, reject) => { timer = setTimeout(() => { this.resolver.cancel(); reject(new ObservationError('dns_timeout')); }, this.duration('dns')); }),
      ]);
      this.checkpoint();
      return boundedDns(kind, value as DnsRecords[K]);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'ENODATA' || code === 'ENOTFOUND') { this.checkpoint(); return [] as unknown as DnsRecords[K]; }
      throw failure(error, 'dns_error');
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  async publicTarget(hostname: string): Promise<PublicTarget> {
    const name = normalizeExternalHostname(hostname);
    // Complete both address families before choosing any destination. No fallback on DNS errors.
    const a = await this.query('A', name);
    const aaaa = await this.query('AAAA', name);
    if ([...a, ...aaaa].some(address => !isPublicAddress(address))) throw new UnsafeTargetError();
    if (!a.length && !aaaa.length) throw new ObservationError('dns_no_address');
    return { a, aaaa, addresses: [...a.map(address => ({ address, family: 4 as const })), ...aaaa.map(address => ({ address, family: 6 as const }))] };
  }
  private async dial(hostname: string, port: 80 | 443, signal?: AbortSignal): Promise<Socket> {
    // This runs for EVERY newly created TCP socket, including HTTP reconnects and legacy probes.
    const target = await this.publicTarget(hostname);
    this.checkpoint();
    if (signal?.aborted) throw new ObservationError('http_aborted');
    const selected = target.addresses[0];
    this.event({ kind: 'connect', hostname, detail: 'Pinned public address', address: selected.address, port });
    return new Promise<Socket>((resolve, reject) => {
      const socket = this.track((this.options.connectTcp ?? netConnect)({ host: selected.address, family: selected.family, port }), selected.address);
      let settled = false;
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket.removeListener('connect', connected);
        socket.removeListener('error', failed);
        signal?.removeEventListener('abort', aborted);
        if (error) { socket.destroy(); reject(failure(error, 'tcp_error')); }
        else resolve(socket);
      };
      const connected = () => finish();
      const failed = (error: Error) => finish(error);
      const aborted = () => finish(new ObservationError('http_aborted'));
      signal?.addEventListener('abort', aborted, { once: true });
      const timer = setTimeout(() => finish(new ObservationError('tcp_timeout')), this.duration('tcp'));
      socket.once('connect', connected);
      socket.once('error', failed);
    });
  }
  private async handshake(hostname: string, protocol?: 'TLSv1' | 'TLSv1.1'): Promise<TLSSocket> {
    const tcp = await this.dial(hostname, 443);
    this.checkpoint();
    return new Promise<TLSSocket>((resolve, reject) => {
      const options: ConnectionOptions = { socket: tcp, servername: hostname, rejectUnauthorized: false, ALPNProtocols: ['http/1.1'],
        ...(protocol ? { minVersion: protocol, maxVersion: protocol, ciphers: 'DEFAULT:@SECLEVEL=0' } : { minVersion: 'TLSv1.2' }) };
      let socket: TLSSocket;
      try { socket = this.track((this.options.connectTls ?? tlsConnect)(options), this.addresses.get(tcp)!); }
      catch (error) { tcp.destroy(); reject(error); return; }
      let settled = false;
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket.removeListener('secureConnect', connected);
        socket.removeListener('error', failed);
        if (error) { socket.destroy(); tcp.destroy(); reject(error); }
        else resolve(socket);
      };
      const connected = () => finish();
      const failed = (error: Error) => finish(error);
      const timer = setTimeout(() => finish(new ObservationError('tls_timeout')), this.duration('tls'));
      socket.once('secureConnect', connected);
      socket.once('error', failed);
    });
  }
  async certificate(hostname: string): Promise<TlsObservation> {
    const name = normalizeExternalHostname(hostname);
    this.checkpoint();
    if (this.certificateValue && this.certificateHostname === name) return this.certificateValue;
    if (this.usage.normalTls >= 1) throw new ObservationError('normal_tls_budget');
    this.usage.normalTls++;
    this.certificateHostname = name;
    let socket: TLSSocket;
    try { socket = await this.handshake(name); }
    catch (error) { throw failure(error, 'tls_error'); }
    const cert = socket.getPeerCertificate();
    let hostnameMatch = false;
    try { hostnameMatch = !checkServerIdentity(name, cert); } catch { /* Missing/malformed certificates do not match. */ }
    const validFrom = String(cert.valid_from ?? '');
    const validTo = String(cert.valid_to ?? '');
    const now = Date.now();
    const validTime = Number.isFinite(Date.parse(validFrom)) && Number.isFinite(Date.parse(validTo)) && Date.parse(validFrom) <= now && Date.parse(validTo) > now;
    const issuer = Object.fromEntries(Object.entries(cert.issuer ?? {}).slice(0, 10).map(([key, value]) => [key.slice(0, 64), String(value).slice(0, 512)]));
    this.certificateValue = {
      handshake: true, authorized: socket.authorized === true, authorizationError: socket.authorizationError ? String(socket.authorizationError).slice(0, 120) : null,
      hostnameMatch, validFrom, validTo, issuer, sans: String(cert.subjectaltname ?? '').split(', ').filter(Boolean).slice(0, 64).map(value => value.slice(0, 253)),
      fingerprint: String(cert.fingerprint256 ?? '').slice(0, 100), address: this.addresses.get(socket)!, protocol: socket.getProtocol(),
    };
    this.httpsPermitted = socket.authorized === true && hostnameMatch && validTime;
    if (this.httpsPermitted) this.warmSocket = socket;
    else socket.destroy();
    return this.certificateValue;
  }
  async legacy(hostname: string, protocol: 'TLSv1' | 'TLSv1.1'): Promise<LegacyObservation> {
    this.checkpoint();
    const name = normalizeExternalHostname(hostname);
    if (protocol !== 'TLSv1' && protocol !== 'TLSv1.1') throw new ObservationError('invalid_legacy_protocol');
    if (this.usage.legacyTls >= 2) throw new ObservationError('legacy_tls_budget');
    this.usage.legacyTls++;
    try {
      const socket = await this.handshake(name, protocol);
      const negotiated = socket.getProtocol() === protocol;
      socket.destroy();
      return { protocol, outcome: negotiated ? 'negotiated' : 'undetermined', detail: negotiated ? 'The server negotiated this legacy protocol.' : 'The requested legacy protocol was not established.' };
    } catch (error) {
      if (error instanceof UnsafeTargetError) throw error;
      return { protocol, outcome: peerProtocolRejection(error) ? 'peer_rejected' : 'undetermined', detail: peerProtocolRejection(error) ? 'The peer sent an explicit protocol-version rejection.' : 'The probe did not establish whether the server accepts this protocol.' };
    }
  }
  followRedirect(): void {
    this.checkpoint();
    if (this.usage.redirects >= 3) throw new ObservationError('redirect_budget');
    this.usage.redirects++;
    this.event({ kind: 'redirect', hostname: this.certificateHostname ?? '', detail: 'One permitted redirect hop' });
  }
  async request(urlString: string, bodyLimit: number): Promise<HttpObservation> {
    if (this.requestInFlight) throw new ObservationError('concurrency_limit');
    this.requestInFlight = true;
    try { return await this.performRequest(urlString, bodyLimit); }
    finally { this.requestInFlight = false; this.activeHttpSignal = undefined; }
  }
  private async performRequest(urlString: string, bodyLimit: number): Promise<HttpObservation> {
    this.checkpoint();
    if (urlString.length > 4096 || !Number.isInteger(bodyLimit) || bodyLimit < 1 || bodyLimit > MAX_BODY_BYTES) throw new ObservationError('invalid_request');
    let url: URL;
    try { url = new URL(urlString); } catch { throw new UnsafeTargetError('The redirect URL is invalid.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) throw new UnsafeTargetError('Only standard HTTP and HTTPS destinations are allowed.');
    const hostname = normalizeExternalHostname(url.hostname);
    const secure = url.protocol === 'https:';
    if (this.usage.http >= 8) throw new ObservationError('http_budget');
    if (secure) {
      // Another HTTPS origin cannot consume a second handshake, but an unsafe redirect still rejects the run.
      if (this.certificateHostname && this.certificateHostname !== hostname) await this.publicTarget(hostname);
      await this.certificate(hostname);
      if (!this.httpsPermitted) throw new ObservationError('tls_invalid_certificate');
    }
    this.checkpoint();
    this.usage.http++;
    this.event({ kind: 'http', hostname, detail: 'GET', port: secure ? 443 : 80 });
    return new Promise<HttpObservation>((resolve, reject) => {
      const controller = new AbortController();
      this.activeHttpSignal = controller.signal;
      let request: ClientRequest | undefined;
      let response: IncomingMessage | undefined;
      let settled = false;
      let address = '';
      const finish = (error?: unknown, value?: HttpObservation) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) { controller.abort(); response?.destroy(); request?.destroy(); reject(failure(error, 'http_error')); }
        else resolve(value!);
      };
      const timer = setTimeout(() => finish(new ObservationError('http_timeout')), this.duration('http'));
      const factory = secure ? (this.options.httpsRequest ?? httpsRequest) : (this.options.httpRequest ?? httpRequest);
      try {
        request = factory({
          protocol: url.protocol, hostname, port: secure ? 443 : 80, path: `${url.pathname}${url.search}`,
          method: 'GET', agent: secure ? this.secureAgent : this.plainAgent, maxHeaderSize: 16384,
          headers: { Host: hostname, 'User-Agent': 'WitnessOps-External-Check/0.1', Accept: '*/*', 'Accept-Encoding': 'identity', Connection: 'keep-alive' },
        }, incoming => {
          response = incoming;
          let bodyBytes = 0;
          const chunks: Buffer[] = [];
          incoming.on('data', (chunk: Buffer) => {
            const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            bodyBytes += bytes.length;
            if (bodyBytes > bodyLimit) { finish(new ObservationError('body_limit')); return; }
            chunks.push(bytes);
          });
          incoming.once('aborted', () => finish(new ObservationError('http_aborted')));
          incoming.once('error', error => finish(error));
          incoming.once('end', () => {
            if (settled) return;
            const raw = Buffer.concat(chunks);
            const headers: Record<string, string> = {};
            for (const [name, value] of Object.entries(incoming.headers)) {
              // Native maxHeaderSize bounds the full header block. Truncation could hide policy directives.
              if (RESPONSE_HEADERS.has(name) && value !== undefined) headers[name] = Array.isArray(value) ? value.join(', ') : value;
            }
            let body = '';
            let utf8Valid = !headers['content-encoding'] || headers['content-encoding'].toLowerCase() === 'identity';
            try { body = new TextDecoder('utf-8', { fatal: true }).decode(raw); } catch { utf8Valid = false; }
            finish(undefined, { url: url.href, statusCode: incoming.statusCode ?? 0, headers, body, bodyBytes, utf8Valid, address });
          });
        });
        request.once('socket', socket => { address = this.addresses.get(socket) ?? ''; });
        request.once('error', error => finish(error));
        request.end();
      } catch (error) { finish(error); }
    });
  }
  close(): void {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.deadlineTimer);
    this.resolver.cancel();
    this.plainAgent.destroy();
    this.secureAgent.destroy();
    for (const socket of this.sockets) socket.destroy();
    this.warmSocket = null;
  }
}
export function createObservationTransport(options: NetworkOptions = {}): ObservationTransport {
  return new BoundedObservationTransport(options);
}
