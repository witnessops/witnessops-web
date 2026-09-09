import test from 'node:test';
import assert from 'node:assert/strict';
import { Duplex } from 'node:stream';
import { inspectCertificate, inspectHsts } from './checks';
import { runSnapshot } from './runner';
import { externalExposureAdapter } from './adapter';
import type { Socket, TcpNetConnectOpts } from 'node:net';
import { checkServerIdentity, type ConnectionOptions, type PeerCertificate, type TLSSocket } from 'node:tls';
import { createObservationTransport, isPublicAddress, ObservationError, UnsafeTargetError, type ExternalResolver, type NetworkOptions } from './network';

function resolver(overrides: Partial<ExternalResolver> = {}): ExternalResolver {
  return { resolve4: async () => ['93.184.215.14'], resolve6: async () => [], resolveTxt: async () => [], resolveMx: async () => [], resolveCaa: async () => [], cancel() {}, ...overrides };
}
function code(expected: string) { return (error: unknown) => error instanceof ObservationError && error.code === expected; }

/** A byte-stream socket, not an HTTP mock: Node's real Agent, ClientRequest and parser run over it. */
class InertSocket extends Duplex {
  connecting = false;
  authorized = true;
  authorizationError: Error | null = null;
  encrypted = false;
  remoteAddress = '93.184.215.14';
  requests: string[] = [];
  response = 'HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: keep-alive\r\nStrict-Transport-Security: max-age=31536000\r\n\r\nok';
  shouldRespond = true;
  private partial = '';
  _read() {}
  _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    this.partial += chunk.toString();
    if (this.partial.includes('\r\n\r\n')) {
      this.requests.push(this.partial);
      this.partial = '';
      if (this.shouldRespond) queueMicrotask(() => { if (!this.destroyed) this.push(Buffer.from(this.response)); });
    }
    callback();
  }
  setKeepAlive() { return this; }
  setNoDelay() { return this; }
  setTimeout() { return this; }
  ref() { return this; }
  unref() { return this; }
  getProtocol() { return 'TLSv1.3'; }
  getPeerCertificate() {
    return { subjectaltname: 'DNS:public.com', valid_from: new Date(Date.now() - 86_400_000).toUTCString(), valid_to: new Date(Date.now() + 86_400_000).toUTCString(), issuer: { CN: 'Fixture issuer' }, fingerprint256: 'AB:CD' };
  }
}
function harness(options: NetworkOptions = {}) {
  const sockets: InertSocket[] = [];
  const tcpOptions: TcpNetConnectOpts[] = [];
  const tlsOptions: ConnectionOptions[] = [];
  const transport = createObservationTransport({
    resolver: resolver(),
    connectTcp: args => { tcpOptions.push(args); const socket = new InertSocket(); sockets.push(socket); queueMicrotask(() => socket.emit('connect')); return socket as unknown as Socket; },
    connectTls: args => { tlsOptions.push(args); const socket = args.socket as unknown as InertSocket; socket.encrypted = true; queueMicrotask(() => socket.emit('secureConnect')); return socket as unknown as TLSSocket; },
    ...options,
  });
  return { transport, sockets, tcpOptions, tlsOptions };
}

/** Real Node HTTP agents run over inert sockets; no public target is contacted. */
function crossHostRedirectHarness(mode: 'queued' | 'public' | 'private') {
  let plainConnections = 0;
  const tcp: TcpNetConnectOpts[] = [];
  const setup = harness({
    resolver: resolver({ resolve4: async hostname =>
      hostname === 'www.public.com' && mode === 'private' ? ['93.184.215.14', '169.254.169.254'] : ['93.184.215.14'] }),
    timeouts: { http: 30 },
    connectTcp: options => {
      tcp.push(options);
      const socket = new InertSocket();
      if (options.port === 80 && ++plainConnections === 1) {
        socket.response = `HTTP/1.1 301 Moved Permanently\r\nLocation: http://www.public.com/\r\nContent-Length: 0\r\nConnection: ${mode === 'queued' ? 'keep-alive' : 'close'}\r\n\r\n`;
        if (mode !== 'queued') socket.once('finish', () => socket.destroy());
      }
      queueMicrotask(() => socket.emit('connect'));
      return socket as unknown as Socket;
    },
  });
  return { ...setup, tcp };
}

