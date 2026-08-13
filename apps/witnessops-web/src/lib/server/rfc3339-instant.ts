export function compareRfc3339Instants(left: string, right: string): number {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);

  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
    throw new Error("A valid RFC3339 timestamp is required for ordering.");
  }

  return leftTime === rightTime ? 0 : leftTime < rightTime ? -1 : 1;
}

export function laterRfc3339(left: string, right: string): string {
  return compareRfc3339Instants(left, right) > 0 ? left : right;
}
