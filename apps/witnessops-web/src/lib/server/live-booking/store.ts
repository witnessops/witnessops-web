import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { chmod, mkdir, open, readFile, readdir, rename, rm, stat, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { storeIsIsolated } from "./mode";
import type { BookingRecord, HoldRecord, SessionRecord, VerificationRecord } from "./records";

const LOCK_STALE_MS = 30 * 60 * 1000;

const ID_RE = /^[A-Za-z0-9_-]{8,80}$/;
type Folder = "sessions" | "holds" | "bookings" | "verifications" | "cancellations" | "abuse";

export class LiveBookingStoreError extends Error {
  constructor(message = "store_unavailable") {
    super(message);
    this.name = "LiveBookingStoreError";
  }
}

async function ensurePrivateDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700);
}

function pidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

export async function openStore(dir: string, env: NodeJS.ProcessEnv = process.env): Promise<string> {
  if (!storeIsIsolated(dir, env)) throw new LiveBookingStoreError("store_alias");
  try {
    const info = await stat(dir);
    if (!info.isDirectory()) throw new LiveBookingStoreError();
    await chmod(dir, 0o700);
    return dir;
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
  await ensurePrivateDir(path.dirname(file));
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

async function releaseOwnedLock(lockPath: string, token: string): Promise<void> {
  try {
    if (await readFile(lockPath, "utf8") === token) await rm(lockPath, { force: true });
  } catch {
    // A missing lock was already released. A different owner token is left in place.
  }
}

export async function withStoreLock<T>(dir: string, action: (store: string) => Promise<T>, now = Date.now()): Promise<T> {
  const store = await openStore(dir);
  const lockPath = path.join(store, "locks", "mutation.lock");
  const token = `${process.pid}:${randomUUID()}`;
  const deadline = Date.now() + 20_000;
  await ensurePrivateDir(path.dirname(lockPath));
  while (true) {
    try {
      await writeFile(lockPath, token, { encoding: "utf8", flag: "wx", mode: 0o600 });
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw new LiveBookingStoreError();
      const observed = await readFile(lockPath, "utf8").catch(() => "");
      const pid = Number(observed.split(":")[0]);
      const info = await stat(lockPath).catch(() => null);
      const stale = Boolean(info && Date.now() - info.mtimeMs > LOCK_STALE_MS);
      if (observed && stale && !pidAlive(pid)) {
        const again = await readFile(lockPath, "utf8").catch(() => "");
        if (again === observed) await rm(lockPath, { force: true });
        continue;
      }
      if (Date.now() >= deadline) throw new LiveBookingStoreError("busy");
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
  }
  const beat = setInterval(() => {
    void utimes(lockPath, new Date(), new Date()).catch(() => undefined);
  }, 1_000);
  beat.unref();
  try {
    await sweepExpired(store, now);
    return await action(store);
  } catch (error) {
    if (error instanceof LiveBookingStoreError) throw error;
    if (error instanceof Error && error.name === "LiveBookingFailure") throw error;
    throw new LiveBookingStoreError();
  } finally {
    clearInterval(beat);
    await releaseOwnedLock(lockPath, token);
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
export function deleteVerification(store: string, id: string): Promise<void> {
  return rm(recordPath(store, "verifications", id), { force: true });
}
export function deleteSession(store: string, tokenHash: string): Promise<void> {
  return rm(recordPath(store, "sessions", tokenHash), { force: true });
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

export async function sweepExpired(store: string, now: number): Promise<void> {
  const sessions = await listFolder<SessionRecord>(store, "sessions", (session) => session.expiresAt <= now);
  await Promise.all(sessions.map((session) => deleteSession(store, session.tokenHash)));
  const verifications = await listFolder<VerificationRecord>(store, "verifications", (verification) => verification.consumed || verification.expiresAt <= now);
  await Promise.all(verifications.map((verification) => deleteVerification(store, verification.id)));
  const holds = await listFolder<HoldRecord>(store, "holds", (hold) => hold.expiresAt <= now);
  await Promise.all(holds.map((hold) => rm(recordPath(store, "holds", hold.slotId), { force: true })));
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
  }, now);
}