test('redirect queued before dial records only destination acceptance and HTTP attempt, not connectivity', async () => {
  const { transport, tcp } = crossHostRedirectHarness('queued');
  const snapshot = await runSnapshot('public.com', { transport });
  const transition = snapshot.checks.find(check => check.check_id === 'web.https_redirect.v1')!;
  assert.equal(transition.status, 'UNDETERMINED');
  assert.deepEqual(snapshot.network.filter(event => event.hostname === 'www.public.com'), [
    { kind: 'redirect', hostname: 'www.public.com', detail: 'Redirect target accepted from public.com; destination scheme: http', port: 80 },
    { kind: 'http', hostname: 'www.public.com', detail: 'GET attempt', port: 80 },
  ]);
  assert.equal(tcp.filter(options => options.port === 80).length, 1, 'The queued cross-host request never reached dial');
  assert.equal(snapshot.usage.redirects, 1);
  assert.equal(transition.collected, true, 'Only the initial redirect response was collected.');
  assert.deepEqual((transition.observation as { chain: unknown[] }).chain, [
    { url: 'http://public.com/', status: 301, address: '93.184.215.14' },
  ]);
});

test('cross-host redirect with any private answer fails closed before a destination TCP attempt', async () => {
  const { transport, tcp } = crossHostRedirectHarness('private');
  await assert.rejects(runSnapshot('public.com', { transport }), UnsafeTargetError);
  assert.deepEqual(transport.events.filter(event => event.hostname === 'www.public.com'), [
    { kind: 'redirect', hostname: 'www.public.com', detail: 'Redirect target accepted from public.com; destination scheme: http', port: 80 },
    { kind: 'http', hostname: 'www.public.com', detail: 'GET attempt', port: 80 },
    { kind: 'dns', hostname: 'www.public.com', detail: 'A' },
    { kind: 'dns', hostname: 'www.public.com', detail: 'AAAA' },
  ]);
  assert.deepEqual(tcp, [
    { host: '93.184.215.14', family: 4, port: 443 },
    { host: '93.184.215.14', family: 4, port: 80 },
  ]);
});

test('successful cross-host HTTP redirect records actual DNS validation before the pinned TCP attempt', async () => {
  const { transport, tcp } = crossHostRedirectHarness('public');
  const snapshot = await runSnapshot('public.com', { transport });
  assert.deepEqual(snapshot.network.filter(event => event.hostname === 'www.public.com'), [
    { kind: 'redirect', hostname: 'www.public.com', detail: 'Redirect target accepted from public.com; destination scheme: http', port: 80 },
    { kind: 'http', hostname: 'www.public.com', detail: 'GET attempt', port: 80 },
    { kind: 'dns', hostname: 'www.public.com', detail: 'A' },
    { kind: 'dns', hostname: 'www.public.com', detail: 'AAAA' },
    { kind: 'connect', hostname: 'www.public.com', detail: 'TCP connect attempt to validated public address', address: '93.184.215.14', port: 80 },
  ]);
  const transition = snapshot.checks.find(check => check.check_id === 'web.https_redirect.v1')!;
  assert.equal(transition.status, 'NEEDS_ATTENTION', 'The observed final HTTP response retains its existing disposition');
  assert.deepEqual((transition.observation as { chain: unknown[] }).chain, [
    { url: 'http://public.com/', status: 301, address: '93.184.215.14' },
    { url: 'http://www.public.com/', status: 200, address: '93.184.215.14' },
  ]);
  assert.equal(tcp.filter(options => options.port === 80).length, 2);
});

