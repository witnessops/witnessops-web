import { aasrStagingBuildBindings, isAasrStagingBuild, stagingRuntimeReady } from './config';

export function aasrStagingRouteAllowed(path: string, method: string): boolean {
  // AuthKit and native logout use same-origin POST server actions on page URLs.
  if (['/', '/aasr-fixture', '/aasr-fixture/'].includes(path)) return ['GET', 'HEAD', 'POST'].includes(method);
  if (['/login', '/callback'].includes(path)) return ['GET', 'HEAD'].includes(method);
  if (path === '/api/aasr-fixture') return ['GET', 'POST'].includes(method);
  return ['GET', 'HEAD'].includes(method) && (path.startsWith('/_next/static/') || path === '/favicon.ico');
}

/** Runs before any ordinary app/public-report bypass in middleware. */
export function aasrStagingRequestBoundary(request: Request): Response | undefined {
  if (!isAasrStagingBuild()) return;
  const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' };
  const url = new URL(request.url);
  if (!aasrStagingRouteAllowed(url.pathname, request.method)) return new Response('Not found.', { status: 404, headers });
  if (!stagingRuntimeReady()) return new Response('Staging configuration is unavailable.', { status: 503, headers });
  const { origin } = aasrStagingBuildBindings(), host = new URL(origin).host;
  if (request.headers.get('host') !== host || request.headers.get('x-forwarded-host') !== host ||
      request.headers.get('x-forwarded-proto') !== 'https' || request.headers.has('forwarded') ||
      ![origin, 'https://0.0.0.0:3020'].includes(url.origin)) return new Response('Use the configured staging origin.', { status: 403, headers });
  // Callback GET is an intentional cross-site navigation with code/state. The
  // SDK owns its PKCE/CSRF check; only mutations use the native Origin rule here.
  if (!['GET', 'HEAD'].includes(request.method) && (request.headers.get('origin') !== origin ||
      ![null, 'same-origin', 'none'].includes(request.headers.get('sec-fetch-site')))) {
    return new Response('Use the app origin.', { status: 403, headers });
  }
}
