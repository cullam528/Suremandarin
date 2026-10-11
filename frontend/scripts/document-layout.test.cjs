/* eslint-disable @typescript-eslint/no-require-imports -- Isolated Node regression tests for server layouts, without network or real request APIs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const sourceRoot = path.join(__dirname, '../src');
const missing = new Error('SYNTHETIC_NOT_FOUND');

function loader() {
  const modules = new Map();
  function load(relative) {
    const filename = path.join(sourceRoot, relative);
    if (modules.has(filename)) return modules.get(filename);
    const loadedModule = { exports: {} };
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(compiled, {
      exports: loadedModule.exports,
      URL,
      require(request) {
        if (request.endsWith('.css')) return {};
        if (request === 'react/jsx-runtime') return require(request);
        if (request === 'next/navigation') return { notFound() { throw missing; } };
        if (request === 'next/font/google') return { Plus_Jakarta_Sans: () => ({ variable: 'synthetic-jakarta-variable' }) };
        if (request === 'next/image') return (props) => {
          const imageProps = { ...props };
          delete imageProps.priority;
          delete imageProps.unoptimized;
          return React.createElement('img', imageProps);
        };
        if (request === 'next/link') return (props) => React.createElement('a', props);
        if (request === 'lucide-react') return { ArrowLeft: () => null, Home: () => null, SearchX: () => null };
        if (request === '@/lib/i18n') return { isLocale: (value) => value === 'en' || value === 'zh' };
        if (request === '@/lib/seo') return {
          absoluteUrl: (value) => 'https://www.suremandarin.com' + value,
          siteUrl: 'https://www.suremandarin.com', siteName: 'SureMandarin',
          seoCopy: { en: { title: 'Original default title', description: 'Original default description' } },
          indexingAllowed: true,
          googleSiteVerification: 'synthetic-google-verification',
          bingSiteVerification: 'synthetic-bing-verification',
        };
        if (request.startsWith('@/')) {
          const target = request.slice(2);
          return load(fs.existsSync(path.join(sourceRoot, target + '.tsx')) ? target + '.tsx' : target + '.ts');
        }
        throw new Error('Unexpected dependency (request APIs and network are forbidden): ' + request);
      },
    }, { filename });
    modules.set(filename, loadedModule.exports);
    return loadedModule.exports;
  }
  return load;
}

for (const [locale, htmlLang] of [['en', 'en'], ['zh', 'zh-CN']]) {
  test(`${locale} renders the correct initial HTML language with one document root`, async () => {
    const load = loader();
    const Layout = load('app/[lang]/layout.tsx').default;
    const element = await Layout({ params: Promise.resolve({ lang: locale }), children: React.createElement('main', null, 'Synthetic page') });
    const html = renderToStaticMarkup(element);
    assert.match(html, new RegExp('<html[^>]*lang="' + htmlLang + '"'));
    assert.equal((html.match(/<html\b/g) || []).length, 1);
    assert.equal((html.match(/<body\b/g) || []).length, 1);
    assert.match(html, new RegExp('data-site-locale="' + htmlLang + '"'));
    assert.match(html, /id="legacy-ie-detection"/);
    assert.match(html, /id="legacy-browser-warning"/);
    assert.match(html, /synthetic-jakarta-variable font-sans antialiased/);
    assert.match(html, /src="\/icon.png"/);
    assert.match(html, /Synthetic page/);
  });
}

test('invalid route locales fail as notFound without reading a request or CMS', async () => {
  const Layout = loader()('app/[lang]/layout.tsx').default;
  for (const lang of ['fr', 'constructor', '__proto__', 'EN']) {
    await assert.rejects(Layout({ params: Promise.resolve({ lang }), children: null }), (error) => error === missing);
  }
});

test('document defaults retain search verification without a default homepage canonical', () => {
  const { documentMetadata } = loader()('lib/document-metadata.ts');
  assert.equal(documentMetadata.verification.google, 'synthetic-google-verification');
  assert.equal(documentMetadata.verification.other['msvalidate.01'], 'synthetic-bing-verification');
  assert.equal(documentMetadata.alternates, undefined);
  assert.equal(documentMetadata.openGraph.url, undefined);
  assert.equal(documentMetadata.robots.index, true);
});

test('localized, legacy and global 404 metadata consistently clears inherited SEO', () => {
  const load = loader();
  for (const route of ['app/[lang]/not-found.tsx', 'app/(legacy)/not-found.tsx', 'app/global-not-found.tsx']) {
    const { metadata } = load(route);
    assert.equal(metadata.title.absolute, 'Page not found | SureMandarin');
    assert.equal(metadata.robots.index, false);
    assert.equal(metadata.robots.googleBot.index, false);
    assert.equal(metadata.robots.follow, true);
    assert.equal(metadata.alternates, null);
    assert.equal(metadata.openGraph, null);
    assert.equal(metadata.twitter, null);
  }
  const html = renderToStaticMarkup(React.createElement(load('app/global-not-found.tsx').default));
  assert.equal((html.match(/<html\b/g) || []).length, 1);
  assert.equal((html.match(/<body\b/g) || []).length, 1);
  assert.match(html, /This page took a wrong turn/);
});

test('each nonlocalized layout is an independent document root', () => {
  const load = loader();
  const routes = ['app/(legacy)/layout.tsx'];
  // The native-practice feature may exist only in an unreleased local checkout.
  if (fs.existsSync(path.join(sourceRoot, 'app/practice/page.tsx'))) {
    routes.push('app/practice/layout.tsx');
  }
  for (const route of routes) {
    const Layout = load(route).default;
    const html = renderToStaticMarkup(React.createElement(Layout, null, 'Alias'));
    assert.equal((html.match(/<html\b/g) || []).length, 1);
    assert.match(html, /<html[^>]*lang="en"/);
  }
  assert.equal(fs.existsSync(path.join(sourceRoot, 'app/layout.tsx')), false, 'No fixed English root may wrap the localized document');
});
