import assert from "node:assert/strict";
import test from "node:test";

import { acquireBodyScrollLock } from "./body-scroll-lock";

function withMockBody(
  initialOverflow: string,
  run: (body: { style: { overflow: string; paddingRight: string } }) => void,
) {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const body = { style: { overflow: initialOverflow, paddingRight: "" } };

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { body, documentElement: { clientWidth: 0 } },
  });

  try {
    run(body);
  } finally {
    if (originalDocument) {
      Object.defineProperty(globalThis, "document", originalDocument);
    } else {
      Reflect.deleteProperty(globalThis, "document");
    }
  }
}

test("body scroll remains locked until stacked overlays all release", () => {
  withMockBody("clip", (body) => {
    const releaseDrawer = acquireBodyScrollLock();
    const releaseSearch = acquireBodyScrollLock();

    assert.equal(body.style.overflow, "hidden");
    releaseDrawer();
    assert.equal(body.style.overflow, "hidden");
    releaseSearch();
    assert.equal(body.style.overflow, "clip");
  });
});

test("body scroll release is idempotent", () => {
  withMockBody("", (body) => {
    const release = acquireBodyScrollLock();

    release();
    release();
    assert.equal(body.style.overflow, "");
  });
});

test("first lock compensates for the desktop scrollbar and restores padding", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      innerWidth: 1200,
      getComputedStyle: () => ({ paddingRight: "3px" }),
    },
  });

  try {
    withMockBody("", (body) => {
      body.style.paddingRight = "3px";
      Object.defineProperty(globalThis.document.documentElement, "clientWidth", {
        configurable: true,
        value: 1180,
      });

      const release = acquireBodyScrollLock();
      assert.equal(body.style.paddingRight, "23px");

      release();
      assert.equal(body.style.paddingRight, "3px");
    });
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});
