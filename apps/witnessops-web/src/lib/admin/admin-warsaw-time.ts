const WARSAW = "Europe/Warsaw";

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: WARSAW,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export interface WarsawParts {
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
}

export function warsawParts(iso: string): WarsawParts | null {
  const date = new Date(iso);
  if (!iso.trim() || Number.isNaN(date.getTime())) return null;
  const parts = new Map(dateTimeFormat.formatToParts(date).map((part) => [part.type, part.value]));
  const day = parts.get("day");
  const month = parts.get("month");
  const year = parts.get("year");
  const hour = parts.get("hour");
  const minute = parts.get("minute");
  if (!day || !month || !year || !hour || !minute) return null;
  return { day, month, year, hour, minute };
}

/** Europe/Warsaw, "24 Oct 2026, 20:12". */
export function formatWarsawDateTime(iso: string): string | null {
  const parts = warsawParts(iso);
  if (!parts) return null;
  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute}`;
}

/** Europe/Warsaw, "20:12". */
export function formatWarsawClock(iso: string): string | null {
  const parts = warsawParts(iso);
  if (!parts) return null;
  return `${parts.hour}:${parts.minute}`;
}

/** Europe/Warsaw, "24 Oct". */
export function formatWarsawDayMonth(iso: string): string | null {
  const parts = warsawParts(iso);
  if (!parts) return null;
  return `${parts.day} ${parts.month}`;
}

export function isSameWarsawDay(iso: string, now: Date): boolean {
  const left = warsawParts(iso);
  const right = warsawParts(now.toISOString());
  if (!left || !right) return false;
  return left.day === right.day && left.month === right.month && left.year === right.year;
}

export function recordedInstant(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
