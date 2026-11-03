import { defaultPosition, type Point, type Size, type Viewport } from "./floating-position";

type Obstacle = { left: number; top: number; right: number; bottom: number; control: boolean };
const CONTROLS = 'a[href], button, input, textarea, select, summary, [role="button"], [contenteditable="true"]';

/** Inspect visible ink and controls, not full-width section backgrounds. */
function obstacles(element: HTMLElement, x: number, bounds: Viewport): Obstacle[] {
  const result: Obstacle[] = [];
  const add = (rect: DOMRect, control: boolean) => {
    if (rect.width && rect.height && rect.right > x - 8 && rect.left < bounds.x + bounds.width && rect.bottom > bounds.y && rect.top < bounds.y + bounds.height) {
      result.push({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, control });
    }
  };
  const visible = (node: Element) => !element.contains(node) && !node.closest('dialog, [aria-hidden="true"]') && node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  document.querySelectorAll(`${CONTROLS}, img, video, canvas, svg`).forEach((node) => {
    if (visible(node)) add(node.getBoundingClientRect(), node.matches(CONTROLS));
  });
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!node.textContent?.trim() || !parent || parent.closest('script, style, noscript') || !visible(parent)) continue;
    const box = parent.getBoundingClientRect();
    if (box.right <= x - 8 || box.bottom <= bounds.y || box.top >= bounds.y + bounds.height) continue;
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) add(rect, false);
  }
  return result;
}

/** Stable random preference: only move again when the current spot becomes busy. */
export function clearRightPosition(element: HTMLElement, size: Size, bounds: Viewport, seed: number, previous: Point | null): Point {
  const edge = defaultPosition(size, bounds);
  // Include the greeting above and the wider invitation below the hit target.
  const blocks = obstacles(element, edge.x - 80, bounds);
  const top = Math.min(edge.y, bounds.y + 88);
  const bottom = Math.max(top, edge.y - 36);
  const score = (point: Point, labels = false) => blocks.reduce((sum, box) => {
    const width = Math.max(0, Math.min(point.x + size.width + 8, box.right) - Math.max(point.x - (labels ? 80 : 8), box.left));
    const height = Math.max(0, Math.min(point.y + size.height + (labels ? 40 : 8), box.bottom) - Math.max(point.y - (labels ? 36 : 8), box.top));
    // Keeping controls clickable takes priority on a very crowded viewport.
    return sum + width * height * (box.control ? 1000 : 1);
  }, 0);
  const finish = (point: Point) => {
    // On narrow pages, omit decorative labels if only the mascot itself fits.
    element.dataset.labelsBlocked = String(score(point, true) > 0);
    return point;
  };
  if (previous && previous.x === edge.x && previous.y >= top && previous.y <= bottom && score(previous) === 0) return finish(previous);
  const candidates: Point[] = [];
  for (let y = top; y <= bottom; y += 8) candidates.push({ x: edge.x, y });
  candidates.push({ x: edge.x, y: bottom });
  const scored = candidates.map((point) => ({ point, score: score(point) }));
  const best = Math.min(...scored.map((item) => item.score));
  const safe = scored.filter((item) => item.score === best);
  const withLabels = safe.filter((item) => score(item.point, true) === 0);
  const available = withLabels.length ? withLabels : safe;
  return finish(available[Math.min(available.length - 1, Math.floor(seed * available.length))].point);
}
