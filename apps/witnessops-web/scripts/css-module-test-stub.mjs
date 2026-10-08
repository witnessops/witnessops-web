/**
 * Test-only stand-in for `*.module.css` imports so node:test can render
 * components (e.g. the live homepage) that Next normally bundles.
 * Each class lookup returns its own name, keeping markup deterministic.
 */
const cssModuleProxy = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === "__esModule") {
        return true;
      }
      if (prop === "default") {
        return cssModuleProxy;
      }
      return typeof prop === "string" ? prop : undefined;
    },
  },
);

export default cssModuleProxy;