test('conservative classifier rejects every special IPv4 class and mapped/non-global IPv6', () => {
  const blocked = ['0.0.0.0', '0.1.2.3', '10.1.2.3', '100.64.0.1', '100.127.255.255', '127.255.255.254', '169.254.169.254',
    '172.16.0.1', '172.31.255.254', '192.0.0.9', '192.0.2.1', '192.88.99.1', '192.168.1.1', '198.18.0.1', '198.19.255.254',
    '198.51.100.1', '203.0.113.1', '224.0.0.1', '239.255.255.255', '240.0.0.1', '255.255.255.255',
    '::', '::1', '::ffff:127.0.0.1', '::ffff:8.8.8.8', '::ffff:7f00:1', '64:ff9b::808:808', '64:ff9b:1::1', '100::1',
    'fc00::1', 'fd12::1', 'fe80::1', 'fe80::1%lo0', 'ff02::1', '2001::1', '2001:2::1', '2001:20::1', '2001:db8::1',
    '2002:7f00:1::1', '3fff::1', '3fff:fff::1', '4000::1', 'gibberish', '127.1', '2130706433', '0x7f000001'];
  for (const address of blocked) assert.equal(isPublicAddress(address), false, address);
  for (const address of ['1.1.1.1', '8.8.8.8', '93.184.215.14', '100.63.255.255', '100.128.0.1', '172.15.255.255', '172.32.0.1', '2001:4860:4860::8888', '2606:4700:4700::1111', '2a00:1450:4001:830::200e']) assert.equal(isPublicAddress(address), true, address);
});

test('mixed A/AAAA answers are rejected before any socket exists', async () => {
  const { transport, tcpOptions } = harness({ resolver: resolver({ resolve6: async () => ['::1'] }) });
  try { await assert.rejects(transport.certificate('public.com'), UnsafeTargetError); assert.equal(tcpOptions.length, 0); }
  finally { transport.close(); }
});

test('actual connector receives the validated literal address; logical Host and SNI survive', async () => {
  let aQueries = 0, aaaaQueries = 0;
  const { transport, tcpOptions, tlsOptions, sockets } = harness({ resolver: resolver({
    resolve4: async () => ++aQueries === 1 ? ['93.184.215.14'] : ['169.254.169.254'],
    resolve6: async () => { aaaaQueries++; return []; },
  }) });
  try {
    assert.equal((await transport.certificate('public.com')).authorized, true);
    assert.deepEqual(tcpOptions, [{ host: '93.184.215.14', family: 4, port: 443 }]);
    assert.equal(tlsOptions[0].servername, 'public.com');
    assert.equal(tlsOptions[0].rejectUnauthorized, true);
    assert.equal(tlsOptions[0].checkServerIdentity, checkServerIdentity);
    assert.equal(checkServerIdentity(tlsOptions[0].servername!, { subjectaltname: 'DNS:public.com' } as PeerCertificate), undefined);
    assert.ok(checkServerIdentity(tlsOptions[0].servername!, { subjectaltname: 'DNS:other.com' } as PeerCertificate) instanceof Error);
    assert.equal(tlsOptions[0].socket, sockets[0]);
    const result = await transport.request('https://public.com/', 1024);
    assert.equal(result.body, 'ok');
    assert.equal(result.address, '93.184.215.14');
    assert.match(sockets[0].requests[0], /^GET \/ HTTP\/1.1\r\n/im);
    assert.match(sockets[0].requests[0], /Host: public\.com\r\n/iu);
    assert.match(sockets[0].requests[0], /Accept-Encoding: identity\r\n/iu);
    assert.doesNotMatch(sockets[0].requests[0], /(?:Cookie|Authorization):/iu);
    await transport.request('https://public.com/.well-known/security.txt', 65536);
    assert.equal(tlsOptions.length, 1);
    assert.equal(tcpOptions.length, 1);
    assert.equal(transport.usage.normalTls, 1);
    assert.equal(aQueries, 1);
    assert.equal(aaaaQueries, 1);
    assert.equal(sockets[0].requests.length, 2);
  } finally { transport.close(); assert.ok(sockets.every(socket => socket.destroyed)); }
});

