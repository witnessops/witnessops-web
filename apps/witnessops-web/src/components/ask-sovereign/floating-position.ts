export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Viewport = Point & Size;

/** Keep the entire control reachable, including after rotation or keyboard resize. */
export function constrainPosition(point: Point, size: Size, viewport: Viewport): Point {
  const availableX = Math.max(0, viewport.width - size.width);
  const availableY = Math.max(0, viewport.height - size.height);
  const gapX = Math.min(16, availableX / 2);
  const gapY = Math.min(16, availableY / 2);
  return {
    x: Math.min(viewport.x + availableX - gapX, Math.max(viewport.x + gapX, point.x)),
    y: Math.min(viewport.y + availableY - gapY, Math.max(viewport.y + gapY, point.y)),
  };
}

export function defaultPosition(size: Size, viewport: Viewport): Point {
  return constrainPosition({ x: viewport.x + viewport.width, y: viewport.y + viewport.height }, size, viewport);
}

/** Locale is independent of hosting: Polish at /pl today, or at a domain root later. */
export function sovereignLinks(prefix: "" | "/pl") {
  return { docs: `${prefix}/docs`, contact: `${prefix}/contact` };
}
