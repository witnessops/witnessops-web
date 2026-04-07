/**
 * WEB-011: tests for the admin system data helpers.
 *
 * The helpers replace three hardcoded fictions on the admin system
 * page (Docs Pages, Audio Files, Surface) with real data reads.
 * These tests pin both the pure helper logic over hermetic tmpdirs
 * and the real-path resolution against the on-disk project tree.
 */
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  PUBLIC_SURFACE_URL_FALLBACK,
  countAudioFiles,
  countDocsPages,
  getPublicSurfaceUrl,
} from "./admin-system-data";

let createdDirs: string[] = [];

afterEach(async () => {
  for (const dir of createdDirs) {
    await rm(dir, { recursive: true, force: true });
  }
  createdDirs = [];
  delete process.env.NEXT_PUBLIC_OS_SITE_URL;
});

async function makeTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  createdDirs.push(dir);
  return dir;
}

async function touchFile(filePath: string, contents = ""): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, "utf8");
}

// ---------------------------------------------------------------------------
// countDocsPages
// ---------------------------------------------------------------------------

test("WEB-011: countDocsPages returns 0 on a missing directory", async () => {
  const result = await countDocsPages(
    path.join(os.tmpdir(), "wo-web011-does-not-exist-" + Date.now()),
  );
  assert.equal(result, 0);
});

test("WEB-011: countDocsPages returns 0 on an empty directory", async () => {
  const dir = await makeTempDir("wo-web011-empty-docs-");
  assert.equal(await countDocsPages(dir), 0);
});

test("WEB-011: countDocsPages counts .mdx and .md files at any depth", async () => {
  const dir = await makeTempDir("wo-web011-docs-tree-");
  await touchFile(path.join(dir, "intro.mdx"));
  await touchFile(path.join(dir, "guide.md"));
  await touchFile(path.join(dir, "reference", "api.mdx"));
  await touchFile(path.join(dir, "reference", "deep", "details.md"));
  await touchFile(path.join(dir, "audiences", "operator", "start.mdx"));
  assert.equal(await countDocsPages(dir), 5);
});

test("WEB-011: countDocsPages ignores files with other extensions", async () => {
  const dir = await makeTempDir("wo-web011-docs-mixed-");
  await touchFile(path.join(dir, "intro.mdx"));
  await touchFile(path.join(dir, "data.json"));
  await touchFile(path.join(dir, "notes.txt"));
  await touchFile(path.join(dir, "image.png"));
  assert.equal(await countDocsPages(dir), 1);
});

test("WEB-011: countDocsPages on the real docs tree returns at least 1", async () => {
  // Sanity that the default-path resolution lands somewhere with
  // actual docs in the test environment. The exact count drifts
  // with content edits; we only assert it is non-zero so the test
  // does not become brittle on every doc add/remove.
  const result = await countDocsPages();
  assert.ok(result >= 1, `expected at least 1 doc page, got ${result}`);
});

// ---------------------------------------------------------------------------
// countAudioFiles
// ---------------------------------------------------------------------------

test("WEB-011: countAudioFiles returns 0 on a missing directory", async () => {
  const result = await countAudioFiles(
    path.join(os.tmpdir(), "wo-web011-does-not-exist-audio-" + Date.now()),
  );
  assert.equal(result, 0);
});

test("WEB-011: countAudioFiles returns 0 on an empty directory", async () => {
  const dir = await makeTempDir("wo-web011-empty-audio-");
  assert.equal(await countAudioFiles(dir), 0);
});

test("WEB-011: countAudioFiles counts .mp3, .m4a, .wav at any depth", async () => {
  const dir = await makeTempDir("wo-web011-audio-tree-");
  await touchFile(path.join(dir, "intro.mp3"));
  await touchFile(path.join(dir, "section", "ana.m4a"));
  await touchFile(path.join(dir, "deep", "nested", "voice.wav"));
  assert.equal(await countAudioFiles(dir), 3);
});

test("WEB-011: countAudioFiles ignores non-audio files", async () => {
  const dir = await makeTempDir("wo-web011-audio-mixed-");
  await touchFile(path.join(dir, "intro.mp3"));
  await touchFile(path.join(dir, "transcript.txt"));
  await touchFile(path.join(dir, "cover.png"));
  await touchFile(path.join(dir, "metadata.json"));
  assert.equal(await countAudioFiles(dir), 1);
});

test("WEB-011: countAudioFiles on the real audio tree returns at least 1", async () => {
  const result = await countAudioFiles();
  assert.ok(result >= 1, `expected at least 1 audio file, got ${result}`);
});

// ---------------------------------------------------------------------------
// getPublicSurfaceUrl
// ---------------------------------------------------------------------------

test("WEB-011: getPublicSurfaceUrl returns env var when set", () => {
  process.env.NEXT_PUBLIC_OS_SITE_URL = "https://staging.witnessops.com";
  assert.equal(getPublicSurfaceUrl(), "https://staging.witnessops.com");
});

test("WEB-011: getPublicSurfaceUrl trims whitespace from env var", () => {
  process.env.NEXT_PUBLIC_OS_SITE_URL = "  https://preview.witnessops.com  ";
  assert.equal(getPublicSurfaceUrl(), "https://preview.witnessops.com");
});

test("WEB-011: getPublicSurfaceUrl returns documented fallback when env var unset", () => {
  delete process.env.NEXT_PUBLIC_OS_SITE_URL;
  assert.equal(getPublicSurfaceUrl(), PUBLIC_SURFACE_URL_FALLBACK);
});

test("WEB-011: getPublicSurfaceUrl returns documented fallback when env var is empty string", () => {
  process.env.NEXT_PUBLIC_OS_SITE_URL = "";
  assert.equal(getPublicSurfaceUrl(), PUBLIC_SURFACE_URL_FALLBACK);
});

test("WEB-011: getPublicSurfaceUrl fallback constant is the production origin", () => {
  // Defensive: pin the documented fallback so a future edit cannot
  // silently change what dev/preview environments display when
  // NEXT_PUBLIC_OS_SITE_URL is unset.
  assert.equal(PUBLIC_SURFACE_URL_FALLBACK, "https://witnessops.com");
});
