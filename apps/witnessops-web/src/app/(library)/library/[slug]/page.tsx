import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  categoryLabel,
  getSkill,
  listSkills,
  listSkillVersions,
  readSkillMarkdown,
  relatedSkills,
} from "@/lib/skills/catalog";
import styles from "../skill-library.module.css";
import { SkillCopyAction } from "./skill-actions";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listSkills().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const skill = getSkill((await params).slug);
  if (!skill) return {};
  return {
    title: skill.title,
    description: skill.description,
    alternates: { canonical: `/library/${skill.slug}` },
  };
}

export default async function SkillDetailPage({ params }: Props) {
  const skill = getSkill((await params).slug);
  if (!skill) notFound();
  const markdown = readSkillMarkdown(skill.slug);
  const historicalVersions = listSkillVersions(skill.slug).filter(
    (release) => release.version !== skill.version,
  );
  const checkHref = `/verify/skill?skill=${encodeURIComponent(skill.slug)}&version=${encodeURIComponent(skill.version)}&sha256=${skill.sha256}`;
  const downloadHref = skill.conformance
    ? `/library/${skill.slug}/versions/${skill.version}/download`
    : `/library/${skill.slug}/download`;

  return (
    <main id="main-content" tabIndex={-1} className={styles.page} data-page="skill-detail">
      <header className={`${styles.frame} ${styles.detailHeader}`}>
        <div>
          <p className={styles.eyebrow}>All Skills Library · {categoryLabel(skill.category)}</p>
          <h1 className={styles.detailTitle}>{skill.name}</h1>
          <p className={styles.lead}>{skill.tagline}</p>
          <div className={styles.actions}>
            <Link href={checkHref} className={styles.actionPrimary}>Check this exact version</Link>
            <a href={downloadHref} className={styles.actionSecondary}>Download SKILL.md</a>
          </div>
        </div>
        <dl className={styles.detailFacts}>
          <div><dt>Version</dt><dd>{skill.version}</dd></div>
          <div><dt>Lifecycle</dt><dd>{skill.lifecycle}</dd></div>
          <div><dt>License</dt><dd>{skill.license}</dd></div>
          <div><dt>Published</dt><dd>{skill.publishedAt}</dd></div>
          <div><dt>Reviewed</dt><dd>{skill.reviewedAt}</dd></div>
          <div><dt>Source</dt><dd><a href="https://github.com/witnessops/witnessops-web">{skill.sourceRepository}</a><br /><code>{skill.sourcePath}</code></dd></div>
          <div><dt>Bytes</dt><dd>{skill.byteLength}</dd></div>
          <div><dt>SHA-256</dt><dd><code>{skill.sha256}</code></dd></div>
        </dl>
      </header>

      <div className={`${styles.frame} ${styles.detailBody}`}>
        <section className={styles.sourcePanel} aria-labelledby="skill-source-heading">
          <div className={styles.sourceBar}><strong id="skill-source-heading">Plain view · SKILL.md</strong><span>UTF-8 · exact download bytes</span></div>
          <pre className={styles.source}>{markdown}</pre>
        </section>
        <aside className={styles.side}>
          <section className={styles.sideCard}>
            <h2>Exact-byte actions</h2>
            <p>View, copy, download, and checker prefill all originate from the committed SKILL.md bytes identified above.</p>
            <SkillCopyAction markdown={markdown} />
          </section>
          <section className={styles.sideCard}>
            <h2>Related skills</h2>
            <ul>{relatedSkills(skill).map((item) => <li key={item.slug}><Link href={`/library/${item.slug}`}>{item.name}</Link></li>)}</ul>
          </section>
          {skill.conformance && historicalVersions.length > 0 ? (
            <section className={styles.sideCard}>
              <h2>Contract history</h2>
              <p>
                v1.0.0 initially matched a 128 KiB runtime. Later runtime source
                moved to 16 KiB without a contract update. v1.0.1 records and
                resolves that source-level drift.
              </p>
              <ul>
                <li><a href={skill.conformance.receiptHref}>Historical drift receipt</a></li>
                <li><a href={skill.conformance.contractHref}>Machine-readable v1.0.1 contract</a></li>
                <li><a href={skill.conformance.verifierHref}>Independent verifier</a></li>
                {historicalVersions.map((release) => {
                  const historicalCheckHref = `/verify/skill?skill=${encodeURIComponent(release.slug)}&version=${encodeURIComponent(release.version)}&sha256=${release.sha256}`;
                  return (
                    <li key={release.version}>
                      <a href={`/library/${release.slug}/versions/${release.version}/download`}>
                        Archived {release.version} bytes
                      </a>
                      {" · "}
                      <Link href={historicalCheckHref}>check</Link>
                    </li>
                  );
                })}
              </ul>
              <p>
                This establishes source and contract agreement only. It is not
                a safety, certification, or production-deployment claim.
              </p>
            </section>
          ) : null}
          <section className={styles.sideCard}>
            <h2>Limitation</h2>
            <p>Source transparency and a matching digest do not prove that a skill or resulting workflow is safe.</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
