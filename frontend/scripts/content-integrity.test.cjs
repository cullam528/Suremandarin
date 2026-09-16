/* eslint-disable @typescript-eslint/no-require-imports -- Isolated React rendering test harness. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Render the actual components without network requests, a Next server or CMS writes.
function load(relativePath) {
  const source = fs.readFileSync(path.join(__dirname, '../src', relativePath), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const loaded = { exports: {} };
  function resolve(name) {
    if (name === 'next/image') return { default: (props) => {
      const attributes = { ...props };
      delete attributes.priority;
      return React.createElement('img', attributes);
    } };
    if (name === 'next/link') return { default: (props) => {
      const attributes = { ...props };
      delete attributes.prefetch;
      return React.createElement('a', attributes);
    } };
    if (name.endsWith('/TestimonialSubmission')) return { TestimonialSubmission: () => null };
    if (name.endsWith('/SectionHeading')) return { SectionHeading: ({ title }) => React.createElement('h2', null, title) };
    if (name.endsWith('/LanguageSwitcher')) return { LanguageSwitcher: () => null };
    if (name === '@/lib/learning-guide') return { getLearningFaqs: () => [] };
    if (name === '@/lib/i18n') return { isLocale: (locale) => ['en', 'zh'].includes(locale) };
    if (name === 'next/navigation') return {
      notFound() { throw new Error('404'); },
      permanentRedirect(destination) { throw Object.assign(new Error('308'), { destination }); },
    };
    return require(name);
  }
  new Function('require', 'module', 'exports', output)(resolve, loaded, loaded.exports);
  return loaded.exports;
}
function render(Component, props) {
  return renderToStaticMarkup(React.createElement(Component, props));
}
const review = {
  id: 'real-review', name: 'Existing learner', country: 'Student', quote: 'User-authored review.',
  image: '/cms-original-avatar.webp', rating: 4, verified: false,
};

test('They Say keeps supplied stories without filling empty CMS results or inventing verification', () => {
  const { TheySayContent } = load('components/TheySayContent.tsx');
  const html = render(TheySayContent, { testimonials: [], title: 'Student experiences' });
  assert.match(html, /Patty Willis/);
  assert.match(html, /Daniel Aylmer/);
  assert.doesNotMatch(html, /Sophie Martin|Verified student|8 student reviews|id="all-stories"/);
  assert.doesNotMatch(html, /out of 5 stars/);
});

test('CMS reviews retain their own portrait, verification and actual visible count', () => {
  const { TheySayContent } = load('components/TheySayContent.tsx');
  const html = render(TheySayContent, { testimonials: [review, review], title: 'Student experiences' });
  assert.match(html, /cms-original-avatar\.webp/);
  assert.match(html, /1 student review/);
  assert.doesNotMatch(html, /Verified|sophie-martin\.png/);
});

test('home reviews keep CMS portraits and do not render an empty section', () => {
  const { Testimonials } = load('components/Testimonials.tsx');
  assert.equal(render(Testimonials, { testimonials: [], title: 'Reviews' }), '');
  const html = render(Testimonials, { testimonials: [{ ...review, name: 'Sophie Martin' }], title: 'Reviews' });
  assert.match(html, /cms-original-avatar\.webp/);
  assert.doesNotMatch(html, /sophie-martin\.png/);
});

test('teacher page shows confirmed Jessica profile in both languages, never sample availability', () => {
  const { MarketingPage } = load('components/site/MarketingPage.tsx');
  for (const locale of ['en', 'zh']) {
    const html = render(MarketingPage, { kind: 'teachers', locale });
    assert.match(html, /Jessica/);
    assert.match(html, /teacher-jessica\.webp/);
    assert.match(html, /2007/);
    assert.doesNotMatch(html, /Xinyi|sample teachers|Example team|示例教师|可预约/);
    assert.match(html, new RegExp(`href="/${locale}/contact#consultation"`));
  }
});

test('footer hides missing or malformed LinkedIn, accepts a configured valid profile, and removes redundant labels', () => {
  const { Footer } = load('components/Footer.tsx');
  const settings = { siteName: 'SureMandarin', footerDescription: '', copyright: '', socialLinks: [] };
  for (const socialLinks of [[], [{ platform: 'linkedin', url: 'https://linkedin.com/in/想（jessica-li-889b483b' }], [{ platform: 'linkedin', url: 'javascript:alert(1)' }]]) {
    const html = render(Footer, { settings: { ...settings, socialLinks } });
    assert.doesNotMatch(html, /aria-label="LinkedIn"|Careers|Study Guide|Help Center/);
    assert.doesNotMatch(html, /href="\/en\/(resources|announcements)"/);
  }
  const html = render(Footer, { settings: { ...settings, socialLinks: [{ platform: 'linkedin', url: 'https://www.linkedin.com/in/confirmed-profile' }] } });
  assert.match(html, /https:\/\/www.linkedin.com\/in\/confirmed-profile/);
});

test('legacy resource and announcement routes permanently redirect by locale and leave public directories', async () => {
  for (const [route, target] of [['resources', 'knowledge'], ['announcements', 'knowledge/news-and-insights']]) {
    const { default: Page } = load(`app/[lang]/${route}/page.tsx`);
    for (const lang of ['en', 'zh']) {
      await assert.rejects(() => Page({ params: Promise.resolve({ lang }) }), (error) => error.message === '308' && error.destination === `/${lang}/${target}`);
    }
    await assert.rejects(() => Page({ params: Promise.resolve({ lang: 'invalid' }) }), /404/);
  }
  const { publicPages } = load('lib/site-pages.ts');
  assert.equal(publicPages.some((page) => ['/resources', '/announcements'].includes(page.path)), false);
});
