/** Format the timestamp shown to Polish buyers; the server still controls expiry. */
export function formatPolishVerificationExpiry(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/i.exec(value);
  if (!parts) return null;
  const [, year, month, day, hours, minutes, seconds] = parts;
  const calendar = new Date(0);
  calendar.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  if (
    calendar.getUTCFullYear() !== Number(year) ||
    calendar.getUTCMonth() !== Number(month) - 1 ||
    calendar.getUTCDate() !== Number(day) ||
    Number(hours) > 23 || Number(minutes) > 59 || Number(seconds) > 59
  ) return null;
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) return null;
  try {
    const date = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeZone: "Europe/Warsaw" }).format(instant);
    const time = new Intl.DateTimeFormat("pl-PL", {
      timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
      ...(instant.getUTCMilliseconds() ? { fractionalSecondDigits: 3 as const } : {}),
    }).format(instant);
    const offset = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", timeZoneName: "longOffset" })
      .formatToParts(instant).find((part) => part.type === "timeZoneName")?.value;
    if (!offset || !/^GMT[+-]\d{2}:\d{2}$/.test(offset)) return null;
    return `${date}, ${time} (czas w Polsce, ${offset.replace("GMT", "UTC")})`;
  } catch {
    return null;
  }
}
