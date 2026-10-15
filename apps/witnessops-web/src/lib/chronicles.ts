import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const CHRONICLE_FICTION_LABEL =
  "A story from the WitnessOps desk. Fiction; events dramatised.";

export const CHRONICLE_SERIES_INTRO =
  "Short fiction from the WitnessOps desk about agents, authority and the records they leave behind.";

const BRANDS: Array<[RegExp, string]> = [
  [/ChatGPT/g, "the coordinator"],
  [/Cursor/g, "the editor"],
  [/Grok/g, "the researcher"],
  [/Slack/g, "the chat room"],
  [/Facebook/g, "the social network"],
  [/GitHub/g, "the code host"],
  [/Jira/g, "the ticket tracker"],
  [/Solitaire/g, "a card game"],
  [/Git hook/g, "version-control hook"],
  [/\bGit\b/g, "version control"],
];

/** Shipped preview text. Brand names stay out. The attendance row uses Sovereign Dot. */
export function chroniclePreviewText(source: string): string {
  const attendance = source.replace("Grok / Sovereign Bot", "Grok / Sovereign Dot");
  return BRANDS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), attendance)
    .replace(/\\~/g, "~");
}

export type ChronicleChapter = {
  id: "001" | "003";
  slug: string;
  number: string;
  kicker: string;
  title: string;
  subtitle?: string;
  dateline: string;
  meta: string;
  description: string;
  sourceFile: string;
  dropLines: string[];
};

export const PUBLISHED_CHAPTERS: readonly ChronicleChapter[] = [
  {
    id: "001",
    slug: "001-the-unauthorized-feline",
    number: "001",
    kicker: "THE SOVEREIGN CHRONICLES · CHAPTER I",
    title: "CAT-001: The Unauthorized Feline",
    dateline: "WitnessOps Headquarters · 17:23 · An otherwise normal Tuesday",
    meta: "CH-001 · FICTION · 3 MIN READ",
    description: "A story from the WitnessOps desk about an unauthorized feline and the record it left.",
    sourceFile: "chapter-001.md",
    dropLines: [
      "WitnessOps Headquarters · 17:23 · An otherwise normal Tuesday",
    ],
  },
  {
    id: "003",
    slug: "003-the-meeting-nobody-authorized",
    number: "003",
    kicker: "THE SOVEREIGN CHRONICLES · CHAPTER III",
    title: "The Meeting That Nobody Authorized but Everybody Attended",
    subtitle: "An Incident in Distributed Artificial Intelligence",
    dateline: "WitnessOps Headquarters · 15 October 2026 · 02:40 Warsaw Time",
    meta: "CH-003 · FICTION · 8 MIN READ",
    description: "A story from the WitnessOps desk about a meeting nobody authorized.",
    sourceFile: "chapter-003.md",
    dropLines: [
      "An Incident in Distributed Artificial Intelligence",
      "WitnessOps Headquarters · 15 October 2026 · 02:40 Warsaw Time",
    ],
  },
] as const;

export const RESERVED_CHAPTERS = [
  {
    id: "002",
    title: "Sir Whiskers Opens a Pull Request",
    teaser: "Nobody knows how. Not even the code host.",
  },
  {
    id: "004",
    title: "The Agent Who Scheduled a Meeting With Himself",
    teaser: "Nobody attends. Somehow, four action items are created.",
  },
] as const;

export function readChronicleSource(fileName: string): string {
  return readFileSync(resolve(process.cwd(), "src/content/chronicles", fileName), "utf8");
}

export function chronicleBodySource(chapter: ChronicleChapter): string {
  let text = chroniclePreviewText(readChronicleSource(chapter.sourceFile));
  text = text.replace(/^# .+\n+/, "");
  text = text.replace(/^#{2,3} .+\n+/, "");
  for (const line of chapter.dropLines) {
    text = text.replace(`${line}\n`, "");
  }
  return text.trim();
}

export function chronicleJsonLd(chapter: ChronicleChapter) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: chapter.title,
    genre: "Fiction",
    description: chapter.description,
    isPartOf: {
      "@type": "CreativeWorkSeries",
      name: "The Sovereign Chronicles",
    },
    publisher: {
      "@type": "Organization",
      name: "WitnessOps",
    },
  };
}
