#!/usr/bin/env node
/**
 * HTTP regression audit; no dependencies. Run against a production build:
 *   node scripts/seo-audit.mjs http://localhost:3010 --limit=24
 *   node scripts/seo-audit.mjs https://www.suremandarin.com --all
 * Public canonicals must remain the official domain even on localhost.
 */
import process from "node:process";

const OFFICIAL_ORIGIN = "https://www.suremandarin.com";
const USER_AGENT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const CONCURRENCY = 3;
const issues = [];

function usage() {
  console.log("Usage: node scripts/seo-audit.mjs [origin] [--limit=N | --all]\nDefaults: https://www.suremandarin.com, 24 sampled pages, at most 3 concurrent requests.");
}

function argumentsFrom(argv) {
  let origin = OFFICIAL_ORIGIN;
  let limit = 24;
  let originSet = false;
  for (const argument of argv) {
    if (argument === "--help" || argument === "-h") return null;
    if (argument === "--all") limit = Infinity;
    else if (/^--limit=\d+$/.test(argument)) {
      const value = Number(argument.slice(8));
      if (!Number.isSafeInteger(value) || value < 1) throw new Error("--limit must be a positive integer.");
      if (limit !== Infinity) limit = value;
    } else if (!argument.startsWith("-") && !originSet) {
      const parsed = new URL(argument);
      if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
        throw new Error("Origin must be an HTTP(S) origin without credentials, path, query or fragment.");
      }
      origin = parsed.origin;
      originSet = true;
    } else throw new Error("Unknown argument: " + argument);
  }
  return { origin, limit };
}

function report(level, page, message) {
  issues.push({ level, page, message });
  console.log(level.toUpperCase() + " " + page + ": " + message);
}

function decodeEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (match, entity) => {
    const named = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" };
    if (entity.startsWith("#")) {
      const code = entity[1].toLowerCase() === "x" ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

function attributes(source) {
  const result = {};
  for (const match of source.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    result[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}

function elements(html, tag) {
  return [...html.matchAll(new RegExp("<" + tag + "\\b([^>]*?)>", "gi"))].map((match) => attributes(match[1]));
}

function hasNoindex(value = "") {
  return /(?:^|[\s,;:])(?:noindex|none)(?:$|[\s,;])/i.test(value);
}

function officialUrl(value) {
  try { return new URL(value).origin === OFFICIAL_ORIGIN; } catch { return false; }
}

async function request(origin, path) {
  const response = await fetch(new URL(path, origin), {
    headers: { "User-Agent": USER_AGENT },
    redirect: "manual",
    signal: AbortSignal.timeout(45000),
  });
  return { response, text: await response.text() };
}

function parseSitemap(xml) {
  return [...xml.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/gi)].map((match) => {
    const body = match[1];
    const location = body.match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/i)?.[1];
    return {
      url: decodeEntities(location?.trim() ?? ""),
      alternates: elements(body, "(?:xhtml:)?link").filter((link) => link.rel?.toLowerCase() === "alternate" && link.hreflang && link.href),
    };
  });
}

function inspectSitemap(entries) {
  const byUrl = new Map(entries.map((entry) => [entry.url, entry]));
  if (entries.length !== byUrl.size) report("error", "/sitemap.xml", "Duplicate canonical URLs.");
  for (const entry of entries) {
    if (!officialUrl(entry.url)) {
      report("error", "/sitemap.xml", "Non-production or invalid URL: " + entry.url);
      continue;
    }
    const locale = new URL(entry.url).pathname.split("/")[1];
    const language = locale === "zh" ? "zh-Hans" : "en";
    if (!["en", "zh"].includes(locale)) report("error", entry.url, "Sitemap public URL must use /en or /zh.");
    if (!entry.alternates.some((link) => link.hreflang.toLowerCase() === language.toLowerCase() && link.href === entry.url)) {
      report("error", entry.url, "Sitemap is missing its self-language alternate.");
    }
    for (const alternate of entry.alternates) {
      if (!officialUrl(alternate.href)) report("error", entry.url, "Alternate is not a production URL: " + alternate.href);
      const translated = byUrl.get(alternate.href);
      if (!translated) report("error", entry.url, "Alternate is absent from sitemap: " + alternate.href);
      else if (!translated.alternates.some((link) => link.hreflang.toLowerCase() === language.toLowerCase() && link.href === entry.url)) {
        report("error", entry.url, "Sitemap alternate does not link back: " + alternate.href);
      }
    }
  }
}

function sample(entries, limit) {
  if (limit >= entries.length) return entries;
  // Spread sampling over both languages and static/course/article entries.
  const groups = ["en", "zh"].map((locale) => entries.filter((entry) => new URL(entry.url).pathname.split("/")[1] === locale));
  const ordered = [];
  for (let i = 0; i < Math.max(...groups.map((group) => group.length)); i++) {
    for (const group of groups) if (group[i]) ordered.push(group[i]);
  }
  if (limit === 1) return ordered.slice(0, 1);
  const chosen = new Map();
  for (let i = 0; i < Math.ceil(limit / 2); i++) {
    const fraction = Math.ceil(limit / 2) === 1 ? 0 : i / (Math.ceil(limit / 2) - 1);
    for (const group of groups) {
      const entry = group[Math.round(fraction * (group.length - 1))];
      if (entry && chosen.size < limit) chosen.set(entry.url, entry);
    }
  }
  for (const entry of ordered) if (chosen.size < limit) chosen.set(entry.url, entry);
  return [...chosen.values()];
}

async function auditPage(origin, entry) {
  const pageIssues = [];
  const issue = (level, message) => {
    pageIssues.push(message);
    report(level, entry.url, message);
  };
  try {
    const canonical = entry.url;
    const url = new URL(canonical);
    const { response, text } = await request(origin, url.pathname + url.search);
    if (response.status !== 200) {
      issue("error", "Expected HTTP 200, received " + response.status + (response.headers.get("location") ? " → " + response.headers.get("location") : "") + ".");
      return;
    }
    if (!response.headers.get("content-type")?.includes("text/html")) issue("error", "Response is not HTML.");
    if (hasNoindex(response.headers.get("x-robots-tag") ?? "")) issue("error", "Sitemap page sends a noindex HTTP header.");

    let jsonLdCount = 0;
    // Strip scripts after parsing JSON-LD, so serialized React payloads are not
    // mistaken for real headings/metadata. Streamed HTML after body is retained.
    const html = text.replace(/<!--[\s\S]*?-->/g, "").replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi, (_, source, body) => {
      if (attributes(source).type?.toLowerCase() === "application/ld+json") {
        jsonLdCount++;
        try { JSON.parse(body); } catch (error) { issue("error", "Invalid JSON-LD: " + error.message); }
      }
      return "";
    }).replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "");
    const titles = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
    if (titles.length !== 1 || !decodeEntities(titles[0]?.[1] ?? "").trim()) issue("error", "Expected one nonempty title, found " + titles.length + ".");
    const metas = elements(html, "meta");
    const descriptions = metas.filter((meta) => meta.name?.toLowerCase() === "description");
    if (descriptions.length !== 1 || !descriptions[0]?.content?.trim()) issue("error", "Expected one nonempty meta description.");
    for (const meta of metas) {
      if (["robots", "googlebot", "bingbot"].includes(meta.name?.toLowerCase()) && hasNoindex(meta.content)) issue("error", meta.name + " metadata forbids indexing.");
    }
    const links = elements(html, "link");
    const canonicals = links.filter((link) => link.rel?.toLowerCase() === "canonical");
    if (canonicals.length !== 1 || canonicals[0]?.href !== canonical) issue("error", "Expected self canonical; received " + (canonicals.map((link) => link.href).join(", ") || "none") + ".");
    const ogUrl = metas.filter((meta) => meta.property?.toLowerCase() === "og:url");
    if (ogUrl.length !== 1 || ogUrl[0]?.content !== canonical) issue("error", "og:url must equal the canonical URL.");
    const alternates = links.filter((link) => link.rel?.toLowerCase() === "alternate" && link.hreflang);
    for (const expected of entry.alternates) {
      if (!alternates.some((link) => link.hreflang.toLowerCase() === expected.hreflang.toLowerCase() && link.href === expected.href)) issue("error", "Missing/wrong " + expected.hreflang + " alternate; expected " + expected.href + ".");
    }
    for (const actual of alternates) {
      if (!entry.alternates.some((link) => link.hreflang.toLowerCase() === actual.hreflang.toLowerCase() && link.href === actual.href)) issue("error", "HTML alternate is inconsistent with sitemap: " + actual.hreflang + " → " + actual.href + ".");
    }
    const headingCount = [...html.matchAll(/<h1\b[^>]*>/gi)].length;
    if (headingCount !== 1) issue("error", "Expected one H1, found " + headingCount + ".");
    if (!jsonLdCount) issue("warning", "No JSON-LD found.");
    for (const image of elements(html, "img")) {
      if (!image.src?.trim() || ["undefined", "null"].includes(image.src)) issue("error", "Image has an empty or invalid src.");
      if (!("alt" in image)) issue("warning", "Image is missing alt: " + image.src);
    }
    if (!metas.some((meta) => meta.property?.toLowerCase() === "og:image" && meta.content?.trim())) issue("warning", "No social share image found.");
    if (!pageIssues.length) console.log("PASS " + canonical);
  } catch (error) { issue("error", error.message); }
}

