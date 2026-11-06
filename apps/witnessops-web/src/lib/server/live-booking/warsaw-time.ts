import { HORIZON_DAYS, LIVE_BOOKING_TIME_ZONE, MIN_LEAD_MS, SLOT_HOURS, SLOT_MINUTES } from "./constants";

export type WarsawSlot = { id: string; start: string; end: string };

type Wall = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: LIVE_BOOKING_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function wall(instant: number): Wall {
  const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function same(left: Wall, year: number, month: number, day: number, hour: number, minute: number): boolean {
  return left.year === year && left.month === month && left.day === day && left.hour === hour && left.minute === minute && left.second === 0;
}

/** UTC instant for a Europe/Warsaw wall time. Null when the wall time is skipped or repeated by DST. */
export function warsawWallToUtc(year: number, month: number, day: number, hour: number, minute: number): string | null {
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstOffset = Date.UTC(wall(desiredUtc).year, wall(desiredUtc).month - 1, wall(desiredUtc).day, wall(desiredUtc).hour, wall(desiredUtc).minute, wall(desiredUtc).second) - desiredUtc;
  let instant = desiredUtc - firstOffset;
  const secondOffset = Date.UTC(wall(instant).year, wall(instant).month - 1, wall(instant).day, wall(instant).hour, wall(instant).minute, wall(instant).second) - instant;
  instant = desiredUtc - secondOffset;
  if (!same(wall(instant), year, month, day, hour, minute)) return null;
  for (const neighbor of [instant - 3_600_000, instant + 3_600_000]) {
    if (neighbor !== instant && same(wall(neighbor), year, month, day, hour, minute)) return null;
  }
  return new Date(instant).toISOString();
}

export function formatWarsawOffset(isoUtc: string): string {
  const instant = Date.parse(isoUtc);
  const local = wall(instant);
  const localUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
  const offsetMinutes = Math.round((localUtc - instant) / 60_000);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const minutes = String(abs % 60).padStart(2, "0");
  const y = String(local.year).padStart(4, "0");
  const m = String(local.month).padStart(2, "0");
  const d = String(local.day).padStart(2, "0");
  const hh = String(local.hour).padStart(2, "0");
  const mm = String(local.minute).padStart(2, "0");
  const ss = String(local.second).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}${sign}${hours}:${minutes}`;
}

export function slotIdFor(year: number, month: number, day: number, hour: number, minute: number): string {
  const p = (value: number, width = 2) => String(value).padStart(width, "0");
  return `waw-${p(year, 4)}${p(month)}${p(day)}-${p(hour)}${p(minute)}`;
}

export function warsawSlots(now: number): WarsawSlot[] {
  const today = wall(now);
  const slots: WarsawSlot[] = [];
  for (let offset = 0; offset < HORIZON_DAYS; offset += 1) {
    const cursor = new Date(Date.UTC(today.year, today.month - 1, today.day + offset));
    const weekday = cursor.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    for (const hour of SLOT_HOURS) {
      const start = warsawWallToUtc(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate(), hour, 0);
      if (!start) continue;
      const startMs = Date.parse(start);
      if (startMs < now + MIN_LEAD_MS) continue;
      slots.push({
        id: slotIdFor(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate(), hour, 0),
        start,
        end: new Date(startMs + SLOT_MINUTES * 60_000).toISOString(),
      });
    }
  }
  return slots;
}

export function overlaps(startIso: string, endIso: string, busyStart: string, busyEnd: string): boolean {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  const busyFrom = Date.parse(busyStart);
  const busyTo = Date.parse(busyEnd);
  if ([start, end, busyFrom, busyTo].some(Number.isNaN)) return true;
  return busyFrom < end && busyTo > start;
}
