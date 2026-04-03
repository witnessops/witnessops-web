import React from "react";

export interface ProofObjectProps {
  type: string;
  fields: Record<string, string>;
}

export function ProofObject({ type, fields }: ProofObjectProps) {
  return (
    <div
      style={{
        background: "#11111b",
        color: "#a6e3a1",
        borderRadius: "8px",
        padding: "16px",
        fontFamily: "monospace",
        fontSize: "13px",
        lineHeight: 1.8,
        border: "1px solid #333",
      }}
    >
      <div style={{ color: "#cdd6f4", marginBottom: "8px" }}>
        <span style={{ color: "#f5c2e7" }}>{"\u03C6"}</span>{" "}
        <span style={{ fontWeight: 600 }}>{type}</span>
      </div>
      {Object.entries(fields).map(([key, value]) => (
        <div key={key} style={{ paddingLeft: "16px" }}>
          <span style={{ color: "#89b4fa" }}>{key}</span>
          <span style={{ color: "#6c7086" }}>{" : "}</span>
          <span style={{ color: "#a6e3a1" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}
