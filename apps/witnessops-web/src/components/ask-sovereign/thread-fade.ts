/** The top fade is one text line tall, shared by both languages. */
export function threadFadePx(thread: HTMLElement): number {
  let fade = 0;
  thread.querySelectorAll<HTMLElement>("p").forEach((node) => {
    if (node.closest("[class*='srOnly']")) return;
    const line = parseFloat(getComputedStyle(node).lineHeight);
    if (Number.isFinite(line)) fade = Math.max(fade, line);
  });
  return Math.max(24, Math.ceil(fade || 24));
}

/**
 * Move the thread so no glyph sits in the strong part of the top fade.
 * A line may fade out below about 0.3 alpha. It may not continue into the darker part.
 */
export function snapThreadClearOfFade(thread: HTMLElement, fadePx: number): void {
  const frame = thread.getBoundingClientRect();
  const bandTop = frame.top + fadePx * 0.3;
  const bandBottom = frame.top + fadePx;
  const strong = bandBottom - bandTop;
  const rects: DOMRect[] = [];
  const walker = document.createTreeWalker(thread, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (parent && !parent.closest("[class*='srOnly']") && (node.textContent || "").trim()) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width >= 1 && rect.height >= 1) rects.push(rect);
      }
    }
    node = walker.nextNode();
  }
  const maxScroll = Math.max(0, thread.scrollHeight - thread.clientHeight);
  const anchor = thread.querySelector("[data-latest-answer], [data-retry], [data-handoff-card]");
  const anchorBox = anchor ? anchor.getBoundingClientRect() : null;
  const action = thread.querySelector("[data-retry], [data-handoff-card]");
  const actionBox = action ? action.getBoundingClientRect() : null;
  const actionFits = Boolean(actionBox && actionBox.height <= frame.height - 16);
  const candidates = [thread.scrollTop, 0, maxScroll];
  if (anchorBox) candidates.push(thread.scrollTop + (anchorBox.top - bandBottom));
  for (let index = 0; index < rects.length; index += 1) {
    const rect = rects[index];
    candidates.push(thread.scrollTop + (rect.bottom - bandTop));
    candidates.push(thread.scrollTop + (rect.top - bandBottom));
  }
  for (let index = 0; index <= rects.length; index += 1) {
    const previous = rects[index - 1];
    const next = rects[index];
    const gapTop = previous ? previous.bottom : frame.top - fadePx;
    const gapBottom = next ? next.top : frame.bottom + fadePx;
    if (gapBottom - gapTop + 0.5 < strong) continue;
    const minDelta = gapTop - bandTop;
    const maxDelta = gapBottom - bandBottom;
    candidates.push(thread.scrollTop + Math.min(maxDelta, Math.max(minDelta, 0)));
  }
  let best = thread.scrollTop;
  let bestDist = Number.POSITIVE_INFINITY;
  let edge = thread.scrollTop;
  let edgeDist = Number.POSITIVE_INFINITY;
  for (let index = 0; index < candidates.length; index += 1) {
    const raw = candidates[index] ?? thread.scrollTop;
    const scroll = Math.max(0, Math.min(maxScroll, raw));
    const delta = scroll - thread.scrollTop;
    let blocked = false;
    for (let cursor = 0; cursor < rects.length; cursor += 1) {
      const rect = rects[cursor];
      const top = rect.top - delta;
      const bottom = rect.bottom - delta;
      if (bottom > bandTop + 0.5 && top < bandBottom - 0.5) {
        blocked = true;
        break;
      }
    }
    if (!blocked && actionFits && actionBox) {
      const top = actionBox.top - delta;
      const bottom = actionBox.bottom - delta;
      if (top < frame.top - 1 || bottom > frame.bottom + 1) blocked = true;
    }
    if (blocked) continue;
    const dist = Math.abs(scroll - thread.scrollTop);
    if (dist < bestDist - 0.01) {
      bestDist = dist;
      best = scroll;
    }
    if (anchorBox && Math.abs(anchorBox.top - delta - bandBottom) <= 4 && dist < edgeDist - 0.01) {
      edgeDist = dist;
      edge = scroll;
    }
  }
  if (Number.isFinite(edgeDist)) best = edge;
  if (!Number.isFinite(bestDist) || Math.abs(best - thread.scrollTop) < 0.5) return;
  thread.scrollTop = best;
}
