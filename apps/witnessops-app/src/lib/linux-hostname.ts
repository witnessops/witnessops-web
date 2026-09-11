/** A local Linux label need not resolve publicly. This is never a collection target. */
export function linuxHostname(input: unknown): string {
  if (typeof input !== 'string' || input.length > 253 || !input.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) throw new Error('Invalid Linux hostname');
  return input.toLowerCase();
}
