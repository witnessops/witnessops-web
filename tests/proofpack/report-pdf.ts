import assert from 'node:assert/strict';
import { expect, type Page, type TestInfo } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

/** Inspect text-paint operations in Chromium's generated PDF (not arbitrary PDFs).
 * Fail closed if Chromium changes its direct-object/Flate stream format. Counting
 * pages alone missed an extra page whose only paint operation was a white box.
 */
function pdfPages(pdf: Buffer): { runs: number; text: string }[] {
  const raw = pdf.toString('latin1');
  const objects = new Map([...raw.matchAll(/(?:^|\n)(\d+) 0 obj\n([\s\S]*?)\nendobj/g)].map(m => [m[1], m[2]]));
  const stream = (id: string) => {
    const object = objects.get(id)!;
    expect(object, `PDF stream ${id}`).toBeTruthy();
    const length = Number(/\/Length (\d+)\b/.exec(object)?.[1]);
    const start = object.indexOf('stream\n') + 7;
    expect(object).toContain('/Filter /FlateDecode');
    return inflateSync(Buffer.from(object.slice(start, start + length), 'latin1')).toString('latin1');
  };
  const fonts = new Map<string, Map<number, string>>();
  const widths = new Map<string, number>();
  for (const [id, object] of objects) {
    const cmapId = /\/ToUnicode (\d+) 0 R/.exec(object)?.[1];
    if (!cmapId) continue;
    const cmap = stream(cmapId), glyphs = new Map<number, string>();
    for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
      for (const m of block[1].matchAll(/<([0-9A-F]+)>\s*<([0-9A-F]+)>/gi)) {
        glyphs.set(parseInt(m[1], 16), String.fromCharCode(...m[2].match(/.{4}/g)!.map(x => parseInt(x, 16))));
      }
    }
    for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
      expect(block[1], 'Unsupported Chromium CMap array range').not.toContain('[');
      for (const m of block[1].matchAll(/<([0-9A-F]+)>\s*<([0-9A-F]+)>\s*<([0-9A-F]+)>/gi)) {
        const first = parseInt(m[1], 16), last = parseInt(m[2], 16), base = parseInt(m[3], 16);
        for (let code = first; code <= last; code++) glyphs.set(code, String.fromCodePoint(base + code - first));
      }
    }
    fonts.set(id, glyphs);
    const width = /begincodespacerange\s*<([0-9A-F]+)>/i.exec(cmap)?.[1].length;
    expect(width).toBeTruthy();
    widths.set(id, width!);
  }
  const pages = [...objects.values()].filter(value => /\/Type \/Page\b/.test(value));
  expect(pages.length).toBeGreaterThan(0);
  return pages.map(page => {
    const contentId = /\/Contents (\d+) 0 R/.exec(page)?.[1];
    expect(contentId, 'Chromium page must reference a content stream').toBeTruthy();
    const object = objects.get(contentId!)!;
    expect(object).toBeTruthy();
    const length = Number(/\/Length (\d+)\b/.exec(object)?.[1]);
    const start = object.indexOf('stream\n') + 'stream\n'.length;
    expect(length).toBeGreaterThan(0);
    expect(start).toBeGreaterThan('stream\n'.length - 1);
    const bytes = Buffer.from(object.slice(start, start + length), 'latin1');
    expect(object).toContain('/Filter /FlateDecode');
    const operators = inflateSync(bytes).toString('latin1');
    const fontRefs = new Map([...page.matchAll(/\/(F\d+) (\d+) 0 R/g)].map(m => [m[1], m[2]]));
    let font: Map<number, string> | undefined;
    let text = '', width = 4;
    for (const op of operators.matchAll(/\/(F\d+) [\d.]+ Tf|<([0-9A-F]+)>\s*Tj/gi)) {
      if (op[1]) { const id = fontRefs.get(op[1])!; font = fonts.get(id); width = widths.get(id)!; continue; }
      assert(font, 'Text must have a mapped Chromium font');
      assert(Number.isInteger(width) && width > 0 && op[2].length % width === 0, 'Invalid PDF glyph width');
      for (let i = 0; i < op[2].length; i += width) {
        const hex = op[2].slice(i, i + width);
        const value = font!.get(parseInt(hex, 16));
        if (value === undefined) throw new Error(`Unmapped PDF glyph ${hex}`);
        text += value;
      }
    }
    expect(operators, 'Unsupported Chromium text array').not.toMatch(/\]\s*TJ/);
    return { runs: [...operators.matchAll(/BT\b([\s\S]*?)\bET/g)].filter(m => /\bTj\b|\bTJ\b/.test(m[1])).length, text };

  });
}

export async function assertReportPdf(page: Page, info: TestInfo) {
  const root = page.locator('[data-buyer-print-root]');
  const before = await root.locator('article').innerHTML();
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
  await expect(root).toBeVisible();
  await expect(root).toContainText('Verification appendix');
  await expect(root).toContainText('This report is a derived presentation of the source evidence.');
  await expect.poll(
    () => page.locator('body > :not([data-buyer-print-root])').evaluateAll(nodes => nodes.every(n => getComputedStyle(n).display === 'none')),
    { message: 'Non-report body children must be hidden in print media', timeout: 2000 },
  ).toBe(true);
  expect(await root.locator('article').innerHTML()).toBe(before);
  // Fresh browser contexts do not always reproduce the trailing anonymous page.
  // Keep the causal layout boundary covered independently of engine pagination.
  expect(await page.locator('html').evaluate(node => getComputedStyle(node).page)).toBe('proofpackBuyerReport');
  const session = await page.context().newCDPSession(page);
  // Exact production acceptance settings; format:'A4' rounds these dimensions.
  const { data } = await session.send('Page.printToPDF', {
    printBackground: true, preferCSSPageSize: true,
    generateTaggedPDF: true,
    paperWidth: 210 / 25.4, paperHeight: 297 / 25.4,
    marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
  });
  await session.detach();
  const pdf = Buffer.from(data, 'base64');
  writeFileSync(info.outputPath('report-A4.pdf'), pdf);
  const pages = pdfPages(pdf);
  const runs = pages.map(p => p.runs);
  await info.attach('page-text-paint-runs', { body: JSON.stringify(runs), contentType: 'application/json' });
  // Each fixture ends with source/provenance text, beyond the two margin labels.
  // This rejects both the blank trailing box and a margin-label-only orphan.
  expect(runs.every(count => count > 2), `Text runs on each PDF page: ${runs}`).toBe(true);
  expect(runs.at(-1)).toBeGreaterThan(2);
  return { pdf, textRuns: runs, pageTexts: pages.map(p => p.text) };
}
