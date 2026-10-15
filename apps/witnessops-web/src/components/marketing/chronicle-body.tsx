import Link from "next/link";

import {
  PUBLISHED_CHAPTERS,
  RESERVED_CHAPTERS,
  chronicleBodySource,
  type ChronicleChapter,
} from "@/lib/chronicles";

function inlineCode(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index} className="wo-mono text-brand-accent">{part.slice(1, -1)}</code>;
    }
    return <span key={index}>{part}</span>;
  });
}

function sectionHeading(line: string) {
  const heading = line.replace(/^###\s+/, "");
  const roman = heading.match(/^([IVX]+)\.\s+(.+)$/);
  if (roman) return { num: roman[1], title: roman[2] };
  const epilogue = heading.match(/^EPILOGUE\s+[—-]\s+(.+)$/);
  if (epilogue) return { num: "EPILOGUE", title: epilogue[1] };
  return { num: "", title: heading };
}

export function ChronicleBody({ chapter }: { chapter: ChronicleChapter }) {
  const source = chronicleBodySource(chapter);
  const chunks = source.split("```");
  let record = 0;
  return (
    <div className="chronicle-prose wo-prose-stack mt-8 text-text-secondary">
      {chunks.map((chunk, index) => {
        if (index % 2 === 1) {
          record += 1;
          const id = `R-${String(record).padStart(2, "0")}`;
          return (
            <figure key={id} role="group" aria-label={`Evidence record ${id} (fiction)`} className="rounded-lg border border-surface-border bg-surface-inset p-6">
              <figcaption className="wo-mono-caps mb-3 flex justify-between text-brand-accent">
                <span>Evidence record · {id}</span>
                <span>Fiction</span>
              </figcaption>
              <pre className="wo-mono overflow-x-hidden whitespace-pre-wrap text-text-secondary">{chunk.trim()}</pre>
            </figure>
          );
        }
        const blocks = chunk.trim().split(/\n{2,}/).filter(Boolean);
        return <div key={`prose-${index}`} className="wo-prose-stack">{blocks.map((block, blockIndex) => {
          const trimmed = block.trim();
          const key = `prose-${index}-block-${blockIndex}`;
          if (trimmed.startsWith("### ")) {
            const heading = sectionHeading(trimmed);
            return (
              <h2 key={key} className="wo-h3 pt-6 text-center text-text-primary">
                {heading.num ? <span className="wo-mono-caps mb-2 block text-brand-accent">{heading.num}</span> : null}
                {heading.title}
              </h2>
            );
          }
          if (trimmed.startsWith("INCIDENT-")) {
            return <p key={key} role="note" className="wo-mono-caps inline-block rounded-md border border-surface-border px-3 py-1 text-text-primary">{trimmed}</p>;
          }
          return <p key={key}>{inlineCode(trimmed)}</p>;
        })}</div>;
      })}
    </div>
  );
}

export function ChroniclePager({ chapter }: { chapter: ChronicleChapter }) {
  const index = PUBLISHED_CHAPTERS.findIndex((item) => item.id === chapter.id);
  const previous = index === 0 ? RESERVED_CHAPTERS[0] : null;
  const next = chapter.id === "001" ? RESERVED_CHAPTERS[0] : RESERVED_CHAPTERS[1];
  return (
    <div className="mt-12 grid gap-4 border-t border-surface-border pt-8 sm:grid-cols-2">
      <p className="wo-small text-text-muted">
        {previous ? `Chapter ${previous.id}, ${previous.title}, coming soon` : <Link href="/chronicles" className="underline-offset-4 hover:underline">All chronicles</Link>}
      </p>
      <p className="wo-small text-text-muted sm:text-right">
        {`Chapter ${next.id}, ${next.title}, coming soon. Not yet linked.`}
      </p>
    </div>
  );
}
