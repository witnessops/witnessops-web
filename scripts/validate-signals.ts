import { listSignals } from "../packages/content/src/signals";

async function main() {
  const signals = await listSignals();

  if (signals.length === 0) {
    throw new Error("No published signals found in content/witnessops/signals");
  }

  for (const signal of signals) {
    if (!signal.title) {
      throw new Error(`Missing signal title in ${signal.sourcePath}`);
    }

    if (!signal.invariant) {
      throw new Error(`Missing signal invariant in ${signal.sourcePath}`);
    }
  }

  console.log(
    `Signals validation passed. ${signals.length} published signal(s) loaded.`,
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? `Signals validation failed: ${error.message}`
      : "Signals validation failed.",
  );
  process.exit(1);
});
