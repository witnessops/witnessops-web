export function logUnexpectedRouteError(
  operation: string,
  error: unknown,
): void {
  console.error(operation, {
    errorType: error instanceof Error ? error.name : "unknown",
  });
}
