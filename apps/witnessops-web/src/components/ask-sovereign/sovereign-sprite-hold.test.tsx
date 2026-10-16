import assert from "node:assert/strict";
import { mock } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { spriteRecord, type SovereignSpriteState } from "./sovereign-playback";
import { SovereignSprite } from "./sovereign-sprite";

const css = readFileSync(resolve(__dirname, "ask-sovereign-preview.module.css"), "utf8");

type El = {
  nodeType: number;
  nodeName: string;
  tagName: string;
  className: string;
  attributes: Record<string, string>;
  childNodes: El[];
  parentNode: El | null;
  style: StyleMap;
  ownerDocument: Doc;
  textContent: string;
  appendChild: (child: El) => El;
  removeChild: (child: El) => El;
  insertBefore: (child: El, before: El | null) => El;
  setAttribute: (name: string, value: string) => void;
  getAttribute: (name: string) => string | null;
  removeAttribute: (name: string) => void;
  hasAttribute: (name: string) => boolean;
  addEventListener: () => void;
  removeEventListener: () => void;
};

type StyleMap = Record<string, string> & {
  setProperty: (name: string, value: string | null) => void;
  getPropertyValue: (name: string) => string;
  removeProperty: (name: string) => void;
};

function makeStyle(): StyleMap {
  const values: Record<string, string> = {};
  return new Proxy(values, {
    get(target, prop) {
      if (prop === "setProperty") {
        return (name: string, value: string | null) => {
          if (value == null || value === "") delete target[name];
          else target[name] = String(value);
        };
      }
      if (prop === "getPropertyValue") return (name: string) => target[name] ?? "";
      if (prop === "removeProperty") return (name: string) => {
        delete target[name];
      };
      return target[String(prop)];
    },
    set(target, prop, value) {
      target[String(prop)] = value == null ? "" : String(value);
      return true;
    },
  }) as StyleMap;
}

function makeElement(doc: Doc, tag: string): El {
  const element = {
    nodeType: tag === "#text" ? 3 : 1,
    nodeName: tag === "#text" ? "#text" : tag.toUpperCase(),
    tagName: tag === "#text" ? "#text" : tag.toUpperCase(),
    className: "",
    attributes: {},
    childNodes: [],
    parentNode: null,
    style: makeStyle(),
    ownerDocument: doc,
    textContent: "",
  } as unknown as El;
  element.appendChild = (child) => {
    child.parentNode?.removeChild(child);
    child.parentNode = element;
    element.childNodes.push(child);
    return child;
  };
  element.removeChild = (child) => {
    element.childNodes = element.childNodes.filter((node) => node !== child);
    child.parentNode = null;
    return child;
  };
  element.insertBefore = (child, before) => {
    child.parentNode?.removeChild(child);
    child.parentNode = element;
    const index = before ? element.childNodes.indexOf(before) : element.childNodes.length;
    element.childNodes.splice(index < 0 ? element.childNodes.length : index, 0, child);
    return child;
  };
  element.setAttribute = (name, value) => {
    element.attributes[name] = String(value);
    if (name === "class") element.className = String(value);
  };
  element.getAttribute = (name) => (name in element.attributes ? element.attributes[name] : null);
  element.removeAttribute = (name) => {
    delete element.attributes[name];
  };
  element.hasAttribute = (name) => name in element.attributes;
  element.addEventListener = () => {};
  element.removeEventListener = () => {};
  return element;
}

type Doc = {
  documentElement: El;
  body: El;
  hidden: boolean;
  activeElement: El | null;
  createElement: (tag: string) => El;
  createTextNode: (text: string) => El;
  addEventListener: () => void;
  removeEventListener: () => void;
};

function installDom() {
  const doc = {} as Doc;
  doc.documentElement = makeElement(doc, "html");
  doc.body = makeElement(doc, "body");
  doc.documentElement.appendChild(doc.body);
  doc.hidden = false;
  doc.createElement = (tag) => makeElement(doc, tag);
  doc.createTextNode = (text) => {
    const node = makeElement(doc, "#text");
    node.textContent = text;
    return node;
  };
  doc.addEventListener = () => {};
  doc.removeEventListener = () => {};
  doc.documentElement.setAttribute("data-theme", "light");
  doc.activeElement = null;
  class HTMLIFrameElement {}
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const previous = {
    document: Object.getOwnPropertyDescriptor(globalThis, "document"),
    window: Object.getOwnPropertyDescriptor(globalThis, "window"),
    Image: Object.getOwnPropertyDescriptor(globalThis, "Image"),
    MutationObserver: Object.getOwnPropertyDescriptor(globalThis, "MutationObserver"),
  };
  Object.assign(globalThis, {
    document: doc,
    window: globalThis,
    HTMLIFrameElement,
    Image: class {
      static count = 0;
      src = "";
      constructor() {
        (globalThis.Image as unknown as { count: number }).count += 1;
      }
      decode() {
        return Promise.resolve();
      }
    },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
  });
  Object.defineProperty(globalThis, "devicePixelRatio", { configurable: true, value: 1 });
  return () => {
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  };
}

