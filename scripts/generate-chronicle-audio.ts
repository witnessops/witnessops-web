import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { ALL_CHAPTERS, type ChronicleChapter } from "../apps/witnessops-web/src/lib/chronicles";
import {
  chronicleNarrationInputHash,
  chronicleNarrationText,
  type ChronicleNarrationAsset,
} from "../apps/witnessops-web/src/lib/chronicle-narration";

const webRoot = fileURLToPath(new URL("../apps/witnessops-web/", import.meta.url));
const audioRoot = join(webRoot, "public/audio/chronicles");
const manifestPath = join(webRoot, "src/content/chronicles/audio-manifest.json");
const endpoint = "https://api.x.ai/v1/tts";
const voices = ["orion", "eve", "rex", "sal"] as const;
const pricePerMillionCharacters = 15;
const maximumCharacters = 60_000;
const maximumAudioBytes = 100 * 1024 * 1024;

type Manifest = Record<string, ChronicleNarrationAsset>;
type Options = { generate: boolean; voice: string; chapter?: string; maxCostUsd: number };
type PlannedChapter = {
  chapter: ChronicleChapter;
  text: string;
  inputSha256: string;
  src: string;
  outputPath: string;
  cached: boolean;
};

class SafeError extends Error {}

function optionsFrom(args: string[]): Options {
  const options: Options = { generate: false, voice: "orion", maxCostUsd: 1 };
  for (const arg of args) {
    if (arg === "--generate") options.generate = true;
    else if (arg === "--dry-run") options.generate = false;
    else if (arg.startsWith("--voice=")) options.voice = arg.slice("--voice=".length);
    else if (arg.startsWith("--chapter=")) options.chapter = arg.slice("--chapter=".length);
    else if (arg.startsWith("--max-cost-usd=")) options.maxCostUsd = Number(arg.slice("--max-cost-usd=".length));
    else throw new SafeError("Unknown argument. Use --generate, --dry-run, --voice=orion|eve|rex|sal, --chapter=<chapter-id> or --max-cost-usd=1.");
  }
  if (!(voices as readonly string[]).includes(options.voice)) throw new SafeError("Unsupported voice. Use orion, eve, rex or sal.");
  if (options.chapter !== undefined) {
    if (!options.chapter.trim()) throw new SafeError("The chapter selector must not be empty.");
    if (!ALL_CHAPTERS.some((chapter) => chapter.id === options.chapter)) throw new SafeError("Unknown published chapter.");
  }
  if (!Number.isFinite(options.maxCostUsd) || options.maxCostUsd <= 0) throw new SafeError("The cost limit must be a positive USD amount.");
  return options;
}

