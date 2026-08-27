import type { Metadata } from "next";
import Link from "next/link";

import { categoryLabel, listSkills } from "@/lib/skills/catalog";
import { languageAlternates } from "@/lib/public-seo";
import styles from "./skill-library.module.css";

export const metadata: Metadata = {
  title: "WitnessOps Skill Library",
  description: "Eleven first-party agent skill contracts with exact source bytes, SHA-256 digests, and a local deterministic check path.",
  alternates: languageAlternates("/library", { en: "/library", pl: "/pl/library" }),
};

export default function LibraryPage() {
  const skills = listSkills();

  return (
    <main id="main-content" tabIndex={-1} className={styles.page} data-page="skill-library">
      <header className={styles.hero}>
        <div className={styles.frame}>
          <p className={styles.eyebrow}>WitnessOps Skill Library · first-party contracts</p>
          <h1 className={styles.title}>Inspect the instructions before the agent acts.</h1>
          <p className={styles.lead}>
            Every entry is a committed SKILL.md with one exact byte sequence. Read it, copy it,
            download it, or send that exact version to the local Aegis checker.
          </p>
          <div className={styles.actions}>
            <Link className={styles.actionPrimary} href="/library/governed-agent-verifier">Open featured skill</Link>
            <Link className={styles.actionSecondary} href="/docs/how-it-works/proof-model">Read the doctrine</Link>
          </div>
          <p className={styles.boundary}>
            First-party reference contracts, not customer evidence · Apache-2.0 · no marketplace, ratings, accounts, remote fetching, or cloud skill storage.
          </p>
        </div>
      </header>

      <section className={styles.frame} aria-label="First-party skills">
        <div className={styles.grid}>
          {skills.map((skill) => (
            <Link key={skill.slug} href={`/library/${skill.slug}`} className={`${styles.card} ${skill.featured ? styles.featured : ""}`}>
              <div className={styles.cardTop}>
                <span>{categoryLabel(skill.category)}</span>
                <span>{skill.lifecycle} · v{skill.version}</span>
              </div>
              <h2>{skill.title}</h2>
              <p className={styles.cardTagline}>{skill.tagline}</p>
              <p className={styles.cardDescription}>{skill.description}</p>
              <code className={styles.cardHash}>sha256:{skill.sha256}</code>
              <span className={styles.cardCta}>Inspect exact bytes →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={`${styles.frame} ${styles.doctrine}`} aria-labelledby="skill-library-boundary">
        <p className={styles.eyebrow}>Boundary</p>
        <h2 id="skill-library-boundary">A readable contract is not a safety certification.</h2>
        <p>
          These files make declared instructions inspectable. A local policy result is bounded to
          the selected policy and supplied bytes; it does not establish that a resulting workflow,
          external tool, model, or environment is safe.
        </p>
      </section>
    </main>
  );
}
