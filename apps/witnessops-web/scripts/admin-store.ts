/** Run from the app directory with Node 22; never prints customer records. */
import { AdminCoreError, getAdminCoreState, initializeAdminCoreStore, prepareAdminSessionStorage, snapshotAdminCoreStore } from "../src/lib/server/admin-core-spine";
import { requireAdminSessionStorage } from "../src/lib/server/admin-session-revocation";

async function main() {
  const [command, destination, ...extra] = process.argv.slice(2);
  const preparing = command === "prepare-sessions";
  const validArgument = preparing ? destination === "--after-session-key-rotation" : command === "snapshot" ? Boolean(destination) : !destination;
  if (extra.length || !["check", "init-empty", "snapshot", "prepare-sessions"].includes(command ?? "") || !validArgument) {
    console.error("Usage: admin-store.ts check|init-empty|snapshot <absolute-new-file>|prepare-sessions --after-session-key-rotation. init-empty never overwrites existing state. For upgrades/restores, stop traffic, rotate the admin session signing secret, then prepare-sessions before starting the new release. The flag acknowledges operator-performed rotation; this command does not rotate secrets.");
    process.exitCode = 1;
    return;
  }
  if (process.env.NODE_ENV !== "production" || !process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR?.trim()) {
    throw new Error("Set NODE_ENV=production and WITNESSOPS_ADMIN_CORE_STORE_DIR explicitly. The storage directory must already exist.");
  }
  if (command === "init-empty") await initializeAdminCoreStore();
  if (preparing) await prepareAdminSessionStorage(true);
  await getAdminCoreState();
  await requireAdminSessionStorage();
  if (command === "snapshot") {
    const digest = await snapshotAdminCoreStore(destination!);
    console.log(`Core snapshot saved; SHA-256 ${digest}. Customer data: protect this file. Excludes session state and external artifacts. Restore with signing-secret rotation and provider reconciliation before resuming sends.`);
    return;
  }
  console.log(preparing ? "Session storage prepared; existing business state and revocation markers preserved. Start the release only with the rotated session signing secret. Rotation was operator-acknowledged, not verified by this command." : command === "init-empty" ? "Empty admin storage initialized." : "Admin storage is readable and session storage is present. This is not a backup or provider health check.");
}

main().catch((error: unknown) => {
  console.error(error instanceof AdminCoreError ? `${error.code}: ${error.message}` : "Admin storage command failed. Check explicit configuration, storage integrity, permissions and the destination.");
  process.exitCode = 1;
});
