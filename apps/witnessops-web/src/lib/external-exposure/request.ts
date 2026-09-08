import { checkRateLimit, scheduleRateLimitCleanup } from '@witnessops/config/rate-limit';
import { readBoundedRequestText, RequestBodyTooLargeError } from '../server/bounded-request-body';
import { findDuplicateJsonObjectKey } from '../json-ambiguity';
import { externalExposureAdapter, validateExternalSnapshot } from './adapter';
import { normalizeExternalHostname } from './input';
import type { ExternalSnapshotV1 } from './contracts';

const BODY_LIMIT = 1024;
const PROCESS_STATE = Symbol.for('witnessops.external-exposure.request-state.v1');
type ProcessState = { active: number };
const processStore = globalThis as typeof globalThis & { [PROCESS_STATE]?: ProcessState };
const processState = processStore[PROCESS_STATE] ??= { active: 0 };
scheduleRateLimitCleanup(60_000);

class BodyDeadlineError extends Error {}
const responseHeaders = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' };
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const PUBLIC_ORIGINS = new Set(['https://witnessops.com', 'https://www.witnessops.com']);

function sameOrigin(request: Request): boolean {
  const rawOrigin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!rawOrigin || !host) return false;
  try {
    const origin = new URL(rawOrigin), internal = new URL(request.url);
    // Next may build Request.url with its internal bind hostname. Host is the
    // browser-facing authority; forwarded hosts never select an allowed origin.
    if (origin.origin !== rawOrigin || origin.host !== host.toLowerCase()) return false;
    if (PUBLIC_ORIGINS.has(origin.origin)) return true;
    return origin.protocol === 'http:' && internal.protocol === 'http:'
      && LOOPBACK_HOSTS.has(origin.hostname) && LOOPBACK_HOSTS.has(internal.hostname)
      && origin.port === internal.port;
  } catch { return false; }
}

function failure(error: string, status: number, retryAfter?: number): Response {
  return Response.json({ error }, { status, headers: { ...responseHeaders, ...(retryAfter === undefined ? {} : { 'Retry-After': String(retryAfter) }) } });
}

/** Keep the shared size/UTF-8 reader, but never wait for an uncooperative body's cancel hook. */
export async function readExternalRequestBody(request: Request, deadlineMs = 5000): Promise<string> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  let finished = false;
  let streamController: ReadableStreamDefaultController<Uint8Array>;
  function cancelSource() { void reader.cancel().catch(() => {}); }
  const stream = new ReadableStream<Uint8Array>({
    start(controller) { streamController = controller; },
    async pull(controller) {
      try {
        const item = await reader.read();
        if (finished) return;
        if (item.done) controller.close(); else controller.enqueue(item.value);
      } catch (error) { if (!finished) controller.error(error); }
    },
    cancel() { finished = true; cancelSource(); },
  }, { highWaterMark: 0 });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let onAbort: () => void = () => {};
  const deadline = new Promise<never>((_, reject) => {
    onAbort = () => {
      finished = true;
      const error = new BodyDeadlineError('Request body did not complete.');
      streamController.error(error);
      cancelSource();
      reject(error);
    };
    timeout = setTimeout(onAbort, deadlineMs);
    request.signal.addEventListener('abort', onAbort, { once: true });
    if (request.signal.aborted) onAbort();
  });
  try {
    const boundedRequest = new Request(request.url, {
      method: 'POST', headers: request.headers, body: stream, duplex: 'half',
    } as RequestInit);
    return await Promise.race([readBoundedRequestText(boundedRequest, BODY_LIMIT), deadline]);
  } finally {
    finished = true;
    clearTimeout(timeout);
    request.signal.removeEventListener('abort', onAbort);
    cancelSource();
  }
}

export function createExternalExposureHandler(
  run: (hostname: string) => Promise<ExternalSnapshotV1>,
  options: { namespace?: string; bodyDeadlineMs?: number } = {},
) {
  // The production caller uses a fixed namespace and key, never a supplied client/IP header.
  const namespace = options.namespace ?? 'external-exposure-v1';
  return async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== 'POST') return failure('Use POST with a JSON hostname.', 405);
    if (!sameOrigin(request) || !['same-origin', 'none', null].includes(request.headers.get('sec-fetch-site'))) return failure('This request must come from the same origin.', 403);
    if (url.search || !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? '') || (request.headers.has('content-encoding') && request.headers.get('content-encoding') !== 'identity')) return failure('Submit one hostname as a JSON request body.', 400);
    if (processState.active >= 2) return failure('Two checks are already running. Please try again shortly.', 429, 5);
    const allowance = checkRateLimit(`${namespace}:global`, 'all-runs', { limit: 10, windowMs: 60_000 });
    if (!allowance.allowed) return failure('The snapshot service has reached its short-term request limit. Try again in a minute.', 429, allowance.retryAfterSeconds);
    processState.active += 1;
    try {
      let target: string;
      try {
        const source = await readExternalRequestBody(request, options.bodyDeadlineMs);
        if (findDuplicateJsonObjectKey(source) !== null) throw new Error('Duplicate field.');
        const input: unknown = JSON.parse(source);
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 || !Object.hasOwn(input, 'hostname')) throw new Error('Invalid fields.');
        const hostname = (input as { hostname: unknown }).hostname;
        if (typeof hostname !== 'string') throw new Error('Invalid hostname.');
        target = normalizeExternalHostname(hostname);
      } catch (error) {
        if (error instanceof BodyDeadlineError) return failure('The request body timed out. Please retry.', 408);
        if (error instanceof RequestBodyTooLargeError) return failure('The request body must not exceed 1 KiB.', 413);
        return failure('Enter one public hostname, without a URL, path, port, IP address or additional fields.', 400);
      }
      const hostAllowance = checkRateLimit(`${namespace}:hostname`, target, { limit: 1, windowMs: 60_000 });
      if (!hostAllowance.allowed) return failure('This hostname was checked recently. Wait one minute before retrying.', 429, hostAllowance.retryAfterSeconds);
      try {
        const snapshot = validateExternalSnapshot(await run(target));
        if (snapshot.target !== target) throw new Error('Snapshot target does not match the request.');
        const model = externalExposureAdapter(snapshot);
        return Response.json({ snapshot, model }, { headers: responseHeaders });
      } catch {
        return failure('A bounded snapshot could not be completed for this hostname. No report was generated.', 422);
      }
    } finally {
      processState.active -= 1;
    }
  };
}