test('closed HTTPS connection cannot cause another normal TLS handshake', async () => {
  const { transport, sockets, tlsOptions } = harness();
  try {
    await transport.request('https://public.com/', 1024);
    sockets[0].destroy();
    await new Promise(resolve => setImmediate(resolve));
    await assert.rejects(transport.request('https://public.com/again', 1024), code('normal_tls_budget'));
    assert.equal(tlsOptions.length, 1);
  } finally { transport.close(); }
});

test('an inconsistent injected secureConnect still cannot authorize HTTP', async () => {
  const setup = harness({ connectTls: args => {
    const socket = args.socket as unknown as InertSocket;
    socket.authorized = false;
    socket.authorizationError = new Error('SELF_SIGNED_CERT_IN_CHAIN');
    queueMicrotask(() => socket.emit('secureConnect'));
    return socket as unknown as TLSSocket;
  } });
  try {
    assert.equal((await setup.transport.certificate('public.com')).authorized, false);
    await assert.rejects(setup.transport.request('https://public.com/', 1024), code('tls_invalid_certificate'));
    assert.equal(setup.sockets[0].requests.length, 0);
    assert.equal(setup.sockets[0].destroyed, true);
  } finally { setup.transport.close(); }
});

test('successful strict validation preserves available certificate metadata and expected interpretation', async () => {
  const { transport } = harness({ connectTls: args => {
    const socket = args.socket as unknown as InertSocket;
    const cert = socket.getPeerCertificate();
    socket.getPeerCertificate = () => ({ ...cert, valid_to: new Date(Date.now() + 60 * 86_400_000).toUTCString() });
    assert.equal(args.rejectUnauthorized, true);
    queueMicrotask(() => socket.emit('secureConnect'));
    return socket as unknown as TLSSocket;
  } });
  try {
    const observation = await transport.certificate('public.com');
    assert.equal(observation.validationFailure, undefined);
    assert.equal(observation.handshake, true);
    assert.equal(observation.authorized, true);
    assert.equal(Reflect.get(observation, 'hostnameMatch'), true);
    assert.deepEqual(Reflect.get(observation, 'issuer'), { CN: 'Fixture issuer' });
    assert.deepEqual(Reflect.get(observation, 'sans'), ['DNS:public.com']);
    assert.equal(Reflect.get(observation, 'fingerprint'), 'AB:CD');
    assert.equal(inspectCertificate(observation, new Date()).status, 'OBSERVED_EXPECTED');
  } finally { transport.close(); }
});

test('TCP refusal and elapsed TLS deadline remain uncollected uncertainty', async () => {
  for (const mode of ['refused', 'timeout']) {
    const setup = mode === 'refused' ? harness({ connectTcp: () => {
      const socket = new InertSocket();
      queueMicrotask(() => socket.emit('error', Object.assign(new Error('Connection refused'), { code: 'ECONNREFUSED' })));
      return socket as unknown as Socket;
    } }) : harness({ connectTls: args => args.socket as TLSSocket, timeouts: { tls: 5 } });
    const snapshot = await runSnapshot('public.com', { transport: setup.transport });
    const certificate = snapshot.checks.find(check => check.check_id === 'tls.certificate.v1')!;
    assert.equal(certificate.status, 'UNDETERMINED');
    assert.equal(certificate.collected, false);
    assert.equal(snapshot.usage.normalTls, 1);
  }
});

