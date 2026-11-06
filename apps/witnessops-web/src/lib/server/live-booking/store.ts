import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, open, readFile, readdir, realpath, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { withFilesystemLock } from "../filesystem-lock";
import type { BookingRecord, HoldRecord, SessionRecord, VerificationRecord } from "./records";

const ID_RE = /^[A-Za-z0-9_-]{8,80}$/;
type Folder = "sessions" | "holds" | "bookings" | "verifications" | "cancellations" | "abuse";

export class LiveBookingStoreError extends Error {
  constructor(message = "store_unavailable") {
    super(message);
    this.name = "LiveBookingStoreError";
  }
}

export async function openStore(dir: string): Promise<string> {
  const resolved = path.resolve(dir);
  if (!path.isAbsolute(dir) || resolved !== dir.replace(/\/+$/, "") && resolved !== dir) {
    throw new LiveBookingStoreError();
  }
  try {
    const real = await realpath(resolved);
    const info = await stat(real);
    if (!info.isDirectory()) throw new LiveBookingStoreError();
    return real;
  } catch (error) {
    if (error instanceof LiveBookingStoreError) throw error;
    throw new LiveBookingStoreError();
  }
}

function recordPath(store: string, folder: Folder, id: string): string {
  if (!ID_RE.test(id)) throw new LiveBookingStoreError("invalid_id");
  const base = path.resolve(store, folder);
  const name = `${path.basename(id)}.json`;
  const resolved = path.resolve(base, name);
  if (resolved !== path.join(base, name) || !resolved.startsWith(base + path.sep)) {
    throw new LiveBookingStoreError("invalid_id");
  }
  return resolved;
}

async function readRecord<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new LiveBookingStoreError();
  }
}

async function writeRecord(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  const handle = await open(temp, "w", 0o600);
  try {
    await handle.writeFile(JSON.stringify(value));
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temp, file);
  const directory = await open(path.dirname(file), "r");
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}

export async function withStoreLock<T>(dir: string, action: (store: string) => Promise<T>): Promise<T> {
  const store = await openStore(dir);
  try {
    return await withFilesystemLock(
      {
        lockPath: path.join(store, "locks", "mutation.lock"),
        description: "live booking store",
        waitMs: 15,
        timeoutMs: 20_000,
        staleMs: 60_000,
      },
      () => action(store),
    );
  } catch (error) {
    if (error instanceof LiveBookingStoreError) throw error;
    if (error instanceof Error && error.name === "LiveBookingFailure") throw error;
    if (error instanceof Error && error.message.startsWith("Timed out waiting")) {
      throw new LiveBookingStoreError("busy");
    }
    throw new LiveBookingStoreError();
  }
}

export function readSession(store: string, tokenHash: string): Promise<SessionRecord | null> {
  return readRecord(recordPath(store, "sessions", tokenHash));
}
export function writeSession(store: string, record: SessionRecord): Promise<void> {
  return writeRecord(recordPath(store, "sessions", record.tokenHash), record);
}
export function readHold(store: string, slotId: string): Promise<HoldRecord | null> {
  return readRecord(recordPath(store, "holds", slotId));
}
export function writeHold(store: string, record: HoldRecord): Promise<void> {
  return writeRecord(recordPath(store, "holds", record.slotId), record);
}
export function deleteHold(store: string, slotId: string): Promise<void> {
  return rm(recordPath(store, "holds", slotId), { force: true });
}
export function readBooking(store: string, id: string): Promise<BookingRecord | null> {
  return readRecord(recordPath(store, "bookings", id));
}
export function writeBooking(store: string, record: BookingRecord): Promise<void> {
  return writeRecord(recordPath(store, "bookings", record.id), record);
}
export function readVerification(store: string, id: string): Promise<VerificationRecord | null> {
  return readRecord(recordPath(store, "verifications", id));
}
export function writeVerification(store: string, record: VerificationRecord): Promise<void> {
  return writeRecord(recordPath(store, "verifications", record.id), record);
}
export function readCancellation(store: string, cancelHash: string): Promise<{ bookingId: string } | null> {
  return readRecord(recordPath(store, "cancellations", cancelHash));
}
export function writeCancellation(store: string, cancelHash: string, bookingId: string): Promise<void> {
  return writeRecord(recordPath(store, "cancellations", cancelHash), { bookingId });
}

export async function listActiveHolds(store: string, now: number): Promise<HoldRecord[]> {
  return listFolder<HoldRecord>(store, "holds", (hold) => hold.expiresAt > now);
}

export async function listBookings(store: string): Promise<BookingRecord[]> {
  return listFolder<BookingRecord>(store, "bookings", () => true);
}

export async function countOpenSessions(store: string, now: number): Promise<number> {
  const sessions = await listFolder<SessionRecord>(store, "sessions", (session) => session.expiresAt > now);
  return sessions.length;
}

async function listFolder<T>(store: string, folder: Folder, keep: (value: T) => boolean): Promise<T[]> {
  const base = path.join(store, folder);
  let names: string[];
  try {
    names = await readdir(base);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new LiveBookingStoreError();
  }
  const records: T[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const record = await readRecord<T>(path.join(base, name));
    if (record && keep(record)) records.push(record);
  }
  return records;
}

export async function consumeBudget(store: string, key: string, limit: number, windowMs: number, now: number): Promise<boolean> {
  const file = recordPath(store, "abuse", key);
  const current = await readRecord<{ count: number; windowStart: number }>(file);
  if (!current || now - current.windowStart >= windowMs) {
    await writeRecord(file, { count: 1, windowStart: now });
    return true;
  }
  if (current.count >= limit) return false;
  await writeRecord(file, { count: current.count + 1, windowStart: current.windowStart });
  return true;
}

export function holdIsActive(hold: HoldRecord | null, now: number): hold is HoldRecord {
  return Boolean(hold && hold.expiresAt > now);
}

/** Test and concurrency helper. One active hold per slot, serialized by the store lock. */
export async function claimSlotRace(dir: string, slotId: string, owner: string, now: number): Promise<"held" | "taken"> {
  return withStoreLock(dir, async (store) => {
    const existing = await readHold(store, slotId);
    if (holdIsActive(existing, now) && existing.sessionHash !== owner) return "taken";
    await writeHold(store, {
      id: `hld${owner.slice(0, 32)}`,
      slotId,
      start: "2026-07-15T07:00:00.000Z",
      end: "2026-07-15T07:20:00.000Z",
      sessionHash: owner,
      draft: { topic: "Synthetic topic", stage: "planned", name: "Synthetic", email: "synthetic@example.test", timezone: "Europe/Warsaw" },
      expiresAt: now + 60_000,
    });
    return "held";
  });
}
