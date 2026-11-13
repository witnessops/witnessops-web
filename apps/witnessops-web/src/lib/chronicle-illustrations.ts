import illustrations from "@/content/chronicles/illustrations.json";
import type { ChronicleChapter } from "@/lib/chronicles";

export type ChronicleIllustration = {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
  sha256: string;
  position?: string;
};

export type ChronicleBodyIllustration = ChronicleIllustration & {
  afterRecord?: number;
  afterParagraph?: string;
  afterSection?: string;
};

export type ChronicleArtwork = {
  hero: ChronicleIllustration;
  body: ChronicleBodyIllustration[];
};

/** Supplied illustrative artwork; the chapter manuscripts remain the narration source. */
export function getChronicleArtwork(chapter: ChronicleChapter): ChronicleArtwork | null {
  return (illustrations as Partial<Record<ChronicleChapter["id"], ChronicleArtwork>>)[chapter.id] ?? null;
}
