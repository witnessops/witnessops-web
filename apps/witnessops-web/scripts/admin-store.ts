/** Run from the app directory with Node 22; never prints customer records. */
import { AdminCoreError, getAdminCoreState, initializeAdminCoreStore, snapshotAdminCoreStore } from "../src/lib/server/admin-core-spine";
import { requireAdminSessionStorage } from "../src/lib/server/admin-session-revocation";

async function main() {
  const [command, destination, ...extra] = process.argv.slice(2);
  if (extra.length || !["check", "init-empty", "snapshot"].includes(command ?? "") || (command === "snapshot" ? !destination : destination)) {
    console.error("Usage: admin-store.ts check|init-empty|snapshot <absolute-new-file>. init-empty is only for a deliberately new store, never recovery of lost data.");
    process.exitCode = 1;
    return;
  }
  if (process.env.NODE_ENV !== "production" || !process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR?.trim()) {
    throw new Error("Set NODE_ENV=production and WITNESSOPS_ADMIN_CORE_STORE_DIR explicitly. The storage directory must already exist.");
  }
  if (command === "init-empty") await initializeAdminCoreStore();
  await getAdminCoreState();
  await requireAdminSessionStorage();
  if (command === "snapshot") {
    const digest = await snapshotAdminCoreStore(destination!);
    console.log(`Core snapshot saved; SHA-256 ${digest}. Customer data: protect this file. Excludes session state and external artifacts. Restore with signing-secret rotation and provider reconciliation before resuming sends.`);
    return;
  }
  console.log(command === "init-empty" ? "Empty admin storage initialized." : "Admin storage is readable and session storage is present. This is not a backup or provider health check.");
}

main().catch((error: unknown) => {
  console.error(error instanceof AdminCoreError ? `${error.code}: ${error.message}` : "Admin storage command failed. Check explicit configuration, storage integrity, permissions and the destination.");
  process.exitCode = 1;
});
