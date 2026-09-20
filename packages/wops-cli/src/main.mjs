#!/usr/bin/env node
import { run } from './commands.mjs';
import { serverCheck } from './server-check.mjs';

const generalHelp = `WitnessOps CLI

Usage:
  wops auth login [--server URL]
  wops auth status
  wops auth logout
  sudo wops server check [--starts-at UTC --ends-at UTC]

Run authentication commands as your normal user. A server check requires Linux,
sudo, explicit collection authority, and the operator-prepared Local Audit
runtime. Retry an interrupted server check to reconcile retained state; do not
manually recollect or delete retained files.

More help:
  wops auth --help
  wops server check --help`;

const authHelp = `Usage:
  wops auth login [--server URL]
  wops auth status
  wops auth logout

Run as your normal user. Login opens browser authorization and binds the selected
workspace. A local credential alone does not confirm an active server session.`;

const serverHelp = `Usage:
  sudo wops server check
  sudo wops server check --starts-at YYYY-MM-DDTHH:MM:SSZ --ends-at YYYY-MM-DDTHH:MM:SSZ

Runs one authorized, read-only Linux collection with an approved window of at
most 30 minutes. The accepted root-owned Local Audit runtime must already be
installed. The command does not remediate the server. Retry after interruption
to reconcile retained state; do not manually recollect or delete retained files.`;

const args = process.argv.slice(2);
const help = args.length === 1 && ['help', '--help', '-h'].includes(args[0])
  ? generalHelp
  : args[0] === 'auth' && args.length === 2 && ['help', '--help', '-h'].includes(args[1])
    ? authHelp
    : args[0] === 'server' && (
      args.length === 2 && ['help', '--help', '-h'].includes(args[1])
      || args[1] === 'check' && args.length === 3 && ['help', '--help', '-h'].includes(args[2])
    )
      ? serverHelp
      : null;

try { process.exitCode = help === null ? await (args[0] === 'server' ? serverCheck : run)(args) : (console.log(help), 0); }
catch (error) { console.error(error.message); process.exitCode = 1; }
