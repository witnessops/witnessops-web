// An in-memory SMTP sink for the explicitly disposable registration journey.
// It never relays mail and accepts only the inspected Keycloak container peer.
import assert from 'node:assert/strict';
import net from 'node:net';

const MAX_BYTES = 256 * 1024;
const ipv4 = address => address?.replace(/^::ffff:/, '');

export async function startRegistrationMailCapture({ host, peer, recipients }) {
  assert.equal(net.isIP(host), 4);
  assert.equal(net.isIP(peer), 4);
  assert.ok(recipients.length > 0 && recipients.length <= 3);
  assert.ok(recipients.every(value => /^[a-z0-9-]+@example\.invalid$/.test(value)));
  const allowed = new Set(recipients);
  const sockets = new Set();
  const messages = [];
  const waiters = new Set();
  let count = 0;
  let fatal = false;
  let closed = false;
  const notify = () => { for (const waiter of [...waiters]) waiter(); };
  const server = net.createServer(socket => {
    if (ipv4(socket.remoteAddress) !== peer || sockets.size >= 4) {
      socket.destroy();
      return;
    }
    sockets.add(socket);
    socket.setEncoding('utf8');
    socket.setTimeout(15_000, () => socket.destroy());
    socket.on('error', () => { /* connection content must never enter logs */ });
    socket.on('close', () => sockets.delete(socket));
    let buffered = '';
    let from = false;
    let recipient = null;
    let data = null;
    let bytes = 0;
    const reset = () => { from = false; recipient = null; data = null; bytes = 0; };
    socket.write('220 academy-ci.invalid ESMTP\r\n');
    socket.on('data', chunk => {
      buffered += chunk;
      if (Buffer.byteLength(buffered) + bytes > MAX_BYTES) {
        fatal = true; notify(); socket.end('552 Message too large\r\n'); return;
      }
      let end;
      while ((end = buffered.indexOf('\r\n')) >= 0) {
        const line = buffered.slice(0, end);
        buffered = buffered.slice(end + 2);
        if (data !== null) {
          if (line === '.') {
            if (!recipient || ++count > 6) {
              fatal = true; notify(); socket.end('452 Capture limit reached\r\n'); return;
            }
            messages.push({ recipient, body: data.join('\r\n') });
            reset();
            socket.write('250 Captured locally\r\n');
            notify();
          } else {
            const unescaped = line.startsWith('..') ? line.slice(1) : line;
            bytes += Buffer.byteLength(unescaped) + 2;
            if (bytes > MAX_BYTES) {
              fatal = true; notify(); socket.end('552 Message too large\r\n'); return;
            }
            data.push(unescaped);
          }
          continue;
        }
        if (/^EHLO\s+\S+$/i.test(line)) {
          socket.write(`250-academy-ci.invalid\r\n250-8BITMIME\r\n250 SIZE ${MAX_BYTES}\r\n`);
        } else if (/^HELO\s+\S+$/i.test(line)) {
          socket.write('250 academy-ci.invalid\r\n');
        } else if (/^MAIL FROM:<academy-ci@example\.invalid>(?:\s+(?:SIZE=\d+|BODY=(?:7BIT|8BITMIME))){0,2}$/i.test(line)) {
          reset(); from = true; socket.write('250 Sender accepted\r\n');
        } else if (/^RCPT TO:/i.test(line)) {
          const address = /^RCPT TO:<([^>]+)>$/i.exec(line)?.[1];
          if (from && !recipient && allowed.has(address)) {
            recipient = address; socket.write('250 Recipient accepted\r\n');
          } else socket.write('550 Synthetic recipient only\r\n');
        } else if (/^DATA$/i.test(line) && from && recipient) {
          data = []; bytes = 0; socket.write('354 End with dot\r\n');
        } else if (/^RSET$/i.test(line)) {
          reset(); socket.write('250 Reset\r\n');
        } else if (/^NOOP$/i.test(line)) {
          socket.write('250 OK\r\n');
        } else if (/^QUIT$/i.test(line)) {
          socket.end('221 Closed\r\n'); return;
        } else socket.write('502 Unsupported capture command\r\n');
      }
    });
  });
  server.on('error', () => { fatal = true; notify(); });
  await new Promise((resolve, reject) => {
    server.once('error', () => reject(new Error('SMTP_CAPTURE_START')));
    server.listen({ host, port: 0, exclusive: true }, resolve);
  });
  return {
    host,
    port: server.address().port,
    get count() { return count; },
    next(recipient, timeout = 20_000) {
      assert.ok(allowed.has(recipient));
      return new Promise((resolve, reject) => {
        const finish = () => { clearTimeout(timer); waiters.delete(check); };
        const check = () => {
          if (fatal || closed) { finish(); reject(new Error('SMTP_CAPTURE_UNAVAILABLE')); return; }
          const at = messages.findIndex(message => message.recipient === recipient);
          if (at >= 0) { const [message] = messages.splice(at, 1); finish(); resolve(message.body); }
        };
        const timer = setTimeout(() => { finish(); reject(new Error('SMTP_CAPTURE_TIMEOUT')); }, timeout);
        waiters.add(check);
        check();
      });
    },
    async close() {
      closed = true; notify(); messages.length = 0;
      for (const socket of sockets) socket.destroy();
      await new Promise(resolve => server.close(resolve));
    },
  };
}

