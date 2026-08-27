import type { Metadata } from "next";
import Image from "next/image";
import { SectionShell } from "@/components/shared/section-shell";
import {
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_SUBJECTS,
  publicContactMailto,
} from "@/lib/public-contact";
import { canonicalUrl } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Media kit",
  description:
    "WitnessOps logos, brand colours, product screenshots, company description and general contact details.",
  alternates: { canonical: canonicalUrl("/media-kit") },
  openGraph: {
    title: "Media kit | WitnessOps",
    description:
      "WitnessOps logos, brand colours, product screenshots, company description and general contact details.",
    siteName: "WitnessOps",
    type: "website",
    url: canonicalUrl("/media-kit"),
  },
  twitter: {
    card: "summary_large_image",
    title: "Media kit | WitnessOps",
    description:
      "WitnessOps logos, brand colours, product screenshots, company description and general contact details.",
  },
};

type DownloadAsset = {
  href: string;
  fileName: string;
  format: "PNG" | "SVG";
  dimensions: string;
};

type BrandAsset = {
  title: string;
  description: string;
  previewSrc: string;
  previewAlt: string;
  previewWidth: number;
  previewHeight: number;
  darkPreview?: boolean;
  downloads: DownloadAsset[];
};

const brandAssets: BrandAsset[] = [
  {
    title: "Horizontal logo — black",
    description: "Use on warm white or another light, quiet background.",
    previewSrc: "/brand/witnessops-horizontal-black.svg",
    previewAlt: "Black WitnessOps horizontal logo",
    previewWidth: 1500,
    previewHeight: 420,
    downloads: [
      {
        href: "/brand/witnessops-horizontal-black.svg",
        fileName: "witnessops-horizontal-black.svg",
        format: "SVG",
        dimensions: "1500 × 420",
      },
      {
        href: "/brand/witnessops-horizontal-black-2400px.png",
        fileName: "witnessops-horizontal-black-2400px.png",
        format: "PNG",
        dimensions: "2400 × 672",
      },
    ],
  },
  {
    title: "Horizontal logo — white",
    description: "Use on black or another dark background with clear contrast.",
    previewSrc: "/brand/witnessops-horizontal-white.svg",
    previewAlt: "White WitnessOps horizontal logo",
    previewWidth: 1500,
    previewHeight: 420,
    darkPreview: true,
    downloads: [
      {
        href: "/brand/witnessops-horizontal-white.svg",
        fileName: "witnessops-horizontal-white.svg",
        format: "SVG",
        dimensions: "1500 × 420",
      },
      {
        href: "/brand/witnessops-horizontal-white-2400px.png",
        fileName: "witnessops-horizontal-white-2400px.png",
        format: "PNG",
        dimensions: "2400 × 672",
      },
    ],
  },
  {
    title: "W mark — black",
    description: "Compact mark for light backgrounds and small placements.",
    previewSrc: "/brand/witnessops-mark-black.svg",
    previewAlt: "Black geometric WitnessOps W mark",
    previewWidth: 746,
    previewHeight: 427,
    downloads: [
      {
        href: "/brand/witnessops-mark-black.svg",
        fileName: "witnessops-mark-black.svg",
        format: "SVG",
        dimensions: "746 × 427",
      },
    ],
  },
  {
    title: "W mark — white",
    description: "Compact mark for dark backgrounds and small placements.",
    previewSrc: "/brand/witnessops-mark-white.svg",
    previewAlt: "White geometric WitnessOps W mark",
    previewWidth: 746,
    previewHeight: 427,
    darkPreview: true,
    downloads: [
      {
        href: "/brand/witnessops-mark-white.svg",
        fileName: "witnessops-mark-white.svg",
        format: "SVG",
        dimensions: "746 × 427",
      },
    ],
  },
  {
    title: "App icon",
    description: "Square dark icon for app and account surfaces.",
    previewSrc: "/brand/witnessops-app-icon-dark-1024px.png",
    previewAlt: "Dark square WitnessOps app icon",
    previewWidth: 1024,
    previewHeight: 1024,
    darkPreview: true,
    downloads: [
      {
        href: "/brand/witnessops-app-icon-dark-1024px.png",
        fileName: "witnessops-app-icon-dark-1024px.png",
        format: "PNG",
        dimensions: "1024 × 1024",
      },
    ],
  },
  {
    title: "Company avatar",
    description: "Square company profile image for account and directory use.",
    previewSrc: "/brand/witnessops-company-avatar-400x400.png",
    previewAlt: "WitnessOps company avatar",
    previewWidth: 400,
    previewHeight: 400,
    darkPreview: true,
    downloads: [
      {
        href: "/brand/witnessops-company-avatar-400x400.png",
        fileName: "witnessops-company-avatar-400x400.png",
        format: "PNG",
        dimensions: "400 × 400",
      },
    ],
  },
];

