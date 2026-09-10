import { readFile } from "node:fs/promises";

// Public ownership file, not an account credential. IndexNow is supported by
// Bing and participating engines; it does not submit URLs to Google.
const origin = "https://www.suremandarin.com";
const keyFile = "3495bfb560ad1c1c37a69e68911dac65.txt";
const key = (await readFile(new URL(`../public/${keyFile}`, import.meta.url), "utf8")).trim();
const submit = process.argv.includes("--submit");
const explicitPaths = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));

async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}

const sitemap = await (await get(`${origin}/sitemap.xml`)).text();
const inventory = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].replaceAll("&amp;", "&"));
const urlList = [...new Set(explicitPaths.length ? explicitPaths.map((path) => new URL(path, origin).href) : inventory)];
if (!urlList.length || urlList.length > 10000) throw new Error("Expected 1–10,000 URLs.");
for (const url of urlList) {
  const parsed = new URL(url);
  if (parsed.origin !== origin || parsed.search || parsed.hash || !inventory.includes(url)) {
    throw new Error(`Only current canonical sitemap URLs may be submitted: ${url}`);
  }
}
console.log(`${submit ? "Submitting" : "Dry run:"} ${urlList.length} canonical URLs to IndexNow.`);
if (!submit) {
  console.log(urlList.join("\n"));
  console.log("Run with --submit after the matching site deployment is live.");
} else {
  const deployedKey = await (await get(`${origin}/${keyFile}`)).text();
  if (deployedKey.trim() !== key) throw new Error("Ownership file is not deployed yet.");
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(origin).host, key, keyLocation: `${origin}/${keyFile}`, urlList }),
    signal: AbortSignal.timeout(30000),
  });
  if (![200, 202].includes(response.status)) throw new Error(`IndexNow HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
  console.log(`HTTP ${response.status}: URLs received${response.status === 202 ? "; ownership validation pending" : ""}. This confirms notification, not indexing or rankings.`);
}
