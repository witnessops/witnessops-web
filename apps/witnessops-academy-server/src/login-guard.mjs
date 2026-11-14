// Bounded pre-login state. Entries expire, the map has a hard cap, and login starts are rate-limited.
export const PREAUTH_TTL_MS = 600_000;
export const PREAUTH_MAX_ENTRIES = 256;
export const LOGIN_WINDOW_MS = 60_000;
export const LOGIN_MAX_PER_WINDOW = 30;
export const LOGIN_SWEEP_MS = 30_000;

export function createLoginGuard(options = {}) {
  const maxEntries = options.maxEntries ?? PREAUTH_MAX_ENTRIES;
  const windowMs = options.windowMs ?? LOGIN_WINDOW_MS;
  const maxPerWindow = options.maxPerWindow ?? LOGIN_MAX_PER_WINDOW;
  const entries = new Map();
  const hits = new Map();

  function sweep(now = Date.now()) {
    for (const [key, value] of entries) {
      if (value.exp <= now) entries.delete(key);
    }
    for (const [ip, stamps] of hits) {
      const fresh = stamps.filter((stamp) => now - stamp < windowMs);
      if (fresh.length === 0) hits.delete(ip);
      else hits.set(ip, fresh);
    }
  }

  function begin(ip, now = Date.now()) {
    sweep(now);
    const stamps = hits.get(ip) ?? [];
    if (stamps.length >= maxPerWindow || entries.size >= maxEntries) return { ok: false, status: 429 };
    stamps.push(now);
    hits.set(ip, stamps);
    return { ok: true };
  }

  function put(key, value) {
    if (!entries.has(key) && entries.size >= maxEntries) return false;
    entries.set(key, value);
    return true;
  }

  function take(key, now = Date.now()) {
    const value = entries.get(key);
    entries.delete(key);
    if (!value || value.exp <= now) return null;
    return value;
  }

  return {
    begin,
    put,
    take,
    sweep,
    size: () => entries.size,
  };
}

export function startLoginSweep(guard, intervalMs = LOGIN_SWEEP_MS) {
  const timer = setInterval(() => guard.sweep(), intervalMs);
  timer.unref();
  return timer;
}