const colours = [
  { name: "Black", value: "#000000", swatchClass: "bg-black" },
  { name: "Orange", value: "#F27A3D", swatchClass: "bg-[#F27A3D]" },
  { name: "Warm White", value: "#FAF7F2", swatchClass: "bg-[#FAF7F2]" },
] as const;

const screenshots = [
  {
    title: "WitnessOps homepage — desktop",
    description: "The desktop homepage hero and primary public navigation.",
    src: "/media-kit/witnessops-homepage-desktop.png",
    alt: "WitnessOps desktop homepage with the headline Agents act. WitnessOps proves.",
    width: 1506,
    height: 738,
    fileName: "witnessops-homepage-desktop.png",
  },
  {
    title: "WitnessOps homepage — mobile",
    description: "The homepage hero and compact navigation on a narrow screen.",
    src: "/media-kit/witnessops-homepage-mobile.png",
    alt: "WitnessOps mobile homepage with compact header and the headline Agents act. WitnessOps proves.",
    width: 390,
    height: 598,
    fileName: "witnessops-homepage-mobile.png",
  },
] as const;

const downloadClassName =
  "inline-flex min-h-[50px] max-w-full items-center justify-center rounded-lg border border-brand-accent bg-brand-accent px-5 py-2 text-center font-mono text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-text-inverse shadow-[0_8px_24px_rgba(242,122,61,0.14)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#FF8A4C] hover:shadow-[0_14px_34px_rgba(242,122,61,0.26)] active:translate-y-0 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg motion-reduce:transform-none";

const eyebrowClassName =
  "font-mono text-[0.68rem] font-semibold uppercase leading-6 tracking-[0.16em] text-brand-accent";
const sectionTitleClassName =
  "mt-4 max-w-[18ch] text-3xl font-semibold leading-[1.04] tracking-[-0.04em] text-text-primary sm:text-4xl lg:text-5xl";
const cardClassName =
  "min-w-0 rounded-xl border border-surface-border bg-surface-card p-5 shadow-[0_24px_64px_rgba(0,0,0,0.22)]";

function AssetDownloads({ title, downloads }: Pick<BrandAsset, "title" | "downloads">) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {downloads.map((asset) => (
        <a
          key={asset.fileName}
          href={asset.href}
          download={asset.fileName}
          aria-label={`Download ${title} as ${asset.format}, ${asset.dimensions}`}
          className={downloadClassName}
        >
          <span className="break-words">
            Download {asset.format} · {asset.dimensions}
          </span>
        </a>
      ))}
    </div>
  );
}

