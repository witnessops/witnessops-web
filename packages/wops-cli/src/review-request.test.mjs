import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { AGENT_ACTION_REVIEW_INTENT, SCOPE_PROMPT, buildReviewRequestBody, reviewCommand } from './commands/review.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const answers = {
  name: 'Ada Lovelace',
  email: 'Ada@Acme.Test',
  org: 'Acme Test',
  locale: 'en',
  scope: 'One refund action on the billing agent. Decision needed by Friday. Systems: billing API.',
};

function fields(overrides = {}) {
  const queued = { ...answers, ...overrides };
  const order = ['name', 'email', 'org', 'locale', 'scope'];
  let index = 0;
  return {
    queued,
    ask: async () => queued[order[index++]],
  };
}

function issuance(email = 'ada@acme.test') {
  return {
    channel: 'engage',
    email,
    status: 'issued',
    admissionState: 'verification_sent',
    intakeId: 'intake-secret',
    issuanceId: 'iss_secret',
    threadId: null,
    createdAt: '2026-10-27T07:00:00.000Z',
    expiresAt: '2026-10-27T07:15:00.000Z',
  };
}

test('review request body is the fixed public intent and omits a blank organisation', () => {
  const body = buildReviewRequestBody(answers);
  assert.deepEqual(Object.keys(body), ['email', 'name', 'org', 'intent', 'locale', 'scope']);
  assert.equal(body.intent, AGENT_ACTION_REVIEW_INTENT);
  assert.equal(body.intent, 'agent-action-security-review');
  assert.equal(body.email, 'ada@acme.test');
  assert.equal(body.locale, 'en');
  assert.deepEqual(Object.keys(buildReviewRequestBody({ ...answers, org: '  ' })), ['email', 'name', 'intent', 'locale', 'scope']);
  assert.throws(() => buildReviewRequestBody({ ...answers, email: 'ada@gmail.com' }), /business email/);
  assert.throws(() => buildReviewRequestBody({ ...answers, locale: 'de' }), /locale en or pl/);
  assert.throws(() => buildReviewRequestBody({ ...answers, scope: '' }), /Scope is invalid/);
});

test('review request posts only the fit check and prints mailbox verification', async () => {
  const logs = [];
  const requests = [];
  const questions = [];
  const { ask: next } = fields();
  const ask = async question => { questions.push(question); return next(); };
  const status = await reviewCommand(['review', 'request', '--server', 'http://127.0.0.1:3001'], {
    ask,
    output: line => logs.push(line),
    fetch: async (url, init) => {
      requests.push({ url, init });
      return Response.json(issuance(), { status: 201 });
    },
  });
  assert.equal(status, 0);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'http://127.0.0.1:3001/api/review/request');
  assert.equal(requests[0].init.method, 'POST');
  assert.equal(requests[0].init.redirect, 'error');
  assert.equal(requests[0].init.headers.Origin, 'http://127.0.0.1:3001');
  assert.equal(requests[0].init.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(requests[0].init.body), buildReviewRequestBody(answers));
  const text = logs.join('\n');
  assert.match(text, /Verification email sent\./);
  assert.match(text, /Email: ada@acme\.test/);
  assert.match(text, /Status: issued/);
  assert.match(text, /Admission: verification_sent/);
  assert.match(text, /Expires: 2026-10-27T07:15:00.000Z/);
  assert.match(text, /not a booking, a payment, or permission to start work/);
  assert.match(questions.at(-1), new RegExp(SCOPE_PROMPT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(text, /iss_secret|intake-secret|authority map|finding/);
});

test('review request help and invalid servers do not prompt or send', async () => {
  const logs = [];
  let asked = 0;
  let fetched = 0;
  const fetch = async () => { fetched += 1; throw new Error('network'); };
  const ask = async () => { asked += 1; return ''; };
  assert.equal(await reviewCommand(['review', 'request', '--help'], { ask, fetch, output: line => logs.push(line) }), 0);
  assert.match(logs.join('\n'), /agent-action-security-review/);
  assert.match(logs.join('\n'), /not a booking, a payment, or permission to start work/);
  await assert.rejects(reviewCommand(['review', 'request', '--server', 'http://evil.test'], { ask, fetch }), /HTTPS, or HTTP on 127\.0\.0\.1/);
  await assert.rejects(reviewCommand(['review', 'request', '--offer', 'bounded-workflow-review'], { ask, fetch }), /Use wops review request --help/);
  assert.equal(asked, 0);
  assert.equal(fetched, 0);
});

test('rejected intake stays a non-start and does not echo arbitrary server text', async () => {
  const logs = [];
  const { ask } = fields({ email: 'security@acme.test' });
  const status = await reviewCommand(['review', 'request'], {
    ask,
    output: line => logs.push(line),
    fetch: async () => Response.json({ ok: false, error: 'Please use your business email.', detail: 'SECRET-BODY' }, { status: 400 }),
  });
  assert.equal(status, 1);
  assert.equal(logs.join('\n'), 'Please use your business email.');
  const hidden = [];
  assert.equal(await reviewCommand(['review', 'request'], {
    ask: fields().ask,
    output: line => hidden.push(line),
    fetch: async () => Response.json({ error: 'SECRET-BODY' }, { status: 500 }),
  }), 1);
  assert.equal(hidden.join('\n'), 'Review request was not accepted. Try again.');
});

test('review request does not follow redirects or write local auth state', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'wops-review-request-'));
  let leaked = 0;
  const server = createServer((request, response) => {
    if (request.url === '/leak') leaked += 1;
    response.writeHead(302, { Location: '/leak' });
    response.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    const before = await readdir(directory);
    await assert.rejects(reviewCommand(
      ['review', 'request', '--server', `http://127.0.0.1:${port}`],
      { ask: fields().ask },
    ), /not sent/);
    assert.equal(leaked, 0);
    assert.deepEqual(await readdir(directory), before);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});

