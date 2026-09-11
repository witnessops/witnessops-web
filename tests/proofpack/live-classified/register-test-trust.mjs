// Explicit test process only. Never imported by app runtime or build.
import { registerHooks } from 'node:module';
if (process.env.NODE_ENV !== 'test') throw new Error('Test-only trust loader');
registerHooks({ resolve(specifier,context,nextResolve) {
  if (specifier.endsWith('/proofpack/pinned-registry')) return {url:new URL('./test-trust.mjs',import.meta.url).href,shortCircuit:true};
  return nextResolve(specifier,context);
}});
