/* eslint-disable @typescript-eslint/no-require-imports -- Isolated synthetic UI tests; no real CAPTCHA or network is used. */
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

// The deliberately synthetic challenge is never sent to a server.
const challenge = (overrides = {}) => ({
  token: 'synthetic-unit-test-token', target: 60,
  image: '/images/captcha/synthetic-test.webp', expiresIn: 300, ...overrides,
});

function mountCaptcha() {
  const slots = [];
  const requests = [];
  const proofs = [];
  const timers = new Map();
  const writesAfterUnmount = [];
  let cursor = 0;
  let effects = [];
  let nextTimer = 1;
  let now = 100_000;
  let mounted = true;
  let dirty = false;
  let tree;
  const onChange = (proof) => proofs.push(proof);
  const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const react = {
    useId() { return 'synthetic-captcha'; },
    useRef(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { current: initial };
      return slots[index];
    },
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) {
        slots[index] = {
          value: typeof initial === 'function' ? initial() : initial,
          set(update) {
            if (!mounted) writesAfterUnmount.push(index);
            const next = typeof update === 'function' ? update(slots[index].value) : update;
            if (!Object.is(next, slots[index].value)) { slots[index].value = next; dirty = true; }
          },
        };
      }
      return [slots[index].value, slots[index].set];
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (!sameDeps(slots[index]?.dependencies, dependencies)) {
        effects.push(() => {
          slots[index]?.cleanup?.();
          slots[index] = { dependencies: dependencies?.slice(), cleanup: effect() };
        });
      }
    },
  };
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, AbortController, Date: { now: () => now },
    setTimeout(callback, delay) {
      const id = nextTimer++;
      timers.set(id, { callback, due: now + Math.max(0, delay) });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    fetch(url, options) {
      assert.equal(url, '/api/security/puzzle');
      return new Promise((resolve, reject) => requests.push({ url, options, resolve, reject }));
    },
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: Symbol.for('synthetic-fragment') };
      if (name === 'lucide-react') return Object.fromEntries(['ArrowRight', 'Check', 'LoaderCircle', 'RefreshCw', 'ShieldCheck'].map((icon) => [icon, icon]));
      if (name === './PuzzleCaptcha.module.css') return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
      throw new Error('Unexpected dependency: ' + name);
    },
  }, { filename: componentPath });

  function render() {
    assert(mounted);
    cursor = 0; effects = []; dirty = false;
    tree = exports.PuzzleCaptcha({ locale: 'en', onChange });
    effects.forEach((effect) => effect());
  }
  function find(predicate, node) {
    if (!node || typeof node !== 'object') return undefined;
    if (Array.isArray(node)) return node.map((child) => find(predicate, child)).find(Boolean);
    return predicate(node) ? node : find(predicate, node.props?.children);
  }
  async function flush() {
    // Drain the fetch → json → then/catch → finally chain and React-like commits.
    for (let i = 0; i < 12; i++) {
      await Promise.resolve();
      if (mounted && dirty) render();
    }
  }
  async function act(callback) { callback(); await flush(); }
  async function advance(milliseconds) {
    const end = now + milliseconds;
    for (;;) {
      const next = [...timers].filter(([, timer]) => timer.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      const [id, timer] = next;
      now = timer.due; timers.delete(id); timer.callback();
      await flush();
    }
    now = end; await flush();
  }
  render();
  return {
    get slider() { return find((node) => node.type === 'input' && node.props.type === 'range', tree).props; },
    get refreshButton() { return find((node) => node.type === 'button', tree).props; },
    get status() { return find((node) => node.props.id === 'synthetic-captcha-status', tree).props.children; },
    get scene() { return find((node) => node.props.className === 'scene', tree).props; },
    requests, proofs, timers, writesAfterUnmount, act, advance, flush,
    async resolve(index, data = challenge(), ok = true) {
      requests[index].resolve({ ok, json: async () => data });
      await flush();
    },
    async reject(index) { requests[index].reject(new Error('Synthetic network failure')); await flush(); },
    async change(value) { await act(() => this.slider.onChange({ currentTarget: { value: String(value) } })); },
    async pointerDown() {
      await act(() => this.slider.onPointerDown({ pointerId: 7, currentTarget: { setPointerCapture(id) { assert.equal(id, 7); } } }));
    },
    async key(key) { await act(() => this.slider.onKeyDown({ key, preventDefault() {} })); },
    unmount() {
      mounted = false;
      slots.forEach((slot) => slot?.cleanup?.());
    },
  };
}

async function correctDrag(ui) {
  await ui.pointerDown();
  await ui.change(20);
  await ui.change(40);
  await ui.change(60);
  await ui.act(() => ui.slider.onPointerUp());
}

