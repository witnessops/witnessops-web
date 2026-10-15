import styles from "../footer-pages.module.css";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SectionShell } from "@/components/shared/section-shell";
import {
  COMPANY_DETAILS,
  COMPANY_DETAILS_HREF,
  type CompanyDetailsLocale,
} from "@/lib/company-details";
import {
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_SUBJECTS,
  publicContactMailto,
} from "@/lib/public-contact";
import { canonicalUrl, languageAlternates } from "@/lib/public-seo";

export type MediaKitLocale = CompanyDetailsLocale;

function tx(locale: MediaKitLocale, en: string, pl: string): string {
  return locale === "pl" ? pl : en;
}

export const metadata: Metadata = {
  title: "Media kit",
  description:
    "Canonical WitnessOps Logo System v1, integrity metadata, public brand guidance, product screenshots and company description.",
  alternates: languageAlternates("/media-kit", {
    en: "/media-kit",
    pl: "/pl/media-kit",
  }),
  openGraph: {
    title: "Media kit | WitnessOps",
    description:
      "Canonical WitnessOps Logo System v1, integrity metadata, public brand guidance, product screenshots and company description.",
    siteName: "WitnessOps",
    type: "website",
    url: canonicalUrl("/media-kit"),
  },
  twitter: {
    card: "summary_large_image",
    title: "Media kit | WitnessOps",
    description:
      "Canonical WitnessOps Logo System v1, integrity metadata, public brand guidance, product screenshots and company description.",
  },
};

const LOGO_SYSTEM = {
  version: "v1",
  status: "Canonical production asset set",
  href: "/media-kit/logo-system-v1/WitnessOps_Logo_System_v1.zip",
  fileName: "WitnessOps_Logo_System_v1.zip",
  bytes: "1,619,826 bytes",
  sha256: "189edcf511639f5bc54f97dadaa011b9747ef81bc7e3879934784b675cdd6d53",
  manifestHref: "/media-kit/logo-system-v1/manifest.json",
  checksumsHref: "/media-kit/logo-system-v1/SHA256SUMS.txt",
  readmeHref: "/media-kit/logo-system-v1/README.md",
  brandSheetPngHref: "/media-kit/logo-system-v1/witnessops-brand-sheet.png",
  brandSheetSvgHref: "/media-kit/logo-system-v1/witnessops-brand-sheet.svg",
  clearspaceHref: "/media-kit/logo-system-v1/witnessops-clearspace.svg",
  constructionHref: "/media-kit/logo-system-v1/witnessops-construction-grid.svg",
  markConstructionHref: "/media-kit/logo-system-v1/mark-construction.json",
} as const;

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
    title: "Primary stacked logo — black",
    description: "Primary lockup for formal covers and large centred placements.",
    previewSrc: "/brand/witnessops-primary-stacked-black.svg",
    previewAlt: "Black WitnessOps primary stacked logo",
    previewWidth: 1000,
    previewHeight: 640,
    downloads: [
      {
        href: "/brand/witnessops-primary-stacked-black.svg",
        fileName: "witnessops-primary-stacked-black.svg",
        format: "SVG",
        dimensions: "1000 × 640",
      },
      {
        href: "/brand/witnessops-primary-stacked-black-1600px.png",
        fileName: "witnessops-primary-stacked-black-1600px.png",
        format: "PNG",
        dimensions: "1600 × 1024",
      },
    ],
  },
  {
    title: "Primary stacked logo — white",
    description: "Reversed primary lockup for dark formal covers and large placements.",
    previewSrc: "/brand/witnessops-primary-stacked-white.svg",
    previewAlt: "White WitnessOps primary stacked logo",
    previewWidth: 1000,
    previewHeight: 640,
    darkPreview: true,
    downloads: [
      {
        href: "/brand/witnessops-primary-stacked-white.svg",
        fileName: "witnessops-primary-stacked-white.svg",
        format: "SVG",
        dimensions: "1000 × 640",
      },
      {
        href: "/brand/witnessops-primary-stacked-white-1600px.png",
        fileName: "witnessops-primary-stacked-white-1600px.png",
        format: "PNG",
        dimensions: "1600 × 1024",
      },
    ],
  },
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
      {
        href: "/brand/witnessops-mark-black-1024px.png",
        fileName: "witnessops-mark-black-1024px.png",
        format: "PNG",
        dimensions: "1024 × 586",
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
      {
        href: "/brand/witnessops-mark-white-1024px.png",
        fileName: "witnessops-mark-white-1024px.png",
        format: "PNG",
        dimensions: "1024 × 586",
      },
    ],
  },
  {
    title: "App icon — dark",
    description: "Square dark icon for app, account and social-avatar surfaces.",
    previewSrc: "/brand/witnessops-app-icon-dark-1024px.png",
    previewAlt: "Dark square WitnessOps app icon",
    previewWidth: 1024,
    previewHeight: 1024,
    downloads: [
      {
        href: "/brand/witnessops-app-icon-dark.svg",
        fileName: "witnessops-app-icon-dark.svg",
        format: "SVG",
        dimensions: "1024 × 1024",
      },
      {
        href: "/brand/witnessops-app-icon-dark-1024px.png",
        fileName: "witnessops-app-icon-dark-1024px.png",
        format: "PNG",
        dimensions: "1024 × 1024",
      },
    ],
  },
  {
    title: "App icon — light",
    description: "Square light icon for light account and social-avatar surfaces.",
    previewSrc: "/brand/witnessops-app-icon-light-1024px.png",
    previewAlt: "Light square WitnessOps app icon",
    previewWidth: 1024,
    previewHeight: 1024,
    downloads: [
      {
        href: "/brand/witnessops-app-icon-light.svg",
        fileName: "witnessops-app-icon-light.svg",
        format: "SVG",
        dimensions: "1024 × 1024",
      },
      {
        href: "/brand/witnessops-app-icon-light-1024px.png",
        fileName: "witnessops-app-icon-light-1024px.png",
        format: "PNG",
        dimensions: "1024 × 1024",
      },
    ],
  },
];

