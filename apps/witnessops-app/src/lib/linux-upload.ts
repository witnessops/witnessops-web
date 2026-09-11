import 'server-only';
import { LIMITS } from '../../../witnessops-web/src/lib/proofpack/primitives.mjs';
import { ApiError, requireId } from './errors';

/** Count actual streamed bytes before multipart parsing, irrespective of Content-Length. */
export async function linuxUpload(request: Request) {
  if (!/^multipart\/form-data;\s*boundary=/i.test(request.headers.get('content-type') ?? '') || request.headers.has('content-encoding') || !request.body) throw new ApiError(400, 'Submit ZIP and detached signature files.');
  const limit = LIMITS.proofpack + LIMITS.signature + 16 * 1024;
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  const timer = setTimeout(() => { void reader.cancel(); }, 30_000);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new ApiError(413, 'Import exceeds the bounded upload size.');
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { 'content-type': request.headers.get('content-type')! } }).formData();
    if ([...form.keys()].sort().join() !== 'assetId,signature,zip') throw new ApiError(400, 'Submit only assetId, ZIP and detached signature. The server selects trust.');
    const zip = form.get('zip'), signature = form.get('signature'), assetId = requireId(form.get('assetId'));
    if (!(zip instanceof File) || !(signature instanceof File) || !zip.size || !signature.size || zip.size > LIMITS.proofpack || signature.size > LIMITS.signature) throw new ApiError(413, 'Invalid ZIP or signature size.');
    return { assetId, zipName: zip.name, zip: new Uint8Array(await zip.arrayBuffer()), signature: new Uint8Array(await signature.arrayBuffer()) };
  } finally { clearTimeout(timer); await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
