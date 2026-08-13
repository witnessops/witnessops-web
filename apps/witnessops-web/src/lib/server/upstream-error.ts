const MAX_DIAGNOSTIC_CHARS = 512;
const MAX_DIAGNOSTIC_BYTES = 2048;

export class UpstreamServiceError extends Error {
  readonly code: string;
  readonly status: number | null;

  constructor(code: string, publicMessage: string, status: number | null = null) {
    super(publicMessage);
    this.name = "UpstreamServiceError";
    this.code = code;
    this.status = status;
  }
}

function redactDiagnostic(value: string): string {
  return value
    .slice(0, MAX_DIAGNOSTIC_CHARS)
    .replace(/https?:\/\/[^\s"']+/gi, "[url]")
    .replace(
      /\b(password|passwd|secret|token|api[-_ ]?key|authorization|cookie)\b\s*[:=]\s*[^\s,;]+/gi,
      "$1=[redacted]",
    )
    .replace(/[\r\n\t]+/g, " ")
    .trim();
}

export async function logUpstreamFailure(args: {
  service: string;
  operation: string;
  response: Response;
}): Promise<void> {
  let detail = "";
  try {
    const reader = args.response.body?.getReader();
    if (reader) {
      const decoder = new TextDecoder();
      let bytesRead = 0;
      while (bytesRead < MAX_DIAGNOSTIC_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        const remaining = MAX_DIAGNOSTIC_BYTES - bytesRead;
        const chunk = value.subarray(0, remaining);
        bytesRead += chunk.byteLength;
        detail += decoder.decode(chunk, { stream: bytesRead < MAX_DIAGNOSTIC_BYTES });
        if (chunk.byteLength < value.byteLength) break;
      }
      await reader.cancel().catch(() => undefined);
    }
  } catch {
    detail = "unreadable response body";
  }
  console.error("Upstream service request failed", {
    service: args.service,
    operation: args.operation,
    status: args.response.status,
    detail: redactDiagnostic(detail),
  });
}
