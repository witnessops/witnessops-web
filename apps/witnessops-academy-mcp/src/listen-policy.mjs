const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

export function assertHttpBindIsLoopback(host, resourceUrl) {
  const url = new URL(resourceUrl);
  if (url.protocol !== 'http:') return;
  const normalized = String(host).replace(/^\[|\]$/g, '');
  if (LOOPBACK_HOSTS.has(normalized)) return;
  throw new Error('MCP_HOST must be loopback when MCP_RESOURCE_URL is http');
}
