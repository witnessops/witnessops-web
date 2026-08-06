const DEFAULT_ADMIN_RETURN_PATH = "/admin";
const ADMIN_RETURN_BASE = new URL("https://admin-return.invalid");
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

function isAdminDestination(url: URL): boolean {
  return (
    url.origin === ADMIN_RETURN_BASE.origin &&
    (url.pathname === DEFAULT_ADMIN_RETURN_PATH ||
      url.pathname.startsWith(`${DEFAULT_ADMIN_RETURN_PATH}/`))
  );
}

export function sanitizeAdminReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 1_024 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    CONTROL_CHARACTER_PATTERN.test(value)
  ) {
    return DEFAULT_ADMIN_RETURN_PATH;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return DEFAULT_ADMIN_RETURN_PATH;
  }
  if (
    decoded.startsWith("//") ||
    decoded.includes("\\") ||
    CONTROL_CHARACTER_PATTERN.test(decoded)
  ) {
    return DEFAULT_ADMIN_RETURN_PATH;
  }

  try {
    const parsed = new URL(value, ADMIN_RETURN_BASE);
    const decodedParsed = new URL(decoded, ADMIN_RETURN_BASE);
    if (!isAdminDestination(parsed) || !isAdminDestination(decodedParsed)) {
      return DEFAULT_ADMIN_RETURN_PATH;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_ADMIN_RETURN_PATH;
  }
}
