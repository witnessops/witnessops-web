// Builds Academy MCP curriculum JSON from the static lesson pages and
// lesson-state.mjs. The same inputs always produce the same bytes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CLAIMS, LABELS } from '../../witnessops-academy/public/lesson-state.mjs';
import { MAX_TEXT_BYTES } from '../src/limits.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(HERE, '..');
const LESSONS_DIR = path.resolve(PACKAGE_ROOT, '../witnessops-academy/public/lessons');
const OUTPUT_DIR = path.resolve(PACKAGE_ROOT, 'curriculum');
const MAPPED_LESSON = 'report-or-evidence';

function decodeEntities(value) {
  return value.replace(/&(?:#x[0-9a-f]+|#\d+|nbsp|amp|lt|gt|quot|apos);/gi, (entity) => {
    const body = entity.slice(1, -1);
    const lower = body.toLowerCase();
    if (lower === 'nbsp') return ' ';
    if (lower === 'amp') return '&';
    if (lower === 'lt') return '<';
    if (lower === 'gt') return '>';
    if (lower === 'quot') return '"';
    if (lower === 'apos' || body === '#39') return "'";
    const code = lower.startsWith('#x') ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return entity;
    return String.fromCodePoint(code);
  });
}

function stripMarkup(value) {
  let out = '';
  let index = 0;
  while (index < value.length) {
    const open = value.indexOf('<', index);
    if (open < 0) {
      out += value.slice(index);
      break;
    }
    out += value.slice(index, open);
    const close = value.indexOf('>', open + 1);
    if (close < 0) break;
    if (/^br\b/i.test(value.slice(open + 1, close).trim())) out += '\n';
    index = close + 1;
  }
  return out;
}

function textOf(html, { newlines = false } = {}) {
  const decoded = stripMarkup(decodeEntities(html)).replace(/\u00a0/g, ' ');
  if (!newlines) return decoded.replace(/\s+/g, ' ').trim();
  return decoded
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => line !== '')
    .join('\n')
    .trim();
}

function unwrapQuotes(value) {
  const pairs = [['“', '”'], ['"', '"'], ['‘', '’']];
  for (const [open, close] of pairs) {
    if (value.startsWith(open) && value.endsWith(close) && value.length > open.length + close.length) {
      return value.slice(open.length, -close.length).trim();
    }
  }
  return value;
}

function classList(attrs) {
  const match = /\bclass\s*=\s*"([^"]*)"/i.exec(attrs);
  return match ? match[1].split(/\s+/).filter(Boolean) : [];
}

function tagBoundary(html, index, literal) {
  const next = html[index + literal.length];
  return next === undefined || !/[A-Za-z0-9]/.test(next);
}

function extractBalanced(html, tag, fromIndex) {
  const open = `<${tag}`;
  const close = `</${tag}>`;
  const startTagEnd = html.indexOf('>', fromIndex);
  if (startTagEnd < 0) throw new Error(`unclosed ${tag}`);
  let depth = 1;
  let cursor = startTagEnd + 1;
  while (cursor < html.length) {
    const nextOpen = html.indexOf(open, cursor);
    const nextClose = html.indexOf(close, cursor);
    if (nextClose < 0) throw new Error(`unclosed ${tag}`);
    const openIsTag = nextOpen >= 0 && nextOpen < nextClose && tagBoundary(html, nextOpen, open);
    if (openIsTag) {
      depth += 1;
      const nestedEnd = html.indexOf('>', nextOpen);
      if (nestedEnd < 0) throw new Error(`unclosed ${tag}`);
      cursor = nestedEnd + 1;
    } else {
      depth -= 1;
      if (depth === 0) return html.slice(startTagEnd + 1, nextClose);
      cursor = nextClose + close.length;
    }
  }
  throw new Error(`unclosed ${tag}`);
}

function extractElements(html, tag, className) {
  const found = [];
  const open = `<${tag}`;
  let cursor = 0;
  while (cursor < html.length) {
    const at = html.indexOf(open, cursor);
    if (at < 0) break;
    if (!tagBoundary(html, at, open)) {
      cursor = at + open.length;
      continue;
    }
    const tagEnd = html.indexOf('>', at);
    if (tagEnd < 0) throw new Error(`unclosed ${tag}`);
    const attrs = html.slice(at + open.length, tagEnd);
    if (!className || classList(attrs).includes(className)) found.push(extractBalanced(html, tag, at));
    cursor = tagEnd + 1;
  }
  return found;
}

