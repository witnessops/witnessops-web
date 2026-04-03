import { SectionShell } from "@/components/shared/section-shell";

interface ProblemSectionProps {
  type: string;
  id: string;
  enabled: boolean;
  title: string;
  body: string;
  bullets: string[];
  closing: string;
}

export function ProblemSection({ id, title, body, bullets, closing }: ProblemSectionProps) {
  return (
    <SectionShell id={id} narrow>
      <div>
        <h2 className="mb-6 text-3xl font-bold text-text-primary md:text-4xl">
          {title}
        </h2>
        <p className="mb-8 text-lg leading-relaxed text-text-secondary">
          {body}
        </p>
        <ul className="mb-8 space-y-4">
          {bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex items-start gap-3 text-text-secondary"
            >
              <span className="mt-1.5 block size-2 shrink-0 rounded-full bg-signal-amber shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
              {bullet}
            </li>
          ))}
        </ul>
        <p className="text-text-muted">{closing}</p>
      </div>
    </SectionShell>
  );
}
