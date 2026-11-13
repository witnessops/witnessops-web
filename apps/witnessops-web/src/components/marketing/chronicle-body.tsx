import Link from "next/link";
import { Fragment } from "react";

import {
  editorialBodyClass,
  editorialHeadingClass,
} from "@/components/editorial/editorial-article";
import { ChronicleIllustration } from "@/components/marketing/chronicle-illustration";
import { getChronicleArtwork } from "@/lib/chronicle-illustrations";

import {
  PUBLISHED_CHAPTERS,
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
  const illustrations = getChronicleArtwork(chapter)?.body ?? [];
  let record = 0;
  let section = "";
  return (
    <div className="chronicle-prose mt-10 text-text-secondary">
      {chunks.map((chunk, index) => {
        if (index % 2 === 1) {
          record += 1;
          const id = `R-${String(record).padStart(2, "0")}`;
          const lines = chunk.trim().split("\n");
          return (
            <Fragment key={id}>
            <figure role="group" aria-label={`Evidence record ${id} (fiction)`} className="my-10 rounded-lg border border-surface-border bg-surface-inset p-4 sm:p-6">
              <figcaption className="wo-mono-caps mb-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-brand-accent">
                <span>Evidence record · {id}</span>
                <span>Fiction</span>
              </figcaption>
              <pre className="wo-mono whitespace-pre-wrap text-text-secondary">
                {lines.map((line, lineIndex) => /^─{3,}$/.test(line.trim()) ? (
                  <span key={lineIndex} aria-hidden="true" className="chronicle-record-divider block border-t border-surface-border" />
                ) : (
                  <Fragment key={lineIndex}>{line}{lineIndex < lines.length - 1 ? "\n" : null}</Fragment>
                ))}
              </pre>
            </figure>
            {illustrations.filter((image) => image.afterRecord === record).map((image) => <ChronicleIllustration key={image.src} image={image} />)}
            </Fragment>
          );
        }
        const blocks = chunk.trim().split(/\n{2,}/).filter(Boolean);
        return <div key={`prose-${index}`}>{blocks.map((block, blockIndex) => {
          const trimmed = block.trim();
          const key = `prose-${index}-block-${blockIndex}`;
          if (trimmed.startsWith("### ")) {
            const heading = sectionHeading(trimmed);
            const completedSection = section;
            section = trimmed.replace(/^###\s+/, "");
            return (
              <Fragment key={key}>
              {illustrations.filter((image) => image.afterSection === completedSection).map((image) => <ChronicleIllustration key={image.src} image={image} />)}
              <h2 className={editorialHeadingClass}>
                {heading.num ? <span className="wo-mono-caps mb-2 block text-brand-accent">{heading.num}</span> : null}
                {heading.title}
              </h2>
              </Fragment>
            );
          }
          if (trimmed.startsWith("INCIDENT-")) {
            return <p key={key} role="note" className="wo-mono-caps mt-5 inline-block rounded-md border border-surface-border px-3 py-1 text-text-primary">{trimmed}</p>;
          }
          return <Fragment key={key}>
            <p className={editorialBodyClass}>{inlineCode(trimmed)}</p>
            {illustrations.filter((image) => image.afterParagraph === trimmed).map((image) => <ChronicleIllustration key={image.src} image={image} />)}
          </Fragment>;
        })}</div>;
      })}
    </div>
  );
}

export function ChroniclePager({ chapter }: { chapter: ChronicleChapter }) {
  const index = PUBLISHED_CHAPTERS.findIndex((item) => item.id === chapter.id);
  const previous = index > 0 ? PUBLISHED_CHAPTERS[index - 1] : null;
  const next = index >= 0 && index < PUBLISHED_CHAPTERS.length - 1 ? PUBLISHED_CHAPTERS[index + 1] : null;
  const allChronicles = () => <Link href="/chronicles" className="underline-offset-4 hover:underline">All chronicles</Link>;
  const chapterLink = (item: ChronicleChapter) => (
    <Link href={`/chronicles/${item.slug}`} className="underline-offset-4 hover:underline">{`Chapter ${item.id}`}</Link>
  );
  if (index < 0) {
    return <p className="wo-small mt-12 border-t border-surface-border pt-8 text-text-muted">{allChronicles()}</p>;
  }
  return (
    <div className="mt-12 grid gap-4 border-t border-surface-border pt-8 sm:grid-cols-2">
      <p className="wo-small text-text-muted">
        {previous ? chapterLink(previous) : allChronicles()}
      </p>
      <p className="wo-small text-text-muted sm:text-right">
        {next ? chapterLink(next) : allChronicles()}
      </p>
    </div>
  );
}
