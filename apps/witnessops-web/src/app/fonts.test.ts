import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { brotliDecompressSync } from "node:zlib";
import test from "node:test";

const fontsDir = join(process.cwd(), "public/fonts");
const KNOWN_TAGS = [
  "cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt ", "fpgm",
  "glyf", "loca", "prep", "CFF ", "VORG", "EBDT", "EBLC", "gasp", "hdmx", "kern",
  "LTSH", "PCLT", "VDMX", "vhea", "vmtx", "BASE", "GDEF", "GPOS", "GSUB", "EBSC",
  "JSTF", "MATH", "CBDT", "CBLC", "COLR", "CPAL", "SVG ", "sbix", "acnt", "avar",
  "bdat", "bloc", "bsln", "cvar", "fdsc", "feat", "fmtx", "fvar", "gvar", "hsty",
  "just", "lcar", "mort", "morx", "opbd", "prop", "trak", "Zapf", "Silf", "Glat",
  "Gloc", "Feat", "Sill",
];

const REQUIRED = Array.from("ąćęłńóśźżĄĆĘŁŃÓŚŹŻ€–—„”…");
const BOX = "─";

function readBase128(buf: Buffer, offset: number) {
  let result = 0;
  for (let count = 0; count < 5; count += 1) {
    const byte = buf[offset + count];
    if (byte === undefined) throw new Error("truncated base128");
    if (count === 0 && byte === 0x80) throw new Error("invalid base128");
    result = result * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) return { value: result, offset: offset + count + 1 };
  }
  throw new Error("base128 overflow");
}

function cmapCoverage(buf: Buffer): Set<number> {
  if (buf.readUInt32BE(0) !== 0x774f4632) throw new Error("not woff2");
  const numTables = buf.readUInt16BE(12);
  let cursor = 48;
  const tables: { tag: string; length: number }[] = [];
  for (let index = 0; index < numTables; index += 1) {
    const flags = buf[cursor];
    cursor += 1;
    const tagIndex = flags & 0x3f;
    let tag: string;
    if (tagIndex === 63) {
      tag = buf.toString("latin1", cursor, cursor + 4);
      cursor += 4;
    } else {
      tag = KNOWN_TAGS[tagIndex] ?? "";
    }
    const transformed = tag === "glyf" || tag === "loca" ? (flags >> 6) !== 3 : (flags & 0x40) !== 0;
    const original = readBase128(buf, cursor);
    cursor = original.offset;
    let length = original.value;
    if (transformed) {
      const transformedLength = readBase128(buf, cursor);
      cursor = transformedLength.offset;
      length = transformedLength.value;
    }
    tables.push({ tag, length });
  }
  const compressedSize = buf.readUInt32BE(20);
  const decoded = brotliDecompressSync(buf.subarray(cursor, cursor + compressedSize));
  let tableOffset = 0;
  const cmap = tables.find((table) => {
    const start = tableOffset;
    tableOffset += table.length;
    return table.tag === "cmap" ? (tableOffset = start, true) : false;
  });
  if (!cmap) throw new Error("cmap missing");
  const cmapStart = tables.slice(0, tables.findIndex((table) => table.tag === "cmap")).reduce((sum, table) => sum + table.length, 0);
  return readCmap(decoded.subarray(cmapStart, cmapStart + cmap.length));
}

function readCmap(table: Buffer): Set<number> {
  const covered = new Set<number>();
  const subtables = table.readUInt16BE(2);
  for (let index = 0; index < subtables; index += 1) {
    const offset = table.readUInt32BE(4 + index * 8 + 4);
    const format = table.readUInt16BE(offset);
    if (format === 4) readFormat4(table.subarray(offset), covered);
    else if (format === 12) readFormat12(table.subarray(offset), covered);
    else if (format === 6) readFormat6(table.subarray(offset), covered);
  }
  return covered;
}