test('legacy certificate rejection never claims that the peer disabled the protocol', async () => {
  const { transport, sockets } = harness({ connectTls: args => {
    assert.equal(args.rejectUnauthorized, true);
    const socket = args.socket as unknown as InertSocket;
    queueMicrotask(() => socket.emit('error', Object.assign(new Error('self-signed'), { code: 'DEPTH_ZERO_SELF_SIGNED_CERT' })));
    return socket as unknown as TLSSocket;
  } });
  try {
    assert.equal((await transport.legacy('public.com', 'TLSv1')).outcome, 'undetermined');
    assert.equal((await transport.legacy('public.com', 'TLSv1.1')).outcome, 'undetermined');
    assert.equal(transport.usage.legacyTls, 2);
    assert.ok(sockets.every(socket => socket.destroyed && socket.requests.length === 0));
  } finally { transport.close(); }
});

test('HTTP reconnect revalidates DNS and blocks rebinding before creating another socket', async () => {
  let resolution = 0;
  const { transport, sockets, tcpOptions } = harness({ resolver: resolver({ resolve4: async () => ++resolution === 1 ? ['93.184.215.14'] : ['169.254.169.254'] }) });
  try {
    await transport.request('http://public.com/', 1024);
    sockets[0].destroy();
    await new Promise(resolve => setImmediate(resolve));
    await assert.rejects(transport.request('http://public.com/redirected', 1024), UnsafeTargetError);
    assert.equal(tcpOptions.length, 1);
    assert.equal(resolution, 2);
  } finally { transport.close(); }
});

test('unsafe redirect destinations and ports are rejected without connections', async () => {
  const { transport, tcpOptions } = harness();
  try {
    for (const url of ['http://127.0.0.1/', 'http://[::ffff:127.0.0.1]/', 'http://public.com:8080/', 'https://user:password@public.com/', 'ftp://public.com/']) await assert.rejects(transport.request(url, 1024), UnsafeTargetError);
    assert.equal(tcpOptions.length, 0);
  } finally { transport.close(); }
});

test('DNS absence differs from resolver failure; bounded response and query budgets fail closed', async () => {
  const absent = createObservationTransport({ resolver: resolver({ resolveTxt: async () => { throw Object.assign(new Error(), { code: 'ENODATA' }); } }) });
  const failing = createObservationTransport({ resolver: resolver({ resolve4: async () => { throw Object.assign(new Error(), { code: 'SERVFAIL' }); } }) });
  const oversized = createObservationTransport({ resolver: resolver({ resolve4: async () => Array.from({ length: 65 }, () => '8.8.8.8') }) });
  try {
    assert.deepEqual(await absent.query('TXT', 'public.com'), []);
    await assert.rejects(failing.publicTarget('public.com'), code('dns_error'));
    await assert.rejects(oversized.publicTarget('public.com'), code('dns_response_limit'));
    for (let index = 1; index < 20; index++) await absent.query('TXT', 'public.com');
    await assert.rejects(absent.query('TXT', 'public.com'), code('dns_budget'));
  } finally { absent.close(); failing.close(); oversized.close(); }
});

test('DNS timeout cancels resolver and never dials', async () => {
  let canceled = 0;
  const { transport, tcpOptions } = harness({ resolver: resolver({ resolve4: () => new Promise(() => {}), cancel() { canceled++; } }), timeouts: { dns: 10 } });
  try { await assert.rejects(transport.certificate('public.com'), code('dns_timeout')); assert.equal(tcpOptions.length, 0); assert.equal(canceled, 1); }
  finally { transport.close(); }
});

