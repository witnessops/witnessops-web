import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import path from 'node:path';
import { openDarwinDirectory } from '../filesystem-darwin.mjs';
import { failureReason, pathLabel } from '../filesystem.mjs';

export const EXECUTABLE_NAMES = ['codex', 'claude', 'gemini', 'aider'];
export const MAX_PATH_ENTRIES = 32;

export async function collectExecutables(record, { pathValue, userHome, io = { open, lstat } }) {
  const entries = pathValue ? pathValue.split(path.delimiter) : [];
  if (!entries.length) {
    const check = record.check('agent-path-scan', 'scope', null);
    record.fail(check, 'path-unavailable', 'PATH was empty or unavailable; command locations were not inspected.');
    return;
  }
  if (entries.length > MAX_PATH_ENTRIES) {
    const check = record.check('agent-path-scan', 'scope', null);
    record.fail(check, 'path-entry-limit', 'PATH locations beyond the first 32 were not inspected.');
  }
  for (const directory of [...new Set(entries.slice(0, MAX_PATH_ENTRIES))]) {
    if (!path.isAbsolute(directory) || directory.length > 4096 || /[\x00-\x1f\x7f-\x9f]/.test(directory)) {
      const check = record.check('agent-path-scan', 'scope', null);
      record.fail(check, 'unsupported-path', 'An empty, relative or invalid PATH location was not inspected.');
      continue;
    }
    let handle;
    try {
      // PATH explicitly selects these directories, including ordinary /bin
      // aliases. Pin the selected directory; never follow candidate symlinks.
      handle = process.platform === 'darwin' && io.open === open
        ? await openDarwinDirectory(directory)
        : await io.open(directory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NONBLOCK);
      for (const name of EXECUTABLE_NAMES) {
        const check = record.check('agent-path-scan', 'filesystem-metadata', pathLabel(path.join(directory, name), userHome));
        try {
          const metadata = handle.entryMetadata ? await handle.entryMetadata(name)
            : await io.lstat(`/proc/self/fd/${handle.fd}/${name}`);
          check.status = 'observed';
          const kind = metadata.isSymbolicLink() ? 'symbolic-link' : metadata.isFile() ? 'regular-file' : 'other';
          record.observe(check, 'agent-tool-entry', `A filesystem entry named ${name} was observed.`, {
            name, entry_kind: kind, executable_mode_bit: kind === 'regular-file' ? Boolean(metadata.mode & 0o111) : null,
          }, kind === 'symbolic-link'
            ? 'This supports only the presence of a named symbolic link. Its target was not inspected.'
            : 'This supports only the presence and recorded file type/mode of a named entry, not product installation or effective executability.',
          ['Product identity, trust, installation and use are not established.', 'Effective permissions are not established.']);
        } catch (error) {
          if (error.code === 'ENOENT') check.status = 'not-found';
          else record.fail(check, failureReason(error), 'This command entry could not be inspected; its presence and properties remain unknown.');
        }
      }
    } catch (error) {
      const check = record.check('agent-path-scan', 'filesystem-metadata', pathLabel(directory, userHome));
      if (error.code === 'ENOENT') check.status = 'not-found';
      else record.fail(check, failureReason(error), 'Command entries in this PATH location were not inspected.');
    } finally { await handle?.close(); }
  }
}
