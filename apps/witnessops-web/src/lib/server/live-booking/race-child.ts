import { existsSync } from "node:fs";
import { claimSlotRace } from "./store";

async function main(): Promise<void> {
  const dir = process.env.LIVE_BOOKING_RACE_DIR ?? "";
  const go = process.env.LIVE_BOOKING_RACE_GO ?? "";
  const owner = process.env.LIVE_BOOKING_RACE_OWNER ?? "";
  process.stdout.write("ready\n");
  const deadline = Date.now() + 5_000;
  while (!existsSync(go)) {
    if (Date.now() > deadline) {
      process.stderr.write("race child timed out waiting to start\n");
      process.exit(3);
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  const result = await claimSlotRace(dir, "waw-20260715-0900", owner, Date.parse("2026-07-15T06:00:00.000Z"));
  process.stdout.write(`${result}\n`);
}

if (process.env.LIVE_BOOKING_RACE_CHILD === "1") void main();
