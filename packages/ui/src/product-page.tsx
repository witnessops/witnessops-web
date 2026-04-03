import type { ReactNode } from "react";
import { Badge } from "./badge";
import { Button } from "./button";
import { Card } from "./card";

type ActionVariant = "primary" | "secondary" | "ghost";

export interface ProductAction {
  label: string;
  href: string;
  variant?: ActionVariant;
}

export interface ProductCardItem {
  eyebrow?: string;
  title: string;
  body: string;
  footer?: string;
}

export interface ProductFlowStep {
  step: string;
  title: string;
  body: string;
  note?: string;
}

interface ProductHeroProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ProductAction[];
  aside?: ReactNode;
  className?: string;
}

interface ProductSectionProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

interface ProductCardGridProps {
  items: ProductCardItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

interface ProductFlowProps {
  steps: ProductFlowStep[];
  className?: string;
}

interface ProductExampleFrameProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

interface ProductCtaRailProps {
  title: string;
  description: string;
  actions: ProductAction[];
  note?: string;
  className?: string;
}

const gridClasses: Record<NonNullable<ProductCardGridProps["columns"]>, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 xl:grid-cols-3",
  4: "md:grid-cols-2 xl:grid-cols-4",
};

export function ProductHero({
  eyebrow,
  title,
  description,
  actions = [],
  aside,
  className = "",
}: ProductHeroProps) {
  if (!aside) {
    return (
      <header className={className}>
        {eyebrow && (
          <Badge variant="signal" className="mb-4">
            {eyebrow}
          </Badge>
        )}
        <h1 className="max-w-[14ch] text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-[720px] text-lg leading-8 text-text-secondary">
          {description}
        </p>
        {actions.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-3">
            {actions.map((action) => (
              <Button
                key={`${action.href}:${action.label}`}
                href={action.href}
                variant={action.variant ?? "secondary"}
                size="md"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </header>
    );
  }

  return (
    <header
      className={`grid gap-8 lg:grid-cols-[minmax(0,1.618fr)_minmax(300px,1fr)] lg:items-start ${className}`}
    >
      <div>
        {eyebrow && (
          <Badge variant="signal" className="mb-4">
            {eyebrow}
          </Badge>
        )}
        <h1 className="max-w-[14ch] text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-[720px] text-lg leading-8 text-text-secondary">
          {description}
        </p>
        {actions.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-3">
            {actions.map((action) => (
              <Button
                key={`${action.href}:${action.label}`}
                href={action.href}
                variant={action.variant ?? "secondary"}
                size="md"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
      <div>{aside}</div>
    </header>
  );
}

export function ProductSection({
  eyebrow,
  title,
  description,
  children,
  className = "",
}: ProductSectionProps) {
  return (
    <section className={`space-y-6 ${className}`}>
      <div className="max-w-[820px]">
        {eyebrow && (
          <Badge variant="outline" className="mb-4">
            {eyebrow}
          </Badge>
        )}
        <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-3 text-base leading-7 text-text-secondary md:text-lg">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

export function ProductCardGrid({
  items,
  columns = 3,
  className = "",
}: ProductCardGridProps) {
  return (
    <div className={`grid gap-6 ${gridClasses[columns]} ${className}`}>
      {items.map((item) => (
        <Card
          key={`${item.title}:${item.eyebrow ?? ""}`}
          className="h-full border-surface-border/80 bg-surface-card/90"
        >
          {item.eyebrow && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
              {item.eyebrow}
            </p>
          )}
          <h3 className="text-lg font-semibold text-text-primary">{item.title}</h3>
          <p className="mt-3 text-sm leading-6 text-text-secondary">{item.body}</p>
          {item.footer && (
            <p className="mt-4 text-sm font-medium text-text-muted">{item.footer}</p>
          )}
        </Card>
      ))}
    </div>
  );
}

export function ProductFlow({ steps, className = "" }: ProductFlowProps) {
  return (
    <ol className={`space-y-4 ${className}`}>
      {steps.map((step) => (
        <li key={`${step.step}:${step.title}`}>
          <Card className="border-surface-border/80 bg-surface-card/90">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand-accent/30 bg-brand-accent/5 font-mono text-sm font-semibold text-brand-accent">
                {step.step}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-text-primary">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {step.body}
                </p>
                {step.note && (
                  <p className="mt-3 text-sm font-medium text-text-muted">
                    {step.note}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </li>
      ))}
    </ol>
  );
}

export function ProductExampleFrame({
  eyebrow,
  title,
  description,
  children,
  className = "",
}: ProductExampleFrameProps) {
  return (
    <Card
      className={`border-brand-accent/20 bg-gradient-to-br from-surface-card to-surface-bg-alt ${className}`}
    >
      {eyebrow && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
          {eyebrow}
        </p>
      )}
      <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="mt-3 max-w-[760px] text-sm leading-6 text-text-secondary">
          {description}
        </p>
      )}
      <div className="mt-6">{children}</div>
    </Card>
  );
}

export function ProductCtaRail({
  title,
  description,
  actions,
  note,
  className = "",
}: ProductCtaRailProps) {
  return (
    <Card className={`border-brand-accent/20 bg-surface-card ${className}`}>
      <h2 className="text-2xl font-semibold text-text-primary">{title}</h2>
      <p className="mt-3 max-w-[720px] text-base leading-7 text-text-secondary">
        {description}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {actions.map((action) => (
          <Button
            key={`${action.href}:${action.label}`}
            href={action.href}
            variant={action.variant ?? "secondary"}
            size="md"
          >
            {action.label}
          </Button>
        ))}
      </div>
      {note && <p className="mt-4 text-sm text-text-muted">{note}</p>}
    </Card>
  );
}
