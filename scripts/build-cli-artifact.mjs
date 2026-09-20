#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageDirectory = path.join(root, 'packages/wops-cli');

function outputArgument(args) {
  if (args.length === 0) return path.join(root, 'dist/cli');
  if (args.length === 2 && args[0] === '--output' && args[1]) return path.resolve(args[1]);
  throw new Error('Use node scripts/build-cli-artifact.mjs [--output DIRECTORY].');
}

export async function buildCliArtifact(args = process.argv.slice(2)) {
  const outputDirectory = outputArgument(args);
  const metadata = JSON.parse(await readFile(path.join(packageDirectory, 'package.json'), 'utf8'));
  if (metadata.name !== '@witnessops/cli' || !/^\d+\.\d+\.\d+$/.test(metadata.version)) {
    throw new Error('Unexpected CLI package identity or version.');
  }

  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'witnessops-cli-pack-'));
  try {
    const packed = spawnSync('npm', ['pack', '--json', '--pack-destination', temporaryDirectory], {
      cwd: packageDirectory,
      encoding: 'utf8',
      env: { ...process.env, NO_UPDATE_NOTIFIER: '1' },
    });
    if (packed.status !== 0) throw new Error(`CLI archive build failed: ${packed.stderr.trim() || 'npm pack failed'}`);
    const result = JSON.parse(packed.stdout);
    if (!Array.isArray(result) || result.length !== 1 || result[0].name !== metadata.name || result[0].version !== metadata.version) {
      throw new Error('npm pack returned an unexpected package.');
    }
    const filename = result[0].filename;
    if (path.basename(filename) !== filename || !filename.endsWith(`-${metadata.version}.tgz`)) {
      throw new Error('npm pack returned an unexpected archive name.');
    }

    const source = path.join(temporaryDirectory, filename);
    const bytes = await readFile(source);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    await mkdir(outputDirectory, { recursive: true });
    const destination = path.join(outputDirectory, filename);
    await copyFile(source, destination);
    await writeFile(`${destination}.sha256`, `${sha256}  ${filename}\n`, { mode: 0o644 });
    return { destination, sha256, version: metadata.version };
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildCliArtifact()
    .then(result => {
      console.log(`Built ${result.destination}`);
      console.log(`SHA-256 ${result.sha256}`);
      console.log('Integrity metadata only; no publisher signature or release approval is claimed.');
    })
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
