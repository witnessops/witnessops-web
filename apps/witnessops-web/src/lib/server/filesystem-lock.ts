import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

interface FileLockOptions {
  lockPath: string;
  description: string;
  waitMs?: number;
  timeoutMs?: number;
  staleMs?: number;
}

const DEFAULT_WAIT_MS = 25;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_STALE_MS = 10 * 60_000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function removeOwnedLock(lockPath: string, lockToken: string): Promise<void> {
  try {
    if ((await readFile(lockPath, "utf8")) === lockToken) {
      await rm(lockPath, { force: true });
    }
  } catch {
    // The lock may already be gone. A remaining orphan is handled by the
    // stale-lock recovery path for the primary lock.
  }
}

async function tryAcquireLock(
  options: FileLockOptions,
  lockToken: string,
  staleMs: number,
): Promise<"acquired" | "retry" | "waiting"> {
  const recoveryPath = `${options.lockPath}.recovery`;
  const recoveryToken = `${process.pid}:${randomUUID()}`;

  try {
    await writeFile(recoveryPath, recoveryToken, {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return "waiting";
    }
    throw error;
  }

  try {
    try {
      await writeFile(options.lockPath, lockToken, {
        encoding: "utf8",
        flag: "wx",
      });
      return "acquired";
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }

    try {
      const lockStat = await stat(options.lockPath);
      if (Date.now() - lockStat.mtimeMs <= staleMs) {
        return "waiting";
      }
      await rm(options.lockPath, { force: true });
      return "retry";
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return "retry";
      }
      throw error;
    }
  } finally {
    await removeOwnedLock(recoveryPath, recoveryToken);
  }
}

export async function withFilesystemLock<T>(
  options: FileLockOptions,
  action: () => Promise<T>,
): Promise<T> {
  const waitMs = options.waitMs ?? DEFAULT_WAIT_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;
  const lockToken = `${process.pid}:${randomUUID()}`;
  const deadline = Date.now() + timeoutMs;

  await mkdir(path.dirname(options.lockPath), { recursive: true });

  while (true) {
    const result = await tryAcquireLock(options, lockToken, staleMs);
    if (result === "acquired") {
      break;
    }
    if (result === "retry") continue;
    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for ${options.description} lock`);
    }
    await wait(waitMs);
  }

  try {
    return await action();
  } finally {
    await removeOwnedLock(options.lockPath, lockToken);
  }
}