test('streamed raw body cap aborts socket and compressed/invalid UTF-8 is never valid text', async () => {
  const { transport, sockets } = harness();
  try {
    await transport.certificate('public.com');
    sockets[0].response = 'HTTP/1.1 200 OK\r\nContent-Length: 10\r\nConnection: keep-alive\r\n\r\n0123456789';
    await assert.rejects(transport.request('https://public.com/', 4), code('body_limit'));
    assert.equal(sockets[0].destroyed, true);
  } finally { transport.close(); }
  const compressed = harness();
  try {
    await compressed.transport.certificate('public.com');
    compressed.sockets[0].response = 'HTTP/1.1 200 OK\r\nContent-Length: 2\r\nContent-Encoding: gzip\r\nConnection: keep-alive\r\n\r\nok';
    const result = await compressed.transport.request('https://public.com/', 1024);
    assert.equal(result.bodyBytes, 2);
    assert.equal(result.utf8Valid, false);
  } finally { compressed.transport.close(); }
});

test('HTTP timeout destroys the active socket and the redirect/HTTP budgets are global', async () => {
  const { transport, sockets } = harness({ timeouts: { http: 15 } });
  try {
    await transport.certificate('public.com');
    sockets[0].shouldRespond = false;
    await assert.rejects(transport.request('https://public.com/', 1024), code('http_timeout'));
    assert.equal(sockets[0].destroyed, true);
    for (let index = 0; index < 3; index++) transport.followRedirect('public.com', 'www.public.com', 80);
    assert.throws(() => transport.followRedirect('public.com', 'www.public.com', 80), code('redirect_budget'));
  } finally { transport.close(); }
  const bounded = harness();
  try {
    for (let index = 0; index < 8; index++) await bounded.transport.request('http://public.com/', 1024);
    await assert.rejects(bounded.transport.request('http://public.com/', 1024), code('http_budget'));
    assert.equal(bounded.transport.usage.http, 8);
  } finally { bounded.transport.close(); }
});

test('legacy success, explicit peer protocol rejection, and local policy failure remain distinct', async () => {
  let attempt = 0;
  const { transport } = harness({ connectTls: args => {
    assert.equal(args.rejectUnauthorized, true);
    const socket = args.socket as unknown as InertSocket;
    queueMicrotask(() => socket.emit('error', Object.assign(new Error('fixture'), { code: ++attempt === 1 ? 'ERR_SSL_TLSV1_ALERT_PROTOCOL_VERSION' : 'ERR_SSL_NO_PROTOCOLS_AVAILABLE' })));
    return socket as unknown as TLSSocket;
  } });
  try {
    assert.equal((await transport.legacy('public.com', 'TLSv1')).outcome, 'peer_rejected');
    assert.equal((await transport.legacy('public.com', 'TLSv1.1')).outcome, 'undetermined');
    await assert.rejects(transport.legacy('public.com', 'TLSv1'), code('legacy_tls_budget'));
  } finally { transport.close(); }
});

test('HTTPS redirect to private DNS is rejected even when the normal TLS budget is already consumed', async () => {
  const { transport, tcpOptions } = harness({ resolver: resolver({ resolve4: async name => name === 'private.public.com' ? ['10.0.0.1'] : ['93.184.215.14'] }) });
  try {
    await transport.certificate('public.com');
    await assert.rejects(transport.request('https://private.public.com/', 1024), UnsafeTargetError);
    assert.equal(tcpOptions.length, 1);
  } finally { transport.close(); }
});

test('HTTP deadline prevents a late DNS answer from opening a new TCP socket', async () => {
  let release: ((addresses: string[]) => void) | undefined;
  const { transport, tcpOptions } = harness({ resolver: resolver({ resolve4: () => new Promise(resolve => { release = resolve; }) }), timeouts: { http: 10 } });
  try {
    await assert.rejects(transport.request('http://public.com/', 1024), code('http_timeout'));
    release!(['93.184.215.14']);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(tcpOptions.length, 0);
  } finally { transport.close(); }
});

