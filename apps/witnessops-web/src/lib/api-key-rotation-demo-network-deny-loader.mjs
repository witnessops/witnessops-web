const BLOCKED_NETWORK_MODULES = new Set([
  "dgram",
  "dns",
  "http",
  "http2",
  "https",
  "net",
  "tls",
  "undici",
]);

function networkModuleName(specifier) {
  return specifier.startsWith("node:") ? specifier.slice(5).split("/")[0] : specifier.split("/")[0];
}

export async function resolve(specifier, context, nextResolve) {
  if (BLOCKED_NETWORK_MODULES.has(networkModuleName(specifier))) {
    throw new Error(`NETWORK_DISABLED: ${specifier}`);
  }
  return nextResolve(specifier, context);
}

function denyNetwork() {
  throw new Error("NETWORK_DISABLED: global network API");
}

Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  value: denyNetwork,
  writable: false,
});

Object.defineProperty(globalThis, "WebSocket", {
  configurable: true,
  value: class NetworkDisabledWebSocket {
    constructor() {
      denyNetwork();
    }
  },
  writable: false,
});
