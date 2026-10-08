import { registerHooks } from "node:module";

const emptyServerOnlyModule = new URL(
  "./server-only-test-stub.mjs",
  import.meta.url,
).href;

const cssModuleTestStub = new URL(
  "./css-module-test-stub.mjs",
  import.meta.url,
).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: emptyServerOnlyModule, shortCircuit: true };
    }
    if (specifier.endsWith(".module.css")) {
      return { url: cssModuleTestStub, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
