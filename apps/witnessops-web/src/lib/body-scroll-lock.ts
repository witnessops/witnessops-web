let activeLockCount = 0;
let overflowBeforeFirstLock: string | null = null;
let paddingRightBeforeFirstLock: string | null = null;

/**
 * Lock document body scrolling until every active caller releases its lock.
 * The returned release function is idempotent so effect cleanup is safe.
 */
export function acquireBodyScrollLock(): () => void {
  if (typeof document === "undefined") {
    return () => undefined;
  }

  if (activeLockCount === 0) {
    overflowBeforeFirstLock = document.body.style.overflow;
    paddingRightBeforeFirstLock = document.body.style.paddingRight;

    if (typeof window !== "undefined") {
      const scrollbarWidth = Math.max(
        0,
        window.innerWidth - document.documentElement.clientWidth,
      );
      if (scrollbarWidth > 0) {
        const computedPaddingRight =
          Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
        document.body.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`;
      }
    }

    document.body.style.overflow = "hidden";
  }
  activeLockCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLockCount = Math.max(0, activeLockCount - 1);

    if (activeLockCount === 0) {
      document.body.style.overflow = overflowBeforeFirstLock ?? "";
      document.body.style.paddingRight = paddingRightBeforeFirstLock ?? "";
      overflowBeforeFirstLock = null;
      paddingRightBeforeFirstLock = null;
    }
  };
}
