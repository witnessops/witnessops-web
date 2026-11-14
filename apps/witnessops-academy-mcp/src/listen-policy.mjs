const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

// This process speaks plain HTTP. Unspecified addresses such as 0.0.0.0 and ::
// are refused unless MCP_ALLOW_PUBLIC_BIND=1. A https resource URL is the TLS
// proxy's name, not permission to listen on every interface.
export function assertHttpBindIsLoopback(host, allowPublic = false) {
  const normalized = String(host).replace(/^\[|\]$/g, '').toLowerCase();
  if (LOOPBACK_HOSTS.has(normalized)) return;
  if (allowPublic) return;
  throw new Error('MCP_HOST must be a loopback address unless MCP_ALLOW_PUBLIC_BIND=1');
}
