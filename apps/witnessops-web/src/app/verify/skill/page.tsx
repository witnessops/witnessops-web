import type { Metadata } from "next";
import { SkillConsole } from "@/components/verify/skill-console";
import styles from "@/components/verify/skill-console.module.css";

export const metadata: Metadata = {
  title: "Check a Skill",
  description:
    "Check an agent skill before you trust it. Paste or drop a SKILL.md and run Aegis deterministic policy checks in the browser.",
  robots: { index: false, follow: false },
};

export default function CheckSkillPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={styles.page}
      data-page="skill-check"
      data-ui-proof-id="skill-check-page"
    >
      <section className={styles.heroSection}>
        <div className={`${styles.frame} ${styles.heroFrame}`}>
          <header className={styles.heroCopy}>
            <p className={styles.eyebrow}>Before execution · Aegis by WitnessOps</p>
            <h1 className={styles.heroTitle}>
              Check an agent skill before you trust it.
            </h1>
            <p className={styles.heroBody}>
              Paste or drop a SKILL.md. Aegis runs locally in this browser. The
              skill is not uploaded, stored, or sent to a model.
            </p>
            <p className={styles.heroLimit}>
              {
                "Aegis checks a SKILL.md against explicit deterministic policy rules. A pass means no governed pattern was detected under the selected policy; it does not prove the skill is safe."
              }
            </p>
          </header>

          <aside
            className={styles.boundaryPanel}
            aria-label="Local verification boundary"
            data-ui-proof-id="skill-local-boundary"
          >
            <div className={styles.panelHeader}>
              <span>Local verification boundary</span>
              <span>01</span>
            </div>
            <dl className={styles.boundaryRows}>
              <div>
                <dt>Input</dt>
                <dd>One SKILL.md</dd>
              </div>
              <div>
                <dt>Processing</dt>
                <dd>This browser</dd>
              </div>
              <div>
                <dt>Storage</dt>
                <dd>None</dd>
              </div>
              <div>
                <dt>Model calls</dt>
                <dd>None</dd>
              </div>
            </dl>
            <p className={styles.boundaryNote}>
              Deterministic policy output · bounded to declared instructions
            </p>
          </aside>
        </div>
      </section>

      <section className={styles.workspaceSection} aria-label="Aegis skill evaluation workspace">
        <div className={styles.frame} id="skill-console">
          <SkillConsole />
        </div>
      </section>
    </main>
  );
}
