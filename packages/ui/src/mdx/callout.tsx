import React from "react";

export type CalloutType = "info" | "warning" | "danger" | "tip";

export interface CalloutProps {
  type: CalloutType;
  title?: string;
  children: React.ReactNode;
}

const styles: Record<CalloutType, { bg: string; border: string; icon: string }> = {
  info: { bg: "#e8f0fe", border: "#4285f4", icon: "i" },
  warning: { bg: "#fef7e0", border: "#f9ab00", icon: "!" },
  danger: { bg: "#fce8e6", border: "#ea4335", icon: "x" },
  tip: { bg: "#e6f4ea", border: "#34a853", icon: "*" },
};

export function Callout({ type, title, children }: CalloutProps) {
  const style = styles[type];

  return (
    <div
      style={{
        background: style.bg,
        borderLeft: `4px solid ${style.border}`,
        borderRadius: "4px",
        padding: "12px 16px",
        margin: "16px 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: style.border,
            color: "#fff",
            fontSize: "12px",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {style.icon}
        </span>
        <div>
          {title && (
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>{title}</div>
          )}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
