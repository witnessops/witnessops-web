import { registerHooks } from "node:module";

const emptyServerOnlyModule = new URL(
  "./server-only-test-stub.mjs",
  import.meta.url,
).href;
const cssModuleStub = new URL("./css-module-test-stub.mjs", import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: emptyServerOnlyModule, shortCircuit: true };
    }
    if (specifier.endsWith(".css")) {
      return { url: cssModuleStub, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
