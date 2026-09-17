/** Public destination only; app exposure remains an explicit deployment choice. */
export function getWorkspaceAppUrl(path: '/' | '/signup' = '/') {
  const value = process.env.WITNESSOPS_EARLY_ACCESS_APP_URL;
  if (!value) return process.env.NODE_ENV === 'development' ? new URL(path, 'http://127.0.0.1:3020/').href : null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === '127.0.0.1')) return null;
    return new URL(path, url).href;
  } catch { return null; }
}
