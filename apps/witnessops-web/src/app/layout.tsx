import { getWorkspaceAppUrl } from "@/lib/workspace-access";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/shared/navbar";
import { DocumentNavigation } from "@/components/shared/document-navigation";
import documentNavigationStyles from "@/components/shared/document-navigation.module.css";
import { DocsAssistantWidget, DOCS_ASSISTANT_WIDGET_QUARANTINED } from "@/components/docs-assistant/docs-assistant-widget";
import { loadHomeContent } from "@/lib/content";
import { KonamiPenguin } from "@/components/shared/konami-penguin";
import { RouteScrollReset } from "@/components/shared/route-scroll-reset";
import {
  DOCUMENT_LANGUAGE_HEADER,
  parseDocumentLanguage,
} from "@/lib/request-language";
import { THEME_INIT_SCRIPT } from "@/lib/theme-init";
import "./globals.css";
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/social-metadata";

export const revalidate = 300;

export const metadata: Metadata = {
  title: {
    default: "WitnessOps — Security and operational reviews",
    template: "%s | WitnessOps",
  },
  description:
    "Bounded security and operational reviews with evidence references, clear limits and a practical handover. Start with a non-secret fit check.",
  metadataBase: new URL("https://witnessops.com"),
  openGraph: {
    images: DEFAULT_OPEN_GRAPH_IMAGES,
    title: "WitnessOps — Security and operational reviews",
    description:
      "Bounded security and operational reviews with evidence references, clear limits and a practical handover.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    images: DEFAULT_TWITTER_IMAGES,
    card: "summary_large_image",
    title: "WitnessOps — Security and operational reviews",
    description:
      "Bounded security and operational reviews with evidence references, clear limits and a practical handover.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16" },
      { url: "/brand/witnessops-logo-system-v1/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/witnessops-logo-system-v1/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/witnessops-logo-system-v1/favicon/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/brand/witnessops-logo-system-v1/favicon/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2EEE4" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0C0B" },
  ],
};

function fontPreloads(language: string) {
  return (
    <>
      <link rel="preload" href="/fonts/inter-400.woff2" as="font" type="font/woff2" crossOrigin="" />
      <link rel="preload" href="/fonts/inter-300.woff2" as="font" type="font/woff2" crossOrigin="" />
      {language === "pl" ? (
        <>
          <link rel="preload" href="/fonts/inter-400-latin-ext.woff2" as="font" type="font/woff2" crossOrigin="" />
          <link rel="preload" href="/fonts/inter-300-latin-ext.woff2" as="font" type="font/woff2" crossOrigin="" />
        </>
      ) : null}
    </>
  );
}

const appShellStyle: React.CSSProperties = {
  scrollPaddingTop: "calc(var(--app-navbar-height) + 16px)",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = loadHomeContent();
  const headerStore = await headers();
  const documentLanguage = parseDocumentLanguage(
    headerStore.get(DOCUMENT_LANGUAGE_HEADER),
  );

  const localWorkspace = headerStore.get("x-witnessops-local-workspace");
  if (localWorkspace === "proofpack" || localWorkspace === "external-check") {
    return (
      <html lang={documentLanguage} data-theme="light" style={appShellStyle} suppressHydrationWarning>
        <head>
          <meta name="color-scheme" content="light dark" />
          {fontPreloads(documentLanguage)}
          <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        </head>
        <body className="min-h-screen bg-surface-bg text-text-primary antialiased">
          <a href="#main-content" className="skip-link">
            {localWorkspace === "proofpack" ? "Skip to proofpack" : "Skip to snapshot"}
          </a>
          <div className={documentNavigationStyles.chrome}>
            <DocumentNavigation>
              <Navbar
                signupUrl={getWorkspaceAppUrl("/signup")}
                appUrl={getWorkspaceAppUrl()}
                links={content.navbar.links}
                cta={content.navbar.cta}
                announcement={content.navbar.announcement}
              />
            </DocumentNavigation>
          </div>
          {children}
          <div className={documentNavigationStyles.chrome}>
            <DocumentNavigation>
              <Footer {...content.footer} appUrl={getWorkspaceAppUrl()} />
            </DocumentNavigation>
          </div>
          {localWorkspace === "external-check" && (DOCS_ASSISTANT_WIDGET_QUARANTINED ? null : <DocsAssistantWidget />)}
        </body>
      </html>
    );
  }

  return (
    <html lang={documentLanguage} data-theme="light" style={appShellStyle} suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        {fontPreloads(documentLanguage)}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <meta name="penguin" content="respect" />
        {/*

      🐧
      Respect the penguin.
      Bring receipts.

      Assume the host can lie.
      In God we trust. All others must bring receipts.

          .--.
         |o_o |
         |:_/ |
        //   \ \
       (|     | )
      /'\_   _/`\
      \___)=(___/

      controlled  → governed execution
      provable    → signed evidence chains
      bounded     → explicit trust boundaries
      fail-safe   → denial by default

      $ man witnessops

        */}
        <script src="/witnessops-manual.js" defer />
        <script src="/witnessops-analytics.js" defer />
      </head>
      <body className="min-h-screen bg-surface-bg text-text-primary antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Navbar
          signupUrl={getWorkspaceAppUrl("/signup")}
          appUrl={getWorkspaceAppUrl()}
          links={content.navbar.links}
          cta={content.navbar.cta}
          announcement={content.navbar.announcement}
        />
        <RouteScrollReset />
        {children}
        <Footer {...content.footer} appUrl={getWorkspaceAppUrl()} />
        {DOCS_ASSISTANT_WIDGET_QUARANTINED ? null : <DocsAssistantWidget />}
        <KonamiPenguin />
      </body>
    </html>
  );
}