function readManifest(): Manifest {
  if (!existsSync(manifestPath)) return {};
  let parsed: unknown;
  try { parsed = JSON.parse(readFileSync(manifestPath, "utf8")); }
  catch { throw new SafeError("The audio manifest is unreadable or invalid JSON; no generation attempted."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new SafeError("The audio manifest must be an object.");
  for (const [id, value] of Object.entries(parsed)) {
    const asset = value as Partial<ChronicleNarrationAsset> | null;
    if (!ALL_CHAPTERS.some((chapter) => chapter.id === id) || !asset ||
        typeof asset.src !== "string" || !new RegExp(`^/audio/chronicles/chapter-${id}-[a-f0-9]{12}\\.mp3$`).test(asset.src) ||
        typeof asset.voice !== "string" || typeof asset.inputSha256 !== "string" || !/^[a-f0-9]{64}$/.test(asset.inputSha256) ||
        typeof asset.audioSha256 !== "string" || !/^[a-f0-9]{64}$/.test(asset.audioSha256) ||
        typeof asset.durationSeconds !== "number" || !Number.isFinite(asset.durationSeconds) || asset.durationSeconds <= 0 ||
        typeof asset.generatedAt !== "string" || !Number.isFinite(Date.parse(asset.generatedAt))) {
      throw new SafeError(`Invalid audio manifest entry for chapter ${id}; no generation attempted.`);
    }
  }
  return parsed as Manifest;
}

function audioDuration(filePath: string): number {
  let result: { streams?: Array<{ codec_name?: string; codec_type?: string }>; format?: { duration?: string } };
  try {
    result = JSON.parse(execFileSync("ffprobe", [
      "-v", "error", "-show_entries", "stream=codec_name,codec_type:format=duration", "-of", "json", filePath,
    ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000, maxBuffer: 1024 * 1024 }));
  } catch { throw new SafeError("Audio validation failed. The generated file is retained; no automatic retry will be made."); }
  const duration = Number(result.format?.duration);
  if (!result.streams?.some((stream) => stream.codec_type === "audio" && stream.codec_name === "mp3") || !Number.isFinite(duration) || duration <= 0) {
    throw new SafeError("The audio file is not a valid, positive-duration MP3. No automatic retry will be made.");
  }
  return duration;
}

function plan(options: Options, manifest: Manifest): PlannedChapter[] {
  return ALL_CHAPTERS.filter((chapter) => options.chapter === undefined || chapter.id === options.chapter).map((chapter) => {
    const text = chronicleNarrationText(chapter);
    if (!text.length || text.length > maximumCharacters) throw new SafeError(`Chapter ${chapter.id} is outside the 1–60,000 character request limit.`);
    const inputSha256 = chronicleNarrationInputHash(chapter, options.voice);
    const src = `/audio/chronicles/chapter-${chapter.id}-${inputSha256.slice(0, 12)}.mp3`;
    const outputPath = resolve(audioRoot, `chapter-${chapter.id}-${inputSha256.slice(0, 12)}.mp3`);
    const existing = manifest[chapter.id];
    let cached = false;
    if (existing?.inputSha256 === inputSha256 && existing.voice === options.voice) {
      if (existing.src !== src || !existsSync(outputPath)) throw new SafeError(`Chapter ${chapter.id} has a matching manifest but missing or mismatched audio. Restore the asset before retrying.`);
      const hash = createHash("sha256").update(readFileSync(outputPath)).digest("hex");
      if (hash !== existing.audioSha256) throw new SafeError(`Chapter ${chapter.id} audio hash does not match. Restore the asset before retrying.`);
      const duration = audioDuration(outputPath);
      if (Math.abs(duration - existing.durationSeconds) > 0.1) throw new SafeError(`Chapter ${chapter.id} audio duration does not match its manifest.`);
      cached = true;
    } else if (existsSync(outputPath)) {
      throw new SafeError(`Chapter ${chapter.id} already has an unregistered output file. Recover its manifest before generating again.`);
    }
    if (!cached && existsSync(audioRoot)) {
      const prefix = `chapter-${chapter.id}-${inputSha256.slice(0, 12)}.mp3`;
      if (readdirSync(audioRoot).some((name) => name === `${prefix}.attempt.json` || (name.startsWith(`${prefix}.`) && name.endsWith(".partial")))) {
        throw new SafeError(`Chapter ${chapter.id} has a retained or uncertain generation attempt. Reconcile its outcome before generating again.`);
      }
    }
    return { chapter, text, inputSha256, src, outputPath, cached };
  });
}

function saveManifest(manifest: Manifest) {
  const temporaryPath = `${manifestPath}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
    renameSync(temporaryPath, manifestPath);
  } finally {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
  }
}

async function synthesize(item: PlannedChapter, options: Options, apiKey: string): Promise<ChronicleNarrationAsset> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: item.text,
        voice_id: options.voice,
        language: "en",
        output_format: { codec: "mp3", sample_rate: 24000, bit_rate: 128000 },
        speed: 1,
        text_normalization: true,
      }),
      signal: AbortSignal.timeout(180_000),
      redirect: "error",
    });
  } catch { throw new SafeError(`Chapter ${item.chapter.id}: request failed or timed out. Billing outcome is unknown; no automatic retry was made.`); }
  if (!response.ok) throw new SafeError(`Chapter ${item.chapter.id}: xAI returned HTTP ${response.status}. No automatic retry was made.`);
  const type = (response.headers.get("content-type") ?? "").split(";")[0];
  if (!type.startsWith("audio/") && type !== "application/octet-stream") throw new SafeError(`Chapter ${item.chapter.id}: xAI did not return audio. No automatic retry was made.`);
  const contentLength = Number(response.headers.get("content-length"));
  if (contentLength > maximumAudioBytes) throw new SafeError(`Chapter ${item.chapter.id}: audio exceeds the local size limit.`);
  let bytes: Buffer;
  try { bytes = Buffer.from(await response.arrayBuffer()); }
  catch { throw new SafeError(`Chapter ${item.chapter.id}: audio download failed. Billing outcome is unknown; no automatic retry was made.`); }
  if (!bytes.length || bytes.length > maximumAudioBytes) throw new SafeError(`Chapter ${item.chapter.id}: audio is empty or exceeds the local size limit.`);
  const partialPath = `${item.outputPath}.${randomUUID()}.partial`;
  writeFileSync(partialPath, bytes, { flag: "wx" });
  const durationSeconds = audioDuration(partialPath);
  if (existsSync(item.outputPath)) throw new SafeError(`Chapter ${item.chapter.id}: the destination appeared during generation; partial audio is retained.`);
  renameSync(partialPath, item.outputPath);
  return {
    src: item.src,
    voice: options.voice,
    inputSha256: item.inputSha256,
    audioSha256: createHash("sha256").update(bytes).digest("hex"),
    durationSeconds,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const options = optionsFrom(process.argv.slice(2));
  process.chdir(webRoot);
  const initialManifest = readManifest();
  const items = plan(options, initialManifest);
  const pending = items.filter((item) => !item.cached);
  const characters = pending.reduce((sum, item) => sum + item.text.length, 0);
  const estimatedCost = characters * pricePerMillionCharacters / 1_000_000;
  console.log(`${options.generate ? "Generation" : "Dry run"}: voice ${options.voice}; ${pending.length} new recording(s).`);
  for (const item of items) console.log(`Chapter ${item.chapter.id}: ${item.cached ? "cached and verified" : "missing or outdated"}; ${item.text.length.toLocaleString("en-US")} characters.`);
  console.log(`Estimated input: ${characters.toLocaleString("en-US")} characters; estimated cost USD ${estimatedCost.toFixed(4)} at USD 15 / 1M characters; limit USD ${options.maxCostUsd.toFixed(2)}.`);
  if (estimatedCost > options.maxCostUsd) throw new SafeError("Estimated cost exceeds --max-cost-usd. No requests were made.");
  if (!options.generate || pending.length === 0) return;
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) throw new SafeError("XAI_API_KEY is not set. Supply it through the environment; never put it in an argument or source file.");
  try { execFileSync("ffprobe", ["-version"], { stdio: "ignore", timeout: 10_000 }); }
  catch { throw new SafeError("ffprobe is required to validate generated MP3s before any request is made."); }
  mkdirSync(audioRoot, { recursive: true });
  mkdirSync(dirname(manifestPath), { recursive: true });
  const lockPath = join(audioRoot, ".generation.lock");
  let lock: number;
  try { lock = openSync(lockPath, "wx", 0o600); }
  catch { throw new SafeError("An audio generation lock already exists. Check the existing run before retrying."); }
  try {
    // Re-read under the lock so a completed parallel run cannot cause duplicate spend.
    const manifest = readManifest();
    const lockedItems = plan(options, manifest);
    const lockedCost = lockedItems.filter((item) => !item.cached)
      .reduce((sum, item) => sum + item.text.length, 0) * pricePerMillionCharacters / 1_000_000;
    if (lockedCost > options.maxCostUsd) throw new SafeError("The pending cost changed before generation and exceeds --max-cost-usd. No requests were made.");
    for (const item of lockedItems) {
      if (item.cached) continue;
      const attemptPath = `${item.outputPath}.attempt.json`;
      writeFileSync(attemptPath, `${JSON.stringify({ chapter: item.chapter.id, inputSha256: item.inputSha256, startedAt: new Date().toISOString() })}\n`, { flag: "wx", mode: 0o600 });
      console.log(`Generating chapter ${item.chapter.id}...`);
      const asset = await synthesize(item, options, apiKey);
      manifest[item.chapter.id] = asset;
      saveManifest(manifest);
      unlinkSync(attemptPath);
      console.log(`Saved chapter ${item.chapter.id}: ${asset.durationSeconds.toFixed(1)} seconds, verified MP3.`);
    }
  } finally {
    closeSync(lock);
    unlinkSync(lockPath);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof SafeError ? error.message : "Generation failed unexpectedly. Check retained outputs before retrying; no automatic retry was made.");
  process.exitCode = 1;
});
