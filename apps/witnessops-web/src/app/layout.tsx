import type { Metadata } from "next";
import { headers } from "next/headers";
import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/shared/navbar";
import { DocsAssistantWidget } from "@/components/docs-assistant/docs-assistant-widget";
import { loadHomeContent } from "@/lib/content";
import { KonamiPenguin } from "@/components/shared/konami-penguin";
import { RouteScrollReset } from "@/components/shared/route-scroll-reset";
import {
  DOCUMENT_LANGUAGE_HEADER,
  parseDocumentLanguage,
} from "@/lib/request-language";
import "./globals.css";

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
    title: "WitnessOps — Security and operational reviews",
    description:
      "Bounded security and operational reviews with evidence references, clear limits and a practical handover.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
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
    icon: [{ url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

const appShellStyle: React.CSSProperties & {
  "--app-navbar-height": string;
} = {
  "--app-navbar-height": "72px",
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

  return (
    <html lang={documentLanguage} className="dark" style={appShellStyle}>
      <head>
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
      </head>
      <body className="min-h-screen bg-surface-bg text-text-primary antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Navbar
          links={content.navbar.links}
          cta={content.navbar.cta}
          announcement={content.navbar.announcement}
        />
        <RouteScrollReset />
        {children}
        <Footer {...content.footer} />
        <DocsAssistantWidget />
        <KonamiPenguin />
      </body>
    </html>
  );
}