async function main() {
  const options = argumentsFrom(process.argv.slice(2));
  if (!options) return usage();
  console.log("SEO audit: fetching " + options.origin + "; expected canonicals " + OFFICIAL_ORIGIN);
  const robots = await request(options.origin, "/robots.txt");
  if (robots.response.status !== 200) report("error", "/robots.txt", "HTTP " + robots.response.status + ".");
  if (/^\s*Disallow\s*:\s*\/\s*(?:#.*)?$/im.test(robots.text)) report("error", "/robots.txt", "A rule blocks the entire public site.");
  if (!robots.text.split(/\r?\n/).some((line) => /^\s*Sitemap:/i.test(line) && line.replace(/^\s*Sitemap:\s*/i, "").trim() === OFFICIAL_ORIGIN + "/sitemap.xml")) report("error", "/robots.txt", "Missing official sitemap declaration.");

  const sitemap = await request(options.origin, "/sitemap.xml");
  if (sitemap.response.status !== 200) throw new Error("Sitemap returned HTTP " + sitemap.response.status + ".");
  const entries = parseSitemap(sitemap.text);
  if (!entries.length) throw new Error("Sitemap has no URL entries (preview/noindex deployment or malformed sitemap).");
  inspectSitemap(entries);
  const selected = sample(entries.filter((entry) => officialUrl(entry.url)), options.limit);
  console.log("Sitemap: " + entries.length + " URLs; testing " + selected.length + " HTML pages with concurrency " + CONCURRENCY + ".");
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, selected.length) }, async () => {
    while (cursor < selected.length) await auditPage(options.origin, selected[cursor++]);
  }));
  const missing = await request(options.origin, "/en/seo-audit-not-a-page");
  if (missing.response.status !== 404) report("error", "/en/seo-audit-not-a-page", "Expected real HTTP 404, received " + missing.response.status + ".");
  else console.log("PASS real HTTP 404");
  const errors = issues.filter((issue) => issue.level === "error").length;
  const warnings = issues.length - errors;
  console.log("\nResult: " + selected.length + " HTML pages checked; " + errors + " errors, " + warnings + " warnings. Images were inspected in markup, not downloaded; this does not replace visual or performance checks.");
  process.exitCode = errors ? 1 : 0;
}

main().catch((error) => {
  console.error("ERROR " + error.message);
  process.exitCode = 1;
});
