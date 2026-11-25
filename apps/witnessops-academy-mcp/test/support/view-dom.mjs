// Minimal synthetic DOM for exercising the Decision Room inline script in node:vm.
// It models only what chat-view.html uses; no network, no real host.
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

class TextNode {
  constructor(text) { this.nodeType = 3; this.textContent = String(text); }
}

class FakeElement {
  constructor(tagName, id = '') {
    this.tagName = tagName.toLowerCase(); this.id = id; this.children = []; this.ownText = '';
    this.hidden = false; this.disabled = false; this.checked = false; this.className = '';
    this.type = ''; this.name = ''; this.value = ''; this.tabIndex = 0; this.style = {};
    this.attributes = new Map(); this.listeners = new Map();
  }
  get textContent() { return this.ownText + this.children.map(c => c.textContent).join(''); }
  set textContent(value) { this.children = []; this.ownText = String(value); }
  append(...nodes) { for (const n of nodes) this.children.push(typeof n === 'string' ? new TextNode(n) : n); }
  replaceChildren(...nodes) { this.children = []; this.ownText = ''; this.append(...nodes); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(fn); }
  dispatch(type, event = {}) { for (const fn of this.listeners.get(type) ?? []) fn({ preventDefault() {}, ...event }); }
  click() { if (!this.disabled) this.dispatch('click'); }
  focus() {}
  querySelectorAll(selector) {
    const out = [];
    const walk = node => { for (const c of node.children ?? []) { if (c.tagName === selector) out.push(c); walk(c); } };
    walk(this); return { forEach: fn => out.forEach(fn), length: out.length, [Symbol.iterator]: () => out[Symbol.iterator]() };
  }
  elements() { const out = []; const walk = n => { for (const c of n.children ?? []) if (c instanceof FakeElement) { out.push(c); walk(c); } }; walk(this); return out; }
}

/** Collect id="…" elements and their initial `hidden` flag by plain string scanning. */
function elementsById(html) {
  const found = new Map();
  let at = 0;
  for (;;) {
    const hit = html.indexOf(' id="', at); if (hit < 0) break;
    const start = html.lastIndexOf('<', hit), end = html.indexOf('>', hit);
    const close = html.indexOf('"', hit + 5);
    const id = html.slice(hit + 5, close), tag = html.slice(start + 1, html.indexOf(' ', start));
    const element = new FakeElement(tag, id);
    element.hidden = html.slice(start, end).split(/\s/).includes('hidden');
    if (html.slice(start, end).includes(' disabled')) element.disabled = true;
    found.set(id, element); at = end;
  }
  return found;
}

export function inlineScript(html) {
  const open = '<script>', start = html.indexOf(open), end = html.lastIndexOf('</' + 'script>');
  if (start < 0 || end <= start) throw new Error('inline script not found');
  return html.slice(start + open.length, end);
}

export async function flush() { for (let i = 0; i < 5; i += 1) await new Promise(resolve => setImmediate(resolve)); }

export function bootView(html, { hostOrigin = 'https://host.example', windowExtras = {} } = {}) {
  const ids = elementsById(html);
  const sent = [];
  let now = 0, nextTimer = 1;
  const timers = new Map();
  const parent = { postMessage(message, targetOrigin) { sent.push({ message: JSON.parse(JSON.stringify(message)), targetOrigin }); } };
  const windowListeners = [];
  const document = {
    getElementById: id => ids.get(id) ?? null,
    createElement: tag => new FakeElement(tag),
    createTextNode: text => new TextNode(text),
  };
  const window = { parent, addEventListener: (type, fn) => { if (type === 'message') windowListeners.push(fn); }, ...windowExtras };
  const context = vm.createContext({
    window, document, crypto: webcrypto, console,
    setTimeout: (fn, ms) => { const id = nextTimer++; timers.set(id, { fn, at: now + ms }); return id; },
    clearTimeout: id => { timers.delete(id); },
  });
  vm.runInContext(inlineScript(html), context);
  const view = {
    sent, ids, q: id => ids.get(id),
    receive(data, { source = parent, origin = hostOrigin } = {}) { for (const fn of windowListeners) fn({ source, origin, data }); },
    advance(ms) { now += ms; for (const [id, t] of [...timers]) if (t.at <= now) { timers.delete(id); t.fn(); } },
    pendingTimers: () => timers.size,
    calls: () => sent.filter(s => s.message.method === 'tools/call'),
    lastCall: () => view.calls().at(-1),
    async connect() {
      const init = sent.find(s => s.message.method === 'ui/initialize');
      view.receive({ jsonrpc: '2.0', id: init.message.id, result: {} }); await flush();
    },
    async toolResult(structuredContent) {
      view.receive({ jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: { structuredContent } }); await flush();
    },
    async answer(call, structuredContent, isError = false) {
      view.receive({ jsonrpc: '2.0', id: call.message.id, result: { ...(isError ? { isError: true } : {}), structuredContent, content: [{ type: 'text', text: JSON.stringify(structuredContent) }] } });
      await flush();
    },
    async choose(index = 0) {
      const radios = [...view.q('choices').querySelectorAll('input')];
      radios[index].checked = true; radios[index].dispatch('change'); await flush();
    },
    allText: () => [...ids.values()].map(e => e.textContent).join('\n'),
  };
  return view;
}
