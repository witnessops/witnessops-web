"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
export default function AdminLoginPage() {
  const router = useRouter();
  const [keyValue, setKeyValue] = useState("");
  const [message, setMessage] = useState<{
    text: string;
    type: "error" | "success" | "";
  }>({ text: "", type: "" });
  const [fileName, setFileName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = (reader.result as string).trim();
      setKeyValue(content);
      setFileName(file.name);
      setMessage({ text: "", type: "" });
    };
    reader.readAsText(file);
  }, []);

  const handleMicrosoftSignIn = useCallback(() => {
    window.location.href = "/api/admin/oidc/start";
  }, []);

  const handleSubmit = async () => {
    if (!keyValue) {
      setMessage({ text: "No key provided.", type: "error" });
      return;
    }

    setMessage({ text: "Authenticating...", type: "" });

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyValue }),
      });

      if (res.ok) {
        setMessage({ text: "Authenticated.", type: "success" });
        setTimeout(() => router.push("/admin"), 400);
      } else {
        setMessage({ text: "\uD83D\uDC27 Penguin holds the keys.", type: "error" });
        setKeyValue("");
        setFileName("");
      }
    } catch {
      setMessage({ text: "Authentication request failed.", type: "error" });
    }
  };

  return (
    <>
      <style>{`
        body { overflow: hidden !important; }
        .skip-link { display: none !important; }
        nav, footer { display: none !important; }

        #admin-shell {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #000;
          font-family: 'IBM Plex Mono', monospace;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 16px;
          color: #8088a4;
        }

        #admin-shell::before {
          content: "";
          position: fixed;
          inset: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px);
          pointer-events: none;
          z-index: 1;
        }

        .auth-container {
          position: relative;
          z-index: 2;
          width: min(480px, 100%);
          max-height: 100%;
          border: 1px solid #232738;
          background: #080a10;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .auth-header {
          padding: 14px 20px;
          border-bottom: 1px solid #232738;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .auth-title {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #52556a;
        }

        .auth-title span { color: #ff6b35; }

        .auth-status {
          font-size: 8px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 2px 8px;
          border: 1px solid;
          color: #ef4444;
          border-color: rgba(239,68,68,0.3);
        }

        .auth-body {
          padding: 32px 20px;
          text-align: center;
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
        }

        .auth-glyph {
          font-size: 32px;
          margin-bottom: 16px;
          user-select: none;
          filter: grayscale(1) brightness(0.5);
        }

        .auth-instruction {
          font-size: 11px;
          color: #52556a;
          line-height: 1.7;
          margin-bottom: 24px;
          letter-spacing: 0.04em;
        }

        .auth-instruction code {
          color: #ff6b35;
          background: rgba(255,107,53,0.08);
          padding: 1px 6px;
        }

        .auth-subnote {
          font-size: 9px;
          color: #52556a;
          line-height: 1.7;
          margin-bottom: 18px;
          letter-spacing: 0.04em;
        }

        .drop-zone {
          border: 1px dashed #232738;
          padding: 28px;
          transition: all 0.2s;
          cursor: pointer;
          position: relative;
          margin-bottom: 16px;
        }

        .drop-zone:hover,
        .drop-zone.dragover {
          border-color: #ff6b35;
          background: rgba(255,107,53,0.03);
        }

        .drop-zone.loaded {
          border-color: #00d47e;
        }

        .drop-zone-text {
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #52556a;
        }

        .drop-zone.dragover .drop-zone-text { color: #ff6b35; }
        .drop-zone.loaded .drop-zone-text { color: #00d47e; }

        .drop-zone input[type="file"] {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
        }

        .auth-or {
          font-size: 9px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #232738;
          margin: 12px 0;
        }

        .paste-input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid #232738;
          color: #f0f2f8;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          padding: 8px 0;
          outline: none;
          letter-spacing: 0.04em;
          text-align: center;
        }

        .paste-input:focus { border-bottom-color: #ff6b35; }
        .paste-input::placeholder { color: #232738; }

        .auth-submit {
          width: 100%;
          margin-top: 20px;
          padding: 12px;
          background: transparent;
          border: 1px solid #232738;
          color: #52556a;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.15s;
        }

        .auth-submit.primary {
          margin-top: 0;
          margin-bottom: 14px;
          border-color: #ff6b35;
          color: #ff6b35;
        }

        .auth-submit:hover {
          border-color: #ff6b35;
          color: #ff6b35;
        }

        .auth-msg {
          margin-top: 16px;
          font-size: 10px;
          letter-spacing: 0.06em;
          min-height: 16px;
        }

        .auth-msg.error { color: #ef4444; }
        .auth-msg.success { color: #00d47e; }

        .auth-footer {
          padding: 12px 20px;
          border-top: 1px solid #232738;
          font-size: 9px;
          color: #232738;
          letter-spacing: 0.08em;
          text-align: center;
        }

        @media (max-width: 720px) {
          #admin-shell {
            padding: 12px;
          }

          .auth-body {
            padding: 24px 16px;
          }
        }
      `}</style>

      <div id="admin-shell">
        <div className="auth-container">
          <div className="auth-header">
            <span className="auth-title">
              <span>&#x2B21;</span> WitnessOps Admin
            </span>
            <span className="auth-status">LOCKED</span>
          </div>
          <div className="auth-body">
            <div className="auth-glyph">&#x1F510;</div>
            <div className="auth-instruction">
              Sign in with Microsoft for named admin access.
              <br />
              Legacy key entry remains a compatibility fallback.
            </div>

            <button className="auth-submit primary" onClick={handleMicrosoftSignIn}>
              Sign In With Microsoft
            </button>

            <div className="auth-subnote">
              Use the key path only if the OIDC admin seam is not yet configured for this deployment.
            </div>

            <div
              className={`drop-zone${isDragOver ? " dragover" : ""}${fileName ? " loaded" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
            >
              <span className="drop-zone-text">
                {fileName
                  ? `\u2713 Key loaded (${fileName})`
                  : "Drop .witnessops-key here"}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".witnessops-key,*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>

            <div className="auth-or">&mdash; or paste key &mdash;</div>

            <input
              type="password"
              className="paste-input"
              placeholder="paste key..."
              autoComplete="off"
              spellCheck={false}
              value={keyValue}
              onChange={(e) => {
                setKeyValue(e.target.value.trim());
                setFileName("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />

            <button className="auth-submit" onClick={handleSubmit}>
              Authenticate
            </button>

            <div
              className={`auth-msg${message.type ? ` ${message.type}` : ""}`}
            >
              {message.text}
            </div>
          </div>
          <div className="auth-footer">
            Named OIDC admin entry preferred &middot; legacy key path retained temporarily
          </div>
        </div>
      </div>
    </>
  );
}
