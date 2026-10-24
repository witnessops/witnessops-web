import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const adminRoot = path.resolve(__dirname);
const appAdminRoot = path.resolve(__dirname, "../../app/admin");
const legacyBanned = /ea5b2a|b94721|ff6b35|aa6613|b9433a|147a73|234,\s*91,\s*42/i;
const classBanned = /orange-|yellow-|amber-/i;
const TOKEN_VALUES: Record<string, string> = {
  "--admin-accent": "#6C5631",
  "--admin-accent-hover": "#594626",
  "--admin-accent-active": "#4A3A1F",
  "--admin-accent-on": "#FFFFFF",
  "--admin-accent-tint": "#EFE6D0",
  "--admin-accent-dark": "#B89B62",
  "--admin-accent-dark-hover": "#CBB27D",
  "--admin-focus": "#6C5631",
  "--admin-rose": "#8B4B48",
  "--admin-rose-tint": "#F7ECEA",
  "--admin-green": "#365F4A",
  "--admin-green-tint": "#E8F0EB",
  "--admin-mute": "#5B5F57",
  "--admin-mute-2": "#6A6E65",
  "--admin-disabled-bg": "#E4E4DC",
  "--admin-accent-subtle": "var(--admin-accent-tint)",
  "--admin-success": "var(--admin-mute)",
  "--admin-danger": "var(--admin-rose)",
  "--admin-warning": "var(--admin-mute)",
  "--admin-danger-subtle": "var(--admin-rose-tint)",
  "--admin-success-subtle": "#ECECE6",
};

function filesUnder(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "login") continue;
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) filesUnder(full, acc);
    else if (/\.(css|tsx|ts)$/.test(name) && !/\.test\.tsx?$/.test(name)) acc.push(full);
  }
  return acc;
}

function braceBlock(css: string, openIndex: number): string {
  let depth = 0;
  for (let index = openIndex; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    else if (css[index] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(openIndex + 1, index);
    }
  }
  throw new Error("unclosed CSS block");
}

function consoleShellBlocks(css: string): string[] {
  const blocks: string[] = [];
  for (const match of css.matchAll(/\.consoleShell\s*\{/g)) {
    const open = (match.index ?? 0) + match[0].lastIndexOf("{");
    blocks.push(braceBlock(css, open));
  }
  return blocks;
}

function channelByte(part: string): number {
  if (part.endsWith("%")) return (Number(part.slice(0, -1)) / 100) * 255;
  return Number(part);
}

function hslFromRgb(r: number, g: number, b: number): { h: number; s: number } {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  const light = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * light - 1));
  return { h: hue, s: saturation };
}

function parseColorFunction(fn: string): { h: number; s: number } | null {
  const match = fn.trim().match(/^(hsl|rgb)a?\((.*)\)$/i);
  if (!match) return null;
  const kind = match[1]?.toLowerCase();
  const parts = match[2]?.trim().split(/[,\s/]+/).filter(Boolean) ?? [];
  if (kind === "rgb") {
    const channels = parts.slice(0, 3).map(channelByte);
    if (channels.length !== 3 || channels.some((value) => Number.isNaN(value))) return null;
    return hslFromRgb(channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0);
  }
  if (parts.length < 3) return null;
  const hue = Number(parts[0]);
  const saturation = Number(parts[1]?.replace("%", "")) / 100;
  if (Number.isNaN(hue) || Number.isNaN(saturation)) return null;
  return { h: ((hue % 360) + 360) % 360, s: saturation };
}

function isOrange(color: { h: number; s: number }): boolean {
  return color.h >= 5 && color.h <= 55 && color.s >= 0.35;
}

// Explicit exceptions: the login page accent (#ff6b35) and the Wiz avatar chest light (#F97E00).
const ALLOWED_ORANGE_HEX = new Set(["ff6b35", "f97e00"]);
const ORANGE_HEX_MIN_VALUE = 0.35;

function normalizeHex(hex: string): string | null {
  const body = hex.slice(1);
  if (body.length === 3) return body.split("").map((channel) => channel + channel).join("").toLowerCase();
  if (body.length === 6) return body.toLowerCase();
  return null;
}

function hsvFromHex(hex: string): { h: number; s: number; v: number } | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const value = Number.parseInt(normalized, 16);
  const red = ((value >> 16) & 255) / 255;
  const green = ((value >> 8) & 255) / 255;
  const blue = (value & 255) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { h: hue, s: max === 0 ? 0 : delta / max, v: max };
}

function isBrightOrangeHex(hex: string): boolean {
  const color = hsvFromHex(hex);
  if (!color) return false;
  return color.h >= 5 && color.h <= 50 && color.s >= 0.70 && color.v >= ORANGE_HEX_MIN_VALUE;
}

