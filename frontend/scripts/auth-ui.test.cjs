/* eslint-disable @typescript-eslint/no-require-imports -- Synthetic component/DOM tests: no live CAPTCHA, network or account is accessed. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const componentPath = path.join(__dirname, '../src/components/auth/PuzzleCaptcha.tsx');
const compiled = ts.transpileModule(fs.readFileSync(componentPath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const challenge = (overrides = {}) => ({ token: 'synthetic-token', target: 60,
  image: '/images/captcha/synthetic-test.webp', expiresIn: 300, ...overrides });
const Image = Symbol('mock-next-image');

function mountCaptcha({ width = 352, thumb = 52 } = {}) {
  const slots = [], requests = [], proofs = [], writesAfterUnmount = [], observers = [];
  const timers = new Map(), frames = new Map(), captures = new Set();
  let cursor = 0, effects = [], nextTimer = 1, nextFrame = 1, now = 100_000;
  let mounted = true, dirty = false, tree, renders = 0;
  const onChange = (proof) => proofs.push(proof);
  const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const element = (extra = {}) => ({ attributes: {},
    style: { values: {}, setProperty(name, value) { this.values[name] = value; } },
    setAttribute(name, value) { this.attributes[name] = String(value); }, ...extra });
  const dom = {
    panel: element(), track: element({ clientWidth: width }),
    slider: element({ offsetWidth: thumb, focus() {},
      setPointerCapture(id) { captures.add(id); }, hasPointerCapture(id) { return captures.has(id); },
      releasePointerCapture(id) { captures.delete(id); },
    }),
  };
  const react = {
    useId() { return 'synthetic-captcha'; },
    useRef(initial) { const i = cursor++; if (!slots[i]) slots[i] = { current: initial }; return slots[i]; },
    useState(initial) {
      const i = cursor++;
      if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial,
        set(update) {
          if (!mounted) writesAfterUnmount.push(i);
          const next = typeof update === 'function' ? update(slots[i].value) : update;
          if (!Object.is(next, slots[i].value)) { slots[i].value = next; dirty = true; }
        },
      };
      return [slots[i].value, slots[i].set];
    },
    useCallback(callback, dependencies) {
      const i = cursor++;
      if (!sameDeps(slots[i]?.dependencies, dependencies)) slots[i] = { dependencies, callback };
      return slots[i].callback;
    },
    useEffect(effect, dependencies) {
      const i = cursor++;
      if (!sameDeps(slots[i]?.dependencies, dependencies)) effects.push(() => {
        slots[i]?.cleanup?.(); slots[i] = { dependencies: dependencies?.slice(), cleanup: effect() };
      });
    },
  };
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, AbortController, Date: { now: () => now },
    ResizeObserver: class {
      constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
      observe(target) { this.target = target; }
      disconnect() { this.disconnected = true; }
    },
    requestAnimationFrame(callback) { const id = nextFrame++; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout(callback, delay) { const id = nextTimer++; timers.set(id, { callback, due: now + Math.max(0, delay) }); return id; },
    clearTimeout(id) { timers.delete(id); },
    fetch(url, options) { assert.equal(url, '/api/security/puzzle'); return new Promise((resolve, reject) => requests.push({ options, resolve, reject })); },
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: Symbol.for('synthetic-fragment') };
      if (name === 'next/image') return { __esModule: true, default: Image };
      if (name === 'lucide-react') return Object.fromEntries(['ArrowRight', 'Check', 'LoaderCircle', 'RefreshCw', 'ShieldCheck'].map((icon) => [icon, icon]));
      if (name === './PuzzleCaptcha.module.css') return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
      throw new Error('Unexpected dependency: ' + name);
    },
  }, { filename: componentPath });
  function walk(node, callback) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((child) => walk(child, callback)); return; }
    callback(node); walk(node.props?.children, callback);
  }
  function find(predicate) { let match; walk(tree, (node) => { if (!match && predicate(node)) match = node; }); return match?.props; }
  function render() {
    assert(mounted); renders += 1; cursor = 0; effects = []; dirty = false;
    tree = exports.PuzzleCaptcha({ locale: 'en', onChange });
    // React attaches persistent DOM refs before running effects.
    walk(tree, ({ props }) => {
      if (!props.ref) return;
      const name = ['panel', 'track', 'slider'].find((value) => props.className?.split(' ').includes(value));
      assert(name, 'Unexpected DOM ref; extend this harness explicitly');
      props.ref.current = dom[name];
      for (const [key, value] of Object.entries(props)) if (key.startsWith('aria-')) dom[name].setAttribute(key, value);
    });
    effects.forEach((effect) => effect());
  }
  async function flush() { for (let i = 0; i < 12; i++) { await Promise.resolve(); if (mounted && dirty) render(); } }
  async function act(callback) { callback(); await flush(); }
  async function advance(milliseconds) {
    const end = now + milliseconds;
    for (;;) {
      const next = [...timers].filter(([, timer]) => timer.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      const [id, timer] = next; now = timer.due; timers.delete(id); timer.callback(); await flush();
    }
    now = end; await flush();
  }
  render();
  return {
    get slider() { return find((node) => node.props.role === 'slider'); },
    get refreshButton() { return find((node) => node.props.className === 'refresh'); },
    get image() { return find((node) => node.type === Image); },
    get status() { return find((node) => node.props.id === 'synthetic-captcha-status').children; },
    get position() { return Number(dom.slider.attributes['aria-valuenow']); },
    get shift() { return parseFloat(dom.panel.style.values['--shift']); },
    get renders() { return renders; },
    requests, proofs, timers, frames, captures, observers, dom, writesAfterUnmount, act, advance, flush,
    async resolve(index, data = challenge({ token: `synthetic-token-${index}` }), ok = true) { requests[index].resolve({ ok, json: async () => data }); await flush(); },
    async reject(index) { requests[index].reject(new Error('Synthetic network failure')); await flush(); },
    async load() { await act(() => this.image.onLoad()); },
    async imageError() { await act(() => this.image.onError()); },
    async ready(data) { await this.resolve(0, data); await this.load(); },
    async pointer(type, x = 100, overrides = {}) {
      const event = { pointerId: 7, isPrimary: true, button: 0, clientX: x, clientY: 0, currentTarget: dom.slider,
        preventDefault() {}, nativeEvent: { getCoalescedEvents: () => [] }, ...overrides };
      await act(() => this.slider[`onPointer${type}`](event));
    },
    async lost(pointerId = 7) { captures.delete(pointerId); await act(() => this.slider.onLostPointerCapture({ pointerId })); },
    async key(key) { await act(() => this.slider.onKeyDown({ key, preventDefault() {} })); },
    async draw() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach((callback) => callback(now)); await flush(); },
    async resize(nextWidth) { dom.track.clientWidth = nextWidth; observers.filter((o) => !o.disconnected).forEach((o) => o.callback()); await flush(); },
    unmount() { mounted = false; slots.forEach((slot) => slot?.cleanup?.()); },
  };
}

async function correctDrag(ui) {
  await ui.pointer('Down');
  for (const x of [160, 220, 280]) await ui.pointer('Move', x);
  await ui.pointer('Up', 280);
}

test('image success, not JSON success, unlocks the slider with correct source dimensions', async () => {
  const ui = mountCaptcha(); assert.equal(ui.slider.disabled, true); await ui.resolve(0);
  assert.equal(ui.slider.disabled, true); assert.equal(ui.refreshButton.disabled, true);
  assert.equal(ui.image.width, 600); assert.equal(ui.image.height, 240); assert.match(ui.status, /Preparing/);
  await ui.load(); assert.equal(ui.slider.disabled, false); assert.equal(ui.refreshButton.disabled, false);
  assert.equal(ui.timers.size, 1, 'Only challenge-expiry timer remains'); ui.unmount();
});

test('diagonal touch follows horizontal movement without rerendering React every frame', async () => {
  const ui = mountCaptcha(); await ui.ready(); await ui.pointer('Down', 100, { clientY: 80 });
  const renders = ui.renders;
  for (const [x, clientY] of [[160, 95], [220, 140], [280, 190]]) await ui.pointer('Move', x, { clientY });
  assert.equal(ui.frames.size, 1, 'High-frequency events share one paint');
  assert.equal(ui.renders, renders, 'Movement must stay in refs/RAF');
  await ui.draw(); assert.equal(ui.position, 60); assert.equal(ui.shift, 180); assert.equal(ui.renders, renders);
  await ui.pointer('Up', 280, { clientY: 200 }); await ui.advance(651); assert.equal(ui.proofs.at(-1).position, 60);
  const css = fs.readFileSync(path.join(__dirname, '../src/components/auth/PuzzleCaptcha.module.css'), 'utf8');
  assert.match(css.match(/\.slider\s*\{([^}]+)\}/)?.[1] ?? '', /touch-action:\s*none/); ui.unmount();
});

test('pointerup commits its final coordinate; checking ignores late movement and native lostcapture', async () => {
  const ui = mountCaptcha(); await ui.ready(); await ui.pointer('Down');
  await ui.pointer('Move', 160); await ui.pointer('Move', 220); await ui.pointer('Up', 286);
  assert.equal(ui.position, 62); assert.equal(ui.shift, 186); assert.match(ui.status, /Confirming/);
  assert.equal(ui.slider.disabled, true); assert.equal(ui.proofs.filter(Boolean).length, 0);
  await ui.pointer('Move', 400); await ui.pointer('Down', 200); await ui.key('End'); await ui.lost();
  await ui.advance(650); assert.equal(ui.proofs.filter(Boolean).length, 0); await ui.advance(1);
  assert.equal(ui.proofs.at(-1).position, 62); assert.equal(ui.proofs.at(-1).moves, 3);
  assert.equal(ui.proofs.at(-1).elapsedMs, 651); assert.equal(ui.position, 60, 'Successful display snaps to target');
  assert.equal(ui.captures.size, 0); assert.match(ui.status, /Verified/); ui.unmount();
});

test('coalesced samples count real moves without double-counting the final coordinate', async () => {
  const ui = mountCaptcha(); await ui.ready(); await ui.pointer('Down');
  await ui.pointer('Move', 280, { nativeEvent: { getCoalescedEvents: () => [160, 220, 280].map((clientX) => ({ clientX })) } });
  await ui.pointer('Up', 280); await ui.advance(651);
  assert.equal(ui.proofs.at(-1).moves, 3); assert.equal(ui.proofs.at(-1).position, 60); ui.unmount();
});

test('secondary buttons/pointers cannot start, steal, finish or cancel the primary gesture', async () => {
  const ui = mountCaptcha(); await ui.ready();
  await ui.pointer('Down', 100, { isPrimary: false, pointerId: 8 }); await ui.pointer('Down', 100, { button: 2 });
  assert.equal(ui.captures.size, 0); await ui.pointer('Down'); await ui.pointer('Move', 160);
  await ui.pointer('Down', 100, { pointerId: 8 }); await ui.pointer('Move', 400, { pointerId: 8 });
  await ui.pointer('Up', 400, { pointerId: 8 }); await ui.pointer('Cancel', 0, { pointerId: 8 }); await ui.lost(8);
  await ui.draw(); assert.equal(ui.position, 20); assert.equal(ui.captures.has(7), true);
  await ui.pointer('Move', 220); await ui.pointer('Up', 280); await ui.advance(651);
  assert.equal(ui.proofs.at(-1).position, 60); assert.equal(ui.proofs.at(-1).moves, 3); ui.unmount();
});

test('pointercancel and unexpected lost capture never verify an aligned gesture', async () => {
  for (const kind of ['cancel', 'lost']) {
    const ui = mountCaptcha(); await ui.ready(); await ui.pointer('Down');
    for (const x of [160, 220, 280]) await ui.pointer('Move', x);
    if (kind === 'cancel') await ui.pointer('Cancel', 280); else await ui.lost();
    await ui.pointer('Up', 280); await ui.advance(1000); await ui.draw();
    assert.equal(ui.position, 0); assert.equal(ui.proofs.filter(Boolean).length, 0); assert.equal(ui.proofs.at(-1), null);
    assert.match(ui.status, /interrupted/); assert.equal(ui.slider.disabled, false); ui.unmount();
  }
});

test('too few actual moves fail safely and preserve position for correction', async () => {
  const ui = mountCaptcha(); await ui.ready(); await ui.pointer('Down'); await ui.pointer('Move', 280);
  await ui.advance(700); await ui.pointer('Up', 280);
  assert.equal(ui.position, 60); assert.equal(ui.proofs.at(-1), null); assert.equal(ui.proofs.filter(Boolean).length, 0);
  assert.match(ui.status, /slowly/); assert.equal(ui.slider.disabled, false); ui.unmount();
});

test('mismatch retains position and a correction counts only the new gesture', async () => {
  const ui = mountCaptcha(); await ui.ready(); await ui.pointer('Down');
  for (const x of [130, 160, 220]) await ui.pointer('Move', x);
  await ui.advance(700); await ui.pointer('Up', 220); assert.equal(ui.position, 40); assert.match(ui.status, /Almost there/);
  await ui.pointer('Down'); for (const x of [115, 130, 145, 160]) await ui.pointer('Move', x);
  await ui.pointer('Up', 160); await ui.advance(651);
  assert.equal(ui.proofs.at(-1).position, 60); assert.equal(ui.proofs.at(-1).moves, 4); ui.unmount();
});

test('keyboard arrows retain adjustments and Enter respects three-move/minimum-time rules', async () => {
  const ui = mountCaptcha(); await ui.ready(challenge({ target: 3 })); await ui.key('Enter'); assert.equal(ui.slider.disabled, false);
  for (const [key, value] of [['ArrowRight', 1], ['ArrowUp', 2], ['ArrowRight', 3]]) {
    await ui.key(key); assert.equal(ui.position, value); assert.equal(ui.proofs.filter(Boolean).length, 0);
  }
  await ui.key('Enter'); assert.match(ui.status, /Confirming/); await ui.advance(651);
  assert.equal(ui.proofs.at(-1).position, 3); assert.equal(ui.proofs.at(-1).moves, 3); ui.unmount();
});

test('Home/End/PageUp/PageDown and arrows respect bounds; Space can confirm', async () => {
  const ui = mountCaptcha(); await ui.ready();
  for (const [key, expected] of [['End', 100], ['ArrowRight', 100], ['Home', 0], ['ArrowLeft', 0], ['PageUp', 10], ['PageDown', 0], ['ArrowUp', 1], ['ArrowDown', 0]]) {
    await ui.key(key); assert.equal(ui.position, expected);
  }
  for (let i = 0; i < 6; i++) await ui.key('PageUp');
  await ui.advance(700); await ui.key(' '); assert.equal(ui.proofs.at(-1).position, 60); ui.unmount();
});

test('geometry follows measured rail/handle widths and refuses degenerate travel', async () => {
  const ui = mountCaptcha(); await ui.ready(); await ui.resize(252); await ui.pointer('Down');
  for (const x of [140, 180, 220]) await ui.pointer('Move', x);
  await ui.draw(); assert.equal(ui.position, 60); assert.equal(ui.shift, 120);
  await ui.pointer('Up', 220); await ui.advance(651); assert.equal(ui.proofs.at(-1).position, 60); ui.unmount();
  const narrow = mountCaptcha({ width: 52 }); await narrow.ready(); await narrow.pointer('Down');
  assert.equal(narrow.captures.size, 0); assert.equal(narrow.proofs.filter(Boolean).length, 0); narrow.unmount();
});

test('image failure keeps dragging locked; successful refresh restores it', async () => {
  const ui = mountCaptcha(); await ui.resolve(0); await ui.imageError();
  assert.equal(ui.slider.disabled, true); assert.equal(ui.refreshButton.disabled, false); assert.match(ui.status, /image could not load/);
  await ui.act(() => ui.refreshButton.onClick()); await ui.resolve(1); await ui.load();
  assert.equal(ui.slider.disabled, false); assert.doesNotMatch(ui.status, /could not load/); ui.unmount();
});

test('image timeout permits retry and old image callbacks cannot affect a replacement challenge', async () => {
  const ui = mountCaptcha(); await ui.resolve(0); const oldImage = ui.image; await ui.advance(15_000);
  assert.match(ui.status, /image timed out/); assert.equal(ui.slider.disabled, true); assert.equal(ui.refreshButton.disabled, false);
  await ui.act(() => ui.refreshButton.onClick()); await ui.act(() => oldImage.onLoad()); assert.equal(ui.slider.disabled, true);
  await ui.resolve(1); await ui.act(() => oldImage.onLoad()); assert.equal(ui.slider.disabled, true);
  await ui.load(); await ui.act(() => oldImage.onError()); assert.equal(ui.slider.disabled, false);
  assert.doesNotMatch(ui.status, /could not load|timed out/); ui.unmount();
});

test('fetch timeout aborts and ignores late results after a successful refresh', async () => {
  const ui = mountCaptcha(); await ui.advance(15_000); assert.equal(ui.requests[0].options.signal.aborted, true);
  assert.match(ui.status, /timed out/); await ui.act(() => ui.refreshButton.onClick()); await ui.resolve(1); await ui.load();
  const src = ui.image.src;
  await ui.resolve(0, challenge({ token: 'synthetic-old', image: '/images/captcha/old-synthetic.webp' }));
  assert.equal(ui.image.src, src); assert.equal(ui.slider.disabled, false); ui.unmount();
});

test('failed fetch is retryable and malformed image URLs never unlock the slider', async () => {
  const ui = mountCaptcha(); await ui.reject(0); assert.equal(ui.refreshButton.disabled, false); assert.equal(ui.slider.disabled, true);
  await ui.act(() => ui.refreshButton.onClick()); await ui.resolve(1, challenge({ image: 'https://invalid.example/image.png' }));
  assert.equal(ui.slider.disabled, true); assert.equal(ui.image, undefined); assert.match(ui.status, /could not load/);
  await ui.act(() => ui.refreshButton.onClick()); await ui.resolve(2); await ui.load(); assert.equal(ui.slider.disabled, false); ui.unmount();
});

test('expiry clears verified proof and ignores old image callbacks', async () => {
  const ui = mountCaptcha(); await ui.ready(); const oldImage = ui.image; await correctDrag(ui); await ui.advance(651);
  assert(ui.proofs.at(-1)); await ui.advance(295_000 - 651);
  assert.equal(ui.proofs.at(-1), null); assert.equal(ui.position, 0); assert.equal(ui.slider.disabled, true); assert.match(ui.status, /expired/);
  await ui.act(() => oldImage.onLoad()); assert.equal(ui.slider.disabled, true); ui.unmount();
});

test('unmount aborts requests, disconnects observers and rejects late fetch/image writes', async () => {
  const pending = mountCaptcha(); pending.unmount(); assert.equal(pending.requests[0].options.signal.aborted, true);
  assert.equal(pending.timers.size, 0); await pending.resolve(0); assert.deepEqual(pending.writesAfterUnmount, []);
  const image = mountCaptcha(); await image.resolve(0); const callbacks = image.image; image.unmount();
  await image.act(() => { callbacks.onLoad(); callbacks.onError(); }); assert.deepEqual(image.writesAfterUnmount, []);
  assert(image.observers.every((o) => o.disconnected)); assert.equal(image.timers.size, 0); assert.equal(image.proofs.filter(Boolean).length, 0);
});

test('unmount cancels animation frames and checking timers without publishing proof', async () => {
  const frame = mountCaptcha(); await frame.ready(); await frame.pointer('Down'); await frame.pointer('Move', 160);
  assert.equal(frame.frames.size, 1); frame.unmount(); assert.equal(frame.frames.size, 0);
  const checking = mountCaptcha(); await checking.ready(); await correctDrag(checking); assert.match(checking.status, /Confirming/);
  checking.unmount(); await checking.advance(1000); assert.equal(checking.timers.size, 0); assert.equal(checking.proofs.filter(Boolean).length, 0);
  assert.deepEqual(checking.writesAfterUnmount, []);
});
