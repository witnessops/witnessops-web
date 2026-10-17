// Hand-run type audit for the public preview. Not part of CI.
// Ported from the type-lock reference audit and analyser.
// Usage: node scripts/type-audit.mjs
// Env: BASE (default http://127.0.0.1:3001), CHROME, ONLY=/,/pl
import { createRequire } from "node:module";

const require = createRequire("/tmp/node_modules/puppeteer-core/package.json");
const puppeteer = require("puppeteer-core");

const BASE = process.env.BASE || "http://127.0.0.1:3001";
const CHROME = process.env.CHROME || "/usr/bin/google-chrome";
const ROUTES = [
  "/",
  "/reviews",
  "/reviews/agent-action-security-review",
  "/reviews/external-attack-surface-review",
  "/company",
  "/privacy",
  "/chronicles",
  "/chronicles/001-the-unauthorized-feline",
  "/docs/assistant",
  "/pl",
  "/pl/reviews/agent-action-security-review",
  "/pl/docs/assistant",
];
const DARK = ["/", "/reviews/agent-action-security-review", "/chronicles/001-the-unauthorized-feline", "/docs/assistant", "/pl"];

const I = "Inter";
const N = "Newsreader";
const P = "IBM Plex Mono";
// size, line-height, letter-spacing em, weight, family, transform
const T = {
  display: { S: [44, 48, -0.025, 300, I, "none"], M: [56, 64, -0.03, 300, I, "none"], L: [72, 80, -0.03, 300, I, "none"] },
  hero: { S: [52, 56, -0.025, 300, I, "none"], M: [76, 80, -0.03, 300, I, "none"], L: [108, 112, -0.03, 300, I, "none"] },
  h1: { S: [34, 40, -0.02, 300, I, "none"], M: [40, 48, -0.025, 300, I, "none"], L: [48, 56, -0.025, 300, I, "none"] },
  h2: { S: [28, 36, -0.015, 300, I, "none"], M: [30, 36, -0.02, 300, I, "none"], L: [36, 44, -0.02, 300, I, "none"] },
  h3: { S: [20, 28, -0.01, 400, I, "none"], M: [22, 28, -0.01, 400, I, "none"], L: [24, 32, -0.01, 400, I, "none"] },
  h4: { S: [16, 24, 0, 500, I, "none"], M: [18, 28, 0, 500, I, "none"], L: [18, 28, 0, 500, I, "none"] },
  "body-lg": { S: [18, 28, 0, 400, I, "none"], M: [18, 28, 0, 400, I, "none"], L: [20, 32, 0, 400, I, "none"] },
  "body-long": { S: [16, 24, 0, 400, I, "none"], M: [16, 28, 0, 400, I, "none"], L: [16, 28, 0, 400, I, "none"] },
  body: { S: [16, 24, 0, 400, I, "none"], M: [16, 24, 0, 400, I, "none"], L: [16, 24, 0, 400, I, "none"] },
  ui: { S: [14, 20, 0, 500, I, "none"], M: [14, 20, 0, 500, I, "none"], L: [14, 20, 0, 500, I, "none"] },
  small: { S: [14, 20, 0, 400, I, "none"], M: [14, 20, 0, 400, I, "none"], L: [14, 20, 0, 400, I, "none"] },
  caption: { S: [12, 16, 0, 400, I, "none"], M: [12, 16, 0, 400, I, "none"], L: [12, 16, 0, 400, I, "none"] },
  eyebrow: { S: [12, 16, 0.08, 500, I, "uppercase"], M: [12, 16, 0.08, 500, I, "uppercase"], L: [12, 16, 0.08, 500, I, "uppercase"] },
  mono: { S: [13, 20, 0, 400, P, "none"], M: [13, 20, 0, 400, P, "none"], L: [14, 20, 0, 400, P, "none"] },
  "mono-caps": { S: [12, 16, 0.06, 500, P, "uppercase"], M: [12, 16, 0.06, 500, P, "uppercase"], L: [12, 16, 0.06, 500, P, "uppercase"] },
  prose: { S: [18, 28, 0, 400, N, "none"], M: [20, 32, 0, 400, N, "none"], L: [20, 32, 0, 400, N, "none"] },
  price: { S: [20, 28, -0.01, 400, I, "none"], M: [22, 28, -0.01, 400, I, "none"], L: [24, 32, -0.01, 400, I, "none"] },
};
const CHROME_RE = /footer-main|footer-navigation|footer-contact|footer-bottom|footer-legal|>footer|^footer|site-footer|navbar|mobile-brand|desktop-navbar|skip-link|theme|sidebar-kb|public-shell|witnessops-mobile-menu|cookie/i;

function band(w) {
  return w < 768 ? "S" : w < 1200 ? "M" : "L";
}

