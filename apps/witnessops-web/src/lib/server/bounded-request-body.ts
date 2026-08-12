export class RequestBodyTooLargeError extends Error {
  readonly status = 413;

  constructor(readonly limitBytes: number) {
    super(`Request body exceeds the ${limitBytes}-byte limit.`);
    this.name = "RequestBodyTooLargeError";
  }
}

export const PUBLIC_JSON_BODY_LIMIT_BYTES = 64 * 1024;

export async function readBoundedRequestText(
  request: Request,
  limitBytes: number,
): Promise<string> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > limitBytes) {
    throw new RequestBodyTooLargeError(limitBytes);
  }
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limitBytes) {
      await reader.cancel();
      throw new RequestBodyTooLargeError(limitBytes);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function readBoundedRequestJson(
  request: Request,
  limitBytes: number,
): Promise<unknown> {
  return JSON.parse(await readBoundedRequestText(request, limitBytes));
}