const identityColours = [
  { name: { en: "Canonical logo black", pl: "Kanoniczna czerń logo" }, value: "#0B0D10", swatchClass: "bg-[#0B0D10]" },
  { name: { en: "Reversed logo white", pl: "Odwrócona biel logo" }, value: "#FFFFFF", swatchClass: "bg-white" },
] as const;

const interfaceColours = [
  { name: { en: "Charcoal", pl: "Węgiel" }, value: "#0B0C0B", swatchClass: "bg-[#0B0C0B]" },
  { name: { en: "Muted brass", pl: "Przygaszony mosiądz" }, value: "#B89B62", swatchClass: "bg-[#B89B62]" },
  { name: { en: "Warm ivory", pl: "Ciepła kość słoniowa" }, value: "#F5F1E8", swatchClass: "bg-[#F5F1E8]" },
] as const;

const screenshots = [
  {
    title: { en: "WitnessOps homepage — desktop", pl: "Strona główna WitnessOps — komputer" },
    description: {
      en: "The desktop homepage hero and primary public navigation.",
      pl: "Nagłówek strony głównej i główna nawigacja publiczna na komputerze.",
    },
    src: "/media-kit/witnessops-homepage-desktop.png",
    alt: {
      en: "WitnessOps desktop homepage with the headline Proof other people can check.",
      pl: "Strona główna WitnessOps na komputerze z nagłówkiem Proof other people can check.",
    },
    width: 1506,
    height: 900,
    fileName: "witnessops-homepage-desktop.png",
  },
  {
    title: { en: "WitnessOps homepage — mobile", pl: "Strona główna WitnessOps — telefon" },
    description: {
      en: "The homepage hero and compact navigation on a narrow screen.",
      pl: "Nagłówek strony głównej i zwarta nawigacja na wąskim ekranie.",
    },
    src: "/media-kit/witnessops-homepage-mobile.png",
    alt: {
      en: "WitnessOps mobile homepage with compact header and the headline Proof other people can check.",
      pl: "Strona główna WitnessOps na telefonie ze zwartym nagłówkiem i tytułem Proof other people can check.",
    },
    width: 390,
    height: 844,
    fileName: "witnessops-homepage-mobile.png",
  },
] as const;

const downloadClassName = styles.primaryDownload;
const secondaryDownloadClassName = styles.secondaryDownload;

const eyebrowClassName =
  "font-mono text-[0.68rem] font-semibold uppercase leading-6 tracking-[0.16em] text-brand-accent";
const sectionTitleClassName =
  "mt-4 max-w-[18ch] text-3xl font-semibold leading-[1.04] tracking-[-0.04em] text-text-primary sm:text-4xl lg:text-5xl";