function extractById(html, id) {
  const at = html.indexOf(`id="${id}"`);
  if (at < 0) throw new Error(`missing #${id}`);
  const tagStart = html.lastIndexOf('<', at);
  const tag = /^<([a-z0-9]+)/.exec(html.slice(tagStart));
  if (!tag) throw new Error(`unreadable #${id}`);
  return extractBalanced(html, tag[1], tagStart);
}

function sliceBetween(html, start, end) {
  const from = html.indexOf(start);
  if (from < 0) throw new Error(`missing ${start}`);
  const to = html.indexOf(end, from + start.length);
  if (to < 0) throw new Error(`missing ${end}`);
  return html.slice(from, to);
}

function one(elements, label) {
  if (!elements || elements.length === 0) throw new Error(`missing ${label}`);
  return elements[0];
}

function labelOf(row) {
  for (const span of extractElements(row, 'span', 'st2')) {
    const text = textOf(span);
    if (LABELS.includes(text)) return text;
  }
  return '';
}

function whyOf(row) {
  const why = one(extractElements(row, 'div', 'why'), 'why');
  return textOf(why.replace(/<span\b[^>]*\bst2\b[^>]*>[\s\S]*?<\/span>/gi, ''));
}

function evidenceFrom(preHtml) {
  const chunks = preHtml.split(/<span\b[^>]*\bdv\b[^>]*>\s*<\/span>/gi);
  const records = [];
  for (const chunk of chunks) {
    const text = textOf(chunk);
    if (!text || text === 'EVIDENCE RECORD') continue;
    if (text.startsWith('Not supplied') && records.length > 0) {
      records[records.length - 1] = `${records[records.length - 1]} ${text}`;
    } else {
      records.push(text);
    }
  }
  if (records.length === 0) throw new Error('worked example has no evidence');
  return records;
}

function artifactsFrom(attemptHtml) {
  const parts = attemptHtml.split(/<b>([\s\S]*?)<\/b>/gi);
  if (parts.length < 3) throw new Error('exercise has no artifacts');
  if (textOf(parts[0])) throw new Error('exercise artifact text precedes the first name');
  const artifacts = {};
  for (let index = 1; index < parts.length; index += 2) {
    const name = textOf(parts[index]);
    const lines = [];
    for (const line of textOf(parts[index + 1] ?? '', { newlines: true }).split('\n')) {
      if (line.startsWith('SHA-256 ') && lines.length > 0) lines[lines.length - 1] = `${lines[lines.length - 1]} ${line}`;
      else if (line) lines.push(line);
    }
    if (!name || lines.length === 0) throw new Error('empty exercise artifact');
    artifacts[name] = lines.join('\n');
  }
  return artifacts;
}

