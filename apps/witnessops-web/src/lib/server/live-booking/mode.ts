import "server-only";
import { lstatSync, realpathSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact";
import { LIVE_BOOKING_CALENDAR_ID, LIVE_BOOKING_TIME_ZONE } from "./constants";

export type LiveBookingModeName = "disabled" | "unavailable" | "ready";

export interface ReadyLiveBookingConfig {
  storeDir: string;
  publicOrigin: string;
  fromEmail: string;
  replyTo: string;
  pepper: string;
  resendApiKey: string;
  googleClientId: string;
  googleClientSecret: string;
  googleRefreshToken: string;
  calendarId: typeof LIVE_BOOKING_CALENDAR_ID;
  timeZone: typeof LIVE_BOOKING_TIME_ZONE;
}

export type ResolvedLiveBookingMode =
  | { mode: "disabled" }
  | { mode: "unavailable" }
  | { mode: "ready"; config: ReadyLiveBookingConfig };

const SECRET_MIN = 16;

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

function safeHeader(value: string): boolean {
  return value.length > 0 && value.length <= 320 && !/[\u0000-\u001F\u007F]/.test(value);
}

function bareEmail(value: string): boolean {
  return safeHeader(value) && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(value);
}

function httpsOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === value && !url.username && !url.password;
  } catch {
    return false;
  }
}

function sameOrInside(left: string, right: string): boolean {
  return left === right || left.startsWith(right + path.sep) || right.startsWith(left + path.sep);
}

function existingRealPath(candidate: string): string {
  const resolved = path.resolve(candidate);
  try {
    return realpathSync(resolved);
  } catch {
    return resolved;
  }
}

/** Reject symlink aliases and any path that resolves into the token or intake store. */
export function storeIsIsolated(storeDir: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!path.isAbsolute(storeDir)) return false;
  const resolved = path.resolve(storeDir);
  if (resolved !== storeDir && resolved !== storeDir.replace(/\/+$/, "")) return false;
  let info;
  try {
    info = lstatSync(resolved);
  } catch {
    return false;
  }
  if (info.isSymbolicLink() || !info.isDirectory()) return false;
  let real: string;
  try {
    real = realpathSync(resolved);
  } catch {
    return false;
  }
  const forbidden = [
    env.WITNESSOPS_TOKEN_STORE_DIR,
    env.WITNESSOPS_INTAKE_STORE_DIR,
    path.join(process.cwd(), ".witnessops-token-store"),
  ].filter((value): value is string => Boolean(value && value.trim()));
  return forbidden.every((candidate) => !sameOrInside(real, existingRealPath(candidate)));
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): ResolvedLiveBookingMode {
  if (env.WITNESSOPS_LIVE_BOOKING_ENABLED !== "1") return { mode: "disabled" };
  const storeDir = clean(env.WITNESSOPS_LIVE_BOOKING_STORE_DIR);
  const publicOrigin = clean(env.WITNESSOPS_LIVE_BOOKING_PUBLIC_ORIGIN);
  const fromEmail = clean(env.WITNESSOPS_LIVE_BOOKING_FROM_EMAIL);
  const replyTo = clean(env.WITNESSOPS_LIVE_BOOKING_REPLY_TO) || PUBLIC_CONTACT_EMAIL;
  const pepper = clean(env.WITNESSOPS_LIVE_BOOKING_CODE_PEPPER);
  const resendApiKey = clean(env.WITNESSOPS_RESEND_API_KEY);
  const googleClientId = clean(env.WITNESSOPS_LIVE_BOOKING_GOOGLE_CLIENT_ID);
  const googleClientSecret = clean(env.WITNESSOPS_LIVE_BOOKING_GOOGLE_CLIENT_SECRET);
  const googleRefreshToken = clean(env.WITNESSOPS_LIVE_BOOKING_GOOGLE_REFRESH_TOKEN);
  const calendarId = clean(env.WITNESSOPS_LIVE_BOOKING_CALENDAR_ID);
  const timeZone = clean(env.WITNESSOPS_LIVE_BOOKING_TIME_ZONE);
  const mailProvider = clean(env.WITNESSOPS_MAIL_PROVIDER).toLowerCase();
  const storeResolved = path.resolve(storeDir);
  const tokenStore = path.resolve(env.WITNESSOPS_TOKEN_STORE_DIR || path.join(process.cwd(), ".witnessops-token-store"));
  const complete = mailProvider === "resend"
    && path.isAbsolute(storeDir)
    && storeResolved === storeDir
    && storeIsIsolated(storeDir, env)
    && !storeResolved.startsWith(tokenStore + path.sep)
    && storeResolved !== tokenStore
    && httpsOrigin(publicOrigin)
    && bareEmail(fromEmail)
    && bareEmail(replyTo)
    && pepper.length >= 32
    && resendApiKey.length >= SECRET_MIN
    && googleClientId.length >= SECRET_MIN
    && googleClientSecret.length >= SECRET_MIN
    && googleRefreshToken.length >= SECRET_MIN
    && calendarId === LIVE_BOOKING_CALENDAR_ID
    && timeZone === LIVE_BOOKING_TIME_ZONE;
  if (!complete) return { mode: "unavailable" };
  return {
    mode: "ready",
    config: {
      storeDir,
      publicOrigin,
      fromEmail,
      replyTo,
      pepper,
      resendApiKey,
      googleClientId,
      googleClientSecret,
      googleRefreshToken,
      calendarId: LIVE_BOOKING_CALENDAR_ID,
      timeZone: LIVE_BOOKING_TIME_ZONE,
    },
  };
}

export async function resolveLiveBookingMode(env: NodeJS.ProcessEnv = process.env): Promise<ResolvedLiveBookingMode> {
  const resolved = configFromEnv(env);
  if (resolved.mode !== "ready") return resolved;
  try {
    const info = await stat(resolved.config.storeDir);
    if (!info.isDirectory()) return { mode: "unavailable" };
  } catch {
    return { mode: "unavailable" };
  }
  return resolved;
}
