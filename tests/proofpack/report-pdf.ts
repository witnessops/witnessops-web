import { expect, type Page, type TestInfo } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

/** Inspect text-paint operations in Chromium's generated PDF (not arbitrary PDFs).
 * Fail closed if Chromium changes its direct-object/Flate stream format. Counting
 * pages alone missed an extra page whose only paint operation was a white box.
 */
function pdfTextRuns(pdf: Buffer): number[] {
  const raw = pdf.toString('latin1');
  const objects = new Map([...raw.matchAll(/(?:^|\n)(\d+) 0 obj\n([\s\S]*?)\nendobj/g)].map(m => [m[1], m[2]]));
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
    return [...operators.matchAll(/BT\b([\s\S]*?)\bET/g)].filter(m => /\bTj\b|\bTJ\b/.test(m[1])).length;
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
  const runs = pdfTextRuns(pdf);
  await info.attach('page-text-paint-runs', { body: JSON.stringify(runs), contentType: 'application/json' });
  // Each fixture ends with source/provenance text, beyond the two margin labels.
  // This rejects both the blank trailing box and a margin-label-only orphan.
  expect(runs.every(count => count > 2), `Text runs on each PDF page: ${runs}`).toBe(true);
  expect(runs.at(-1)).toBeGreaterThan(2);
  return { pdf, textRuns: runs };
}
