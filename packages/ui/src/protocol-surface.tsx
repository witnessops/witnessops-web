import type { ReactNode } from "react";

export type ProtocolSurfaceTone = "vaultmesh" | "attest";

type ProtocolSurfaceHeaderProps = {
  tone: ProtocolSurfaceTone;
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
};

type ProtocolSurfacePanelProps = {
  tone: ProtocolSurfaceTone;
  children: ReactNode;
  className?: string;
};

type ProtocolSurfaceStateProps = {
  tone: ProtocolSurfaceTone;
  title: string;
  description?: string;
  className?: string;
};

type ProtocolRecordFact = {
  label: string;
  value: ReactNode;
  valueClassName?: string;
};

type ProtocolRecordHeaderProps = {
  tone: ProtocolSurfaceTone;
  backHref: string;
  backLabel: string;
  eyebrow: string;
  label: string;
  uri: string;
  title: string;
  description?: string;
  facts?: ProtocolRecordFact[];
  className?: string;
};

type ProtocolMetadataPanelProps = {
  tone: ProtocolSurfaceTone;
  title: string;
  children: ReactNode;
  className?: string;
};

const toneStyles = {
  vaultmesh: {
    header: "border-b border-white/10 pb-5",
    eyebrow: "text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300",
    title: "mt-2 text-3xl font-semibold tracking-[-0.03em] text-white",
    description: "mt-2 text-sm text-neutral-400",
    panel:
      "rounded-[1.5rem] border border-white/10 bg-white/[0.03]",
    stateTitle: "text-sm font-medium text-neutral-200",
    stateDescription: "mt-1 text-sm text-neutral-500",
    backLink: "text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 hover:text-cyan-300",
    recordLabel: "mt-2 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500",
    uriPanel: "mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4",
    uriLabel: "text-xs font-medium text-neutral-500",
    uriValue: "mt-1 break-all font-mono text-xs text-neutral-400",
    recordTitle: "mt-5 text-3xl font-semibold tracking-[-0.03em] text-white lg:text-4xl",
    recordDescription: "mt-4 max-w-3xl text-base leading-7 text-neutral-300",
    factsGrid: "mt-6 grid gap-x-8 gap-y-4 md:grid-cols-4",
    factLabel: "text-xs font-medium text-neutral-500",
    factValue: "mt-1 text-sm text-neutral-200",
    metadataTitle: "text-sm font-medium text-neutral-500",
  },
  attest: {
    header: "border-b border-surface-border pb-5",
    eyebrow: "text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-accent",
    title: "mt-2 text-3xl font-semibold tracking-tight text-text-primary",
    description: "mt-2 text-sm text-text-secondary",
    panel: "rounded-lg border border-surface-border bg-surface-card",
    stateTitle: "text-sm font-medium text-text-secondary",
    stateDescription: "mt-1 text-sm text-text-muted",
    backLink: "inline-block text-sm text-text-muted hover:text-brand-accent",
    recordLabel: "mt-2 text-xs font-medium uppercase tracking-[0.12em] text-text-muted",
    uriPanel: "mt-4 rounded-lg border border-surface-border bg-surface-bg/70 px-5 py-4",
    uriLabel: "text-xs font-medium text-text-muted",
    uriValue: "mt-1 break-all font-mono text-xs text-text-secondary",
    recordTitle: "mt-5 text-4xl font-bold text-text-primary",
    recordDescription: "mt-4 text-lg text-text-secondary",
    factsGrid: "mt-6 grid gap-4 md:grid-cols-4",
    factLabel: "text-xs font-medium text-text-muted",
    factValue: "mt-2 text-sm text-text-secondary",
    metadataTitle: "text-sm font-medium text-text-muted",
  },
} as const;

function joinClasses(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function ProtocolSurfaceHeader({
  tone,
  eyebrow,
  title,
  description,
  className,
}: ProtocolSurfaceHeaderProps) {
  const styles = toneStyles[tone];

  return (
    <header className={joinClasses(styles.header, className)}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 className={styles.title}>{title}</h1>
      {description ? <p className={styles.description}>{description}</p> : null}
    </header>
  );
}

export function ProtocolSurfacePanel({ tone, children, className }: ProtocolSurfacePanelProps) {
  return <div className={joinClasses(toneStyles[tone].panel, className)}>{children}</div>;
}

export function ProtocolSurfaceState({
  tone,
  title,
  description,
  className,
}: ProtocolSurfaceStateProps) {
  const styles = toneStyles[tone];

  return (
    <ProtocolSurfacePanel tone={tone} className={joinClasses("px-5 py-8", className)}>
      <p className={styles.stateTitle}>{title}</p>
      {description ? <p className={styles.stateDescription}>{description}</p> : null}
    </ProtocolSurfacePanel>
  );
}

export function ProtocolRecordHeader({
  tone,
  backHref,
  backLabel,
  eyebrow,
  label,
  uri,
  title,
  description,
  facts,
  className,
}: ProtocolRecordHeaderProps) {
  const styles = toneStyles[tone];

  return (
    <div className={className}>
      <a href={backHref} className={styles.backLink}>
        {backLabel}
      </a>
      <header className={joinClasses("mt-6", styles.header)}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <p className={styles.recordLabel}>{label}</p>
        <div className={styles.uriPanel}>
          <div className={styles.uriLabel}>Bundle URI</div>
          <div className={styles.uriValue}>{uri}</div>
        </div>
        <h1 className={styles.recordTitle}>{title}</h1>
        {description ? <p className={styles.recordDescription}>{description}</p> : null}

        {facts?.length ? (
          <div className={styles.factsGrid}>
            {facts.map((fact) => (
              <div key={fact.label}>
                <div className={styles.factLabel}>{fact.label}</div>
                <div className={joinClasses(styles.factValue, fact.valueClassName)}>{fact.value}</div>
              </div>
            ))}
          </div>
        ) : null}
      </header>
    </div>
  );
}

export function ProtocolMetadataPanel({
  tone,
  title,
  children,
  className,
}: ProtocolMetadataPanelProps) {
  const styles = toneStyles[tone];

  return (
    <ProtocolSurfacePanel tone={tone} className={joinClasses("p-6", className)}>
      <p className={styles.metadataTitle}>{title}</p>
      {children}
    </ProtocolSurfacePanel>
  );
}