function brightOrangeHexes(text: string): string[] {
  const hits: string[] = [];
  for (const match of text.matchAll(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
    const hex = match[0] ?? "";
    const normalized = normalizeHex(hex);
    if (!normalized || ALLOWED_ORANGE_HEX.has(normalized)) continue;
    if (isBrightOrangeHex(hex)) hits.push(hex);
  }
  return hits;
}

function srgbChannel(channel: number): number {
  const scaled = channel / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const red = srgbChannel((value >> 16) & 255);
  const green = srgbChannel((value >> 8) & 255);
  const blue = srgbChannel(value & 255);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

test("admin surfaces keep the brass tokens and drop orange, amber, and teal accents", () => {
  const css = readFileSync(path.join(adminRoot, "admin.module.css"), "utf8");
  const blocks = consoleShellBlocks(css);
  assert.equal(blocks.length, 2);
  for (const block of blocks) {
    for (const [name, value] of Object.entries(TOKEN_VALUES)) {
      const found = block.match(new RegExp(`${name}\\s*:\\s*([^;]+)`));
      assert.equal(found?.[1]?.trim(), value, name);
    }
  }

  const sources = filesUnder(adminRoot).concat(filesUnder(appAdminRoot));
  const offenders: string[] = [];
  for (const file of sources) {
    const text = readFileSync(file, "utf8");
    if (legacyBanned.test(text) || classBanned.test(text)) offenders.push(file);
    for (const match of text.matchAll(/(?:hsl|rgb)a?\([^)]*\)/gi)) {
      const fn = match[0] ?? "";
      const parsed = parseColorFunction(fn);
      if (!parsed || isOrange(parsed)) offenders.push(`${file} ${fn}`);
    }
    for (const hex of brightOrangeHexes(text)) offenders.push(`${file} ${hex}`);
  }
  assert.deepEqual(offenders, []);
});

test("hex orange sweep rejects a bright orange and keeps brass and rose", () => {
  assert.deepEqual(brightOrangeHexes("color: #E8761A;"), ["#E8761A"]);
  for (const hex of ["#6C5631", "#B89B62", "#CBB27D", "#594626", "#4A3A1F", "#EFE6D0", "#8B4B48"]) {
    assert.deepEqual(brightOrangeHexes(`color: ${hex};`), [], hex);
  }
  assert.deepEqual(brightOrangeHexes("login #ff6b35 and wiz #F97E00"), []);
});

test("brass, rose, mute, and focus pairs meet the WCAG ratios", () => {
  const pairs: Array<[string, string, number]> = [
    ["#6C5631", "#FFFFFF", 4.5],
    ["#6C5631", "#f3f3ef", 4.5],
    ["#FFFFFF", "#6C5631", 4.5],
    ["#FFFFFF", "#594626", 4.5],
    ["#FFFFFF", "#4A3A1F", 4.5],
    ["#B89B62", "#0b0d10", 4.5],
    ["#B89B62", "#1a1c20", 4.5],
    ["#B89B62", "#202226", 3],
    ["#8B4B48", "#FFFFFF", 4.5],
    ["#8B4B48", "#F7ECEA", 4.5],
    ["#5B5F57", "#FFFFFF", 4.5],
    ["#5B5F57", "#f3f3ef", 4.5],
    ["#6C5631", "#FFFFFF", 3],
    ["#6C5631", "#f3f3ef", 3],
    ["#CBB27D", "#0b0d10", 3],
  ];
  for (const [foreground, background, minimum] of pairs) {
    assert.ok(contrastRatio(foreground, background) >= minimum, `${foreground} on ${background} needs ${minimum}`);
  }
});

test("secondary actions use the primary box and the narrow header keeps the bell", () => {
  const css = readFileSync(path.join(adminRoot, "admin.module.css"), "utf8");
  const primary = css.match(/\.rowAction\s*\{[^}]*box-sizing:\s*border-box[^}]*\}/)?.[0]?.replace(/\s+/g, "") ?? "";
  for (const declaration of [
    "box-sizing:border-box",
    "display:inline-flex",
    "align-items:center",
    "justify-content:center",
    "padding:4px10px",
    "min-height:28px",
  ]) {
    assert.match(primary, new RegExp(declaration.replace(".", "\\.")));
  }
  const secondary = css.match(/\.rowActionSecondary\s*\{[^}]*\}/)?.[0]?.replace(/\s+/g, "") ?? "";
  for (const declaration of [
    "box-sizing:border-box",
    "display:inline-flex",
    "align-items:center",
    "justify-content:center",
    "padding:4px10px",
    "min-height:28px",
    "letter-spacing:.1em",
    "text-transform:uppercase",
    "cursor:pointer",
  ]) {
    assert.match(secondary, new RegExp(declaration.replace(".", "\\.")));
  }
  const narrow = css.match(/@media \(max-width:\s*359px\)\s*\{/);
  assert.ok(narrow?.index !== undefined);
  const narrowBlock = braceBlock(css, (narrow?.index ?? 0) + (narrow?.[0].lastIndexOf("{") ?? 0));
  assert.match(narrowBlock, /\.consoleHeaderStatus\s*\{\s*display:\s*none/);
  assert.match(narrowBlock, /\.consoleHeaderActions\s*\{\s*flex-wrap:\s*wrap/);
});
