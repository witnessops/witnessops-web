import net from 'node:net';

export function normalizeAddress(value) {
  let host = String(value || '').trim().replace(/^\[|\]$/g, '');
  const mapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) host = mapped[1];
  return host.toLowerCase();
}

// X-Forwarded-For is used only when the socket peer is an explicitly trusted proxy.
// Hops are read from the right. Trusted proxies are skipped. The first other hop
// is the client when it is a valid IP; otherwise the socket address is used.
export function clientAddress({ remoteAddress, forwardedFor }, trustedProxies) {
  const peer = normalizeAddress(remoteAddress);
  const trusted = new Set([...trustedProxies].map((item) => normalizeAddress(item)).filter(Boolean));
  if (!trusted.has(peer)) return peer;
  const hops = String(forwardedFor || '').split(',').map((item) => item.trim()).filter(Boolean);
  for (let index = hops.length - 1; index >= 0; index -= 1) {
    const hop = normalizeAddress(hops[index]);
    if (!hop || trusted.has(hop)) continue;
    if (net.isIP(hop) === 0) return peer;
    return hop;
  }
  return peer;
}
