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

export async function logUpstreamFailure(args: {
  service: string;
  operation: string;
  response: Response;
}): Promise<void> {
  await args.response.body?.cancel().catch(() => undefined);
  console.error("Upstream service request failed", {
    service: args.service,
    operation: args.operation,
    status: args.response.status,
  });
}
