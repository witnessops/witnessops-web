import { constants } from 'node:fs';
import { open, realpath } from 'node:fs/promises';
import path from 'node:path';

// Darwin flags from Apple's bsd/sys/fcntl.h; Node does not expose these.
// https://github.com/apple-oss-distributions/xnu/blob/main/bsd/sys/fcntl.h
const O_EVTONLY = 0x8000;
const O_SYMLINK = 0x200000;
const O_NOFOLLOW_ANY = 0x20000000;
const metadataFlags = O_EVTONLY | O_SYMLINK | O_NOFOLLOW_ANY | constants.O_NONBLOCK;
const directoryFlags = constants.O_RDONLY | constants.O_DIRECTORY | O_NOFOLLOW_ANY;
const same = (a, b) => a.dev === b.dev && a.ino === b.ino;
const rejected = reason => Object.assign(new Error('Selected input could not be inspected.'), { collectionReason: reason });

// PATH explicitly selects directory aliases. Resolve the directory once, then
// reject any symlink introduced into the resolved path. Unlike Linux procfs,
// Darwin cannot address children via Node's open directory descriptors. Check
// identity around every lookup and discard metadata on a detected replacement.
export async function openDarwinDirectory(directory) {
  const selected = await realpath(directory);
  const handle = await open(selected, directoryFlags);
  try {
    const initial = await handle.stat();
    const unchanged = async () => {
      const current = await open(selected, directoryFlags);
      try { if (!same(initial, await current.stat())) throw rejected('changed-during-lookup'); }
      finally { await current.close(); }
    };
    return {
      close: () => handle.close(),
      async entryMetadata(name) {
        await unchanged();
        let entry, metadata, failure;
        try { entry = await open(path.join(selected, name), metadataFlags); metadata = await entry.stat(); }
        catch (error) { failure = error; }
        finally { await entry?.close(); }
        await unchanged();
        if (failure) throw failure;
        return metadata;
      },
    };
  } catch (error) { await handle.close(); throw error; }
}

export async function openDarwinConfig(file, io = { open }) {
  // No realpath here: all symlinks in explicitly selected config paths must
  // fail. Event-only handles obtain metadata without opening device contents.
  // Never read from an event-only handle: it does not establish read authority.
  const pinned = await io.open(file, metadataFlags);
  let readable;
  try {
    const before = await pinned.stat();
    if (before.isSymbolicLink()) throw rejected('symlink-not-inspected');
    if (!before.isFile()) throw rejected('not-regular-file');
    readable = await io.open(file, constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOCTTY | O_NOFOLLOW_ANY);
    const after = await readable.stat();
    if (!after.isFile()) throw rejected('not-regular-file');
    if (!same(before, after) || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) {
      throw rejected('changed-during-open');
    }
    return readable;
  } catch (error) { await readable?.close(); throw error; }
  finally { await pinned.close(); }
}

export async function createDarwinOutput(file) {
  return open(file, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | O_NOFOLLOW_ANY, 0o600);
}
