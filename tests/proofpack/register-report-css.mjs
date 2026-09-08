// Node-only renderer tests use stable CSS class names and the actual report stylesheet.
import { registerHooks } from 'node:module';
registerHooks({
    load(url, context, nextLoad) {
        if (url.endsWith('.module.css')) return { format: 'module', shortCircuit: true, source: 'export default new Proxy({}, {get: (_, key) => key})' };
        return nextLoad(url, context);
    },
});
