import { spawn } from 'node:child_process';
import { AuthStorage, serverOrigin } from './storage.mjs';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function openBrowser(url) {
  const command = process.platform === 'darwin' ? 'open' : 'xdg-open';
  return new Promise(resolve => {
    const child = spawn(command, [url], { shell: false, stdio: 'ignore' });
    const timer = setTimeout(() => { child.kill(); resolve(false); }, 3000);
    child.once('error', () => { clearTimeout(timer); resolve(false); });
    child.once('exit', code => { clearTimeout(timer); resolve(code === 0); });
  });
}
// Never print server response bodies, errors, credentials or internal identifiers.
const safe = value => String(value ?? '').replace(/[\x00-\x1f\x7f-\x9f]/g, '').slice(0, 120);
export async function run(args, options = {}) {
  const output = options.output ?? console.log, storage = options.storage ?? new AuthStorage();
  const fetcher = options.fetch ?? fetch, now = options.now ?? Date.now, sleep = options.sleep ?? pause;
  const request = async (server, path, body, credential) => {
    try {
      const response = await fetcher(`${server}/api/cli/${path}`, { method: body === undefined ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000), headers: { Origin: server, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(credential ? { Authorization: `Bearer ${credential}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const reader = response.body?.getReader(); if (!reader) throw new Error();
      const chunks = []; let size = 0;
      try {
        for (;;) { const item = await reader.read(); if (item.done) break; size += item.value.byteLength; if (size > 16_384) throw new Error(); chunks.push(item.value); }
      } finally { await reader.cancel(); }
      const raw = Buffer.concat(chunks).toString('utf8');
      return { ok: response.ok, status: response.status, data: JSON.parse(raw) };
    } catch { throw new Error('Server unreachable. Current session status cannot be confirmed. Try again.'); }
  };
  const display = data => {
    if (data.state !== 'active' || !['owner','viewer'].includes(data.role) || data.scope !== 'cli:session') throw new Error('Unexpected session response. Run wops auth login again.');
    output(`Signed in as: ${safe(data.displayName)}\nWorkspace: ${safe(data.workspace)}\nRole: ${data.role === 'owner' ? 'Owner' : 'Viewer'}\nSession: active`);
  };
  if (args[0] !== 'auth' || !['login','status','logout'].includes(args[1]) || (args.length !== 2 && !(args[1] === 'login' && args.length === 4 && args[2] === '--server'))) throw new Error('Use wops auth login [--server URL], wops auth status, or wops auth logout.');
  return storage.lock(async () => {
    if (args[1] === 'logout') {
      let data;
      try { data = await storage.read(); } catch { await storage.remove(); output('Local auth file removed. Server revocation could not be confirmed; the credential expires within one hour.'); return 1; }
      let confirmed = true;
      if (data) { try { const result = await request(data.server, 'session', {}, data.credential); confirmed = result.ok; } catch { confirmed = false; } }
      await storage.remove();
      output(confirmed ? '✓ Signed out' : 'Signed out locally. Server revocation is unconfirmed; the credential expires within one hour.');
      return confirmed ? 0 : 1;
    }
    const saved = await storage.read();
    if (args[1] === 'status') {
      if (!saved) { output('Not signed in.'); return 0; }
      let result;
      try { result = await request(saved.server, 'session', undefined, saved.credential); }
      catch { throw new Error('Local credential exists, but current server status cannot be confirmed. Check your connection and try again.'); }
      if (!result.ok) {
        if (['expired','revoked','invalid_credential','access_denied'].includes(result.data.code)) { const state = { expired: 'Session: expired.', revoked: 'Session: revoked.', invalid_credential: 'Session not recognized.', access_denied: 'Current account or workspace access is unavailable.' }[result.data.code]; output(state + ' Run wops auth logout, then wops auth login.'); return 1; }
        throw new Error('Session status unavailable. Try again.');
      }
      display(result.data); return 0;
    }
    if (saved) throw new Error('A local session already exists. Run wops auth status or wops auth logout first.');
    const server = serverOrigin(args[3] ?? 'https://app.witnessops.com');
    const created = await request(server, 'login', {});
    if (!created.ok) throw new Error('CLI sign-in is unavailable or busy. Try again later.');
    const transaction = created.data;
    if (!/^[A-Za-z0-9_-]{43}$/.test(transaction.device) || !/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(transaction.userCode) || transaction.authorizationUrl !== `${server}/cli/authorize` || transaction.interval !== 5 || !Number.isFinite(Date.parse(transaction.expiresAt))) throw new Error('Unexpected login response. Try again.');
    output(`Opening WitnessOps in your browser…\nOpen: ${transaction.authorizationUrl}\nCode: ${transaction.userCode}`);
    if (!await (options.openBrowser ?? openBrowser)(transaction.authorizationUrl)) output('Browser unavailable. Open the address above and enter your terminal code.');
    output('Waiting for sign-in…');
    const deadline = Math.min(now() + 600_000, Date.parse(transaction.expiresAt));
    for (let attempt = 0; attempt < 120 && now() < deadline; attempt++) {
      await sleep(5000);
      const result = await request(server, 'poll', { device: transaction.device });
      if (result.status === 429 && ['slow_down','busy'].includes(result.data.code)) continue;
      if (!result.ok) throw new Error('Login expired, declined, or already used. Run wops auth login again.');
      if (result.data.state === 'pending') continue;
      const data = result.data;
      if (!/^[A-Za-z0-9_-]{43}$/.test(data.credential) || !Number.isFinite(Date.parse(data.expiresAt)) || data.state !== 'active' || !['owner','viewer'].includes(data.role) || data.scope !== 'cli:session') throw new Error('Unexpected login response. No local session saved.');
      try { await storage.write({ server, credential: data.credential, expiresAt: data.expiresAt }); }
      catch { await request(server, 'session', {}, data.credential).catch(() => undefined); throw new Error('Could not save private credentials. Sign-in was not completed locally.'); }
      output('✓ Signed in'); display(data); return 0;
    }
    throw new Error('Login timed out. Run wops auth login again.');
  });
}
