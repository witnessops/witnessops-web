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
    <div className={compact ? "mt-2" : "mt-3"}>
      <p
        className="mb-1.5 text-xs uppercase tracking-wider text-text-muted"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        Sources
      </p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((source) => {
          const href = askWitnessOpsSourceHref(source);
          const target = askWitnessOpsSourceTarget(source);

          return (
            <a
              key={source.source_id}
              href={href}
              target={target === "external" ? "_blank" : undefined}
              rel={target === "external" ? "noreferrer" : undefined}
              className="rounded border border-surface-border px-2 py-0.5 text-xs text-text-muted transition-colors hover:border-brand-accent hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            >
              {source.public_label}
            </a>
          );
        })}
      </div>
    </div>
  );
}