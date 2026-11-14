import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const PUBLIC_ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const LESSON = 'lessons/reported-versus-saved/index.html';
const WORKBOOK = 'workbook/index.html';
const PILOT = 'lessons/report-or-evidence/index.html';
const LABEL_LINES = [
  'An action is described as intended or suggested. No request has been shown.',
  'A request or job exists in the supplied artifact. Completion is a separate question.',
  'An assistant message says what happened. The message is not the saved record.',
  'A retrieved record, response or destination state was actually read.',
  'The observed record matches the exact claim being checked, and the conclusion stays inside that match.',
];
const LOCAL_SCRIPTS = new Set(['/academy.mjs', '/lesson.mjs']);
const BANNED_WORDING = /certif|accredit/i;
const PILOT_LABELS = /\bEvidenced\b|\bOnly claimed\b|\bContradicted\b/;

async function htmlFiles(directory, prefix = '') {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...await htmlFiles(path.join(directory, entry.name), relative));
    else if (entry.isFile() && entry.name.endsWith('.html')) found.push(relative);
  }
  return found.sort();
}

async function readPublic(relative) {
  const file = path.resolve(PUBLIC_ROOT, relative);
  assert.equal(file.startsWith(PUBLIC_ROOT), true, relative);
  return readFile(file, 'utf8');
}

function splitReference(reference) {
  const hashAt = reference.indexOf('#');
  const hash = hashAt >= 0 ? decodeURIComponent(reference.slice(hashAt + 1)) : '';
  const beforeHash = hashAt >= 0 ? reference.slice(0, hashAt) : reference;
  const pathPart = beforeHash.split('?')[0];
  return { pathPart, hash };
}

async function resolvePublicFile(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  assert.equal(decoded.startsWith('/'), true, urlPath);
  assert.equal(decoded.includes('\\'), false, urlPath);
  assert.equal(decoded.split('/').some((part) => part === '..' || part.startsWith('.')), false, urlPath);
  const relative = decoded.replace(/^\/+/, '');
  const candidates = relative === ''
    ? ['index.html']
    : [relative.replace(/\/$/, ''), `${relative.replace(/\/$/, '')}/index.html`];
  for (const candidate of candidates) {
    const file = path.resolve(PUBLIC_ROOT, candidate);
    assert.equal(file.startsWith(PUBLIC_ROOT), true, candidate);
    try {
      if ((await stat(file)).isFile()) return candidate;
    } catch {
      // Try the directory index alias next.
    }
  }
  assert.fail(`missing public target for ${urlPath}`);
}

test('prepared lesson and workbook share one exercise and one label set', async () => {
  const lesson = await readPublic(LESSON);
  const workbook = await readPublic(WORKBOOK);
  const pilot = await readPublic(PILOT);
  for (const marker of ['Case A', 'Case B', 'Case C', 'Case D', ...LABEL_LINES]) {
    assert.equal(lesson.includes(marker), true, marker);
    assert.equal(workbook.includes(marker), true, marker);
  }
  for (const marker of ['PROPOSED title: Build Your First AI Operator', '€149', 'connect tools', 'finish the job', 'recover and repeat']) {
    assert.equal(lesson.includes(marker), true, marker);
    assert.equal(workbook.includes(marker), true, marker);
  }
  assert.equal(PILOT_LABELS.test(lesson), false);
  assert.equal(PILOT_LABELS.test(workbook), false);
  assert.match(pilot, /The 02:00 backup run completed/);
  assert.match(pilot, PILOT_LABELS);
  assert.match(pilot, /href="\/lessons\/reported-versus-saved\/"/);
  assert.doesNotMatch(lesson, /<form\b/i);
  assert.doesNotMatch(workbook, /<form\b/i);
  assert.match(workbook, /Nothing on this page is sent or stored/);
  assert.match(lesson, /This page has no save and no send/);
});

test('academy pages avoid banned wording and keep local links on this origin', async () => {
  const pages = await htmlFiles(PUBLIC_ROOT);
  assert.deepEqual(pages.filter((file) => file.startsWith('lessons/')).sort(), [
    PILOT,
    LESSON,
  ]);
  assert.equal(pages.includes(WORKBOOK), true);
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const curriculum = await readFile(new URL('../../witnessops-academy-mcp/curriculum/report-or-evidence.json', import.meta.url), 'utf8');
  assert.doesNotMatch(readme, BANNED_WORDING);
  assert.doesNotMatch(curriculum, BANNED_WORDING);
  assert.match(curriculum, /No formal award is issued in this pilot/);

  for (const relative of pages) {
    const html = await readPublic(relative);
    assert.doesNotMatch(html, BANNED_WORDING, relative);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(ids, [...new Set(ids)], relative);
    const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map((match) => match[1]);
    assert.ok(scripts.length > 0, relative);
    for (const script of scripts) {
      const source = script.match(/\ssrc="([^"]+)"/);
      assert.ok(source, `${relative} has an inline script`);
      assert.equal(LOCAL_SCRIPTS.has(source[1]), true, source[1]);
      assert.equal(html.includes(`src="${source[1]}"`), true);
    }
    if (relative === LESSON || relative === WORKBOOK) {
      assert.deepEqual(scripts.map((script) => script.match(/\ssrc="([^"]+)"/)[1]), ['/academy.mjs']);
      assert.doesNotMatch(html, /https?:\/\/|javascript:|data:/i, relative);
    }
    for (const match of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      const reference = match[1];
      assert.doesNotMatch(reference, /^(?:https?:|\/\/|javascript:|data:|mailto:)/i, `${relative} ${reference}`);
      const { pathPart, hash } = splitReference(reference);
      const target = pathPart === '' ? relative : await resolvePublicFile(pathPart);
      if (hash !== '') {
        const targetHtml = target === relative ? html : await readPublic(target);
        assert.equal(targetHtml.includes(`id="${hash}"`), true, `${relative} -> ${reference}`);
      }
    }
  }
});