test('TCP and TLS deadlines actively close their sockets', async () => {
  const pendingTcp = new InertSocket();
  const tcp = harness({ connectTcp: () => pendingTcp as unknown as Socket, timeouts: { tcp: 10 } });
  try { await assert.rejects(tcp.transport.certificate('public.com'), code('tcp_timeout')); assert.equal(pendingTcp.destroyed, true); }
  finally { tcp.transport.close(); }
  const tls = harness({ connectTls: args => args.socket as TLSSocket, timeouts: { tls: 10 } });
  try { await assert.rejects(tls.transport.certificate('public.com'), code('tls_timeout')); assert.equal(tls.sockets[0].destroyed, true); }
  finally { tls.transport.close(); }
});

test('whole-run deadline closes idle sockets and refuses subsequent work', async () => {
  const { transport, sockets } = harness({ timeouts: { run: 15 } });
  await transport.certificate('public.com');
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(sockets[0].destroyed, true);
  assert.throws(() => transport.checkpoint(), code('run_timeout'));
  await assert.rejects(transport.query('TXT', 'public.com'), code('run_timeout'));
  transport.close();
});

test('valid-chain certificates still cannot carry HTTP with a wrong hostname or expired dates', async () => {
  for (const mode of ['hostname', 'expiry']) {
    const { transport, sockets } = harness({ connectTls: args => {
      const socket = args.socket as unknown as InertSocket;
      const certificate = socket.getPeerCertificate();
      socket.getPeerCertificate = () => ({ ...certificate, ...(mode === 'hostname' ? { subjectaltname: 'DNS:other.com' } : { valid_to: new Date(Date.now() - 1000).toUTCString() }) });
      queueMicrotask(() => socket.emit('secureConnect'));
      return socket as unknown as TLSSocket;
    } });
    try {
      await transport.certificate('public.com');
      await assert.rejects(transport.request('https://public.com/', 1024), code('tls_invalid_certificate'));
      assert.equal(sockets[0].requests.length, 0);
      assert.equal(sockets[0].destroyed, true);
    } finally { transport.close(); }
  }
});

test('a negotiated legacy protocol is reported only after the requested handshake and then closed', async () => {
  const { transport, sockets, tcpOptions } = harness({ connectTls: args => {
    const socket = args.socket as unknown as InertSocket;
    assert.equal(args.minVersion, 'TLSv1.1');
    assert.equal(args.maxVersion, 'TLSv1.1');
    assert.equal(args.rejectUnauthorized, true);
    socket.getProtocol = () => 'TLSv1.1';
    queueMicrotask(() => socket.emit('secureConnect'));
    return socket as unknown as TLSSocket;
  } });
  try {
    assert.equal((await transport.legacy('public.com', 'TLSv1.1')).outcome, 'negotiated');
    assert.equal(sockets[0].destroyed, true);
    assert.equal(sockets[0].requests.length, 0);
    assert.deepEqual(tcpOptions, [{ host: '93.184.215.14', family: 4, port: 443 }]);
  } finally { transport.close(); }
});