function selectorMatches(selector: string, element: El) {
  const parts = selector.match(/\.[\w-]+|\[[^\]]+\]|:not\(\[[^\]]+\]\)/g) ?? [];
  if (parts.length === 0) return false;
  return parts.every((part) => {
    if (part.startsWith(".")) return element.className.split(/\s+/).includes(part.slice(1));
    if (part.startsWith(":not(")) {
      const inner = part.slice(5, -1);
      const [, name, value] = inner.match(/\[([\w-]+)="([^"]*)"\]/) ?? [];
      return element.getAttribute(name) !== value;
    }
    const [, name, value] = part.match(/\[([\w-]+)="([^"]*)"\]/) ?? [];
    return element.getAttribute(name) === value;
  });
}

function specificity(selector: string) {
  const classes = selector.match(/\.[\w-]+/g)?.length ?? 0;
  const attrs = selector.match(/\[[^\]]+\]/g)?.length ?? 0;
  return classes + attrs;
}

function heldBackgroundSize(element: El) {
  const inline = element.style.backgroundSize || element.style.getPropertyValue("background-size");
  if (inline) return inline;
  let winner = { size: "", score: -1, order: -1 };
  const blocks = css.replace(/\/\*[\s\S]*?\*\//g, "").split("}");
  blocks.forEach((block, order) => {
    const [selector = "", body = ""] = block.split("{");
    const declared = body.match(/background-size\s*:\s*([^;]+)/);
    if (!declared) return;
    selector.split(",").forEach((part) => {
      const candidate = part.trim();
      if (!candidate.includes(".spriteFace") || !selectorMatches(candidate, element)) return;
      const score = specificity(candidate);
      if (score > winner.score || (score === winner.score && order >= winner.order)) {
        winner = { size: declared[1].trim(), score, order };
      }
    });
  });
  return winner.size;
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setImmediate(resolve));
  });
}

async function holdSprite(state: SovereignSpriteState, elapsed: number) {
  const restore = installDom();
  const host = (globalThis as unknown as { document: Doc }).document.createElement("div");
  (globalThis as unknown as { document: Doc }).document.body.appendChild(host);
  let root: Root | null = null;
  try {
    await act(async () => {
      root = createRoot(host as unknown as Element);
      root.render(<SovereignSprite state={state} paused={false} reduced={false} armed />);
    });
    for (let attempt = 0; attempt < 6; attempt += 1) await settle();
    for (let step = 0; step < 40; step += 1) {
      await act(async () => {
        mock.timers.tick(elapsed);
      });
      await settle();
      const held = [host, ...host.childNodes].flatMap((node) => [node, ...node.childNodes, ...node.childNodes.flatMap((child) => child.childNodes)]).find((node) => node.className.includes("spriteFace") && node.getAttribute("data-hold") === "1");
      if (held) break;
    }
    const walk = (node: El, depth = 0): string =>
      `${" ".repeat(depth)}${node.nodeName} class=${node.className} attrs=${JSON.stringify(node.attributes)} children=${node.childNodes.length}\n${node.childNodes.map((child) => walk(child, depth + 1)).join("")}`;
    const face = [host, ...host.childNodes].flatMap((node) => [node, ...node.childNodes, ...node.childNodes.flatMap((child) => child.childNodes)]).find((node) => node.className.includes("spriteFace"));
    assert.ok(face, `${state} did not paint a face images=${(globalThis.Image as unknown as { count: number }).count}\n${walk(host)}`);
    const record = spriteRecord(state);
    return {
      size: heldBackgroundSize(face),
      position: face.style.backgroundPosition || face.style.getPropertyValue("background-position"),
      image: face.style.backgroundImage || face.style.getPropertyValue("background-image"),
      still: face.getAttribute("data-still"),
      hold: face.getAttribute("data-hold"),
      expectedPosition: `${-record.hold_frame * 94}px 0px`,
    };
  } finally {
    await act(async () => {
      root?.unmount();
    });
    restore();
  }
}

test("a finished idle, wave, or typing loop holds one strip frame", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const cases = [
      { state: "IDLE" as const, elapsed: spriteRecord("IDLE").sequence.reduce((sum, step) => sum + step.ms, 0) * spriteRecord("IDLE").loop_count },
      { state: "GREETING" as const, elapsed: spriteRecord("GREETING").sequence.reduce((sum, step) => sum + step.ms, 0) * spriteRecord("GREETING").loop_count },
      { state: "COMPOSING" as const, elapsed: spriteRecord("COMPOSING").cap_ms ?? 0 },
    ];
    for (const item of cases) {
      const face = await holdSprite(item.state, item.elapsed);
      const stripHold = face.size === "auto 102px" && face.position === face.expectedPosition && !face.image.includes("-still-");
      const stillAsset = face.image.includes("-still-") && face.hold === "1";
      assert.ok(
        stripHold || stillAsset,
        `${item.state} hold size=${face.size} position=${face.position} expected=${face.expectedPosition} still=${face.still} hold=${face.hold} image=${face.image}`,
      );
    }
  } finally {
    mock.timers.reset();
  }
});
