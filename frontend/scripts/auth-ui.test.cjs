/* eslint-disable @typescript-eslint/no-require-imports -- Isolated component/DOM tests: no live CAPTCHA, network or account is accessed. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const Captcha = Symbol('captcha-form-boundary');
const Image = Symbol('next-image');
const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
const plain = (value) => JSON.parse(JSON.stringify(value));

function createEnvironment(component = 'PuzzleCaptcha', { sitekey = 'isolated-site-key', width = 350, search = '' } = {}) {
  const file = path.join(__dirname, '../src/components/auth', component + '.tsx');
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const timers = new Map(), mounts = [], scripts = [], widgets = [], removed = [], requests = [], responses = [], navigation = [];
  let nextTimer = 1, now = 100_000, hooks, readyImmediately = true, renderFailure = false;
  const readyCallbacks = [];
  const schedule = (callback, delay = 0) => {
    const id = nextTimer++; timers.set(id, { callback, due: now + Math.max(0, delay) }); return id;
  };
  const window = { location: { search }, setTimeout: schedule, clearTimeout: (id) => timers.delete(id) };
  const api = {
    ready(callback) { if (readyImmediately) callback(); else readyCallbacks.push(callback); },
    render(container, options) {
      if (renderFailure) throw new Error('Isolated render failure');
      const id = 'isolated-widget-' + widgets.length;
      widgets.push({ id, container, options });
      return id;
    },
    remove(id) { removed.push(id); },
  };
  const react = {
    useId() { return 'isolated-captcha'; },
    useRef(initial) {
      const h = hooks, i = h.cursor++;
      if (!h.slots[i]) h.slots[i] = { current: initial };
      return h.slots[i];
    },
    useState(initial) {
      const h = hooks, i = h.cursor++;
      if (!h.slots[i]) h.slots[i] = {
        value: typeof initial === 'function' ? initial() : initial,
        set(update) {
          if (!h.mounted) h.writesAfterUnmount.push(i);
          const next = typeof update === 'function' ? update(h.slots[i].value) : update;
          if (!Object.is(next, h.slots[i].value)) { h.slots[i].value = next; h.dirty = true; }
        },
      };
      return [h.slots[i].value, h.slots[i].set];
    },
    useEffect(effect, dependencies) {
      const h = hooks, i = h.cursor++;
      if (!sameDeps(h.slots[i]?.dependencies, dependencies)) h.effects.push(() => {
        h.slots[i]?.cleanup?.();
        h.slots[i] = { dependencies: dependencies?.slice(), cleanup: effect() };
      });
    },
  };
  const jsx = (type, props, key) => ({ type, props: props ?? {}, key });
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, window, process: { env: { NEXT_PUBLIC_TURNSTILE_SITE_KEY: sitekey } }, URLSearchParams, Error,
    setTimeout: schedule, clearTimeout: window.clearTimeout,
    FormData: class { constructor(data) { this.data = data; } get(key) { return this.data[key] ?? null; } },
    document: {
      createElement(tag) {
        assert.equal(tag, 'script');
        const listeners = new Map();
        return {
          listeners, removed: false,
          addEventListener(type, callback) { listeners.set(type, callback); },
          removeEventListener(type, callback) { if (listeners.get(type) === callback) listeners.delete(type); },
          remove() { this.removed = true; },
          dispatch(type) { listeners.get(type)?.(); },
        };
      },
      head: { appendChild(script) { scripts.push(script); } },
    },
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: Symbol.for('fragment') };
      if (name === 'next/image') return { __esModule: true, default: Image, getImageProps: (props) => ({ props }) };
      if (name === 'next/link') return { __esModule: true, default: Symbol.for('link') };
      if (name === 'next/navigation') return { useRouter: () => ({ push: (url) => navigation.push(url), refresh: () => navigation.push('refresh') }) };
      if (name === './PuzzleCaptcha') return { PuzzleCaptcha: Captcha };
      if (name === '@/lib/auth-request') return {
        async sendAuthRequest(url, payload, locale) {
          requests.push({ url, payload: plain(payload), locale });
          const result = responses.shift();
          if (result instanceof Error) throw result;
          return result ?? {};
        },
      };
      if (name === 'lucide-react') return new Proxy({}, { get: (_, key) => String(key) });
      if (name === './PuzzleCaptcha.module.css') return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
      throw new Error('Unexpected dependency: ' + name);
    },
  }, { filename: file });

  function walk(node, callback) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((child) => walk(child, callback)); return; }
    callback(node); walk(node.props?.children, callback);
  }
  function mount(props = {}) {
    const proofs = [];
    const h = {
      slots: [], cursor: 0, effects: [], mounted: true, dirty: false, writesAfterUnmount: [], tree: null,
      props: { locale: 'en', action: 'login', onChange: (proof) => proofs.push(proof), ...props },
      container: { clientWidth: width },
      render() {
        assert(h.mounted); hooks = h; h.cursor = 0; h.effects = []; h.dirty = false;
        h.tree = exports[component](h.props);
        walk(h.tree, ({ props }) => { if (props.ref) props.ref.current = h.container; });
        h.effects.forEach((effect) => effect());
      },
      find(predicate) {
        let match; walk(h.tree, (node) => { if (!match && predicate(node)) match = node; }); return match;
      },
      get status() { return h.find((node) => node.props.role === 'status')?.props.children; },
      get refreshButton() { return h.find((node) => node.props.className === 'refresh')?.props; },
      get captcha() { return h.find((node) => node.type === Captcha); },
      get form() { return h.find((node) => node.type === 'form')?.props; },
      get submitButton() { return h.find((node) => node.type === 'button' && node.props.type !== 'button')?.props; },
      get alert() { return h.find((node) => node.props.role === 'alert')?.props.children; },
      get text() { const strings = []; walk(h.tree, (node) => {
        if (typeof node.props?.children === 'string') strings.push(node.props.children);
      }); return strings.join(' '); },
      proofs,
      unmount() { h.mounted = false; h.slots.forEach((slot) => slot?.cleanup?.()); },
    };
    mounts.push(h); h.render(); return h;
  }
  async function flush() { for (let i = 0; i < 24; i++) { await Promise.resolve(); for (const h of mounts) if (h.mounted && h.dirty) h.render(); } }
  async function act(callback) { await callback(); await flush(); }
  async function advance(ms) {
    const end = now + ms;
    for (;;) {
      const next = [...timers].filter(([, timer]) => timer.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      const [id, timer] = next; now = timer.due; timers.delete(id); timer.callback(); await flush();
    }
    now = end; await flush();
  }
  return {
    mount, flush, act, advance, scripts, widgets, removed, requests, responses, navigation, timers, readyCallbacks, api, window,
    deferReady() { readyImmediately = false; },
    failRender() { renderFailure = true; },
    async loadScript(index = scripts.length - 1) { window.turnstile = api; await act(() => scripts[index].dispatch('load')); },
    async solve(token = 'isolated-provider-token', index = widgets.length - 1) { await act(() => widgets[index].options.callback(token)); },
    async submit(ui, fields) { await act(() => ui.form.onSubmit({ preventDefault() {}, currentTarget: fields })); },
  };
}

test('loading never produces proof; only the official script renders a locale/action-bound widget', async () => {
  const env = createEnvironment(); const ui = env.mount();
  assert.equal(ui.refreshButton.disabled, true); assert.match(ui.status, /Loading/);
  assert.deepEqual(ui.proofs, [null]); await env.flush();
  assert.equal(env.scripts.length, 1);
  assert.equal(env.scripts[0].src, 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
  assert.equal(env.scripts[0].async, true); assert.equal(env.scripts[0].defer, true);
  await env.loadScript();
  assert.equal(ui.refreshButton.disabled, false); assert.match(ui.status, /Complete/);
  const options = env.widgets[0].options;
  assert.equal(options.action, 'login'); assert.equal(options.sitekey, 'isolated-site-key');
  assert.equal(options.language, 'en'); assert.equal(options['response-field'], false);
  await env.solve();
  assert.deepEqual(plain(ui.proofs.at(-1)), { token: 'isolated-provider-token' });
  assert.match(ui.status, /Verified/); ui.unmount();
});

test('missing configuration fails closed in every environment without a local bypass', async () => {
  const env = createEnvironment('PuzzleCaptcha', { sitekey: '  ' }); const ui = env.mount();
  await env.flush(); assert.match(ui.status, /could not load/);
  assert.equal(env.scripts.length, 0); assert.equal(ui.refreshButton.disabled, false);
  await env.act(() => ui.refreshButton.onClick());
  assert.equal(ui.proofs.filter(Boolean).length, 0); assert.equal(env.widgets.length, 0); ui.unmount();
});

test('register/recovery actions, Chinese locale and compact mobile size reach the provider', async () => {
  for (const action of ['register', 'forgot-password']) {
    const env = createEnvironment('PuzzleCaptcha', { width: 240 }); const ui = env.mount({ action, locale: 'zh' });
    await env.flush(); await env.loadScript();
    assert.equal(env.widgets[0].options.action, action);
    assert.equal(env.widgets[0].options.language, 'zh-CN'); assert.equal(env.widgets[0].options.size, 'compact');
    assert.equal(ui.refreshButton['aria-label'], '重新加载验证'); ui.unmount();
  }
});

test('expired, timed out, failed and unsupported widgets clear proof and cannot republish stale success', async () => {
  for (const callback of ['expired-callback', 'timeout-callback', 'error-callback', 'unsupported-callback']) {
    const env = createEnvironment(); const ui = env.mount(); await env.flush(); await env.loadScript(); await env.solve();
    await env.act(() => env.widgets[0].options[callback]());
    assert.equal(ui.proofs.at(-1), null); assert.equal(ui.refreshButton.disabled, false);
    const count = ui.proofs.length; await env.solve('stale-token');
    assert.equal(ui.proofs.length, count); assert.doesNotMatch(ui.status, /Verified/);
    ui.unmount();
  }
});

test('refresh clears proof immediately and old callbacks cannot change the replacement widget', async () => {
  const env = createEnvironment(); const ui = env.mount(); await env.flush(); await env.loadScript(); await env.solve();
  const old = env.widgets[0].options;
  await env.act(() => { ui.refreshButton.onClick(); old.callback('same-tick-stale-token'); });
  assert.equal(ui.proofs.at(-1), null); assert.equal(env.widgets.length, 2); assert.equal(env.scripts.length, 1);
  assert.deepEqual(env.removed, ['isolated-widget-0']);
  await env.act(() => { old.callback('stale-token'); old['error-callback'](); old['expired-callback'](); });
  assert.match(ui.status, /Complete/); await env.solve('fresh-token');
  assert.equal(ui.proofs.at(-1).token, 'fresh-token'); ui.unmount();
});

test('blocked script errors are visible and retry loads a fresh script', async () => {
  const env = createEnvironment(); const ui = env.mount(); await env.flush();
  await env.act(() => env.scripts[0].dispatch('error'));
  assert.equal(env.scripts[0].removed, true); assert.equal(env.scripts[0].listeners.size, 0);
  assert.match(ui.status, /blocking settings/); assert.equal(ui.proofs.at(-1), null);
  await env.act(() => ui.refreshButton.onClick()); assert.equal(env.scripts.length, 2);
  await env.loadScript(); await env.solve(); assert.match(ui.status, /Verified/); ui.unmount();
});

test('silent script blocking times out and detached late events cannot verify', async () => {
  const env = createEnvironment(); const ui = env.mount(); await env.flush();
  const lateLoad = env.scripts[0].listeners.get('load');
  await env.advance(15_000); assert.match(ui.status, /could not load/); assert.equal(ui.refreshButton.disabled, false);
  env.window.turnstile = env.api; await env.act(lateLoad); assert.equal(env.widgets.length, 0);
  await env.act(() => ui.refreshButton.onClick()); await env.solve();
  assert.match(ui.status, /Verified/); ui.unmount();
});

test('provider ready timeout and render failure both fail closed', async () => {
  const ready = createEnvironment(); ready.deferReady(); const waiting = ready.mount();
  await ready.flush(); await ready.loadScript(); await ready.advance(15_000);
  assert.match(waiting.status, /could not load/);
  await ready.act(() => ready.readyCallbacks.forEach((callback) => callback()));
  assert.equal(ready.widgets.length, 0); waiting.unmount();
  const render = createEnvironment(); render.failRender(); const failed = render.mount();
  await render.flush(); await render.loadScript();
  assert.match(failed.status, /could not load/); assert.equal(failed.proofs.filter(Boolean).length, 0); failed.unmount();
});

test('empty or oversized provider callbacks never become a proof', async () => {
  for (const token of ['', 'x'.repeat(2049), undefined]) {
    const env = createEnvironment(); const ui = env.mount(); await env.flush(); await env.loadScript();
    await env.act(() => env.widgets[0].options.callback(token));
    assert.equal(ui.proofs.filter(Boolean).length, 0); assert.match(ui.status, /failed/); ui.unmount();
  }
});

test('a local expiry guard clears proof when the provider expiry callback never arrives', async () => {
  const env = createEnvironment(); const ui = env.mount(); await env.flush(); await env.loadScript(); await env.solve();
  await env.advance(294_999); assert(ui.proofs.at(-1));
  await env.advance(1); assert.equal(ui.proofs.at(-1), null); assert.match(ui.status, /expired/); ui.unmount();
});

test('unmount during load prevents widget creation and late errors or success cannot write', async () => {
  const env = createEnvironment(); const pending = env.mount(); await env.flush(); pending.unmount();
  const count = pending.proofs.length;
  await env.loadScript(); assert.equal(env.widgets.length, 0);
  assert.deepEqual(pending.writesAfterUnmount, []); assert.equal(pending.proofs.length, count);
  const mounted = env.mount(); await env.flush(); await env.solve();
  const old = env.widgets[0].options; mounted.unmount(); const completedCount = mounted.proofs.length;
  await env.act(() => { old.callback('late'); old['expired-callback'](); old['error-callback'](); old['timeout-callback'](); });
  await env.advance(300_000);
  assert.deepEqual(mounted.writesAfterUnmount, []); assert.equal(mounted.proofs.length, completedCount);
  assert.deepEqual(env.removed, ['isolated-widget-0']); assert.equal(env.timers.size, 0);
});

test('concurrent forms share one script but keep separate widgets and cleanup', async () => {
  const env = createEnvironment(); const login = env.mount(); const register = env.mount({ action: 'register' });
  await env.flush(); assert.equal(env.scripts.length, 1); await env.loadScript(); assert.equal(env.widgets.length, 2);
  await env.solve('login-token', 0); assert.equal(login.proofs.at(-1).token, 'login-token');
  assert.equal(register.proofs.at(-1), null); login.unmount();
  await env.solve('register-token', 1); assert.equal(register.proofs.at(-1).token, 'register-token');
  register.unmount(); assert.equal(env.removed.length, 2);
});

const accountFields = { fullName: 'Isolated learner', email: 'learner@example.test', password: 'Synthetic-password-123', privacyConsent: 'on', company: '' };

for (const mode of ['login', 'register']) {
  test(mode + ' form requires proof, forwards token and preserves successful navigation', async () => {
    const env = createEnvironment('AuthForm', { search: '?ref=isolated-ref&source=isolated-test' }); const ui = env.mount({ mode });
    assert.equal(ui.captcha.props.action, mode); assert.equal(ui.submitButton.disabled, true);
    await env.submit(ui, accountFields); assert.equal(env.requests.length, 0);
    await env.act(() => ui.captcha.props.onChange({ token: 'isolated-token' }));
    assert.equal(ui.submitButton.disabled, false); await env.submit(ui, accountFields);
    assert.equal(env.requests.length, 1); assert.equal(env.requests[0].url, '/api/auth/' + mode);
    assert.deepEqual(env.requests[0].payload.captcha, { token: 'isolated-token', trap: '' });
    assert.deepEqual(env.navigation, ['/en/account/profile', 'refresh']);
    if (mode === 'register') {
      assert.equal(env.requests[0].payload.privacyConsent, true);
      assert.equal(env.requests[0].payload.referralCode, 'isolated-ref');
    }
    ui.unmount();
  });

  test(mode + ' request failure discards the used proof and remounts the widget before retry', async () => {
    const env = createEnvironment('AuthForm'); const ui = env.mount({ mode });
    await env.act(() => ui.captcha.props.onChange({ token: 'used-token' })); const key = ui.captcha.key;
    env.responses.push(new Error('Isolated account failure')); await env.submit(ui, accountFields);
    assert.equal(ui.alert, 'Isolated account failure'); assert.notEqual(ui.captcha.key, key);
    assert.equal(ui.submitButton.disabled, true); assert.equal(env.navigation.length, 0);
    await env.submit(ui, accountFields); assert.equal(env.requests.length, 1);
    await env.act(() => ui.captcha.props.onChange({ token: 'new-token' })); await env.submit(ui, accountFields);
    assert.equal(env.requests[1].payload.captcha.token, 'new-token'); ui.unmount();
  });
}

test('forgot-password requires action-bound proof and remounts it after an unsuccessful request', async () => {
  const env = createEnvironment('PasswordRecoveryForm'); const ui = env.mount({ mode: 'forgot', locale: 'zh' });
  assert.equal(ui.captcha.props.action, 'forgot-password'); assert.equal(ui.submitButton.disabled, true);
  await env.submit(ui, accountFields); assert.equal(env.requests.length, 0);
  await env.act(() => ui.captcha.props.onChange({ token: 'used-token' })); const key = ui.captcha.key;
  env.responses.push(new Error('Isolated recovery failure')); await env.submit(ui, accountFields);
  assert.notEqual(ui.captcha.key, key); assert.equal(ui.submitButton.disabled, true);
  await env.act(() => ui.captcha.props.onChange({ token: 'new-token' })); await env.submit(ui, accountFields);
  assert.equal(env.requests[1].url, '/api/auth/forgot-password');
  assert.deepEqual(env.requests[1].payload.captcha, { token: 'new-token', trap: '' });
  assert.equal(env.requests[1].locale, 'zh'); assert.equal(ui.form, undefined);
  assert.match(ui.text, /如果该邮箱已注册/); ui.unmount();
});

test('reset-password has no CAPTCHA, validates matching passwords and sends the reset code', async () => {
  const env = createEnvironment('PasswordRecoveryForm'); const ui = env.mount({ mode: 'reset', resetCode: 'isolated-reset-code' });
  assert.equal(ui.captcha, undefined); assert.equal(ui.submitButton.disabled, false);
  await env.submit(ui, { password: 'one', passwordConfirmation: 'two' }); assert.equal(env.requests.length, 0);
  assert.match(ui.alert, /do not match/);
  await env.submit(ui, { password: 'Synthetic-password-123', passwordConfirmation: 'Synthetic-password-123' });
  assert.deepEqual(env.requests[0], {
    url: '/api/auth/reset-password', locale: 'en',
    payload: { code: 'isolated-reset-code', password: 'Synthetic-password-123', passwordConfirmation: 'Synthetic-password-123' },
  });
  await env.advance(900); assert.deepEqual(env.navigation, ['/en/account/profile', 'refresh']); ui.unmount();
});
