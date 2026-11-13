export function isFitCallTimeZone(timeZone: string): boolean {
  try {
    const resolvedZone = new Intl.DateTimeFormat("en", { timeZone })
      .resolvedOptions().timeZone;
    // Intl also accepts numeric offsets; this form requests a named zone.
    return !/^[+-]/.test(resolvedZone);
  } catch (error) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}
