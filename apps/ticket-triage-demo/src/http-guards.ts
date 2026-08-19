import type { IncomingHttpHeaders } from "node:http";

export function hasAllowedLoopbackAuthority(args: {
  headers: IncomingHttpHeaders;
  port: number;
}): boolean {
  const expectedAuthority = `127.0.0.1:${args.port}`;
  const host = args.headers.host?.trim().toLowerCase();
  if (host !== expectedAuthority) {
    return false;
  }

  const origin = args.headers.origin?.trim().toLowerCase();
  return origin === undefined || origin === `http://${expectedAuthority}`;
}

export function parseLoopbackRequestTarget(args: {
  requestTarget: string | undefined;
  port: number;
}): URL | null {
  const raw = args.requestTarget ?? "/";
  if (
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(raw)
  ) {
    return null;
  }

  const origin = `http://127.0.0.1:${args.port}`;
  try {
    const parsed = new URL(raw, origin);
    return parsed.origin === origin ? parsed : null;
  } catch {
    return null;
  }
}