export default function MediaKitPage() {
  return (
    <main id="main-content" tabIndex={-1} className="public-brand-page" data-page="media-kit">
      <SectionShell spacing="spacious" className="border-b border-surface-border">
        <div className="max-w-[760px]">
          <p className={eyebrowClassName}>WitnessOps resources</p>
          <h1 className="mt-5 max-w-[10ch] text-6xl font-bold leading-[0.94] tracking-[-0.06em] text-text-primary sm:text-7xl lg:text-8xl">
            Media kit
          </h1>
          <p className="mt-7 max-w-[42rem] text-base leading-8 text-text-secondary sm:text-lg">
            Current public logos, colours, product screenshots and a short company
            description for accurate references to WitnessOps.
          </p>
        </div>
      </SectionShell>

      <SectionShell id="about" spacing="spacious" className="border-b border-surface-border">
        <div className="max-w-[760px]">
          <p className={eyebrowClassName}>About WitnessOps</p>
          <h2 className={sectionTitleClassName}>One-sentence description</h2>
          <p className="mt-7 text-lg leading-8 text-text-secondary">
            WitnessOps delivers bounded security and operational reviews with
            evidence references, clear limits and a practical handover.
          </p>
        </div>
      </SectionShell>

      <SectionShell id="logos" spacing="spacious" className="border-b border-surface-border">
        <div className="max-w-[720px]">
          <p className={eyebrowClassName}>Logos and marks</p>
          <h2 className={sectionTitleClassName}>
            Choose the version that keeps clear contrast
          </h2>
          <p className="mt-6 text-base leading-8 text-text-secondary">
            Preserve each asset&apos;s proportions and clear space. Do not add
            shadows, bevels, neon effects or unrelated symbols.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {brandAssets.map((asset) => (
            <article key={asset.title} className={cardClassName}>
              <div
                className={`flex min-h-48 items-center justify-center overflow-hidden rounded-md border border-surface-border p-6 ${
                  asset.darkPreview ? "bg-black" : "bg-[#FAF7F2]"
                }`}
              >
                <Image
                  src={asset.previewSrc}
                  alt={asset.previewAlt}
                  width={asset.previewWidth}
                  height={asset.previewHeight}
                  sizes="(max-width: 767px) 80vw, 520px"
                  className="max-h-44 w-auto max-w-full object-contain"
                />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-[-0.015em] text-text-primary">{asset.title}</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{asset.description}</p>
              <AssetDownloads title={asset.title} downloads={asset.downloads} />
            </article>
          ))}
        </div>
      </SectionShell>

      <SectionShell id="colour-and-type" spacing="spacious" className="border-b border-surface-border">
        <div className="max-w-[720px]">
          <p className={eyebrowClassName}>Brand colours and typography</p>
          <h2 className={sectionTitleClassName}>
            A restrained public system
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {colours.map((colour) => (
            <div key={colour.name} className={cardClassName}>
              <div
                aria-hidden="true"
                className={`h-28 rounded-md border border-surface-border ${colour.swatchClass}`}
              />
              <p className="mt-4 font-semibold text-text-primary">{colour.name}</p>
              <code className="mt-1 block select-all break-all font-mono text-sm text-text-secondary">
                {colour.value}
              </code>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className={cardClassName}>
            <h3 className="font-semibold text-text-primary">Primary text</h3>
            <p className="mt-3 text-xl leading-8 text-text-secondary">Inter</p>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Used for headings, body copy and navigation.
            </p>
          </article>
          <article className={cardClassName}>
            <h3 className="font-semibold text-text-primary">Technical text</h3>
            <p className="mt-3 font-mono text-lg leading-8 text-text-secondary">
              IBM Plex Mono
            </p>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Used for technical labels, values and compact metadata.
            </p>
          </article>
        </div>
        <p className="mt-5 max-w-[720px] text-sm leading-7 text-text-muted">
          Orange is for functional emphasis. Font files are not offered for download here.
        </p>
      </SectionShell>

      <SectionShell id="screenshots" spacing="spacious" className="border-b border-surface-border">
        <div className="max-w-[720px]">
          <p className={eyebrowClassName}>Product screenshots</p>
          <h2 className={sectionTitleClassName}>
            Current public surfaces
          </h2>
          <p className="mt-6 text-base leading-8 text-text-secondary">
            These images show the public website without customer evidence, filled forms or private data.
          </p>
        </div>
        <div className="mt-10 grid gap-6">
          {screenshots.map((screenshot) => (
            <figure key={screenshot.fileName} className={cardClassName}>
              <div className="overflow-hidden rounded-md border border-surface-border bg-black">
                <Image
                  src={screenshot.src}
                  alt={screenshot.alt}
                  width={screenshot.width}
                  height={screenshot.height}
                  sizes="(max-width: 767px) 90vw, 1100px"
                  className="h-auto w-full object-contain"
                />
              </div>
              <figcaption className="mt-5">
                <h3 className="text-lg font-semibold text-text-primary">{screenshot.title}</h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{screenshot.description}</p>
                <a
                  href={screenshot.src}
                  download={screenshot.fileName}
                  aria-label={`Download ${screenshot.title} as PNG, ${screenshot.width} × ${screenshot.height}`}
                  className={`${downloadClassName} mt-4`}
                >
                  <span className="break-words">
                    Download PNG · {screenshot.width} × {screenshot.height}
                  </span>
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      </SectionShell>

      <SectionShell id="usage-and-contact" spacing="spacious">
        <div className="max-w-[760px]">
          <p className={eyebrowClassName}>Usage and contact</p>
          <h2 className={sectionTitleClassName}>
            Keep references accurate and the assets intact
          </h2>
          <ul className="mt-7 space-y-3 text-base leading-7 text-text-secondary marker:text-brand-accent">
            <li>Do not stretch, redraw or add decorative effects to the logo or mark.</li>
            <li>Use the black or white version that preserves clear contrast.</li>
            <li>Do not use these assets to imply certification, endorsement or customer status.</li>
          </ul>
        </div>
        <div className={`${cardClassName} mt-10 max-w-[760px]`}>
          <h3 className="font-semibold text-text-primary">General contact</h3>
          <p className="mt-3 text-sm leading-7 text-text-secondary">
            For questions about WitnessOps or these files, contact{" "}
            <a
              href={publicContactMailto(PUBLIC_CONTACT_SUBJECTS.general)}
              className="inline-flex min-h-11 max-w-full items-center break-all font-semibold text-brand-accent underline decoration-surface-border-strong underline-offset-4 hover:text-text-primary hover:decoration-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
            >
              {PUBLIC_CONTACT_EMAIL}
            </a>
            . This is the general public contact, not a dedicated press inbox.
          </p>
          <p className="mt-3 text-xs leading-6 text-text-muted">
            Do not send passwords, private keys, API keys, tokens, recovery codes or customer evidence.
          </p>
        </div>
      </SectionShell>
    </main>
  );
}
