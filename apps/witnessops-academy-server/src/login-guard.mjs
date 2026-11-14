// Per-client login rate limit. Pre-login PKCE state is not stored here.
export const LOGIN_WINDOW_MS = 60_000;
export const LOGIN_MAX_PER_WINDOW = 30;
export const LOGIN_SWEEP_MS = 30_000;

export function createLoginGuard(options = {}) {
  const windowMs = options.windowMs ?? LOGIN_WINDOW_MS;
  const maxPerWindow = options.maxPerWindow ?? LOGIN_MAX_PER_WINDOW;
  const hits = new Map();

  function sweep(now = Date.now()) {
    for (const [ip, stamps] of hits) {
      const fresh = stamps.filter((stamp) => now - stamp < windowMs);
      if (fresh.length === 0) hits.delete(ip);
      else hits.set(ip, fresh);
    }
  }

  function begin(ip, now = Date.now()) {
    sweep(now);
    const stamps = hits.get(ip) ?? [];
    if (stamps.length >= maxPerWindow) {
      const retryAfter = Math.max(1, Math.ceil((stamps[0] + windowMs - now) / 1000));
      return { ok: false, status: 429, retryAfter };
    }
    stamps.push(now);
    hits.set(ip, stamps);
    return { ok: true, retryAfter: 0 };
  }

  return {
    begin,
    sweep,
    clients: () => hits.size,
  };
}

export function startLoginSweep(guard, intervalMs = LOGIN_SWEEP_MS) {
  const timer = setInterval(() => guard.sweep(), intervalMs);
  timer.unref();
  return timer;
}
