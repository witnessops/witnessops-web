"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sanitizeAdminReturnTo } from "@/lib/admin-return-path";

type AuthMethod = "google" | "microsoft" | "legacy";
type MessageKind = "error" | "status" | "success";

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
      text: "Google Workspace sign-in is unavailable in this environment. Use another authorized sign-in method.",
    };
  }
  if (errorCode === "google_auth_failed") {
    return {
      kind: "error",
      text: "Google Workspace sign-in could not be completed. Try again or use another authorized sign-in method.",
    };
  }
  if (errorCode) {
    return {
      kind: "error",
      text: "Admin sign-in could not be completed. Try again or use another authorized sign-in method.",
    };
  }
  return null;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [keyValue, setKeyValue] = useState("");
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState<AuthMessage | null>(null);
  const [pendingMethod, setPendingMethod] = useState<AuthMethod | null>(null);
  const [returnTo, setReturnTo] = useState("/admin");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnTo(sanitizeAdminReturnTo(params.get("returnTo")));
    setMessage(callbackMessage(params.get("error")));
  }, []);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result.trim() : "";
      setKeyValue(content);
      setFileName(file.name);
      setMessage(
        content
          ? { kind: "status", text: "Legacy key file loaded." }
          : { kind: "error", text: "The selected key file is empty." },
      );
    };
    reader.onerror = () => {
      setKeyValue("");
      setFileName("");
      setMessage({ kind: "error", text: "The selected key file could not be read." });
    };
    reader.readAsText(file);
  }, []);

  const beginProviderSignIn = useCallback(
    (method: Exclude<AuthMethod, "legacy">) => {
      setPendingMethod(method);
      setMessage({
        kind: "status",
        text:
          method === "google"
            ? "Connecting to Google Workspace…"
            : "Connecting to Microsoft…",
      });

      if (method === "google") {
        const target = new URL("/api/admin/google/start", window.location.origin);
        target.searchParams.set("returnTo", returnTo);
        navigateAfterStatusAnnouncement(`${target.pathname}${target.search}`);
        return;
      }
      navigateAfterStatusAnnouncement("/api/admin/oidc/start");
    },
    [returnTo],
  );

  const handleLegacySubmit = useCallback(async () => {
    const key = keyValue.trim();
    if (!key) {
      setMessage({ kind: "error", text: "Enter or upload an authorized legacy key." });
      return;
    }

    setPendingMethod("legacy");
    setMessage({ kind: "status", text: "Authenticating legacy key…" });

    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });

      if (!response.ok) {
        setKeyValue("");
        setFileName("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setMessage({
          kind: "error",
          text: "Legacy key authentication was not accepted.",
        });
        setPendingMethod(null);
        return;
      }

      setMessage({ kind: "success", text: "Authenticated. Opening the admin console…" });
      router.push(returnTo);
      router.refresh();
    } catch {
      setMessage({
        kind: "error",
        text: "The authentication service could not be reached. Try again.",
      });
      setPendingMethod(null);
    }
  }, [keyValue, returnTo, router]);

  const isPending = pendingMethod !== null;

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

        .auth-methods { display: grid; gap: 10px; }

        .auth-button {
          min-height: 42px;
          width: 100%;
          border: 1px solid #34394d;
          background: #0d1018;
          color: #d7dbea;
          font: 600 12px/1.4 'IBM Plex Mono', monospace;
          letter-spacing: 0.03em;
          cursor: pointer;
        }

        .auth-button.primary {
          border-color: #ff6b35;
          background: #ff6b35;
          color: #080a10;
        }

        .auth-button.secondary:hover:not(:disabled) { border-color: #ff6b35; }
        .auth-button:disabled { cursor: wait; opacity: 0.58; }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 22px 0 16px;
          color: #60667a;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .auth-divider::before,
        .auth-divider::after {
          flex: 1;
          height: 1px;
          background: #232738;
          content: "";
        }

        .legacy-fieldset {
          display: grid;
          gap: 13px;
          margin: 0;
          padding: 0;
          border: 0;
        }

        .legacy-legend {
          margin-bottom: 5px;
          color: #8f95aa;
          font-size: 11px;
          font-weight: 600;
        }

        .field-label {
          display: block;
          margin-bottom: 6px;
          color: #b8bdcf;
          font-size: 11px;
        }

        .field-help {
          margin: 6px 0 0;
          color: #73798f;
          font-size: 10px;
          line-height: 1.5;
        }

        .file-input,
        .key-input {
          min-height: 38px;
          width: 100%;
          border: 1px solid #34394d;
          border-radius: 0;
          background: #05070c;
          color: #f0f2f8;
          font: 12px/1.4 'IBM Plex Mono', monospace;
        }

        .file-input { padding: 7px; }
        .key-input { padding: 9px 10px; }
        .key-input::placeholder { color: #676d82; }

        .auth-message {
          min-height: 34px;
          margin-top: 16px;
          padding: 8px 10px;
          border-left: 2px solid #3b4054;
          background: #05070c;
          color: #9ba1b8;
          font-size: 11px;
          line-height: 1.5;
        }

        .auth-message.error { border-left-color: #ef4444; color: #f4a3a3; }
        .auth-message.success { border-left-color: #00d47e; color: #7fe3b7; }
        .auth-message.status { border-left-color: #ff6b35; color: #c9cddd; }

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
        .auth-button:focus-visible,
        .file-input:focus-visible,
        .key-input:focus-visible {
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
        <div id="admin-shell" aria-busy={isPending}>
          <section className="auth-container" aria-labelledby="admin-login-title">
            <header className="auth-header">
              <h1 className="auth-title" id="admin-login-title">
                <span aria-hidden="true">&#x2B21;</span> WitnessOps Admin
              </h1>
              <span className="auth-status">Locked</span>
            </header>

            <div className="auth-body">
              <p className="auth-intro">
                Use an explicitly authorized organization identity. Google Workspace is the preferred sign-in method.
              </p>

              <div className="auth-methods" aria-label="Organization sign-in methods">
                <button
                  className="auth-button primary"
                  type="button"
                  disabled={isPending}
                  onClick={() => beginProviderSignIn("google")}
                >
                  {pendingMethod === "google"
                    ? "Connecting to Google Workspace…"
                    : "Continue with Google Workspace"}
                </button>
                <button
                  className="auth-button secondary"
                  type="button"
                  disabled={isPending}
                  onClick={() => beginProviderSignIn("microsoft")}
                >
                  {pendingMethod === "microsoft"
                    ? "Connecting to Microsoft…"
                    : "Continue with Microsoft"}
                </button>
              </div>

              <div className="auth-divider" aria-hidden="true">
                Temporary fallback
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleLegacySubmit();
                }}
              >
                <fieldset className="legacy-fieldset" disabled={isPending}>
                  <legend className="legacy-legend">Legacy key authentication</legend>

                  <div>
                    <label className="field-label" htmlFor="admin-key-file">
                      Legacy key file
                    </label>
                    <input
                      ref={fileInputRef}
                      className="file-input"
                      id="admin-key-file"
                      type="file"
                      accept=".witnessops-key,*"
                      aria-describedby="admin-key-file-help"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          handleFile(file);
                        }
                      }}
                    />
                    <p className="field-help" id="admin-key-file-help">
                      {fileName
                        ? `Selected file: ${fileName}`
                        : "Select an existing authorized .witnessops-key file."}
                    </p>
                  </div>

                  <div>
                    <label className="field-label" htmlFor="admin-key-value">
                      Legacy key
                    </label>
                    <input
                      className="key-input"
                      id="admin-key-value"
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Paste authorized key"
                      value={keyValue}
                      aria-describedby="admin-key-value-help"
                      aria-invalid={message?.kind === "error" && !keyValue}
                      onChange={(event) => {
                        setKeyValue(event.target.value);
                        setFileName("");
                        if (message?.kind === "error") {
                          setMessage(null);
                        }
                      }}
                    />
                    <p className="field-help" id="admin-key-value-help">
                      Use only when an organization OIDC method is unavailable.
                    </p>
                  </div>

                  <button className="auth-button secondary" type="submit">
                    {pendingMethod === "legacy"
                      ? "Authenticating legacy key…"
                      : "Authenticate with legacy key"}
                  </button>
                </fieldset>
              </form>

              <div
                className={`auth-message ${message?.kind ?? "status"}`}
                role={message?.kind === "error" ? "alert" : "status"}
                aria-live={message?.kind === "error" ? "assertive" : "polite"}
                aria-atomic="true"
              >
                {message?.text ?? "Choose an authorized sign-in method."}
              </div>
            </div>

            <footer className="auth-footer">
              Google Workspace preferred · Microsoft OIDC and legacy key retained as fallbacks
            </footer>
          </section>
        </div>
      </main>
    </>
  );
}
