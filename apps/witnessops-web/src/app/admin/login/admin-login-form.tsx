"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { sanitizeAdminReturnTo } from "@/lib/admin-return-path";

type MessageKind = "error" | "status";
type PendingProvider = "google" | "entra" | null;

interface AuthMessage {
  kind: MessageKind;
  text: string;
}

const PROVIDER_NAVIGATION_DELAY_MS = 100;
const SIGN_IN_REQUIRED_TEXT = "Sign in to continue.";

function navigateAfterStatusAnnouncement(destination: string): void {
  window.setTimeout(() => {
    window.location.assign(destination);
  }, PROVIDER_NAVIGATION_DELAY_MS);
}

function callbackMessage(
  errorCode: string | null,
  entraEnabled: boolean,
): AuthMessage | null {
  if (errorCode === "google_auth_unavailable") {
    return {
      kind: "error",
      text: "Google Workspace sign-in is unavailable. Contact an authorized WitnessOps operator.",
    };
  }
  if (errorCode === "entra_not_configured") {
    return {
      kind: "error",
      text: entraEnabled
        ? "Microsoft Entra sign-in is not configured."
        : "That admin sign-in method is not configured.",
    };
  }
  if (errorCode === "entra_auth_failed") {
    return {
      kind: "error",
      text: entraEnabled
        ? "Microsoft Entra sign-in could not be completed. Try again or contact an authorized WitnessOps operator."
        : "Google Workspace sign-in could not be completed. Try again or contact an authorized WitnessOps operator.",
    };
  }
  if (errorCode) {
    return {
      kind: "error",
      text: "Google Workspace sign-in could not be completed. Try again or contact an authorized WitnessOps operator.",
    };
  }
  return null;
}

