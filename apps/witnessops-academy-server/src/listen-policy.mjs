const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

export function assertHttpBindIsLoopback(host, origin) {
  const originUrl = new URL(origin);
  if (originUrl.protocol !== 'http:') return;
  const normalized = String(host).replace(/^\[|\]$/g, '');
  if (LOOPBACK_HOSTS.has(normalized)) return;
  throw new Error('ACADEMY_APP_HOST must be loopback when ACADEMY_PUBLIC_ORIGIN is http');
}
