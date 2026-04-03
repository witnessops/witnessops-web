import { SectionShell } from "@/components/shared/section-shell";

interface PositioningSectionProps {
  type: string;
  id: string;
  enabled: boolean;
  title: string;
  body: string;
  points: string[];
}

export function PositioningSection({ id, title, body, points }: PositioningSectionProps) {
  return (
    <SectionShell id={id} narrow>
      <div className="text-center">
        <h2 className="mb-6 text-3xl font-bold text-text-primary">
          {title}
        </h2>
        <p className="mb-8 text-lg text-text-secondary">
          {body}
        </p>
        <ul className="space-y-3">
          {points.map((point) => (
            <li key={point} className="text-text-muted">
              {point}
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}
