import {registerHooks} from 'node:module';
if(process.env.NODE_ENV!=='test')throw new Error('Isolated test process required');
registerHooks({resolve(specifier,context,next){if(specifier.endsWith('/proofpack/pinned-registry'))return {url:new URL('./test-trust.mjs',import.meta.url).href,shortCircuit:true};return next(specifier,context);}});
