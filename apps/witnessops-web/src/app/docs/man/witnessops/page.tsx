import fs from "node:fs";
import path from "node:path";
import { parseFrontmatterDocument } from "@witnessops/content";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/social-metadata";

const MAN_WITNESSOPS_PATH = path.resolve(
  process.cwd(),
  "../../content/witnessops/docs/man/witnessops.mdx",
);

function loadManPage() {
  const source = fs.readFileSync(MAN_WITNESSOPS_PATH, "utf-8");
  const { frontmatter, body } = parseFrontmatterDocument(source);
  return {
    title: frontmatter.title as string,
    description: (frontmatter.description as string) ?? "",
    draft: Boolean(frontmatter.draft),
    body,
  };
}

const MAN_WITNESSOPS_PAGE = loadManPage();

export const metadata: Metadata = {
  title: MAN_WITNESSOPS_PAGE.title,
  description: MAN_WITNESSOPS_PAGE.description,
  openGraph: {
    title: `${MAN_WITNESSOPS_PAGE.title} | WitnessOps`,
    description: MAN_WITNESSOPS_PAGE.description,
    siteName: "WitnessOps",
    type: "article",
    images: DEFAULT_OPEN_GRAPH_IMAGES,
  },
  twitter: {
    card: "summary_large_image",
    title: `${MAN_WITNESSOPS_PAGE.title} | WitnessOps`,
    description: MAN_WITNESSOPS_PAGE.description,
    images: DEFAULT_TWITTER_IMAGES,
  },
  robots: { index: false, follow: false },
};

export default function ManWitnessOps() {
  if (MAN_WITNESSOPS_PAGE.draft) {
    notFound();
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="docs-page-enter mx-auto max-w-3xl"
    >
      <pre
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          lineHeight: 1.8,
          color: "var(--color-text-secondary)",
          whiteSpace: "pre",
          overflowX: "auto",
        }}
      >
        {MAN_WITNESSOPS_PAGE.body}
      </pre>
    </main>
  );
}