function textParts(message, depth = 0) {
  assert.ok(depth < 5 && Buffer.byteLength(message) <= MAX_BYTES);
  const at = message.search(/\r?\n\r?\n/);
  assert.ok(at >= 0, 'MAIL_HEADERS');
  const headers = message.slice(0, at).replace(/\r?\n[ \t]+/g, ' ');
  const body = message.slice(at).replace(/^\r?\n\r?\n/, '');
  const type = /^Content-Type:\s*([^\r\n]+)/im.exec(headers)?.[1] || 'text/plain';
  if (/^multipart\//i.test(type)) {
    const boundary = /boundary=(?:"([^"\r\n]+)"|([^;\s]+))/i.exec(type);
    assert.ok(boundary, 'MAIL_BOUNDARY');
    const sections = body.split('--' + (boundary[1] || boundary[2])).slice(1);
    assert.ok(sections.length <= 12, 'MAIL_PART_COUNT');
    return sections.filter(section => !section.startsWith('--'))
      .flatMap(section => textParts(section.replace(/^\r?\n/, ''), depth + 1));
  }
  if (!/^text\/(plain|html)(?:;|$)/i.test(type)) return [];
  const encoding = /^Content-Transfer-Encoding:\s*([^\s;]+)/im.exec(headers)?.[1]?.toLowerCase();
  if (encoding === 'base64') return [Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf8')];
  if (encoding === 'quoted-printable') {
    const decoded = body.replace(/=\r?\n/g, '').replace(/=([a-f0-9]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    return [Buffer.from(decoded, 'latin1').toString('utf8')];
  }
  assert.ok([undefined, '7bit', '8bit', 'binary'].includes(encoding), 'MAIL_ENCODING');
  return [body];
}

export function capturedActionLink(message, keycloakOrigin, realm) {
  const base = new URL(keycloakOrigin);
  const expectedPath = base.pathname.replace(/\/$/, '') + `/realms/${realm}/login-actions/action-token`;
  const links = new Set();
  for (const part of textParts(message)) {
    // Decode each original entity once; never reinterpret a replacement.
    const text = part.replace(/&(?:amp|#38);/g, '&');
    for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/g)) {
      let url;
      try { url = new URL(match[0]); } catch { continue; }
      if (url.origin === base.origin && url.pathname === expectedPath && !url.username && !url.password && !url.hash
        && url.searchParams.has('key')) links.add(url.href);
    }
  }
  assert.equal(links.size, 1, 'ONE_PRIVATE_ACTION_LINK');
  return [...links][0];
}