test('arrow-key adjustments keep their position; only Enter confirms the synthetic challenge', async () => {
  const ui = mountCaptcha();
  await ui.resolve(0, challenge({ target: 3 }));
  for (const value of [1, 2, 3]) {
    await ui.key('ArrowRight');
    await ui.change(value);
    await ui.act(() => ui.slider.onKeyUp?.({ key: 'ArrowRight' }));
    assert.equal(ui.slider.value, value, 'Releasing an arrow must not reset the slider');
    assert.equal(ui.proofs.filter(Boolean).length, 0);
  }
  await ui.advance(700);
  await ui.key('Enter');
  assert.equal(ui.proofs.at(-1).position, 3);
  assert.equal(ui.proofs.at(-1).moves, 3);
  assert.equal(ui.slider.disabled, true);
  ui.unmount();
});

test('a quick correct drag waits at the target and confirms after the minimum gesture duration', async () => {
  const ui = mountCaptcha();
  await ui.resolve(0);
  await correctDrag(ui);
  assert.equal(ui.slider.value, 60, 'A quick genuine drag must not be called a mismatch');
  assert.equal(ui.proofs.filter(Boolean).length, 0);
  await ui.advance(650);
  assert.equal(ui.proofs.filter(Boolean).length, 0);
  await ui.advance(1);
  assert.equal(ui.proofs.at(-1).position, 60);
  assert.equal(ui.proofs.at(-1).elapsedMs, 651);
  assert.match(ui.status, /Verified/);
  ui.unmount();
});

test('expiry clears an already verified proof and prevents submitting the old challenge', async () => {
  const ui = mountCaptcha();
  await ui.resolve(0);
  await correctDrag(ui);
  await ui.advance(651);
  assert(ui.proofs.at(-1));
  await ui.advance(295_000 - 651);
  assert.equal(ui.proofs.at(-1), null);
  assert.equal(ui.slider.value, 0);
  assert.equal(ui.slider.disabled, true);
  assert.match(ui.status, /expired/);
  assert.equal(ui.refreshButton.disabled, false);
  ui.unmount();
});

test('a timed-out old fetch cannot overwrite the next refreshed challenge', async () => {
  const ui = mountCaptcha();
  await ui.advance(15_000);
  assert.equal(ui.requests[0].options.signal.aborted, true);
  assert.match(ui.status, /timed out/);
  assert.equal(ui.refreshButton.disabled, false);
  await ui.act(() => ui.refreshButton.onClick());
  assert.equal(ui.requests.length, 2);
  await ui.resolve(1, challenge({ token: 'synthetic-new-token', image: '/images/captcha/new-synthetic.webp' }));
  const currentScene = ui.scene.style.backgroundImage;
  await ui.resolve(0, challenge({ image: '/images/captcha/old-synthetic.webp' }));
  assert.equal(ui.scene.style.backgroundImage, currentScene);
  assert.equal(ui.slider.disabled, false);
  assert.doesNotMatch(ui.status, /timed out|could not load/);
  ui.unmount();
});

test('unmount aborts pending fetch and timers; late results cannot update state or publish proof', async () => {
  const ui = mountCaptcha();
  ui.unmount();
  assert.equal(ui.requests[0].options.signal.aborted, true);
  assert.equal(ui.timers.size, 0);
  await ui.resolve(0);
  assert.deepEqual(ui.writesAfterUnmount, []);
  assert.deepEqual(ui.proofs, []);
});

test('a failed refresh exposes retry and a later successful retry restores the slider', async () => {
  const ui = mountCaptcha();
  await ui.resolve(0);
  await ui.act(() => ui.refreshButton.onClick());
  await ui.reject(1);
  assert.match(ui.status, /could not load/);
  assert.equal(ui.refreshButton.disabled, false);
  assert.equal(ui.slider.disabled, true);
  await ui.act(() => ui.refreshButton.onClick());
  await ui.resolve(2);
  assert.equal(ui.slider.disabled, false);
  assert.doesNotMatch(ui.status, /could not load/);
  assert.equal(ui.proofs.at(-1), null);
  ui.unmount();
});

test('pointer cancellation clears a pending quick-drag confirmation', async () => {
  const ui = mountCaptcha();
  await ui.resolve(0);
  await correctDrag(ui);
  await ui.act(() => ui.slider.onPointerCancel());
  await ui.advance(1000);
  assert.equal(ui.slider.value, 0);
  assert.equal(ui.proofs.filter(Boolean).length, 0);
  assert.equal(ui.slider.disabled, false);
  ui.unmount();
});