function lessonFromHtml(id, html) {
  if (id !== MAPPED_LESSON) throw new Error(`no curriculum mapping for lesson ${id}`);
  const title = textOf(one(extractElements(html, 'h1'), 'h1'));
  const crumb = textOf(one(extractElements(html, 'div', 'crumb'), 'crumb')).split('/').map((part) => part.trim());
  if (crumb.length < 3 || !crumb[1]) throw new Error('lesson crumb has no path');
  const lessonPath = crumb[1];
  const eyebrow = textOf(one(extractElements(html, 'div', 'eyebrow'), 'eyebrow')).split('·').map((part) => part.trim());
  if (eyebrow.length !== 3 || eyebrow[0] !== lessonPath) throw new Error('lesson eyebrow does not match the crumb');
  const position = `${eyebrow[1]} (${eyebrow[2]})`;
  const teacherName = textOf(one(extractElements(html, 'div', 'nm'), 'teacher name'));
  const teacherLine = textOf(one(extractElements(html, 'div', 'ln'), 'teacher line'));
  const teacher = `Crew ${teacherName} — ${teacherLine.charAt(0).toLowerCase()}${teacherLine.slice(1)}`;
  const objective = textOf(one(extractElements(one(extractElements(html, 'div', 'objective'), 'objective'), 'p'), 'objective text'));
  const explained = sliceBetween(html, 'Docs explains', 'Watch Docs do it');
  const explain = extractElements(explained, 'p').map((paragraph) => unwrapQuotes(textOf(paragraph)));
  if (explain.length < 3 || explain.some((line) => line === '')) throw new Error('lesson explanation is incomplete');
  const labels = {};
  for (const row of extractElements(one(extractElements(explained, 'div', 'claims'), 'labels'), 'div', 'cl')) {
    const label = labelOf(row);
    if (!LABELS.includes(label)) throw new Error(`unexpected label ${label || '(none)'}`);
    labels[label] = whyOf(row);
  }
  for (const label of LABELS) {
    if (!labels[label]) throw new Error(`missing label ${label}`);
  }
  const orderedLabels = {};
  for (const label of LABELS) orderedLabels[label] = labels[label];

  const worked = sliceBetween(html, 'Watch Docs do it', 'Your turn');
  const agentReport = unwrapQuotes(textOf(one(extractElements(one(extractElements(worked, 'div', 'report'), 'worked report'), 'p'), 'worked report text')));
  const evidence = evidenceFrom(one(extractElements(worked, 'pre'), 'evidence record'));
  const sorted = [];
  let limit = '';
  for (const row of extractElements(extractById(worked, 'sorted'), 'div', 'cl')) {
    const claim = unwrapQuotes(textOf(one(extractElements(row, 'div', 'q'), 'sorted claim')));
    const why = whyOf(row);
    if (claim.startsWith('Limit ')) {
      limit = why;
      continue;
    }
    const label = labelOf(row);
    if (!LABELS.includes(label)) throw new Error(`sorted claim has no label: ${claim}`);
    sorted.push({ claim, label, why });
  }
  if (sorted.length === 0 || !limit) throw new Error('worked example is incomplete');

  const exerciseHtml = extractById(html, 'exercise');
  const exerciseReport = unwrapQuotes(textOf(one(extractElements(one(extractElements(exerciseHtml, 'div', 'report'), 'exercise report'), 'p'), 'exercise report text')));
  const artifacts = artifactsFrom(one(extractElements(exerciseHtml, 'div', 'attempt'), 'artifacts'));
  const note = textOf(one(extractElements(exerciseHtml, 'p', 'meta'), 'exercise note'));
  const instructions = textOf(one(extractElements(exerciseHtml, 'p', 'brief'), 'exercise instructions'));
  const legends = [...html.matchAll(/<legend>([\s\S]*?)<\/legend>/g)].map((match) => textOf(match[1]));
  if (legends.length !== CLAIMS.length) throw new Error('lesson form claim count does not match lesson-state');
  CLAIMS.forEach((claim, index) => {
    if (!legends[index].includes(claim)) throw new Error(`legend ${index + 1} does not include the lesson-state claim`);
  });
  for (const label of LABELS) {
    if (!exerciseHtml.includes(`value="${label}"`)) throw new Error(`exercise form is missing ${label}`);
  }
  const coaching = textOf(one(extractElements(html, 'div', 'boundary'), 'coaching boundary'));
  return {
    id,
    title,
    path: lessonPath,
    position,
    teacher,
    source: `apps/witnessops-academy/public/lessons/${id}/index.html + apps/witnessops-academy/public/lesson-state.mjs`,
    objective,
    explain,
    labels: orderedLabels,
    worked_example: {
      agent_report: agentReport,
      evidence,
      sorted,
      limit,
    },
    exercise: {
      agent_report: exerciseReport,
      artifacts,
      note,
      claims: [...CLAIMS],
      instructions,
      answer_format: `Free text, or JSON {"claims":[{"label","reason"} x${CLAIMS.length}],"limit"}. Max ${MAX_TEXT_BYTES} UTF-8 bytes.`,
    },
    coaching_rule: coaching,
  };
}

export function buildCurriculum({ lessonsDir = LESSONS_DIR } = {}) {
  const ids = fs.readdirSync(lessonsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  // The MCP curriculum stays on the mapped pilot lesson. Other static lesson
  // directories are public pages and are not exported until a later allow-list.
  if (!ids.includes(MAPPED_LESSON)) throw new Error(`mapped lesson directory is missing: ${MAPPED_LESSON}`);
  return [MAPPED_LESSON].map((id) => {
    const html = fs.readFileSync(path.join(lessonsDir, id, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
    const lesson = lessonFromHtml(id, html);
    return { name: `${id}.json`, text: `${JSON.stringify(lesson, null, 2)}\n` };
  });
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

if (isDirectRun()) {
  const files = buildCurriculum();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const file of files) {
    fs.writeFileSync(path.join(OUTPUT_DIR, file.name), file.text);
    process.stdout.write(`${file.name} ${Buffer.byteLength(file.text)} bytes\n`);
  }
}
