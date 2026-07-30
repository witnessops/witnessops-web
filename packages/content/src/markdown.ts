/**
 * Drop a single leading ATX H1 line from markdown body text.
 * Uses a linear pattern ([^\r\n]+) to avoid ReDoS on crafted input.
 */
export function normalizeMarkdownBody(body: string) {
  return body.replace(/^#[ \t]+[^\r\n]+(?:\r?\n){1,2}/, "").trim();
}