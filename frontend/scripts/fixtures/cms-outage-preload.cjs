// Local-only fault injection, never imported by the application. Usage:
// SM_TEST_CMS_OUTAGE=1 node --require ./scripts/fixtures/cms-outage-preload.cjs ./node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3311
if (process.env.SM_TEST_CMS_OUTAGE !== '1' || process.env.VERCEL) {
  throw new Error('CMS fault injection requires explicit local opt-in and is forbidden on Vercel');
}

const realFetch = globalThis.fetch;
const cmsOrigin = new URL(process.env.SM_TEST_CMS_ORIGIN || 'https://api.suremandarin.com').origin;
const publicEndpoints = new Set([
  '/api/global-setting', '/api/home-page', '/api/courses',
  '/api/articles', '/api/articles/builtin-overrides', '/api/testimonials',
]);

globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.origin === cmsOrigin && publicEndpoints.has(url.pathname)) {
    console.warn('[TEST CMS unavailable]', url.pathname);
    return new Response(JSON.stringify({ error: 'Local simulated CMS outage' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    });
  }
  return realFetch(input, init);
};
