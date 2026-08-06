"use client";

import { useCallback, useEffect, useState } from "react";
import { sanitizeAdminReturnTo } from "@/lib/admin-return-path";

type MessageKind = "error" | "status";

interface AuthMessage {
  kind: MessageKind;
  text: string;
}

const PROVIDER_NAVIGATION_DELAY_MS = 100;

function navigateAfterStatusAnnouncement(destination: string): void {
  window.setTimeout(() => {
    window.location.assign(destination);
  }, PROVIDER_NAVIGATION_DELAY_MS);
}

function callbackMessage(errorCode: string | null): AuthMessage | null {
  if (errorCode === "google_auth_unavailable") {
    return {
      kind: "error",
      text: "Google Workspace sign-in is unavailable. Contact an authorized WitnessOps operator.",
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

export default function AdminLoginPage() {
  const [message, setMessage] = useState<AuthMessage | null>(null);
  const [pending, setPending] = useState(false);
  const [returnTo, setReturnTo] = useState("/admin");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnTo(sanitizeAdminReturnTo(params.get("returnTo")));
    setMessage(callbackMessage(params.get("error")));
  }, []);

  const beginGoogleSignIn = useCallback(() => {
    setPending(true);
    setMessage({
      kind: "status",
      text: "Connecting to Google Workspace…",
    });
    const target = new URL("/api/admin/google/start", window.location.origin);
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

        .admin-skip-link {
          position: fixed;
          left: 16px;
          top: 12px;
          z-index: 10001;
          transform: translateY(-160%);
          padding: 8px 12px;
          border: 1px solid #ff6b35;
          background: #080a10;
          color: #f0f2f8;
          font: 600 12px/1.4 'IBM Plex Mono', monospace;
          text-decoration: none;
        }

        .admin-skip-link:focus-visible { transform: translateY(0); }

        #admin-shell {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: auto;
          padding: 16px;
          background: #000;
          color: #8088a4;
          font-family: 'IBM Plex Mono', monospace;
        }

        #admin-shell::before {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px);
          content: "";
        }

        .auth-container {
          position: relative;
          z-index: 1;
          width: min(500px, 100%);
          border: 1px solid #232738;
          background: #080a10;
        }

        .auth-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 1px solid #232738;
        }

        .auth-title {
          margin: 0;
          color: #7e8299;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .auth-title span { color: #ff6b35; }

        .auth-status {
          padding: 3px 8px;
          border: 1px solid rgba(239,68,68,0.4);
          color: #f87171;
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .auth-body { padding: 28px 22px; }

        .auth-intro {
          margin: 0 0 22px;
          color: #9ba1b8;
          font-size: 12px;
          line-height: 1.65;
          text-align: center;
        }

        .auth-button {
          min-height: 42px;
          width: 100%;
          border: 1px solid #ff6b35;
          background: #ff6b35;
          color: #080a10;
          font: 600 12px/1.4 'IBM Plex Mono', monospace;
          letter-spacing: 0.03em;
          cursor: pointer;
        }

        .auth-button:disabled { cursor: wait; opacity: 0.58; }

        .auth-message {
          min-height: 34px;
          margin-top: 16px;
          padding: 8px 10px;
          border-left: 2px solid #ff6b35;
          background: #05070c;
          color: #c9cddd;
          font-size: 11px;
          line-height: 1.5;
        }

        .auth-message.error { border-left-color: #ef4444; color: #f4a3a3; }

        .auth-footer {
          padding: 12px 20px;
          border-top: 1px solid #232738;
          color: #686e82;
          font-size: 9px;
          line-height: 1.5;
          letter-spacing: 0.06em;
          text-align: center;
        }

        .admin-skip-link:focus-visible,
        .auth-button:focus-visible {
          outline: 2px solid #ff6b35;
          outline-offset: 3px;
        }

        @media (max-width: 520px) {
          #admin-shell { align-items: flex-start; padding: 10px; }
          .auth-body { padding: 22px 16px; }
          .auth-header { padding: 12px 16px; }
        }
      `}</style>

      <a className="admin-skip-link" href="#main-content">
        Skip to admin sign-in
      </a>
      <main id="main-content" tabIndex={-1}>
        <div id="admin-shell" aria-busy={pending}>
          <section className="auth-container" aria-labelledby="admin-login-title">
            <header className="auth-header">
              <h1 className="auth-title" id="admin-login-title">
                <span aria-hidden="true">&#x2B21;</span> WitnessOps Admin
              </h1>
              <span className="auth-status">Locked</span>
            </header>

            <div className="auth-body">
              <p className="auth-intro">
                Use an explicitly authorized Google Workspace identity.
              </p>

              <button
                className="auth-button"
                type="button"
                disabled={pending}
                onClick={beginGoogleSignIn}
              >
                {pending
                  ? "Connecting to Google Workspace…"
                  : "Continue with Google Workspace"}
              </button>

              <div
                className={`auth-message ${message?.kind ?? "status"}`}
                role={message?.kind === "error" ? "alert" : "status"}
                aria-live={message?.kind === "error" ? "assertive" : "polite"}
                aria-atomic="true"
              >
                {message?.text ?? "Google Workspace is the only admin sign-in method."}
              </div>
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