export function AdminLoginForm({ entraEnabled }: { entraEnabled: boolean }) {
  const [message, setMessage] = useState<AuthMessage | null>(null);
  const [pendingProvider, setPendingProvider] = useState<PendingProvider>(null);
  const [returnTo, setReturnTo] = useState("/admin");
  const startedRef = useRef(false);
  const pending = pendingProvider !== null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnTo(sanitizeAdminReturnTo(params.get("returnTo")));
    setMessage(callbackMessage(params.get("error"), entraEnabled));
    if (!params.get("error") && params.has("returnTo")) {
      setMessage({ kind: "status", text: SIGN_IN_REQUIRED_TEXT });
    }
  }, [entraEnabled]);

  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        startedRef.current = false;
        setPendingProvider(null);
        setMessage(null);
      }
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const beginGoogleSignIn = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setPendingProvider("google");
    setMessage({
      kind: "status",
      text: "Connecting to Google Workspace…",
    });
    const target = new URL("/api/admin/google/start", window.location.origin);
    target.searchParams.set("returnTo", returnTo);
    navigateAfterStatusAnnouncement(`${target.pathname}${target.search}`);
  }, [returnTo]);

  const beginEntraSignIn = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setPendingProvider("entra");
    setMessage({
      kind: "status",
      text: "Connecting to Microsoft Entra…",
    });
    const target = new URL("/api/admin/entra/start", window.location.origin);
    target.searchParams.set("returnTo", returnTo);
    navigateAfterStatusAnnouncement(`${target.pathname}${target.search}`);
  }, [returnTo]);

  return (
    <>
      <style>{`
body { overflow: hidden !important; }
body > .skip-link,
body > nav,
body > footer { display: none !important; }

/* ── tokens: LIGHT is the default; DARK follows prefers-color-scheme (CSS only, no JS, no storage) ── */
#admin-shell {
  --lg-page: #F3F3EF;       --lg-card: #FFFFFF;        --lg-card-line: #D9D9D0;
  --lg-band: #0B0D10;       --lg-band-line: #0B0D10;   --lg-band-text: #F7F7F4;
  --lg-band-muted: #C3BFB6; --lg-band-ctl: #6F6E64;    --lg-bar: #B89B62;
  --lg-text: #17191C;       --lg-text-2: #50555B;      --lg-muted: #5B5F57;
  --lg-accent: #6C5631;     --lg-accent-h: #594626;    --lg-accent-a: #4A3A1F;   --lg-on-accent: #FFFFFF;
  --lg-sec-bg: #FFFFFF;     --lg-sec-line: #6C5631;    --lg-sec-text: #6C5631;
  --lg-sec-h-bg: #EFE6D0;   --lg-sec-h-text: #4A3A1F;
  --lg-dis-bg: #E4E4DC;     --lg-dis-line: #6A6E65;    --lg-dis-text: #5B5F57;
  --lg-rose: #8B4B48;       --lg-rose-tint: #F7ECEA;
  --lg-note-bg: #F7F7F3;    --lg-note-line: #8F8F86;   --lg-note-accent: #6C5631;
  --lg-focus: #6C5631;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  #admin-shell {
    --lg-page: #0B0C0B;     --lg-card: #121310;        --lg-card-line: #4C432D;
    --lg-band: #0F100E;     --lg-band-line: #2F302B;   --lg-band-text: #F5F1E8;
    --lg-band-muted: #C3BFB6; --lg-band-ctl: #6F6E64;  --lg-bar: #B89B62;
    --lg-text: #F5F1E8;     --lg-text-2: #C3BFB6;      --lg-muted: #A7A399;
    --lg-accent: #B89B62;   --lg-accent-h: #CBB27D;    --lg-accent-a: #A68B57;   --lg-on-accent: #0B0C0B;
    --lg-sec-bg: #121310;   --lg-sec-line: #B89B62;    --lg-sec-text: #B89B62;
    --lg-sec-h-bg: #26231A; --lg-sec-h-text: #CBB27D;
    --lg-dis-bg: #1A1B17;   --lg-dis-line: #6F6E64;    --lg-dis-text: #A7A399;
    --lg-rose: #F28B93;     --lg-rose-tint: #2A1819;
    --lg-note-bg: #1A1B17;  --lg-note-line: #6F6E64;   --lg-note-accent: #B89B62;
    --lg-focus: #B89B62;
  }
}

.admin-skip-link {
  position: fixed; left: 16px; top: 12px; z-index: 10001; transform: translateY(-160%);
  padding: 8px 12px; border: 1px solid #B89B62; border-radius: 4px;
  background: #0B0D10; color: #F7F7F4;
  font: 500 12px/18px var(--font-mono), "IBM Plex Mono", monospace; text-decoration: none;
}
.admin-skip-link:focus-visible { transform: translateY(0); }

#admin-shell {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: flex-start; justify-content: center;
  overflow: auto; padding: clamp(16px, 12vh, 96px) 16px 16px;
  background: var(--lg-page); color: var(--lg-text-2);
  font: 400 14px/20px var(--font-sans), "Inter", system-ui, "Segoe UI", Arial, sans-serif;
}

.auth-container {
  position: relative; width: min(480px, 100%);
  border: 1px solid var(--lg-card-line); border-radius: 6px; background: var(--lg-card);
}

.auth-header {
  position: relative; display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 0 20px;
  border-bottom: 1px solid var(--lg-band-line); border-radius: 5px 5px 0 0; background: var(--lg-band);
}
.auth-mark { display: block; flex: none; width: 32px; height: 18px; }
.auth-title {
  margin: 0; color: var(--lg-band-text);
  font: 500 13px/20px var(--font-sans), "Inter", system-ui, sans-serif;
  letter-spacing: 0.14em; text-transform: uppercase;
}
.auth-status {
  margin-left: auto; padding: 2px 8px; border: 1px solid var(--lg-band-ctl); border-radius: 4px; color: var(--lg-band-muted);
  font: 500 12px/16px var(--font-mono), "IBM Plex Mono", monospace; letter-spacing: 0.1em; text-transform: uppercase;
}

.auth-body { padding: 24px 24px 20px; }
.auth-intro { margin: 0 0 20px; color: var(--lg-text); font-size: 16px; line-height: 24px; text-align: left; }

.auth-button {
  display: flex; align-items: center; justify-content: center; width: 100%; min-height: 44px; padding: 10px 16px;
  border: 1px solid var(--lg-accent); border-radius: 4px; background: var(--lg-accent); color: var(--lg-on-accent);
  font: 500 14px/20px var(--font-sans), "Inter", system-ui, sans-serif; text-align: center; cursor: pointer;
}
.auth-button:hover:not(:disabled) { background: var(--lg-accent-h); border-color: var(--lg-accent-h); }
.auth-button:active:not(:disabled) { background: var(--lg-accent-a); border-color: var(--lg-accent-a); }
.auth-button-secondary { margin-top: 12px; border-color: var(--lg-sec-line); background: var(--lg-sec-bg); color: var(--lg-sec-text); }
.auth-button-secondary:hover:not(:disabled) { border-color: var(--lg-sec-line); background: var(--lg-sec-h-bg); color: var(--lg-sec-h-text); }
.auth-button-secondary:active:not(:disabled) { border-color: var(--lg-sec-line); background: var(--lg-sec-h-bg); color: var(--lg-sec-h-text); }
/* the other button while a sign-in is starting: reads "off" without relying on colour (dashed) */
.auth-button:disabled { border-style: dashed; border-color: var(--lg-dis-line); background: var(--lg-dis-bg); color: var(--lg-dis-text); cursor: not-allowed; }
/* the clicked button keeps its normal look: "in progress", not "off" */
.auth-button[data-pending="true"]:disabled { border-style: solid; border-color: var(--lg-accent); background: var(--lg-accent); color: var(--lg-on-accent); cursor: wait; }
.auth-button-secondary[data-pending="true"]:disabled { border-color: var(--lg-sec-line); background: var(--lg-sec-bg); color: var(--lg-sec-text); }

.auth-message {
  display: flex; gap: 10px; margin-top: 16px; padding: 12px 14px;
  border: 1px solid var(--lg-note-line); border-left: 3px solid var(--lg-note-accent); border-radius: 4px;
  background: var(--lg-note-bg); color: var(--lg-text); font-size: 14px; line-height: 20px;
}
.auth-message:empty { margin: 0; padding: 0; border: 0; }
.auth-message.error { border-color: var(--lg-rose); background: var(--lg-rose-tint); }
.auth-message-icon {
  flex: none; display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; margin-top: 1px;
  border: 1.5px solid var(--lg-rose); border-radius: 50%; color: var(--lg-rose);
  font: 500 12px/1 var(--font-mono), "IBM Plex Mono", monospace;
}

.auth-method { margin: 16px 0 0; color: var(--lg-muted); font: 400 12px/18px var(--font-mono), "IBM Plex Mono", monospace; }

.auth-footer { padding: 12px 24px; border-top: 1px solid var(--lg-card-line); color: var(--lg-muted); font-size: 12px; line-height: 18px; }

/* starting a sign-in: 2px brass bar on the header's lower edge; text states are the real signal */
#admin-shell[aria-busy="true"] .auth-header::after {
  content: ""; position: absolute; left: 0; bottom: -1px; width: 40%; height: 2px; background: var(--lg-bar);
  animation: auth-progress 1.2s ease-in-out infinite;
}
@keyframes auth-progress { 0% { left: 0; width: 0; } 50% { left: 0; width: 60%; } 100% { left: 100%; width: 0; } }
@media (prefers-reduced-motion: reduce) {
  #admin-shell[aria-busy="true"] .auth-header::after { animation: none; width: 100%; }
}

.admin-skip-link:focus-visible,
.auth-button:focus-visible { outline: 2px solid var(--lg-focus); outline-offset: 3px; }

@media (max-width: 520px) {
  #admin-shell { padding: 16px 12px 12px; }
  .auth-header { padding: 0 16px; }
  .auth-body { padding: 20px 16px 16px; }
  .auth-footer { padding: 12px 16px; }
  .auth-button { min-height: 48px; }
}
@media (forced-colors: active) {
  .auth-button, .auth-message, .auth-status { border: 1px solid CanvasText; }
  .auth-button:disabled { border-style: dashed; }
}
      `}</style>

      <a className="admin-skip-link" href="#main-content">
        Skip to admin sign-in
      </a>
      <main id="main-content" tabIndex={-1}>
        <div id="admin-shell" aria-busy={pending}>
          <section className="auth-container" aria-labelledby="admin-login-title">
            <header className="auth-header">
              <Image
                className="auth-mark"
                src="/brand/witnessops-logo-system-v1/svg/witnessops-mark-white.svg"
                alt=""
                width={32}
                height={18}
                priority
              />
              <h1 className="auth-title" id="admin-login-title">
                WitnessOps Admin
              </h1>
              <span className="auth-status">Locked</span>
            </header>

            <div className="auth-body">
              <p className="auth-intro">
                {entraEnabled
                  ? "Use an explicitly authorized Google Workspace or Microsoft Entra identity."
                  : "Use an explicitly authorized Google Workspace identity."}
              </p>

              <button
                className="auth-button"
                type="button"
                disabled={pending}
                data-pending={pendingProvider === "google" ? "true" : undefined}
                onClick={beginGoogleSignIn}
              >
                {pendingProvider === "google"
                  ? "Connecting to Google Workspace…"
                  : "Continue with Google Workspace"}
              </button>

              {entraEnabled ? (
                <button
                  className="auth-button auth-button-secondary"
                  type="button"
                  disabled={pending}
                  data-pending={pendingProvider === "entra" ? "true" : undefined}
                  onClick={beginEntraSignIn}
                >
                  {pendingProvider === "entra"
                    ? "Connecting to Microsoft Entra…"
                    : "Continue with Microsoft Entra"}
                </button>
              ) : null}

              <div
                className={`auth-message ${message?.kind ?? "status"}`}
                role={message?.kind === "error" ? "alert" : "status"}
                aria-live={message?.kind === "error" ? "assertive" : "polite"}
                aria-atomic="true"
              >
                {message ? (
                  <>
                    {message.kind === "error" ? (
                      <span className="auth-message-icon" aria-hidden="true">!</span>
                    ) : null}
                    <span>{message.text}</span>
                  </>
                ) : null}
              </div>
              <p className="auth-method">
                {entraEnabled
                  ? "Google Workspace remains the default admin sign-in method."
                  : "Google Workspace is the only admin sign-in method."}
              </p>
            </div>

            <footer className="auth-footer">
              Explicit Workspace domain and operator allowlist required
            </footer>
          </section>
        </div>
      </main>
    </>
  );
}
