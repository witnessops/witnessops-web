export type Box = { left: number; top: number; right: number; bottom: number };

export const SWIPE_DISMISS_DISTANCE = 96;
export const SWIPE_DISMISS_VELOCITY = 0.5;

export function pointOutsideBox(point: { x: number; y: number }, box: Box): boolean {
  return point.x < box.left || point.x > box.right || point.y < box.top || point.y > box.bottom;
}

export function shouldDismissBackdrop(startedOutside: boolean, release: { x: number; y: number }, box: Box): boolean {
  return startedOutside && pointOutsideBox(release, box);
}

/** Downward flick. Distance is CSS pixels and elapsed time is milliseconds. */
export function shouldDismissSwipe(distance: number, elapsedMs: number): boolean {
  if (distance > SWIPE_DISMISS_DISTANCE) return true;
  return distance / Math.max(1, elapsedMs) > SWIPE_DISMISS_VELOCITY;
}
