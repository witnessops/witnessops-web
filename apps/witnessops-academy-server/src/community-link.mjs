// This is navigation only. Rocket.Chat independently verifies identity and room membership.
export function communityUrl(value = '') {
  if (value === '') return null;
  const url = new URL(value);
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && local))
    || url.username || url.password || url.search || url.hash) throw new Error('Invalid Academy community URL');
  return url.href;
}
