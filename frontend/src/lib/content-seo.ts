/** Shared by CMS loaders, metadata and the sitemap; contains no network calls. */
export type ContentSeo = {
  metaTitle?: string;
  metaDescription?: string;
  shareImage?: string;
  noIndex?: boolean;
};

export function contentText(value: unknown): string {
  if (typeof value === "string") {
    const text = value.trim();
    if (text.startsWith("[")) {
      try { return contentText(JSON.parse(text)); } catch { /* Markdown, not JSON. */ }
    }
    return text.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/<[^>]*>/g, " ").replace(/[#*_`>|]/g, " ").replace(/\s+/g, " ").trim();
  }
  if (Array.isArray(value)) return value.map(contentText).filter(Boolean).join(" ");
  if (!value || typeof value !== "object") return "";
  const node = value as Record<string, unknown>;
  if (typeof node.text === "string") return node.text;
  return [node.content, node.children, node.rows, node.cells].map(contentText).filter(Boolean).join(" ");
}

export function searchDescription(excerpt: string, body?: unknown): string {
  const text = contentText(excerpt);
  const candidate = text.length >= 65 ? text : [text, contentText(body)].filter(Boolean).join(" ");
  if (candidate.length <= 170) return candidate;
  return `${candidate.slice(0, 167).trimEnd()}…`;
}

/** Invalid CMS dates must not leak into Article markup or sitemap lastmod. */
export function validContentDate(value?: string): string | undefined {
  if (!value || !Number.isFinite(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}

export function languagePaths(
  entries: Array<{ locale: "en" | "zh"; path: string }>,
): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const entry of entries) languages[entry.locale === "zh" ? "zh-Hans" : "en"] = entry.path;
  const defaultPath = languages.en ?? languages["zh-Hans"];
  if (defaultPath) languages["x-default"] = defaultPath;
  return languages;
}
