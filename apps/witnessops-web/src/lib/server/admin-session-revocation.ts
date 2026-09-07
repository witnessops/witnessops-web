import "server-only";

import { createHash } from "node:crypto";
import { mkdir, open, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";

import { getConfiguredEnvPath } from "./storage-config";
import { getAdmissionStoreDir } from "./token-store";
import { verifyAdminSessionCookie } from "./admin-session-cookie";

async function revocationDirectory(): Promise<string> {
  // Reuse the durable admin volume. All replicas must share this directory.
  const configured = getConfiguredEnvPath(
    ["WITNESSOPS_ADMIN_CORE_STORE_DIR"],
    "Admin session revocation directory",
  )?.trim();
  const root = configured || path.join(getAdmissionStoreDir(), "admin-core");
  // A missing production volume is an error, not an empty revocation list.
  if (process.env.NODE_ENV === "production") {
    if (!configured || !(await stat(root)).isDirectory()) {
      throw new Error("Admin session storage is unavailable.");
    }
  }
  const directory = path.join(root, "revoked-sessions");
  if (process.env.NODE_ENV === "production") {
    // Losing the marker directory must not revive logged-out grants.
    if (!(await stat(directory)).isDirectory() || !(await stat(path.join(root, "core-state.json"))).isFile()) {
      throw new Error("Admin session storage is unavailable.");
    }
  } else {
    await mkdir(directory, { recursive: true, mode: 0o700 });
  }
  return directory;
}

export async function requireAdminSessionStorage(): Promise<void> {
  await revocationDirectory();
}

function markerName(cookie: string, expiresAt: number): string {
  // Hash the exact signed token, never the stable per-user actorSessionHash.
  return `${expiresAt}-${createHash("sha256").update(cookie).digest("hex")}`;
}

export async function isAdminSessionRevoked(
  cookie: string,
  expiresAt: number,
): Promise<boolean> {
  const directory = await revocationDirectory();
  try {
    await stat(path.join(directory, markerName(cookie, expiresAt)));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // ENOENT can mean the parent disappeared after preflight, not merely
      // that this grant has no marker. Revalidate before allowing the grant.
      await revocationDirectory();
      return false;
    }
    throw error;
  }
}

/** Invalid/expired cookies create no state. Errors prevent successful logout. */
export async function revokeAdminSessionCookie(cookie: string): Promise<void> {
  const payload = await verifyAdminSessionCookie(cookie);
  if (!payload) return;

  const directory = await revocationDirectory();
  // Presence is the marker, so partial writes cannot restore access. Append
  // mode makes concurrent/repeated logout idempotent without truncation races.
  const marker = await open(path.join(directory, markerName(cookie, payload.exp)), "a", 0o600);
  try {
    await marker.sync();
  } finally {
    await marker.close();
  }
  const directoryHandle = await open(directory, "r");
  try {
    await directoryHandle.sync();
  } finally {
    await directoryHandle.close();
  }

  // Expired cookies already fail cryptographic validation. Cleanup cannot
  // remove a still-live marker, and cleanup failure cannot undo revocation.
  try {
    const now = Date.now();
    for (const name of await readdir(directory)) {
      const match = /^(\d+)-[a-f0-9]{64}$/.exec(name);
      if (match && Number(match[1]) <= now) {
        await unlink(path.join(directory, name));
      }
    }
  } catch {
    // Retry expired-marker cleanup on the next logout.
  }
}