function role(it) {
  const p = it.path;
  const tag = it.tag;
  const fam = it.family;
  const tt = it.tt;
  const s = it.size;
  const w = Number.parseInt(it.w, 10);
  if (it.chapter || /wo-chapter-index/.test(p)) return "chapter-index";
  if (/wo-price|_price(?:__|$)/.test(p)) return "price";
  if (/wo-lead|_lead(?:__|$)/.test(p)) return "body-lg";
  if (/wo-h4/.test(p)) return "h4";
  if (/wo-h3/.test(p)) return "h3";
  if (/wo-h2/.test(p)) return "h2";
  if (/wo-h1/.test(p)) return "h1";
  if (/wo-display/.test(p)) return "display";
  if (it.limits) return "h4";
  if (/p#ask-sovereign-title$/.test(p)) return "h4";
  if (fam === "IBM Plex Mono") return tt === "uppercase" ? "mono-caps" : "mono";
  if (tt === "uppercase" && s <= 13) return "eyebrow";
  if (it.inButton || it.navUi) return "ui";
  if (it.legal && tag === "h2") return "h3";
  if (it.prose && fam === "Newsreader") return "prose";
  if (it.prose && tag === "h2") return "h3";
  if (tt === "uppercase") return "eyebrow";
  if (/heroLine/.test(p) || (tag === "h1" && (it.route === "/" || it.route === "/pl"))) return "hero";
  if (tag === "h1") return "h1";
  if (tag === "h2") return "h2";
  if (tag === "h3") return s <= 18 ? "h4" : "h3";
  if (tag === "h4") return "h4";
  if (s >= 22 && tag !== "button") return "h3";
  if (tag === "button" || tag === "summary" || /public-cta-button|bg-brand-accent|desktop-navbar-menu_trigger|primary__|secondary__|textLink|handoffCta|chips|iconButton/.test(p)) return "ui";
  if (tag === "a" && CHROME_RE.test(p)) return "ui";
  if ((tag === "a" || tag === "button" || tag === "label") && w >= 500 && s <= 16) return "ui";
  if (/min-h-11|public-cta|rounded-sm/.test(p) && (tag === "a" || tag === "button")) return "ui";
  if (/lead|legalHeader>p|header.max-w-4xl.pb-7>p|review-offer_lead|sectionBody|price/.test(p) && s >= 17) return "body-lg";
  if (s >= 17) return "body-lg";
  if (s >= 15 && /legalBody|docs-prose|review-offer_content|footer-pages|section\.mb-10/.test(p) && (tag === "p" || tag === "li" || tag === "dd")) return "body-long";
  if (s >= 15) return "body";
  if (s >= 13) return "small";
  return "caption";
}

function expected(roleName, b) {
  if (roleName === "chapter-index") {
    const [size, lh] = T.h3[b];
    return [size, lh, 0, 400, P, "none"];
  }
  return T[roleName][b];
}

function onGrid(lh) {
  const mod = Math.abs(lh % 4);
  return mod < 0.05 || Math.abs(mod - 4) < 0.05;
}

const COLLECT = `(() => {
  const out = [];
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05;
  };
  const pathOf = (el) => {
    const p = [];
    let e = el;
    for (let i = 0; e && i < 5 && e !== document.body; i++, e = e.parentElement) {
      let s = e.tagName.toLowerCase();
      if (e.id) s += "#" + e.id;
      else if (typeof e.className === "string" && e.className.trim()) s += "." + e.className.trim().split(/\\s+/).slice(0, 2).join(".");
      p.unshift(s);
    }
    return p.join(">");
  };
  for (const el of document.querySelectorAll("body *")) {
    const tag = el.tagName.toUpperCase();
    if (["SCRIPT", "STYLE", "SVG", "PATH", "NOSCRIPT", "TEMPLATE"].includes(tag)) continue;
    const own = [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join("").replace(/\\s+/g, " ").trim();
    if (!own) continue;
    if (!vis(el)) continue;
    if (el.closest("[aria-hidden='true']")) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const fam = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
    out.push({
      tag: el.tagName.toLowerCase(),
      path: pathOf(el),
      text: own.slice(0, 80),
      family: fam,
      size: Number.parseFloat(cs.fontSize),
      lh: cs.lineHeight,
      ls: cs.letterSpacing,
      w: cs.fontWeight,
      tt: cs.textTransform,
      legal: Boolean(el.closest("[data-legal-body]")),
      chapter: el.classList.contains("wo-chapter-index"),
      prose: Boolean(el.closest(".chronicle-prose")),
      limits: tag === "STRONG" && Boolean(el.closest("[class*='limits']")),
      inButton: tag !== "BUTTON" && Boolean(el.closest("button")),
      navUi: Boolean(el.closest("nav")) && Boolean(el.closest("a, button")),
      code: tag === "CODE" || tag === "PRE" || Boolean(el.closest("code, pre, table, td, th")),
      cpl: null,
    });
  }
  return out;
})()`;

function analyse(samples) {
  const deps = new Map();
  const exceptions = [];
  for (const sample of samples) {
    if (sample.theme !== "light") continue;
    const b = band(sample.width);
    for (const it of sample.items) {
      it.route = sample.route;
      if (it.code) {
        exceptions.push({ kind: "code-or-table", route: sample.route, width: sample.width, text: it.text });
        continue;
      }
      if (/sr-only|skip-link/.test(it.path)) continue;
      if (it.text === "N" && it.size <= 16 && /nextjs/i.test(it.path)) continue;
      const r = role(it);
      const [S, LH, LS, W, FAM, TT] = expected(r, b);
      const s = it.size;
      const lh = it.lh === "normal" ? Math.round(s * 1.2 * 100) / 100 : Number.parseFloat(it.lh);
      const ls = it.ls === "normal" ? 0 : Number.parseFloat(it.ls);
      const wt = Number.parseInt(it.w, 10);
      const diffs = [];
      if (it.family !== FAM) diffs.push(`family ${it.family}→${FAM}`);
      if (Math.abs(s - S) > 0.01) diffs.push(`size ${s}→${S}`);
      if (Math.abs(lh - LH) > 0.05) diffs.push(`line-height ${lh}→${LH}`);
      if (Math.abs(ls - LS * s) > 0.15) diffs.push(`tracking ${(ls / s).toFixed(3)}em→${LS}em`);
      if (wt !== W && !(it.tag === "strong" && wt === 500 && W === 400) && !(wt === 500 && W === 400 && Math.abs(s - S) <= 0.01 && Math.abs(lh - LH) <= 0.05)) diffs.push(`weight ${wt}→${W}`);
      if (it.tt !== TT) diffs.push(`transform ${it.tt}→${TT}`);
      if (!onGrid(lh)) diffs.push("line-height off 4px grid");
      if (it.tag === "a" && !/min-h-11|textLink|sectionLink|wo-ui|public-cta/.test(it.path) && diffs.length === 1 && diffs[0].startsWith("line-height")) continue;
      if (it.tag === "strong" && diffs.length > 0 && diffs.every((diff) => diff.startsWith("line-height"))) continue;
      if (!diffs.length) continue;
      const chrome = CHROME_RE.test(it.path);
      const route = chrome ? "(shared chrome)" : sample.route;
      const sel = it.path.split(">").at(-1).replace(/__[A-Za-z0-9_-]{5}\b/g, "").slice(0, 70);
      const key = [route, sample.width, sel, r, diffs.join("|")].join("§");
      if (!deps.has(key)) deps.set(key, { route, width: sample.width, selector: sel, role: r, diffs, text: it.text.slice(0, 50), count: 0 });
      deps.get(key).count += 1;
    }
  }
  return { departures: [...deps.values()], exceptions: exceptions.length };
}

async function main() {
  const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  const samples = [];
  const jobs = [];
  for (const route of ROUTES) {
    if (only && !only.includes(route)) continue;
    for (const width of [390, 768, 1440]) jobs.push([route, width, "light"]);
  }
  for (const route of DARK) {
    if (only && !only.includes(route)) continue;
    for (const width of [390, 1440]) jobs.push([route, width, "dark"]);
  }
  for (const [route, width, theme] of jobs) {
    await page.evaluateOnNewDocument((value) => {
      try { localStorage.setItem("wo-theme", value); } catch { /* private mode */ }
    }, theme);
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: theme }]);
    await page.setViewport({ width, height: width < 500 ? 844 : 900, deviceScaleFactor: 1 });
    let items = [];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await page.goto(BASE + route, { waitUntil: "load", timeout: 45000 });
        await page.evaluate(() => document.fonts.ready);
        items = await page.evaluate((source) => (0, eval)(source), COLLECT);
        break;
      } catch (error) {
        if (attempt === 1) throw error;
      }
    }
    samples.push({ route, width, theme, items });
    console.log(`${route} ${width} ${theme} ${items.length}`);
  }

  const { departures, exceptions } = analyse(samples);
  await page.setViewport({ width: 390, height: 844 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  const open = (path) => page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 45000 });
  await open("/pl");
  await page.evaluate(() => document.fonts.ready);
  const plFonts = await page.evaluate(() => document.fonts.check("16px Inter", "ąęłńśźż"));
  await open("/chronicles/001-the-unauthorized-feline");
  const h1Weight = await page.evaluate(() => getComputedStyle(document.querySelector("h1")).fontWeight);
  await open("/pl/docs/assistant");
  const reviewPad = await page.evaluate(() => {
    const el = document.querySelector("[class*='reviewTag']");
    return el ? getComputedStyle(el).paddingLeft : null;
  });
  console.log(`departures ${departures.length}`);
  console.log(`code-or-table samples ${exceptions}`);
  console.log(`pl-diacritics ${plFonts}`);
  console.log(`chronicle-h1-weight ${h1Weight}`);
  console.log(`review-tag-pad ${reviewPad}`);
  for (const row of departures.slice(0, 200)) {
    console.log([row.route, row.width, row.selector, row.role, row.diffs.join("; "), JSON.stringify(row.text)].join(" | "));
  }
  await browser.close();
  const smokeOk = plFonts === true && h1Weight === "300" && reviewPad === "16px";
  if (!smokeOk || departures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
