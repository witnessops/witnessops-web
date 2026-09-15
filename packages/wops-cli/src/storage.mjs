import { constants } from 'node:fs';
import { mkdir, lstat, open, rename, unlink } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { join, isAbsolute } from 'node:path';
import { randomBytes } from 'node:crypto';
export function configDirectory() {
  if (platform() === 'win32') throw new Error('This preview supports macOS and Linux credential storage only.');
  const base = platform() === 'darwin' ? join(homedir(), 'Library', 'Application Support') : process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  if (!isAbsolute(base)) throw new Error('Use an absolute config directory.');
  return join(base, 'witnessops');
}
export function serverOrigin(input) {
  let url;
  try { url = new URL(input); } catch { throw new Error('Use an HTTPS WitnessOps server URL.'); }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === '127.0.0.1'))) throw new Error('Use HTTPS, or HTTP on 127.0.0.1 for local development.');
  return url.origin;
}
function privateStat(stat, mode) {
  if ((process.getuid && stat.uid !== process.getuid()) || (stat.mode & 0o777) !== mode) throw new Error('Auth storage permissions are unsafe. Use a private owner-only directory/file.');
}
export class AuthStorage {
  constructor(directory = configDirectory()) { this.directory = directory; this.file = join(directory, 'auth.json'); }
  async prepare() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const stat = await lstat(this.directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Auth directory must not be a symlink.');
    privateStat(stat, 0o700);
  }
  async read() {
    await this.prepare();
    let handle;
    try {
      handle = await open(this.file, constants.O_RDONLY | constants.O_NOFOLLOW);
      const stat = await handle.stat(); privateStat(stat, 0o600);
      if (!stat.isFile() || stat.size > 4096) throw new Error();
      const data = JSON.parse(await handle.readFile('utf8'));
      if (Object.keys(data).sort().join() !== 'credential,expiresAt,server' || !/^[A-Za-z0-9_-]{43}$/.test(data.credential) || !Number.isFinite(Date.parse(data.expiresAt))) throw new Error();
      return { ...data, server: serverOrigin(data.server) };
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw new Error('Local auth file is malformed or unsafe. Run wops auth logout to remove it, then log in again.');
    } finally { await handle?.close(); }
  }
  async write(data) {
    await this.prepare();
    const temp = join(this.directory, `.auth-${randomBytes(12).toString('hex')}`);
    let handle;
    try {
      handle = await open(temp, 'wx', 0o600); await handle.writeFile(JSON.stringify(data)); await handle.sync(); await handle.close(); handle = null;
      await rename(temp, this.file);
    } finally { await handle?.close(); await unlink(temp).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  }
  async remove() { await this.prepare(); await unlink(this.file).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  async lock(action) {
    await this.prepare(); let handle;
    const path = join(this.directory, 'auth.lock');
    try { handle = await open(path, 'wx', 0o600); }
    catch { throw new Error('Another auth command may be running. Finish it first; remove a stale auth.lock only when no auth command is running.'); }
    try { return await action(); }
    finally { await handle.close(); await unlink(path); }
  }
}