test('review command source stays off historical ids, files, and credential storage', async () => {
  const source = await readFile(new URL('./commands/review.mjs', import.meta.url), 'utf8');
  assert.equal(AGENT_ACTION_REVIEW_INTENT, 'agent-action-security-review');
  assert.doesNotMatch(source, /bounded-workflow-review|agent-tools-access-review|auth\.json|agent-observation|mcp-config|node:fs/);
  const preparation = await readFile(path.join(root, 'apps/witnessops-web/src/lib/service-preparation.ts'), 'utf8');
  assert.match(preparation, new RegExp(SCOPE_PROMPT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const truth = await readFile(path.join(root, 'apps/witnessops-web/src/lib/commercial-truth.ts'), 'utf8');
  assert.match(truth, /export const PUBLIC_AGENT_ACTION_OFFER = \{[\s\S]*?id: "agent-action-security-review"/);
  const freemail = await readFile(path.join(root, 'apps/witnessops-web/src/lib/freemail-policy.ts'), 'utf8');
  const listed = [...freemail.matchAll(/"([a-z0-9.-]+)"/g)].map(match => match[1]);
  for (const domain of ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'protonmail.com', 'mail.com', 'yandex.com', 'live.com']) {
    assert.ok(listed.includes(domain), domain);
    assert.match(source, new RegExp(`'${domain}'`));
  }
});

function assertUnclear(error) {
  assert.match(error.message, /The server responded but the result is unclear/);
  assert.match(error.message, /may have been received/);
  assert.match(error.message, /Check your mailbox/);
  assert.match(error.message, /do not retry immediately/);
  assert.doesNotMatch(error.message, /not sent/);
  return true;
}

async function withLocalPost(respond, check) {
  const hits = [];
  const server = createServer((request, response) => {
    hits.push({ method: request.method, url: request.url });
    request.resume();
    respond(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    await check({ port, hits });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('a response that cannot be read says the request may have been received', async () => {
  await withLocalPost(response => {
    response.writeHead(502, { 'Content-Type': 'text/html' });
    response.end('<html><body>bad gateway</body></html>');
  }, async ({ port, hits }) => {
    await assert.rejects(reviewCommand(
      ['review', 'request', '--server', `http://127.0.0.1:${port}`],
      { ask: fields().ask },
    ), assertUnclear);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].method, 'POST');
    assert.equal(hits[0].url, '/api/review/request');
  });

  await withLocalPost(response => {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('not-json');
  }, async ({ port, hits }) => {
    await assert.rejects(reviewCommand(
      ['review', 'request', '--server', `http://127.0.0.1:${port}`],
      { ask: fields().ask },
    ), assertUnclear);
    assert.equal(hits.length, 1);
  });

  await withLocalPost(response => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(Buffer.alloc(20_000, 0x61));
  }, async ({ port, hits }) => {
    await assert.rejects(reviewCommand(
      ['review', 'request', '--server', `http://127.0.0.1:${port}`],
      { ask: fields().ask },
    ), assertUnclear);
    assert.equal(hits.length, 1);
  });
});

test('a connect failure or abort before headers says the review request was not sent', async () => {
  const probe = createServer((request, response) => {
    request.resume();
    response.end('unexpected');
  });
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  await assert.rejects(reviewCommand(
    ['review', 'request', '--server', `http://127.0.0.1:${port}`],
    { ask: fields().ask },
  ), error => {
    assert.match(error.message, /The review request was not sent/);
    assert.doesNotMatch(error.message, /may have been received/);
    return true;
  });

  let fetched = 0;
  await assert.rejects(reviewCommand(
    ['review', 'request', '--server', 'http://127.0.0.1:9'],
    {
      ask: fields().ask,
      fetch: async () => {
        fetched += 1;
        throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
      },
    },
  ), error => {
    assert.match(error.message, /The review request was not sent/);
    assert.doesNotMatch(error.message, /may have been received/);
    return true;
  });
  assert.equal(fetched, 1);
});

test('review request help from the executable creates no files', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'wops-review-help-'));
  try {
    const before = await readdir(directory);
    const result = spawnSync(process.execPath, [path.join(root, 'packages/wops-cli/src/main.mjs'), 'review', 'request', '--help'], {
      cwd: directory,
      encoding: 'utf8',
      env: { ...process.env, HOME: directory, XDG_CONFIG_HOME: directory },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^Usage:/);
    assert.match(result.stdout, /wops review request \[--server URL\]/);
    assert.equal(result.stderr, '');
    assert.deepEqual(await readdir(directory), before);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
