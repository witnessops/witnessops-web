import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { collectExecutables, EXECUTABLE_NAMES, MAX_PATH_ENTRIES } from './collectors/executables.mjs';
import { collectMcpConfig, MAX_CONFIG_FILES, MAX_DECLARATIONS } from './collectors/mcp-config.mjs';
import { MAX_CONFIG_BYTES } from './filesystem.mjs';

const metadata = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));

export async function inspectAgent({ configFiles = [], ...options } = {}) {
  if (configFiles.length > MAX_CONFIG_FILES || configFiles.some(file => typeof file !== 'string' || !file || file.length > 4096 || /[\x00-\x1f\x7f-\x9f]/.test(file))) {
    throw new Error('Select at most four explicit JSON configuration paths.');
  }
  const now = options.now ?? (() => new Date().toISOString());
  const platform = options.platform ?? process.platform;
  const userHome = options.userHome ?? homedir();
  const result = {
    schema: 'wops.agent-observation.v1', snapshot_id: randomUUID(), observed_at: now(), completed_at: null,
    collector: { name: 'wops', version: metadata.version },
    collection_status: 'completed',
    scope: {
      host: 'current-user', platform, executable_names: [...EXECUTABLE_NAMES], mcp_config_count: configFiles.length,
      limits: { path_entries: MAX_PATH_ENTRIES, config_files: MAX_CONFIG_FILES, config_bytes: MAX_CONFIG_BYTES, declarations_per_file: MAX_DECLARATIONS },
      limitations: ['Current user only; not a complete host inventory.',
        'Linux and macOS only. Fixed command names in the first 32 PATH entries; no directory enumeration or recursive crawling.',
        'Executable entries are inspected as metadata only; candidate symlink targets and file contents are not inspected.',
        'MCP input is explicit JSON with an mcpServers object. Other formats and unselected configurations are not inspected.',
        ...(platform === 'darwin' ? ['macOS uses symlink-rejecting opens and file/directory identity checks. Directory paths are not pinned across lookup; transient replacement or in-place rewriting cannot be ruled out. Special-file metadata is checked before opening for read and again before reading; a concurrent replacement can still cause a special file to be opened, but its contents are not read.'] : []),
        'Collection is sequential, not an atomic host snapshot. Timestamps are from the local clock and are not attested.',
        'Completed means selected checks completed within this scope; empty observations do not establish absence of AI tooling.',
        'This JSON is an unsigned observation record, not a receipt, security score or safety verdict. Source bytes are not retained; this file cannot independently prove source truth.'],
      not_inspected: ['Runtime processes and previous actions', 'Effective access and tool calls', 'Browser history',
        'Credential stores, cloud accounts and authentication state', 'Unselected files and unsupported formats'],
      privacy_boundary: ['No network, upload, subprocess execution or authentication is used by this collector.',
        'Only explicit configuration files are read. They can contain sensitive values in memory; declaration names, commands, arguments, URLs, environment values and raw contents are never retained.',
        'Selected source paths are retained with the current home prefix replaced by $HOME. Other path components may still be sensitive; review this file before sharing.'],
    },
    checks: [], observations: [], unknowns: ['Effective permissions are not established.', 'Agent usage is not established.',
      'Tooling outside the named commands and selected configuration files remains unknown.'], failures: [],
  };
  const record = {
    check(area, type, sourcePath) {
      const check = { id: `check-${result.checks.length + 1}`, area, source: { type, path: sourcePath }, observed_at: now(), status: 'not-inspected' };
      result.checks.push(check); return check;
    },
    unknown(message) { if (!result.unknowns.includes(message)) result.unknowns.push(message); },
    fail(check, reason, impact) {
      check.status = 'failed';
      result.collection_status = 'partial';
      result.failures.push({ check_id: check.id, area: check.area, reason, impact });
      record.unknown(impact);
    },
    observe(check, category, statement, details, meaning, unknowns) {
      result.observations.push({ id: `obs-${result.observations.length + 1}`, check_id: check.id, category,
        observed_at: check.observed_at, statement, source: check.source, details, meaning, unknowns });
    },
  };
  const uid = options.uid ?? process.getuid?.();
  const supported = ['linux', 'darwin'].includes(platform);
  if (!supported || uid === 0) {
    const check = record.check('collection', 'scope', null);
    record.fail(check, !supported ? 'unsupported-platform' : 'elevated-user',
      !supported ? 'This collector does not support this platform; no host inputs were inspected.'
        : 'Run as a normal user without sudo; no host inputs were inspected.');
    result.collection_status = 'unsupported';
  } else {
    await collectExecutables(record, { pathValue: options.pathValue ?? process.env.PATH, userHome, io: options.executableIo });
    await collectMcpConfig(record, { configFiles: configFiles.map(file => path.resolve(file)), userHome, read: options.readConfig });
  }
  result.completed_at = now();
  return result;
}
