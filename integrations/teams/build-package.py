#!/usr/bin/env python3
"""Build a private Teams personal-tab app package from its source manifest.
Standard-library only. No Microsoft API calls, authentication, network, or deployment.
"""
from __future__ import annotations
import argparse
import json
import math
import re
import struct
import zlib
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent
SIGNATURE = b"\x89PNG\r\n\x1a\n"

def chunk(kind: bytes, data: bytes) -> bytes:
    return struct.pack("!I", len(data)) + kind + data + struct.pack("!I", zlib.crc32(kind + data) & 0xFFFFFFFF)

def line_distance(px: float, py: float, a: tuple[float, float], b: tuple[float, float]) -> float:
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = max(0.0, min(1.0, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy))

def icon(size: int, outlined: bool) -> bytes:
    stops = [(0.2, 0.25), (0.33, 0.73), (0.49, 0.46), (0.65, 0.73), (0.79, 0.25)]
    pts = [(x * size, y * size) for x, y in stops]
    width = size * (0.08 if outlined else 0.075)
    rows = []
    for y in range(size):
        row = bytearray(b"\0")
        for x in range(size):
            dist = min(line_distance(x + 0.5, y + 0.5, a, b) for a, b in zip(pts, pts[1:]))
            if dist < width / 2:
                rgba = (255, 255, 255, 255) if outlined else (97, 223, 196, 255)
            else:
                rgba = (0, 0, 0, 0) if outlined else (10, 16, 27, 255)
            row += bytes(rgba)
        rows.append(bytes(row))
    raw = b"".join(rows)
    ihdr = struct.pack("!IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return SIGNATURE + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")

def make_package(output: Path, entra_app_id: str | None = None) -> None:
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("staticTabs", [{}])[0].get("contentUrl") != "https://academy.witnessops.com/academy/teams/launch":
        raise SystemExit("Unexpected Teams contentUrl; refusing to package")
    if manifest.get("staticTabs", [{}])[0].get("scopes") != ["personal"]:
        raise SystemExit("This package is personal-scope only")
    if entra_app_id is not None:
        # Entra registration is private tenant state; never commit tenant-specific IDs in source.
        if not re.fullmatch(r"[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}", entra_app_id):
            raise SystemExit("Invalid Entra app ID; use canonical lowercase UUID")
        manifest["webApplicationInfo"] = {
            "id": entra_app_id,
            "resource": f"api://academy.witnessops.com/{entra_app_id}",
        }
    items = {
        "manifest.json": json.dumps(manifest, sort_keys=True, indent=2).encode("utf-8") + b"\n",
        "color.png": icon(192, outlined=False),
        "outline.png": icon(32, outlined=True),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, "w", ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in items.items():
            info = ZipInfo(name, (2026, 11, 25, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            archive.writestr(info, data)
    print(f"CREATED {output} ({output.stat().st_size} bytes, {len(items)} files)")
    print("NOT READY FOR INSTALLATION: tab route is source-only until independently deployed.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=ROOT / "academy-teams-private-preview.zip")
    parser.add_argument("--entra-app-id", help="Use a separately registered, single-tenant Entra application (private ZIP only)")
    args = parser.parse_args()
    make_package(args.out, args.entra_app_id)
