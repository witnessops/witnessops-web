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
      return <code key={index} className="font-mono text-[0.9em] text-brand-accent">{part.slice(1, -1)}</code>;
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
    <div className="chronicle-prose mt-8 max-w-[568px] space-y-6 text-[18px] leading-[30px] text-text-secondary sm:text-[20px] sm:leading-[33px]" style={{ fontFamily: "var(--font-serif)" }}>
      {chunks.map((chunk, index) => {
        if (index % 2 === 1) {
          record += 1;
          const id = `R-${String(record).padStart(2, "0")}`;
          return (
            <figure key={id} role="group" aria-label={`Evidence record ${id} (fiction)`} className="rounded-lg border border-surface-border bg-surface-inset p-6">
              <figcaption className="mb-3 flex justify-between font-mono text-xs uppercase tracking-widest text-brand-accent">
                <span>Evidence record · {id}</span>
                <span>Fiction</span>
              </figcaption>
              <pre className="overflow-x-hidden whitespace-pre-wrap font-mono text-[13px] leading-5 text-text-secondary">{chunk.trim()}</pre>
            </figure>
          );
        }
        const blocks = chunk.trim().split(/\n{2,}/).filter(Boolean);
        return <div key={`prose-${index}`} className="space-y-6">{blocks.map((block) => {
          const trimmed = block.trim();
          if (trimmed.startsWith("### ")) {
            const heading = sectionHeading(trimmed);
            return (
              <h2 key={`heading-${index}-${trimmed.slice(0, 24)}`} className="pt-6 text-center text-2xl text-text-primary" style={{ fontFamily: "var(--font-sans)", fontWeight: 600 }}>
                {heading.num ? <span className="mb-2 block font-mono text-base text-brand-accent">{heading.num}</span> : null}
                {heading.title}
              </h2>
            );
          }
          if (trimmed.startsWith("INCIDENT-")) {
            return <p key={trimmed} role="note" className="inline-block rounded-md border border-surface-border px-3 py-1 font-mono text-xs text-text-primary">{trimmed}</p>;
          }
          return <p key={trimmed}>{inlineCode(trimmed)}</p>;
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
      <p className="text-sm text-text-muted">
        {previous ? `Chapter ${previous.id}, ${previous.title}, coming soon` : <Link href="/chronicles" className="underline-offset-4 hover:underline">All chronicles</Link>}
      </p>
      <p className="text-sm text-text-muted sm:text-right">
        {`Chapter ${next.id}, ${next.title}, coming soon. Not yet linked.`}
      </p>
    </div>
  );
}
