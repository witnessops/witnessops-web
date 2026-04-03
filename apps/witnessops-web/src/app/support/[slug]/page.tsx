import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCanonicalAlternates } from "@witnessops/config";
import { MarkdownContent } from "@witnessops/ui/mdx";
import { loadSupportIndex, loadSupportPage } from "@/lib/content";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return loadSupportIndex().map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = loadSupportPage(slug);

  if (!doc) {
    return { title: "Support Document Not Found" };
  }

  return {
    title: doc.title,
    description: doc.description,
    alternates: getCanonicalAlternates(
      "witnessops",
      `/support/${encodeURIComponent(slug)}`,
    ),
  };
}

export default async function SupportDocumentPage({ params }: Props) {
  const { slug } = await params;
  const doc = loadSupportPage(slug);

  if (!doc) {
    notFound();
  }

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[720px] px-6 py-24">
      <Link
        href="/support"
        className="mb-8 inline-block text-sm text-text-muted hover:text-brand-accent"
      >
        &larr; Support
      </Link>

      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">
          {doc.title}
        </h1>
        <p className="mt-4 text-lg text-text-secondary">{doc.description}</p>
      </header>

      <MarkdownContent source={doc.body} />

      <p className="mt-12 text-sm text-text-muted">Source: {doc.sourcePath}</p>
    </main>
  );
}
