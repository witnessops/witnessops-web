import { createHash } from "node:crypto";

import audioManifest from "@/content/chronicles/audio-manifest.json";
import { CHRONICLE_FICTION_LABEL, chronicleBodySource, type ChronicleChapter } from "@/lib/chronicles";

export type ChronicleNarrationAsset = {
  src: string;
  voice: string;
  inputSha256: string;
  audioSha256: string;
  durationSeconds: number;
  generatedAt: string;
};

/** Narrate the published reading text, including its fiction boundary and records. */
export function chronicleNarrationText(chapter: ChronicleChapter): string {
  const body = chronicleBodySource(chapter)
    .replace(/```([^]*?)```/g, (_match, record: string) => `\nEvidence record.\n${record.trim()}\nEnd of record.\n`)
    .replace(/^\s*[─━═_\-]{3,}\s*$/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\.{3,}/g, ". ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return [
    chapter.id === "2040"
      ? "The Sovereign Chronicles. Receipts from the Future. 2040."
      : `The Sovereign Chronicles. Chapter ${Number(chapter.id)}.`,
    chapter.title,
    chapter.subtitle,
    CHRONICLE_FICTION_LABEL,
    body,
  ].filter(Boolean).join("\n\n");
}

/** Binds a stored recording to the exact narration text and synthesis settings. */
export function chronicleNarrationInputHash(chapter: ChronicleChapter, voice: string): string {
  return createHash("sha256").update(JSON.stringify({
    version: 1,
    text: chronicleNarrationText(chapter),
    voice,
    language: "en",
    codec: "mp3",
    sampleRate: 24000,
    bitRate: 128000,
    speed: 1,
    textNormalization: true,
  })).digest("hex");
}

export function getChronicleNarration(chapter: ChronicleChapter): ChronicleNarrationAsset | null {
  const asset = (audioManifest as Record<string, ChronicleNarrationAsset | undefined>)[chapter.id];
  if (!asset || !Number.isFinite(asset.durationSeconds) || asset.durationSeconds <= 0) return null;
  const expectedHash = chronicleNarrationInputHash(chapter, asset.voice);
  if (asset.inputSha256 !== expectedHash) return null;
  if (asset.src !== `/audio/chronicles/chapter-${chapter.id}-${expectedHash.slice(0, 12)}.mp3`) return null;
  if (!/^[a-f0-9]{64}$/.test(asset.audioSha256)) return null;
  return asset;
}