for (const errorCode of ['CERT_HAS_EXPIRED', 'CERT_NOT_YET_VALID', 'ERR_TLS_CERT_ALTNAME_INVALID', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE']) {
  test('strict certificate rejection is a collected diagnostic with no permissive retry: ' + errorCode, async () => {
    const options: ConnectionOptions[] = [];
    const { transport, sockets, tcpOptions } = harness({ connectTls: args => {
      options.push(args);
      const socket = args.socket as unknown as InertSocket;
      socket.getPeerCertificate = () => { throw new Error('Rejected handshakes must not collect peer metadata'); };
      queueMicrotask(() => socket.emit('error', Object.assign(new Error('Synthetic validation failure'), { code: errorCode })));
      return socket as unknown as TLSSocket;
    } });
    try {
      const observation = await transport.certificate('public.com');
      assert.equal(observation.handshake, false);
      assert.equal(observation.authorized, false);
      assert.deepEqual(Reflect.get(observation, 'validationFailure'), { code: errorCode, message: 'Synthetic validation failure' });
      assert.equal(Reflect.get(observation, 'certificateMetadata'), null);
      for (const field of ['hostnameMatch', 'validFrom', 'validTo', 'issuer', 'sans', 'fingerprint']) assert.equal(Object.hasOwn(observation, field), false);
      assert.equal(inspectCertificate(observation, new Date()).status, 'NEEDS_ATTENTION');
      assert.deepEqual(await transport.certificate('public.com'), observation);
      await assert.rejects(transport.request('https://public.com/', 1024), code('tls_invalid_certificate'));
      assert.equal(options.length, 1);
      assert.equal(options[0].rejectUnauthorized, true);
      assert.equal(options[0].servername, 'public.com');
      assert.equal(options[0].socket, sockets[0]);
      assert.deepEqual(tcpOptions, [{ host: '93.184.215.14', family: 4, port: 443 }]);
      assert.equal(transport.usage.normalTls, 1);
      assert.equal(transport.usage.http, 0);
      assert.ok(sockets.every(socket => socket.destroyed && socket.requests.length === 0));
    } finally { transport.close(); }
  });
}

for (const errorCode of ['CERT_HAS_EXPIRED', 'ECONNREFUSED', 'ECONNRESET', 'ENETUNREACH', 'ETIMEDOUT', 'ERR_SSL_TLSV1_ALERT_PROTOCOL_VERSION', 'ERR_SSL_NO_PROTOCOLS_AVAILABLE', 'OUT_OF_MEM', 'unrecognized']) {
  test('runner separates concrete validation failure from connection/protocol uncertainty: ' + errorCode, async () => {
    const { transport } = harness({ connectTls: args => {
      const socket = args.socket as unknown as InertSocket;
      // Message text alone must never classify an arbitrary runtime/network error as a certificate finding.
      queueMicrotask(() => socket.emit('error', Object.assign(new Error('certificate has expired'), { code: errorCode })));
      return socket as unknown as TLSSocket;
    } });
    const snapshot = await runSnapshot('public.com', { transport });
    const certificate = snapshot.checks.find(check => check.check_id === 'tls.certificate.v1')!;
    const concrete = errorCode === 'CERT_HAS_EXPIRED';
    assert.equal(certificate.status, concrete ? 'NEEDS_ATTENTION' : 'UNDETERMINED');
    assert.equal(certificate.collected, concrete);
    assert.equal(snapshot.checks.length, 10);
    assert.equal(snapshot.usage.normalTls, 1);
    const report = externalExposureAdapter(snapshot);
    const finding = report.findings.find(item => item.title === certificate.title);
    assert.equal(!!finding, concrete);
    if (finding) assert.equal(finding.severity, null);
  });
}


test('selected headers retain security-relevant suffixes beneath the native header cap', async () => {
  const { transport, sockets } = harness();
  const hsts = `max-age=31536000; extension=${'a'.repeat(9000)}; max-age=0`;
  try {
    await transport.certificate('public.com');
    sockets[0].response = `HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: keep-alive\r\nStrict-Transport-Security: ${hsts}\r\n\r\nok`;
    assert.ok(Buffer.byteLength(sockets[0].response) < 16384);
    const observation = await transport.request('https://public.com/', 1024);
    assert.equal(inspectHsts(observation).status, 'NEEDS_ATTENTION', 'The duplicate max-age suffix must not be truncated into a positive observation');
    assert.equal(observation.headers['strict-transport-security'], hsts);
  } finally { transport.close(); }
});

test('headers exceeding the native 16 KiB cap fail without an interpretable response', async () => {
  const { transport, sockets } = harness();
  try {
    await transport.certificate('public.com');
    sockets[0].response = `HTTP/1.1 200 OK\r\nContent-Length: 2\r\nStrict-Transport-Security: max-age=31536000; extension=${'a'.repeat(17000)}\r\n\r\nok`;
    await assert.rejects(transport.request('https://public.com/', 1024), code('http_error'));
    assert.equal(sockets[0].destroyed, true);
  } finally { transport.close(); }
});