function readFormat4(sub: Buffer, covered: Set<number>) {
  const segCount = sub.readUInt16BE(6) / 2;
  const endCount = 14;
  const startCount = endCount + segCount * 2 + 2;
  const idDelta = startCount + segCount * 2;
  const idRangeOffset = idDelta + segCount * 2;
  for (let index = 0; index < segCount; index += 1) {
    const end = sub.readUInt16BE(endCount + index * 2);
    const start = sub.readUInt16BE(startCount + index * 2);
    const delta = sub.readInt16BE(idDelta + index * 2);
    const rangeOffset = sub.readUInt16BE(idRangeOffset + index * 2);
    for (let code = start; code <= end && code !== 0xffff; code += 1) {
      let glyph = 0;
      if (rangeOffset === 0) glyph = (code + delta) & 0xffff;
      else {
        const glyphOffset = idRangeOffset + index * 2 + rangeOffset + (code - start) * 2;
        glyph = sub.readUInt16BE(glyphOffset);
        if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
      }
      if (glyph !== 0) covered.add(code);
    }
  }
}

function readFormat12(sub: Buffer, covered: Set<number>) {
  const groups = sub.readUInt32BE(12);
  for (let index = 0; index < groups; index += 1) {
    const start = sub.readUInt32BE(16 + index * 12);
    const end = sub.readUInt32BE(16 + index * 12 + 4);
    const glyph = sub.readUInt32BE(16 + index * 12 + 8);
    if (glyph === 0 && end === start) continue;
    for (let code = start; code <= end; code += 1) covered.add(code);
  }
}

function readFormat6(sub: Buffer, covered: Set<number>) {
  const first = sub.readUInt16BE(6);
  const count = sub.readUInt16BE(8);
  for (let index = 0; index < count; index += 1) {
    if (sub.readUInt16BE(10 + index * 2) !== 0) covered.add(first + index);
  }
}

function familyOf(file: string) {
  if (file.startsWith("inter-")) return "Inter";
  if (file.startsWith("newsreader-")) return "Newsreader";
  if (file.startsWith("ibm-plex-mono-")) return "IBM Plex Mono";
  return "";
}

function weightOf(file: string) {
  const match = file.match(/-(\d{3})/);
  return match ? Number(match[1]) : 0;
}

const woff2 = readdirSync(fontsDir).filter((file) => file.endsWith(".woff2")).sort();
const coverage = new Map<string, Set<number>>();
for (const file of woff2) {
  const key = `${familyOf(file)} ${weightOf(file)}`;
  const glyphs = cmapCoverage(readFileSync(join(fontsDir, file)));
  const existing = coverage.get(key) ?? new Set<number>();
  for (const code of glyphs) existing.add(code);
  coverage.set(key, existing);
}

test("public font files are the locked weights plus the admin Inter 600 face", () => {
  const weights = [...coverage.keys()].sort();
  assert.deepEqual(weights, [
    "IBM Plex Mono 400",
    "IBM Plex Mono 500",
    "Inter 300",
    "Inter 400",
    "Inter 500",
    "Inter 600",
    "Newsreader 400",
    "Newsreader 500",
  ]);
  const globals = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const admin = readFileSync(join(process.cwd(), "src/components/admin/admin.module.css"), "utf8");
  assert.equal(globals.includes("inter-600.woff2"), false);
  assert.equal(globals.includes("ibm-plex-mono-300"), false);
  assert.match(admin, /inter-600\.woff2/);
  assert.match(admin, /inter-600-latin-ext\.woff2/);
  assert.equal(globals.includes("inter-600-latin-ext.woff2"), false);
});

test("latin plus latin-ext cover Polish, euro and punctuation in every public weight", () => {
  for (const [key, glyphs] of coverage) {
    if (key === "Inter 600") {
      const polish = Array.from("ąćęłńśźżĄĆĘŁŃŚŹŻ").filter((char) => !glyphs.has(char.codePointAt(0)!));
      assert.deepEqual(polish, [], key);
      continue;
    }
    const missing = REQUIRED.filter((char) => !glyphs.has(char.codePointAt(0)!));
    assert.deepEqual(missing, [], key);
  }
});

test("IBM Plex Mono ships the box drawing rule from the official subset", () => {
  for (const weight of [400, 500]) {
    const glyphs = coverage.get(`IBM Plex Mono ${weight}`);
    assert.equal(glyphs?.has(BOX.codePointAt(0)!), true, String(weight));
  }
});

test("font licenses travel with the files", () => {
  for (const file of ["licenses/LICENSE-inter.txt", "licenses/OFL-newsreader.txt", "licenses/LICENSE-ibm-plex.txt"]) {
    const text = readFileSync(join(fontsDir, file), "utf8");
    assert.match(text, /SIL Open Font License/);
  }
});
