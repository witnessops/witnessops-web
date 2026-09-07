import Link from "next/link";
import {
  askWitnessOpsSourceHref,
  askWitnessOpsSourceTarget,
  type AskWitnessOpsUiAnswer,
} from "./ask-witnessops-response";

interface Props {
  answer: AskWitnessOpsUiAnswer;
  compact?: boolean;
}

export function AskWitnessOpsSourceLinks({ answer, compact = false }: Props) {
  const sources = answer.presented_sources;
  if (sources.length === 0) {
    return null;
  }

  return (
    <details className={compact ? "mt-2" : "mt-3"}>
      <summary
        className="inline-flex min-h-8 cursor-pointer items-center text-xs text-text-muted underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        Sources ({sources.length})
      </summary>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((source) => {
          const href = askWitnessOpsSourceHref(source);
          const target = askWitnessOpsSourceTarget(source);
          const SourceLink = target === "same_site" ? Link : "a";

          return (
            <SourceLink
              key={source.source_id}
              href={href}
              target={target === "external" ? "_blank" : undefined}
              rel={target === "external" ? "noreferrer" : undefined}
              className="inline-flex min-h-8 items-center rounded border border-surface-border px-2 py-1 text-xs text-text-muted transition-colors hover:border-brand-accent hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            >
              {source.public_label}
            </SourceLink>
          );
        })}
      </div>
    </details>
  );
}
