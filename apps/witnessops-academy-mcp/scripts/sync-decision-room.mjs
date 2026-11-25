// Copy the canonical Decision Room markup (owned with the Matrix widget in
// academy-server) into this package so the MCP server never reads a sibling
// package at runtime. `--check` fails if the committed copy has drifted.
import { readFileSync, writeFileSync } from 'node:fs';

const source = new URL('../../witnessops-academy-server/src/decision-room.html', import.meta.url);
const target = new URL('../src/decision-room.html', import.meta.url);
const canonical = readFileSync(source);
if (process.argv.includes('--check')) {
  if (!canonical.equals(readFileSync(target))) {
    console.error('src/decision-room.html differs from academy-server; run pnpm --filter @witnessops/academy-mcp sync:decision-room');
    process.exit(1);
  }
  console.log('decision-room.html copy matches academy-server');
} else {
  writeFileSync(target, canonical);
  console.log('decision-room.html copied from academy-server');
}
