export function getConfiguredEnvPath(
  envNames: readonly string[],
  purpose: string,
): string | null {
  for (const envName of envNames) {
    const value = process.env[envName];
    if (value) return value;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `${purpose} requires ${envNames.join(" or ")} in production.`,
    );
  }

  return null;
}