const cardClassName =
  "min-w-0 rounded-md border border-surface-border bg-surface-card p-5 sm:p-6";

const ASSET_PL: Record<string, { title: string; description: string; alt: string }> = {
  "Primary stacked logo — black": {
    title: "Główne logo piętrowe — czarne",
    description: "Główny układ na okładki i duże, wyśrodkowane użycia.",
    alt: "Czarne główne logo piętrowe WitnessOps",
  },
  "Primary stacked logo — white": {
    title: "Główne logo piętrowe — białe",
    description: "Odwrócony główny układ na ciemne okładki i duże użycia.",
    alt: "Białe główne logo piętrowe WitnessOps",
  },
  "Horizontal logo — black": {
    title: "Logo poziome — czarne",
    description: "Na ciepłej bieli albo innym jasnym, spokojnym tle.",
    alt: "Czarne poziome logo WitnessOps",
  },
  "Horizontal logo — white": {
    title: "Logo poziome — białe",
    description: "Na czerni albo innym ciemnym tle z wyraźnym kontrastem.",
    alt: "Białe poziome logo WitnessOps",
  },
  "W mark — black": {
    title: "Znak W — czarny",
    description: "Zwarty znak na jasne tła i małe użycia.",
    alt: "Czarny geometryczny znak W WitnessOps",
  },
  "W mark — white": {
    title: "Znak W — biały",
    description: "Zwarty znak na ciemne tła i małe użycia.",
    alt: "Biały geometryczny znak W WitnessOps",
  },
  "App icon — dark": {
    title: "Ikona aplikacji — ciemna",
    description: "Kwadratowa ciemna ikona do aplikacji, konta i awatarów.",
    alt: "Ciemna kwadratowa ikona aplikacji WitnessOps",
  },
  "App icon — light": {
    title: "Ikona aplikacji — jasna",
    description: "Kwadratowa jasna ikona do jasnych kont i awatarów.",
    alt: "Jasna kwadratowa ikona aplikacji WitnessOps",
  },
};

function assetCopy(locale: MediaKitLocale, asset: BrandAsset) {
  return locale === "pl"
    ? ASSET_PL[asset.title]
    : { title: asset.title, description: asset.description, alt: asset.previewAlt };
}

function AssetDownloads({
  locale,
  title,
  downloads,
}: Pick<BrandAsset, "downloads"> & { locale: MediaKitLocale; title: string }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {downloads.map((asset) => (
        <a
          key={asset.fileName}
          href={asset.href}
          download={asset.fileName}
          aria-label={tx(
            locale,
            `Download ${title} as ${asset.format}, ${asset.dimensions}`,
            `Pobierz ${title} jako ${asset.format}, ${asset.dimensions}`,
          )}
          className={secondaryDownloadClassName}
        >
          <span className="break-words">
            {tx(locale, "Download", "Pobierz")} {asset.format} · {asset.dimensions}
          </span>
        </a>
      ))}
    </div>
  );
}

