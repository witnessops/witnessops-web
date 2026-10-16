import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { inspectAgent } from '../agent/inspect.mjs';
import { createOutput } from '../agent/filesystem.mjs';

export const agentHelp = `Usage:
  wops agent inspect [--mcp-config FILE]... [--output FILE]

Write agent-observation.json in the current directory by default. Linux or macOS,
normal user only; no sign-in, sudo, upload, network or executable invocation.
Checks codex, claude, gemini and aider entries in at most 32 PATH locations.
Only explicitly selected JSON files with an mcpServers object are read (max 4).
Do not select credential files. Configuration values are not retained, but
selected source paths are: review the record before sharing it.
No process scan, recursive crawl, security verdict or automatic discovery of
MCP configuration. Existing output files and symlinks are never overwritten.

Exit codes: 0 = completed within selected scope; 2 = partial or unsupported
(record written); 1 = invalid invocation or output failure (no usable record).
An empty observation list is never a claim that no AI tooling is present.`;

export async function agentCommand(args, options = {}) {
  if ((args.length === 2 && ['--help', '-h', 'help'].includes(args[1])) ||
      (args.length === 3 && args[1] === 'inspect' && ['--help', '-h'].includes(args[2]))) {
    (options.output ?? console.log)(agentHelp); return 0;
  }
  if (args[0] !== 'agent' || args[1] !== 'inspect') throw new Error('Use wops agent inspect --help.');
  const configFiles = [];
  let destination = 'agent-observation.json', hasOutput = false;
  for (let i = 2; i < args.length; i += 2) {
    const flag = args[i], value = args[i + 1];
    if (!value || value.startsWith('--') || value.length > 4096 || /[\x00-\x1f\x7f-\x9f]/.test(value)) throw new Error('Use wops agent inspect --help.');
    if (flag === '--mcp-config' && configFiles.length < 4) configFiles.push(value);
    else if (flag === '--output' && !hasOutput) { destination = value; hasOutput = true; }
    else throw new Error('Use wops agent inspect --help.');
  }
  // Exclusive creation refuses regular files, symlinks and concurrent writers.
  // Reserve output before collection so reruns cannot collect and then silently
  // replace earlier evidence. A write failure truncates the owned fd, never an
  // arbitrary pathname, and returns 1; an empty reservation must be removed by
  // the user before retry. No partial JSON is presented as a usable record.
  let handle;
  try {
    // Unsupported platforms still need to be able to write their unsupported
    // record. Supported platforms additionally reject symlinks in output parents.
    handle = ['linux', 'darwin'].includes(process.platform) ? await createOutput(destination)
      : await open(destination, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
  }
  catch { throw new Error('Cannot create a new private output file. Choose an unused path in an existing writable directory.'); }
  let result;
  try {
    result = await (options.inspect ?? inspectAgent)({ configFiles });
    await handle.writeFile(`${JSON.stringify(result, null, 2)}\n`, 'utf8');
    await handle.sync();
  } catch {
    await handle.truncate(0).catch(() => {});
    throw new Error('Observation output failed. An incomplete file may remain; do not use it as evidence. Choose a new path before retrying.');
  } finally { await handle.close(); }
  (options.output ?? console.log)(`Observation record written. Collection status: ${result.collection_status}. Review scope, unknowns and failures before sharing.`);
  return result.collection_status === 'completed' ? 0 : 2;
}
