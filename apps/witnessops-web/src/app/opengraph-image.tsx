import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "WitnessOps";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const svg = readFileSync(
    join(process.cwd(), "public/brand/witnessops-logo-system-v1/svg/witnessops-mark-white.svg"),
  );
  const src = `data:image/svg+xml;base64,${svg.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0D10",
        }}
      >
        <img src={src} width={419} height={240} alt="" />
      </div>
    ),
    { ...size },
  );
}
