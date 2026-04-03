import React from "react";

export interface CodeFrameProps {
  filename: string;
  language: string;
  children: string;
}

export function CodeFrame({ filename, language, children }: CodeFrameProps) {
  return (
    <div
      style={{
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        fontFamily: "monospace",
        background: "#0a0e17",
        boxShadow: "0 24px 80px rgba(2,6,23,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{language}</span>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
            {filename}
          </span>
        </div>
        <div style={{ width: 52 }} />
      </div>

      {/* Body */}
      <pre
        style={{
          color: "rgba(255,255,255,0.8)",
          margin: 0,
          padding: "16px 20px",
          overflow: "auto",
          fontSize: "13px",
          lineHeight: "24px",
        }}
      >
        <code>{children}</code>
      </pre>
    </div>
  );
}
