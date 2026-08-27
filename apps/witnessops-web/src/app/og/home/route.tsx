import { ImageResponse } from "next/og";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background:
            "radial-gradient(circle at top left, rgba(255,107,53,0.28), transparent 34%), linear-gradient(135deg, #0a0f14 0%, #111923 55%, #090d12 100%)",
          color: "#f8fafc",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px",
            width: "100%",
            border: "1px solid rgba(255,255,255,0.08)",
            margin: "28px",
            borderRadius: "28px",
            background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ fontSize: 42, color: "#ff6b35" }}>φ</div>
            <div style={{ fontSize: 28, letterSpacing: "0.18em", textTransform: "uppercase" }}>
              WITNESSOPS
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "860px" }}>
            <div style={{ fontSize: 24, letterSpacing: "0.18em", textTransform: "uppercase", color: "#fb923c" }}>
              Proof infrastructure for agentic operations
            </div>
            <div style={{ fontSize: 72, lineHeight: 1.04, fontWeight: 700 }}>
              Agents act. WitnessOps proves.
            </div>
            <div style={{ fontSize: 28, lineHeight: 1.35, color: "#cbd5e1" }}>
              Check before execution. Preserve evidence. Make the action reviewable.
            </div>
          </div>
          <div style={{ display: "flex", gap: "18px", fontSize: 24, color: "#cbd5e1" }}>
            <div>Before: inspect</div>
            <div>During: preserve</div>
            <div>After: prove</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
