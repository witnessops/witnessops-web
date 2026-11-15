import fs from 'node:fs';
import { isAbsolute, join } from 'node:path';

/** Read only the selected regular secret file; never print its path or contents. */
export function readSessionTokenKeyring({ file = process.env.ACADEMY_TOKEN_KEYRING_FILE,
  credentialsDirectory = process.env.CREDENTIALS_DIRECTORY } = {}) {
  const selected = file || (credentialsDirectory ? join(credentialsDirectory, 'academy_token_keyring') : '');
  let fd;
  try {
    if (!isAbsolute(selected)) throw new Error('path');
    fd = fs.openSync(selected, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    const stat = fs.fstatSync(fd);
    const uid = process.geteuid();
    if (!stat.isFile() || stat.size === 0 || stat.size > 16384
      || ![0o400, 0o600].includes(stat.mode & 0o7777) || ![0, uid].includes(stat.uid)) throw new Error('custody');
    return fs.readFileSync(fd, 'utf8').trim();
  } catch { throw new Error('Academy token keyring custody check failed'); }
  finally { if (fd !== undefined) fs.closeSync(fd); }
}
