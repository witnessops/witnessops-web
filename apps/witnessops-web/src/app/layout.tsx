import type { Metadata } from "next";
import { getSurface } from "@witnessops/config";
import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/shared/navbar";
import { loadHomeContent } from "@/lib/content";
import { KonamiPenguin } from "@/components/shared/konami-penguin";
import { RouteScrollReset } from "@/components/shared/route-scroll-reset";
import { DocsAssistantWidget } from "@/components/docs-assistant/docs-assistant-widget";
import "./globals.css";

const surface = getSurface("witnessops");

export const revalidate = 300;

export const metadata: Metadata = {
  title: {
    default: "WITNESSOPS — Bounded Proof Packs for Technical Trust",
    template: "%s | WITNESSOPS",
  },
  description:
    "WITNESSOPS helps package scoped technical actions when boundaries, available evidence, receipt artifacts, named limits, and inspection paths can be stated.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_OS_SITE_URL ??
      surface?.canonicalUrl ??
      "https://witnessops.com",
  ),
  openGraph: {
    title: "WITNESSOPS — Bounded Proof Packs for Technical Trust",
    description:
      "WITNESSOPS helps package scoped technical actions when boundaries, available evidence, receipt artifacts, named limits, and inspection paths can be stated.",
    siteName: "WITNESSOPS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WITNESSOPS — Bounded Proof Packs for Technical Trust",
    description:
      "WITNESSOPS helps package scoped technical actions when boundaries, available evidence, receipt artifacts, named limits, and inspection paths can be stated.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const appShellStyle: React.CSSProperties & {
  "--app-navbar-height": string;
} = {
  "--app-navbar-height": "72px",
  scrollPaddingTop: "calc(var(--app-navbar-height) + 16px)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = loadHomeContent();
  const isDev = process.env.NODE_ENV === "development";

  return (
    <html lang="en" className="dark" style={appShellStyle}>
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
        <KonamiPenguin />
        {isDev && <DocsAssistantWidget />}
      </body>
    </html>
  );
}
