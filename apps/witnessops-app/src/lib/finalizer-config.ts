import 'server-only';

/**
 * Operator gate for the in-container server-check finalizer.
 * Only the exact value "1" enables it. Unset and every other value stay off.
 */
export function finalizerEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.WITNESSOPS_FINALIZER_ENABLED === '1';
}
