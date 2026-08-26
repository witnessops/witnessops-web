import type { Metadata } from "next";
import { SkillConsole } from "@/components/verify/skill-console";
import { SectionShell } from "@/components/shared/section-shell";

export const metadata: Metadata = {
  title: "Check a Skill",
  description:
    "Check an agent skill before you trust it. Paste or drop a SKILL.md and run Aegis deterministic policy checks in the browser.",
  robots: { index: false, follow: false },
};

export default function CheckSkillPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell narrow className="pt-10 sm:pt-14">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Check a Skill
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
          Check an agent skill before you trust it.
        </h1>
        <p className="mt-4 max-w-[36rem] text-base leading-7 text-text-secondary">
          Paste or drop a SKILL.md. Aegis runs locally in this browser. The skill
          is not uploaded, stored, or sent to a model.
        </p>
        <p className="mt-4 max-w-[36rem] text-sm leading-7 text-text-muted">
          {
            "Aegis checks a SKILL.md against explicit deterministic policy rules. A pass means no governed pattern was detected under the selected policy; it does not prove the skill is safe."
          }
        </p>

        <div className="mt-8" id="skill-console">
          <SkillConsole />
        </div>
      </SectionShell>
    </main>
  );
}
