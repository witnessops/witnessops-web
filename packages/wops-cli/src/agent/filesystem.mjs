import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { openDarwinConfig, createDarwinOutput } from './filesystem-darwin.mjs';
import path from 'node:path';

export const MAX_CONFIG_BYTES = 65_536;

export function failureReason(error) {
  return ({ EACCES: 'permission-denied', EPERM: 'permission-denied', ENOENT: 'not-found',
    ELOOP: 'symlink-not-inspected', ENOTDIR: 'non-directory-or-symlink',
  })[error?.code] ?? (error?.collectionReason ?? 'read-failed');
}

export function collectionError(reason) {
  return Object.assign(new Error('Collection input could not be inspected.'), { collectionReason: reason });
}

export function pathLabel(value, userHome) {
  if (!value || value.length > 4096 || /[\x00-\x1f\x7f-\x9f]/.test(value)) return '[omitted invalid path]';
  const absolute = path.resolve(value);
  const relative = path.relative(userHome, absolute);
  return relative === '' ? '$HOME' : relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
    ? `$HOME/${relative}` : absolute;
}

// Linux descriptor-relative walking: reject symlinks in every selected config
// path component. An ancestor replacement cannot redirect an already-open fd.
// No directory entries are enumerated and no executable contents are read.
async function openParent(file) {
  const parts = path.resolve(file).split('/').filter(Boolean);
  let directory = await open('/', constants.O_RDONLY | constants.O_DIRECTORY);
  try {
    for (const part of parts.slice(0, -1)) {
      const next = await open(`/proc/self/fd/${directory.fd}/${part}`,
        constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      await directory.close();
      directory = next;
    }
    if (!parts.length) throw collectionError('not-regular-file');
    return { directory, selected: `/proc/self/fd/${directory.fd}/${parts.at(-1)}` };
  } catch (error) { await directory.close(); throw error; }
}

export async function openConfig(file) {
  if (process.platform === 'darwin') return openDarwinConfig(file);
  const { directory, selected } = await openParent(file);
  let pinned;
  try {
    // Linux O_PATH (010000000 in fcntl.h) pins metadata without opening a
    // device/FIFO for reading. Node does not expose this flag in fs.constants.
    pinned = await open(selected, 0o10000000 | constants.O_NOFOLLOW);
    const metadata = await pinned.stat();
    if (metadata.isSymbolicLink()) throw collectionError('symlink-not-inspected');
    if (!metadata.isFile()) throw collectionError('not-regular-file');
    return await open(`/proc/self/fd/${pinned.fd}`, constants.O_RDONLY | constants.O_NONBLOCK);
  } finally { await pinned?.close(); await directory.close(); }
}

export async function createOutput(file) {
  if (process.platform === 'darwin') return createDarwinOutput(file);
  const { directory, selected } = await openParent(file);
  try { return await open(selected, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600); }
  finally { await directory.close(); }
}

export async function readConfig(file, opener = openConfig) {
  const handle = await opener(file);
  try {
    const before = await handle.stat();
    if (!before.isFile()) throw collectionError('not-regular-file');
    if (before.size > MAX_CONFIG_BYTES) throw collectionError('size-limit');
    const bytes = Buffer.alloc(MAX_CONFIG_BYTES + 1);
    let count = 0;
    for (;;) {
      const { bytesRead } = await handle.read(bytes, count, bytes.length - count, count);
      count += bytesRead;
      if (count > MAX_CONFIG_BYTES) throw collectionError('size-limit');
      if (!bytesRead) break;
    }
    const after = await handle.stat();
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) {
      throw collectionError('changed-during-read');
    }
    try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, count)); }
    catch { throw collectionError('invalid-utf8'); }
  } finally { await handle.close(); }
}

// Bound depth and reject duplicate JSON keys rather than quietly retaining the
// last declaration. JSON.parse first establishes the grammar; tokens below only
// track structure and object keys. Neither parser error text nor tokens escape.
export function parseConfig(text) {
  let value;
  try { value = JSON.parse(text); } catch { throw collectionError('invalid-json'); }
  const tokens = text.match(/"(?:\\.|[^"\\])*"|[{}\[\]:,]|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g) ?? [];
  const stack = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === '{' || token === '[') {
      stack.push(token === '{' ? new Set() : null);
      if (stack.length > 32) throw collectionError('depth-limit');
    } else if (token === '}' || token === ']') stack.pop();
    else if (token.startsWith('"') && tokens[i + 1] === ':') {
      const key = JSON.parse(token), keys = stack.at(-1);
      if (keys.has(key)) throw collectionError('duplicate-json-key');
      keys.add(key);
    }
  }
  return value;
}
