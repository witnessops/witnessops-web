/** Public destination only; app exposure remains an explicit deployment choice. */
export function getWorkspaceAppUrl() {
  const value = process.env.WITNESSOPS_EARLY_ACCESS_APP_URL;
  if (!value) return process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:3020/' : null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    return url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === '127.0.0.1') ? url.href : null;
  } catch { return null; }
}
