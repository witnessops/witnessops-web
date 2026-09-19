import {headers} from 'next/headers';
import {reportHost} from '../lib/report-host';
import { AppProviders } from "../components/app-providers";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
const sans = localFont({ src: [
  { path: "../../../witnessops-web/public/fonts/inter-400.woff2", weight: "400" },
  { path: "../../../witnessops-web/public/fonts/inter-500.woff2", weight: "500" },
  { path: "../../../witnessops-web/public/fonts/inter-600.woff2", weight: "600" },
], variable: "--app-font-sans", display: "swap" });
const mono = localFont({ src: "../../../witnessops-web/public/fonts/ibm-plex-mono-400.woff2", variable: "--app-font-mono", display: "swap" });
export const metadata: Metadata = { title: "WitnessOps · Checks", robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) { const publicReport=Boolean(reportHost((await headers()).get('host'))); return <html lang="en"><body className={`${sans.variable} ${mono.variable}`}><AppProviders publicReport={publicReport}>{children}</AppProviders></body></html>; }
