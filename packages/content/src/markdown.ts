export function normalizeMarkdownBody(body: string) {
  return body.replace(/^#\s+.+?(?:\r?\n){1,2}/, "").trim();
}