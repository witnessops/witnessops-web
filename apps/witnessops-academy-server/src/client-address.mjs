export function normalizeAddress(value) {
  let host = String(value || '').trim().replace(/^\[|\]$/g, '');
  const mapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) host = mapped[1];
  return host.toLowerCase();
}

// X-Forwarded-For is used only when the socket peer is an explicitly trusted proxy.
export function clientAddress({ remoteAddress, forwardedFor }, trustedProxies) {
  const peer = normalizeAddress(remoteAddress);
  const trusted = new Set([...trustedProxies].map((item) => normalizeAddress(item)).filter(Boolean));
  if (!trusted.has(peer)) return peer;
  const first = String(forwardedFor || '').split(',')[0].trim();
  return normalizeAddress(first) || peer;
}