export default function MediaKitPage({
  locale = "en",
}: {
  locale?: MediaKitLocale;
}) {
  const company = COMPANY_DETAILS[locale];
  return (
    <main id="main-content" tabIndex={-1} className={`public-brand-page ${styles.mediaPage}`} data-page="media-kit">
      <SectionShell spacing="spacious" className="border-b border-surface-border">
        <div className="max-w-[760px]">
          <p className={eyebrowClassName}>{tx(locale, "WitnessOps resources", "Materiały WitnessOps")}</p>
          <h1 className="mt-5 max-w-[10ch] text-6xl font-bold leading-[0.94] tracking-[-0.06em] text-text-primary sm:text-7xl lg:text-8xl">
            {tx(locale, "Media kit", "Zestaw dla mediów")}
          </h1>
          <p className="mt-7 max-w-[42rem] text-base leading-8 text-text-secondary sm:text-lg">
            {tx(
              locale,
              "The exact Logo System v1 package, browser-ready exports, public interface colours, product screenshots and company copy for accurate references to WitnessOps.",
              "Dokładny pakiet Logo System v1, pliki gotowe do przeglądarki, kolory interfejsu, zrzuty produktu i opis spółki do wiernych odniesień do WitnessOps.",
            )}
          </p>
          <div className={`${cardClassName} mt-8`} data-media-kit-names="">
            <h2 className="text-xl font-semibold text-text-primary">
              {tx(locale, "Names", "Nazwy")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-text-secondary">
              {tx(locale, "Brand name:", "Nazwa marki:")} WitnessOps
            </p>
            <p className="mt-2 text-sm leading-7 text-text-secondary">
              {tx(locale, "Legal name:", "Nazwa prawna:")} {company.legalName}
            </p>
            <p className="mt-3 text-sm leading-7 text-text-secondary">
              {tx(
                locale,
                "Logo System v1 is the current brand master. Write the brand as WitnessOps. Use the legal name for company references. Do not redraw the mark or replace the supplied wordmark.",
                "Logo System v1 jest aktualnym wzorcem marki. Nazwę marki zapisuj jako WitnessOps. Nazwy prawnej używaj w odniesieniach do spółki. Nie przerysowuj znaku i nie zastępuj dostarczonego wordmarku.",
              )}
            </p>
            <p className="mt-3 text-sm leading-7">
              <Link href={COMPANY_DETAILS_HREF[locale]} className="inline-flex min-h-11 items-center text-brand-accent underline underline-offset-4">
                {company.heading}
              </Link>
            </p>
          </div>
        </div>
        <article
          data-ui-proof-id="logo-system-package"
          className={`${cardClassName} mt-10 grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center`}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className={eyebrowClassName}>{tx(locale, "Canonical package", "Pakiet kanoniczny")} · {LOGO_SYSTEM.version}</p>
              <span className="rounded-xs border border-brand-accent/50 bg-brand-accent/10 px-3 py-1 font-mono text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-brand-accent">
                {tx(locale, LOGO_SYSTEM.status, "Kanoniczny zestaw produkcyjny")}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-text-primary sm:text-3xl">
              WitnessOps Logo System v1
            </h2>
            <p className="mt-4 max-w-[680px] text-sm leading-7 text-text-secondary">
              {tx(
                locale,
                "Forty-six manifest payloads with forty-seven checksum entries: SVG masters, PNG exports, app icons, favicons, clearspace and construction references, plus the canonical geometry source. Use this package instead of redrawing the mark.",
                "Czterdzieści sześć plików w manifeście i czterdzieści siedem wpisów sum kontrolnych: wzorce SVG, eksporty PNG, ikony aplikacji, favicony, odstęp i siatka konstrukcyjna oraz kanoniczne źródło geometrii. Użyj tego pakietu zamiast przerysowywać znak.",
              )}
            </p>
            <p className="mt-3 max-w-[680px] text-xs leading-6 text-text-muted">
              {tx(
                locale,
                "The ZIP is the byte-for-byte package authority. Loose files below are browser-ready render copies of the supplied assets.",
                "ZIP jest wzorcem pakietu bajt w bajt. Luźne pliki poniżej to kopie tych zasobów gotowe do przeglądarki.",
              )}
            </p>
            <p className="mt-4 font-mono text-xs leading-6 text-text-muted">
              ZIP · {LOGO_SYSTEM.bytes}
            </p>
            <p className="mt-1 break-all font-mono text-xs leading-6 text-text-muted">
              SHA-256: <code className="select-all text-text-secondary">{LOGO_SYSTEM.sha256}</code>
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              {[
                [LOGO_SYSTEM.manifestHref, tx(locale, "Package manifest", "Manifest pakietu")],
                [LOGO_SYSTEM.checksumsHref, tx(locale, "File checksums", "Sumy plików")],
                [LOGO_SYSTEM.readmeHref, tx(locale, "Usage README", "README użycia")],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className={secondaryDownloadClassName}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
          <a
            href={LOGO_SYSTEM.href}
            download={LOGO_SYSTEM.fileName}
            aria-label={tx(
              locale,
              `Download complete WitnessOps Logo System v1 ZIP, ${LOGO_SYSTEM.bytes}`,
              `Pobierz kompletny ZIP WitnessOps Logo System v1, ${LOGO_SYSTEM.bytes}`,
            )}
            className={downloadClassName}
          >
            {tx(locale, "Download complete ZIP", "Pobierz kompletny ZIP")}
          </a>
        </article>
      </SectionShell>

      <SectionShell id="about" spacing="spacious" className="border-b border-surface-border">
        <div className="max-w-[760px]">
          <p className={eyebrowClassName}>{tx(locale, "About WitnessOps", "O WitnessOps")}</p>
          <h2 className={sectionTitleClassName}>{tx(locale, "One-sentence description", "Opis jednym zdaniem")}</h2>
          <p className="mt-7 text-lg leading-8 text-text-secondary">
            {tx(
              locale,
              "WitnessOps delivers bounded security and operational reviews with evidence references, clear limits and a practical handover.",
              "WitnessOps prowadzi ograniczone przeglądy bezpieczeństwa i operacyjne, z odniesieniami do dowodów, jasnymi granicami i praktycznym przekazaniem.",
            )}
          </p>
        </div>
      </SectionShell>

      <SectionShell id="logos" spacing="spacious" className="border-b border-surface-border">
        <div className="max-w-[720px]">
          <p className={eyebrowClassName}>{tx(locale, "Logos and marks", "Logotypy i znaki")}</p>
          <h2 className={sectionTitleClassName}>
            {tx(locale, "Use the supplied masters, not a redraw", "Użyj dostarczonych wzorców, nie przerysowania")}
          </h2>
          <p className="mt-6 text-base leading-8 text-text-secondary">
            {tx(
              locale,
              "Choose the black or white version that keeps clear contrast. Preserve the exact proportions, central gate and clearspace; do not add effects or unrelated symbols.",
              "Wybierz wersję czarną albo białą, która zachowuje wyraźny kontrast. Zachowaj dokładne proporcje, środkową bramę i odstęp; nie dodawaj efektów ani obcych symboli.",
            )}
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {brandAssets.map((asset) => {
            const copy = assetCopy(locale, asset);
            return (
            <article key={asset.title} className={cardClassName}>
              <div
                className={`flex min-h-48 items-center justify-center overflow-hidden rounded-md border border-surface-border p-6 ${
                  asset.darkPreview ? "bg-black" : "bg-[#FAF7F2]"
                }`}
              >
                <Image
                  src={asset.previewSrc}
                  alt={copy.alt}
                  width={asset.previewWidth}
                  height={asset.previewHeight}
                  sizes="(max-width: 767px) 80vw, 520px"
                  className="max-h-44 w-auto max-w-full object-contain"
                />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-[-0.015em] text-text-primary">{copy.title}</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{copy.description}</p>
              <AssetDownloads locale={locale} title={copy.title} downloads={asset.downloads} />
            </article>
            );
          })}
        </div>
        <figure className={`${cardClassName} mt-8`}>
          <div className="overflow-hidden rounded-md border border-surface-border bg-white p-2 sm:p-4">
            <Image
              src={LOGO_SYSTEM.brandSheetPngHref}
              alt={tx(
                locale,
                "WitnessOps Logo System v1 brand sheet showing the primary, horizontal and icon treatments with colour and minimum-size rules",
                "Arkusz marki WitnessOps Logo System v1 z układem głównym, poziomym i ikoną oraz zasadami koloru i minimalnego rozmiaru",
              )}
              width={1800}
              height={1200}
              sizes="(max-width: 767px) 90vw, 1100px"
              className="h-auto w-full object-contain"
            />
          </div>
          <figcaption className="mt-6">
            <h3 className="text-xl font-semibold tracking-[-0.02em] text-text-primary">
              {tx(locale, "Brand sheet and construction references", "Arkusz marki i odniesienia konstrukcyjne")}
            </h3>
            <p className="mt-3 max-w-[760px] text-sm leading-7 text-text-secondary">
              {tx(
                locale,
                "Clearspace is X = 1/8 of the mark height. Minimum digital widths are 24 px for the mark, 160 px for the stacked lockup and 180 px for the horizontal lockup.",
                "Odstęp X to 1/8 wysokości znaku. Minimalne szerokości cyfrowe: 24 px dla znaku, 160 px dla układu piętrowego i 180 px dla układu poziomego.",
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                [LOGO_SYSTEM.brandSheetPngHref, "witnessops-brand-sheet.png", tx(locale, "Brand sheet PNG", "Arkusz marki PNG")],
                [LOGO_SYSTEM.brandSheetSvgHref, "witnessops-brand-sheet.svg", tx(locale, "Brand sheet SVG", "Arkusz marki SVG")],
                [LOGO_SYSTEM.clearspaceHref, "witnessops-clearspace.svg", tx(locale, "Clearspace guide", "Prowadnica odstępu")],
                [LOGO_SYSTEM.constructionHref, "witnessops-construction-grid.svg", tx(locale, "Construction grid", "Siatka konstrukcyjna")],
                [LOGO_SYSTEM.markConstructionHref, "mark-construction.json", tx(locale, "Geometry JSON", "Geometria JSON")],
              ].map(([href, fileName, label]) => (
                <a
                  key={href}
                  href={href}
                  download={fileName}
                  className={secondaryDownloadClassName}
                >
                  {label}
                </a>
              ))}
            </div>
          </figcaption>
        </figure>
      </SectionShell>

      <SectionShell id="colour-and-type" spacing="spacious" className="border-b border-surface-border">
        <div className="max-w-[720px]">
          <p className={eyebrowClassName}>{tx(locale, "Brand colours and typography", "Kolory marki i typografia")}</p>
          <h2 className={sectionTitleClassName}>
            {tx(locale, "Identity first; interface second", "Najpierw tożsamość, potem interfejs")}
          </h2>
          <p className="mt-6 text-base leading-8 text-text-secondary">
            {tx(
              locale,
              "The logo identity is monochrome. The website pairs charcoal surfaces with warm ivory text and muted brass accents. These interface colours do not recolour the master identity.",
              "Tożsamość logo jest monochromatyczna. Strona łączy powierzchnie w kolorze węgla z ciepłą kością słoniową tekstu i przygaszonym mosiądzem akcentów. Te kolory interfejsu nie przemalowują wzorca tożsamości.",
            )}
          </p>
        </div>
        <h3 className="mt-10 text-lg font-semibold text-text-primary">{tx(locale, "Logo identity", "Tożsamość logo")}</h3>
        <div className="mt-4 grid max-w-[760px] gap-4 sm:grid-cols-2">
          {identityColours.map((colour) => (
            <div key={colour.value} className={cardClassName}>
              <div
                aria-hidden="true"
                className={`h-28 rounded-md border border-surface-border ${colour.swatchClass}`}
              />
              <p className="mt-4 font-semibold text-text-primary">{colour.name[locale]}</p>
              <code className="mt-1 block select-all break-all font-mono text-sm text-text-secondary">
                {colour.value}
              </code>
            </div>
          ))}
        </div>
        <h3 className="mt-8 text-lg font-semibold text-text-primary">{tx(locale, "Website interface", "Interfejs strony")}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {interfaceColours.map((colour) => (
            <div key={colour.value} className={cardClassName}>
              <div
                aria-hidden="true"
                className={`h-28 rounded-md border border-surface-border ${colour.swatchClass}`}
              />
              <p className="mt-4 font-semibold text-text-primary">{colour.name[locale]}</p>
              <code className="mt-1 block select-all break-all font-mono text-sm text-text-secondary">
                {colour.value}
              </code>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className={cardClassName}>
            <h3 className="font-semibold text-text-primary">{tx(locale, "Primary text", "Tekst podstawowy")}</h3>
            <p className="mt-3 text-xl leading-8 text-text-secondary">Inter</p>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              {tx(locale, "Used for headings, body copy and navigation.", "Do nagłówków, tekstu i nawigacji.")}
            </p>
          </article>
          <article className={cardClassName}>
            <h3 className="font-semibold text-text-primary">{tx(locale, "Technical text", "Tekst techniczny")}</h3>
            <p className="mt-3 font-mono text-lg leading-8 text-text-secondary">
              IBM Plex Mono
            </p>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              {tx(locale, "Used for technical labels, values and compact metadata.", "Do etykiet technicznych, wartości i zwięzłych metadanych.")}
            </p>
          </article>
        </div>
        <p className="mt-5 max-w-[720px] text-sm leading-7 text-text-muted">
          {tx(
            locale,
            "Brass is for restrained interface emphasis, never the logo. Font files are not offered for download here.",
            "Mosiądz służy do oszczędnego wyróżnienia w interfejsie, nigdy w logo. Plików fontów nie udostępniamy tutaj do pobrania.",
          )}
        </p>
      </SectionShell>

      <SectionShell id="screenshots" spacing="spacious" className="border-b border-surface-border">
        <div className="max-w-[720px]">
          <p className={eyebrowClassName}>{tx(locale, "Product screenshots", "Zrzuty produktu")}</p>
          <h2 className={sectionTitleClassName}>
            {tx(locale, "Website design previews", "Podgląd projektu strony")}
          </h2>
          <p className="mt-6 text-base leading-8 text-text-secondary">
            {tx(
              locale,
              "These images preview the website design. They contain no customer evidence, completed forms or private data; they do not establish what is currently deployed.",
              "Te obrazy pokazują projekt strony. Nie zawierają dowodów klientów, wypełnionych formularzy ani danych prywatnych i nie ustalają, co jest obecnie wdrożone.",
            )}
          </p>
        </div>
        <div className={styles.screenshotGrid}>
          {screenshots.map((screenshot) => (
            <figure key={screenshot.fileName} className={cardClassName}>
              <div className="overflow-hidden rounded-md border border-surface-border bg-black">
                <Image
                  src={screenshot.src}
                  unoptimized
                  loading="eager"
                  alt={screenshot.alt[locale]}
                  width={screenshot.width}
                  height={screenshot.height}
                  sizes="(max-width: 767px) 90vw, 1100px"
                  className={styles.screenshotImage}
                />
              </div>
              <figcaption className="mt-5">
                <h3 className="text-lg font-semibold text-text-primary">{screenshot.title[locale]}</h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{screenshot.description[locale]}</p>
                <a
                  href={screenshot.src}
                  download={screenshot.fileName}
                  aria-label={tx(
                    locale,
                    `Download ${screenshot.title.en} as PNG, ${screenshot.width} × ${screenshot.height}`,
                    `Pobierz ${screenshot.title.pl} jako PNG, ${screenshot.width} × ${screenshot.height}`,
                  )}
                  className={`${downloadClassName} mt-4`}
                >
                  <span className="break-words">
                    {tx(locale, "Download PNG", "Pobierz PNG")} · {screenshot.width} × {screenshot.height}
                  </span>
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      </SectionShell>

      <SectionShell id="usage-and-contact" spacing="spacious">
        <div className="max-w-[760px]">
          <p className={eyebrowClassName}>{tx(locale, "Usage and contact", "Użycie i kontakt")}</p>
          <h2 className={sectionTitleClassName}>
            {tx(locale, "Keep references accurate and the assets intact", "Odniesienia mają być wierne, a pliki nienaruszone")}
          </h2>
          <ul className="mt-7 space-y-3 text-base leading-7 text-text-secondary marker:text-brand-accent">
            <li>{tx(locale, "Do not stretch, redraw or add decorative effects to the logo or mark.", "Nie rozciągaj, nie przerysowuj i nie dodawaj ozdobnych efektów do logo ani znaku.")}</li>
            <li>{tx(locale, "Use the black or white version that preserves clear contrast.", "Użyj wersji czarnej albo białej, która zachowuje wyraźny kontrast.")}</li>
            <li>{tx(locale, "Keep at least X = 1/8 of the mark height as clearspace.", "Zachowaj co najmniej X = 1/8 wysokości znaku jako odstęp.")}</li>
            <li>{tx(locale, "Do not recolour the logo orange; the master identity is monochrome.", "Nie przemalowuj logo na pomarańczowo; wzorzec tożsamości jest monochromatyczny.")}</li>
            <li>{tx(locale, "Do not use these assets to imply certification, endorsement or customer status.", "Nie używaj tych plików, żeby sugerować certyfikację, rekomendację albo status klienta.")}</li>
          </ul>
        </div>
        <div className={`${cardClassName} mt-10 max-w-[760px]`}>
          <h3 className="font-semibold text-text-primary">{tx(locale, "General contact", "Kontakt ogólny")}</h3>
          <p className="mt-3 text-sm leading-7 text-text-secondary">
            {tx(locale, "For questions about WitnessOps or these files, contact", "W sprawach WitnessOps albo tych plików napisz na")}{" "}
            <a
              href={publicContactMailto(PUBLIC_CONTACT_SUBJECTS.general)}
              className="inline-flex min-h-11 max-w-full items-center break-all font-semibold text-brand-accent underline decoration-surface-border-strong underline-offset-4 hover:text-text-primary hover:decoration-brand-accent"
            >
              {PUBLIC_CONTACT_EMAIL}
            </a>
            . {tx(locale, "This is the general public contact, not a dedicated press inbox.", "To ogólny kontakt publiczny, a nie osobna skrzynka dla mediów.")}
          </p>
          <p className="mt-3 text-xs leading-6 text-text-muted">
            {tx(
              locale,
              "Do not send passwords, private keys, API keys, tokens, recovery codes or customer evidence.",
              "Nie wysyłaj haseł, kluczy prywatnych, kluczy API, tokenów, kodów odzyskiwania ani dowodów klientów.",
            )}
          </p>
        </div>
      </SectionShell>
    </main>
  );
}
