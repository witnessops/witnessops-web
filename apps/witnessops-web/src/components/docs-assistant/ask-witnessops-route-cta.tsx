import Link from "next/link";

import {
  askWitnessOpsRouteLabel,
  type AskWitnessOpsUiAnswer,
} from "./ask-witnessops-response";

interface Props {
  answer: AskWitnessOpsUiAnswer;
  compact?: boolean;
}

export function AskWitnessOpsRouteCta({ answer, compact = false }: Props) {
  const route = answer.route;
  if (!route) {
    return null;
  }

  const label = askWitnessOpsRouteLabel(route.route_id);
  const className = compact
    ? "mt-2 inline-flex rounded border border-brand-accent px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-accent transition-colors hover:bg-brand-accent/10"
    : "mt-3 inline-flex rounded border border-brand-accent px-3 py-2 text-xs font-semibold uppercase tracking-wider text-brand-accent transition-colors hover:bg-brand-accent/10";

  if (route.href.startsWith("/")) {
    return (
      <Link href={route.href} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <a
      href={route.href}
      target="_blank"
      rel="noreferrer"
      className={className}
    >
      {label}
    </a>
  );
}
