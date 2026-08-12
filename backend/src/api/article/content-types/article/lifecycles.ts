type ArticleData = {
  title?: unknown;
  slug?: unknown;
  excerpt?: unknown;
  body?: unknown;
  imageAlt?: unknown;
  authorName?: unknown;
  readingMinutes?: unknown;
};

function collectText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(collectText).join(' ');
  if (!value || typeof value !== 'object') return '';
  const node = value as Record<string, unknown>;
  if (typeof node.text === 'string') return node.text;
  if (node.content !== undefined) return collectText(node.content);
  if (node.children !== undefined) return collectText(node.children);
  return Object.entries(node)
    .filter(([key]) => key !== 'type' && key !== 'level')
    .map(([, child]) => collectText(child))
    .join(' ');
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `article-${Date.now()}`;
}

function prepareArticle(data: ArticleData, isCreate: boolean) {
  const title = data.title === undefined ? '' : String(data.title).trim();
  const hasBody = data.body !== undefined;
  const bodyText = hasBody ? collectText(data.body).replace(/\s+/g, ' ').trim() : '';

  // These fields are hidden from the editor, so keep their derived values in sync.
  if (isCreate || data.title !== undefined) {
    data.slug = String(data.slug ?? '').trim() || slugify(title);
    data.imageAlt = title;
  }
  if (isCreate || hasBody) {
    data.excerpt = Array.from(bodyText).slice(0, 30).join('');
    data.readingMinutes = Math.max(1, Math.ceil(Array.from(bodyText).length / 300));
  }
  if (isCreate) {
    data.authorName = String(data.authorName ?? '').trim() || 'SureMandarin Team';
  }
}

export default {
  beforeCreate(event: { params: { data: ArticleData } }) {
    prepareArticle(event.params.data, true);
  },
  beforeUpdate(event: { params: { data: ArticleData } }) {
    prepareArticle(event.params.data, false);
  },
};
