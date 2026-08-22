import type { Core } from '@strapi/strapi';
import { grantReferralTrialLesson, evaluateReferralRewards } from './api/referral/services/referral-rewards';
import {
  adjustLessonHoursBalance,
  isSyncingLessonBalance,
  syncAllLessonHoursBalances,
  validateLessonHoursTarget,
} from './api/lesson-credit/services/balance';
import { verifyAppleIdentityToken } from './api/apple-auth/services/apple-auth';

const courses = [
  ['Private Course','private'], ['Group Course','group'], ['Learn & Travel Course','learn-travel'],
  ['IB Tutorial','ib-tutorial'], ['Online Course','online'], ['Exclusive Course','exclusive'],
] as const;

const publicReadActions = [
  'api::home-page.home-page.find',
  'api::global-setting.global-setting.find',
  'api::course.course.find',
  'api::course.course.findOne',
  'api::article.article.find',
  'api::article.article.findOne',
  'api::testimonial.testimonial.find',
  'api::testimonial.testimonial.findOne',
  'api::inquiry.inquiry.create',
];

const COVER_MIN_WIDTH = 1200;
const COVER_MIN_HEIGHT = 675;

const AUTO_TRANSLATE_CONTENT_TYPES = new Set([
  'api::announcement.announcement',
  'api::app-banner.app-banner',
  'api::article.article',
  'api::course-module.course-module',
  'api::course.course',
  'api::faq.faq',
  'api::global-setting.global-setting',
  'api::home-page.home-page',
  'api::lesson.lesson',
  'api::membership-plan.membership-plan',
  'api::promotion.promotion',
  'api::static-page.static-page',
  'api::testimonial.testimonial',
]);

const PROTECTED_TRANSLATION_TERMS = [
  'SureMandarin', 'HSK', 'Pinyin', 'VIP', 'SVIP', 'WeChat', 'WhatsApp',
  'PayPal', 'iOS', 'Android', 'IB', 'IB SL', 'IB HL', 'TikTok', 'LinkedIn',
];

type TranslationSlot = {
  source: string;
  apply: (translated: string) => void;
};

type SchemaAttribute = {
  type?: string;
  component?: string;
  repeatable?: boolean;
  multiple?: boolean;
  relation?: string;
  pluginOptions?: { i18n?: { localized?: boolean } };
};

function isHumanText(value: string, fieldName = '') {
  if (!value.trim() || !/[\u3400-\u9FFF]/u.test(value)) return false;
  if (/^(?:https?:\/\/|mailto:|tel:|\/|#)/i.test(value.trim())) return false;
  if (/^(?:url|href|link|slug|code|icon|platform|type|value|externalUrl|targetUrl)$/i.test(fieldName)) return false;
  return true;
}

function queueTranslation(slots: TranslationSlot[], source: string, apply: (translated: string) => void, fieldName = '') {
  if (!isHumanText(source, fieldName)) return;
  slots.push({ source, apply });
}

function cloneStructuredText(value: unknown, slots: TranslationSlot[], fieldName = ''): unknown {
  if (Array.isArray(value)) return value.map((item) => cloneStructuredText(item, slots, fieldName));
  if (!value || typeof value !== 'object') return value;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    output[key] = cloneStructuredText(child, slots, key);
    if (typeof child === 'string' && /^(?:text|caption|title|description|label|alt|alternativeText)$/i.test(key)) {
      queueTranslation(slots, child, (translated) => { output[key] = translated; }, key);
    }
  }
  return output;
}

function linkedId(value: unknown, media = false): string | number | undefined {
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (!value || typeof value !== 'object') return undefined;
  const record = value as { id?: string | number; documentId?: string };
  return media ? record.id : (record.documentId ?? record.id);
}

function cloneLinkedValue(value: unknown, media = false): unknown {
  if (Array.isArray(value)) return value.map((item) => linkedId(item, media)).filter((item) => item !== undefined);
  return linkedId(value, media) ?? null;
}

function cloneComponentValue(
  strapi: Core.Strapi,
  componentUid: string,
  value: unknown,
  slots: TranslationSlot[],
): unknown {
  if (Array.isArray(value)) return value.map((item) => cloneComponentValue(strapi, componentUid, item, slots));
  if (!value || typeof value !== 'object') return value;
  const schema = (strapi.components as Record<string, any>)[componentUid];
  if (!schema?.attributes) return cloneStructuredText(value, slots);
  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [name, attribute] of Object.entries(schema.attributes as Record<string, SchemaAttribute>)) {
    const child = source[name];
    if (child === undefined) continue;
    if (attribute.type === 'component' && attribute.component) {
      output[name] = cloneComponentValue(strapi, attribute.component, child, slots);
    } else if (attribute.type === 'dynamiczone' && Array.isArray(child)) {
      output[name] = child.map((item) => {
        const componentName = String((item as { __component?: unknown })?.__component ?? '');
        return componentName
          ? { __component: componentName, ...(cloneComponentValue(strapi, componentName, item, slots) as Record<string, unknown>) }
          : cloneStructuredText(item, slots);
      });
    } else if (attribute.type === 'media') {
      output[name] = cloneLinkedValue(child, true);
    } else if (attribute.type === 'relation') {
      output[name] = cloneLinkedValue(child, false);
    } else if (['blocks', 'json', 'customField'].includes(String(attribute.type))) {
      output[name] = cloneStructuredText(child, slots, name);
    } else {
      output[name] = child;
      if (typeof child === 'string' && ['string', 'text', 'richtext'].includes(String(attribute.type))) {
        queueTranslation(slots, child, (translated) => { output[name] = translated; }, name);
      }
    }
  }
  return output;
}

function prepareTranslatedFields(
  strapi: Core.Strapi,
  uid: string,
  source: Record<string, unknown>,
  includeSeo: boolean,
) {
  const schema = (strapi.contentTypes as Record<string, any>)[uid];
  const slots: TranslationSlot[] = [];
  const data: Record<string, unknown> = {};
  if (!schema?.attributes) return { data, slots };

  for (const [name, attribute] of Object.entries(schema.attributes as Record<string, SchemaAttribute>)) {
    if (attribute.pluginOptions?.i18n?.localized !== true || source[name] === undefined) continue;
    if (!includeSeo && /seo/i.test(name)) continue;
    const value = source[name];
    if (attribute.type === 'component' && attribute.component) {
      data[name] = cloneComponentValue(strapi, attribute.component, value, slots);
    } else if (attribute.type === 'dynamiczone' && Array.isArray(value)) {
      data[name] = value.map((item) => {
        const componentName = String((item as { __component?: unknown })?.__component ?? '');
        return componentName
          ? { __component: componentName, ...(cloneComponentValue(strapi, componentName, item, slots) as Record<string, unknown>) }
          : cloneStructuredText(item, slots);
      });
    } else if (attribute.type === 'media') {
      data[name] = cloneLinkedValue(value, true);
    } else if (attribute.type === 'relation') {
      data[name] = cloneLinkedValue(value, false);
    } else if (['blocks', 'json', 'customField'].includes(String(attribute.type))) {
      data[name] = cloneStructuredText(value, slots, name);
    } else {
      data[name] = value;
      if (typeof value === 'string' && ['string', 'text', 'richtext'].includes(String(attribute.type))) {
        queueTranslation(slots, value, (translated) => { data[name] = translated; }, name);
      }
    }
  }
  return { data, slots };
}

function protectTerms(text: string) {
  const terms: string[] = [];
  let protectedText = text;
  PROTECTED_TRANSLATION_TERMS
    .slice()
    .sort((a, b) => b.length - a.length)
    .forEach((term) => {
      protectedText = protectedText.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (match) => {
        const token = `__SMTERM_${terms.length}__`;
        terms.push(match);
        return token;
      });
    });
  return {
    text: protectedText,
    restore(translated: string) {
      return translated.replace(/__\s*SMTERM\s*_\s*(\d+)\s*__/gi, (_match, index) => terms[Number(index)] ?? _match);
    },
  };
}

function decodeGoogleText(value: string) {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, digits) => String.fromCodePoint(Number(digits)))
    .replace(/&([a-z]+|#39);/gi, (match, entity) => named[String(entity).toLowerCase()] ?? match);
}

async function translateWithGoogle(strapi: Core.Strapi, slots: TranslationSlot[]) {
  const apiKey = String(process.env.GOOGLE_TRANSLATE_API_KEY ?? '').trim();
  if (!apiKey) {
    const error = new Error('Google 翻译尚未配置，请先在服务器环境变量中填写 GOOGLE_TRANSLATE_API_KEY。');
    (error as Error & { status?: number; code?: string }).status = 503;
    (error as Error & { status?: number; code?: string }).code = 'TRANSLATION_NOT_CONFIGURED';
    throw error;
  }
  if (!slots.length) return 0;

  const totalCharacters = slots.reduce((sum, slot) => sum + slot.source.length, 0);
  const dailyLimit = Math.max(0, Number(process.env.GOOGLE_TRANSLATE_DAILY_CHARACTER_LIMIT ?? 15000));
  const usageStore = strapi.store({ type: 'plugin', name: 'suremandarin-translation' });
  const usageKey = `google-characters-${new Date().toISOString().slice(0, 10)}`;
  const usedToday = Number(await usageStore.get({ key: usageKey }) ?? 0);
  if (dailyLimit > 0 && usedToday + totalCharacters > dailyLimit) {
    const error = new Error(`今日免费翻译保护额度已用 ${usedToday.toLocaleString()} 字符，请明天继续或由管理员调整额度。`);
    (error as Error & { status?: number; code?: string }).status = 429;
    (error as Error & { status?: number; code?: string }).code = 'TRANSLATION_DAILY_LIMIT';
    throw error;
  }

  let cursor = 0;
  while (cursor < slots.length) {
    const batch: TranslationSlot[] = [];
    let batchCharacters = 0;
    while (cursor < slots.length) {
      const candidate = slots[cursor];
      if (batch.length && batchCharacters + candidate.source.length > 4500) break;
      batch.push(candidate);
      batchCharacters += candidate.source.length;
      cursor += 1;
    }
    const protectedBatch = batch.map((slot) => protectTerms(slot.source));
    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: protectedBatch.map((item) => item.text),
        source: 'zh-CN',
        target: 'en',
        format: 'text',
        model: 'nmt',
      }),
    });
    const payload = await response.json() as {
      data?: { translations?: Array<{ translatedText?: string }> };
      error?: { message?: string };
    };
    if (!response.ok) {
      const error = new Error(payload.error?.message || 'Google 翻译暂时不可用，请稍后重试。');
      (error as Error & { status?: number; code?: string }).status = 502;
      (error as Error & { status?: number; code?: string }).code = 'GOOGLE_TRANSLATION_FAILED';
      throw error;
    }
    const translated = payload.data?.translations ?? [];
    if (translated.length !== batch.length) throw new Error('Google 翻译返回的内容数量不完整，请重试。');
    translated.forEach((item, index) => {
      const restored = protectedBatch[index].restore(decodeGoogleText(String(item.translatedText ?? '')));
      batch[index].apply(restored);
    });
  }
  await usageStore.set({ key: usageKey, value: usedToday + totalCharacters });
  return totalCharacters;
}

function hasMeaningfulLocalizedContent(schema: any, entry: Record<string, unknown> | null) {
  if (!entry || !schema?.attributes) return false;
  return Object.entries(schema.attributes as Record<string, SchemaAttribute>).some(([name, attribute]) => {
    if (attribute.pluginOptions?.i18n?.localized !== true) return false;
    const value = entry[name];
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value && typeof value === 'object' && Object.keys(value as object).length > 0);
  });
}

async function adminRoleCodes(strapi: Core.Strapi, user: any) {
  if (Array.isArray(user?.roles) && user.roles.length) return user.roles.map((role: any) => String(role.code ?? ''));
  if (!user?.id) return [];
  const adminUser = await strapi.db.query('admin::user').findOne({ where: { id: user.id }, populate: ['roles'] });
  return (adminUser?.roles ?? []).map((role: any) => String(role.code ?? ''));
}

type ArticleBlock = {
  type: string;
  level?: number;
  format?: string;
  children?: ArticleBlock[];
  text?: string;
  url?: string;
  image?: { url?: string; alternativeText?: string };
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
};

type BlockNoteInline = {
  type: 'text';
  text: string;
  styles: Record<string, boolean>;
};

type BlockNoteBlock = {
  type: string;
  props?: Record<string, unknown>;
  content?: BlockNoteInline[];
  children?: BlockNoteBlock[];
};

function markdownToBlocks(value: unknown): ArticleBlock[] {
  if (Array.isArray(value)) return value as ArticleBlock[];
  const source = String(value ?? '').replace(/\r\n/g, '\n').trim();
  if (!source) return [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }];

  const lines = source.split('\n');
  const blocks: ArticleBlock[] = [];
  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: 'paragraph', children: [{ type: 'text', text: paragraph.join('\n') }] });
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^```/.test(line.trim())) {
      flushParagraph();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        code.push(lines[index]);
        index += 1;
      }
      blocks.push({ type: 'code', children: [{ type: 'text', text: code.join('\n') }] });
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push({ type: `heading-${heading[1].length}`, children: [{ type: 'text', text: heading[2] }] });
      continue;
    }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) {
      flushParagraph();
      blocks.push({ type: 'divider', children: [{ type: 'text', text: '' }] });
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushParagraph();
      blocks.push({ type: 'quote', children: [{ type: 'text', text: line.replace(/^>\s?/, '') }] });
      continue;
    }
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (bullet || ordered) {
      flushParagraph();
      const type = ordered ? 'list-ordered' : 'list-unordered';
      const last = blocks[blocks.length - 1];
      if (!last || last.type !== type) blocks.push({ type, format: ordered ? 'ordered' : 'unordered', children: [] });
      const list = blocks[blocks.length - 1];
      list.children?.push({ type: 'list-item', children: [{ type: 'text', text: (ordered ?? bullet)![1] }] });
      continue;
    }
    if (!line.trim()) flushParagraph();
    else paragraph.push(line);
  }
  flushParagraph();
  return blocks.length ? blocks : [{ type: 'paragraph', children: [{ type: 'text', text: source }] }];
}

function articleText(block: ArticleBlock): string {
  if (typeof block.text === 'string') return block.text;
  return block.children?.map(articleText).join('') ?? '';
}

function inlineContent(children: ArticleBlock[] | undefined): BlockNoteInline[] {
  const output: BlockNoteInline[] = [];
  const visit = (node: ArticleBlock) => {
    if (typeof node.text === 'string') {
      output.push({
        type: 'text',
        text: node.text,
        styles: {
          ...(node.bold ? { bold: true } : {}),
          ...(node.italic ? { italic: true } : {}),
          ...(node.underline ? { underline: true } : {}),
          ...(node.strikethrough ? { strike: true } : {}),
          ...(node.code ? { code: true } : {}),
        },
      });
      return;
    }
    node.children?.forEach(visit);
  };
  children?.forEach(visit);
  return output;
}

function strapiBlockToBlockNote(block: ArticleBlock): BlockNoteBlock[] {
  const content = inlineContent(block.children);
  if (block.type === 'list-ordered' || block.type === 'list-unordered') {
    const itemType = block.type === 'list-ordered' ? 'numberedListItem' : 'bulletListItem';
    return (block.children ?? []).map((item) => ({
      type: itemType,
      content: inlineContent(item.children),
    }));
  }

  if (block.type === 'list-item') return [{ type: 'bulletListItem', content }];
  if (block.type.startsWith('heading-') || block.type === 'heading') {
    const headingLevels: Record<string, number> = {
      'heading-one': 1,
      'heading-two': 2,
      'heading-three': 3,
      'heading-four': 4,
      'heading-five': 5,
      'heading-six': 6,
    };
    const namedLevel = headingLevels[block.type] ?? Number(block.type.replace('heading-', ''));
    const level = Number.isFinite(namedLevel) ? namedLevel : (block.level ?? 2);
    return [{ type: 'heading', props: { level: Math.min(Math.max(level, 1), 6) }, content }];
  }

  switch (block.type) {
    case 'quote':
      return [{ type: 'quote', content }];
    case 'code':
      return [{ type: 'codeBlock', content }];
    case 'divider':
      return [{ type: 'divider' }];
    case 'centered':
      return [{ type: 'paragraph', props: { textAlignment: 'center' }, content }];
    case 'image': {
      const url = block.image?.url ?? block.url;
      return url ? [{ type: 'image', props: { url, caption: block.image?.alternativeText ?? '' } }] : [];
    }
    case 'video': {
      const url = articleText(block);
      return url ? [{ type: 'video', props: { url } }] : [];
    }
    case 'paragraph':
    default:
      return [{ type: 'paragraph', content }];
  }
}

function toBlockNoteDocument(value: unknown): BlockNoteBlock[] {
  const nativeBlocks = markdownToBlocks(value);
  const document = nativeBlocks.flatMap(strapiBlockToBlockNote);
  return document.length ? document : [{ type: 'paragraph', content: [] }];
}

function isBlockNoteDocument(value: unknown): value is BlockNoteBlock[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every((item) => item && typeof item === 'object' && (
      Object.prototype.hasOwnProperty.call(item, 'content')
      || Object.prototype.hasOwnProperty.call(item, 'props')
      || ['divider', 'pageBreak'].includes(String((item as { type?: unknown }).type ?? ''))
    ));
}

async function migrateArticleBodiesToBlockNote(strapi: Core.Strapi) {
  const entries = await strapi.db.connection('articles').select(['id', 'body']);
  for (const entry of entries as Array<{ id: number; body?: unknown }>) {
    const rawBody = entry.body;
    let parsed: unknown = rawBody;
    if (typeof rawBody === 'string') {
      try {
        const candidate = JSON.parse(rawBody);
        if (Array.isArray(candidate)) parsed = candidate;
      } catch {
        // Existing Markdown/plain text is converted below.
      }
    }
    if (isBlockNoteDocument(parsed)) continue;
    const blocks = toBlockNoteDocument(parsed);
    await strapi.db.connection('articles').where({ id: entry.id }).update({ body: JSON.stringify(blocks) });
  }
}

function mediaId(value: unknown): number | string | undefined {
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return undefined;
  const item = value as { id?: number | string; connect?: Array<{ id?: number | string } | number | string> };
  if (item.id !== undefined) return item.id;
  const connected = item.connect?.[0];
  return typeof connected === 'object' ? connected?.id : connected;
}

async function validateCoverImage(strapi: Core.Strapi, event: { params: { data?: Record<string, unknown> } }) {
  const cover = event.params.data?.cover;
  if (cover === undefined) return;
  const id = mediaId(cover);
  if (id === undefined) return;
  const file = await strapi.db.query('plugin::upload.file').findOne({ where: { id } });
  if (!file || !file.mime?.startsWith('image/')) return;
  if (Number(file.width ?? 0) < COVER_MIN_WIDTH || Number(file.height ?? 0) < COVER_MIN_HEIGHT) {
    throw new Error('封面图尺寸过小，请上传1200*675  / Cover image is too small');
  }
}

async function ensurePublicReadPermissions(strapi: Core.Strapi) {
  const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
    populate: ['permissions'],
  });

  if (!publicRole) return;

  const existing = new Set((publicRole.permissions ?? []).map((permission: { action: string }) => permission.action));
  await Promise.all(publicReadActions.filter((action) => !existing.has(action)).map((action) =>
    strapi.db.query('plugin::users-permissions.permission').create({
      data: { action, role: publicRole.id },
    })
  ));
}

async function ensureContentLocales(strapi: Core.Strapi) {
  const localeQuery = strapi.db.query('plugin::i18n.locale');
  const existing = await localeQuery.findMany();
  const existingCodes = new Set(existing.map((locale: { code: string }) => locale.code));
  const requiredLocales = [
    { code: 'en', name: 'English (en)' },
    { code: 'zh', name: '中文 (zh)' },
  ];

  for (const locale of requiredLocales) {
    if (existingCodes.has(locale.code)) continue;
    await localeQuery.create({ data: locale });
  }
}

async function ensureAdminLocalePermissions(strapi: Core.Strapi) {
  const localizedSubjects = new Set(
    Object.values(strapi.contentTypes)
      .filter((contentType) => contentType.uid.startsWith('api::') && contentType.pluginOptions?.i18n?.localized === true)
      .map((contentType) => contentType.uid),
  );
  if (localizedSubjects.size === 0) return;

  const roles = await strapi.db.query('admin::role').findMany({
    where: { code: { $ne: 'strapi-super-admin' } },
    populate: ['permissions'],
  });
  const actions = new Set([
    'plugin::content-manager.explorer.create',
    'plugin::content-manager.explorer.read',
    'plugin::content-manager.explorer.update',
    'plugin::content-manager.explorer.delete',
    'plugin::content-manager.explorer.publish',
  ]);

  for (const role of roles) {
    for (const permission of role.permissions ?? []) {
      if (!localizedSubjects.has(permission.subject) || !actions.has(permission.action)) continue;
      const properties = (permission.properties ?? {}) as Record<string, unknown>;
      if (JSON.stringify(properties.locales) === JSON.stringify(['en', 'zh'])) continue;
      await strapi.db.query('admin::permission').update({
        where: { id: permission.id },
        data: { properties: { ...properties, locales: ['en', 'zh'] } },
      });
    }
  }
}

async function ensureEditorMarketingPermissions(strapi: Core.Strapi) {
  const editorRoles = await strapi.db.query('admin::role').findMany({
    where: { code: 'strapi-editor' },
    populate: ['permissions'],
  });
  if (!editorRoles.length) return;

  const marketingSubjects = [
    'plugin::users-permissions.user',
    'api::inquiry.inquiry',
    'api::newsletter-subscription.newsletter-subscription',
    'api::coupon.coupon',
    'api::promotion.promotion',
    'api::referral.referral',
    'api::lesson-credit.lesson-credit',
    'api::lesson-booking.lesson-booking',
  ];
  const actions = ['plugin::content-manager.explorer.read', 'plugin::content-manager.explorer.update'];
  const createSubjects = new Set([
    'api::lesson-credit.lesson-credit',
    'api::lesson-booking.lesson-booking',
  ]);

  for (const role of editorRoles) {
    const existing = new Set((role.permissions ?? []).map((permission: { action: string; subject: string }) => `${permission.action}:${permission.subject}`));
    for (const subject of marketingSubjects) {
      const subjectActions = createSubjects.has(subject)
        ? [...actions, 'plugin::content-manager.explorer.create']
        : actions;
      for (const action of subjectActions) {
        const key = `${action}:${subject}`;
        if (existing.has(key)) continue;
        const permission = await strapi.db.query('admin::permission').create({
          data: { action, subject, properties: {}, conditions: [] },
        });
        await strapi.db.connection('admin_permissions_role_lnk').insert({
          permission_id: permission.id,
          role_id: role.id,
          permission_ord: permission.id,
        });
        existing.add(key);
      }
    }
  }
}

async function ensureAccountOverviewPermission(strapi: Core.Strapi) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' }, populate: ['permissions'] });
  if (!role) return;
  const action = 'api::payment.payment.accountOverview';
  const exists = (role.permissions ?? []).some((permission: { action: string }) => permission.action === action);
  if (!exists) await strapi.db.query('plugin::users-permissions.permission').create({ data: { action, role: role.id } });
}

async function ensureDailyProgressPermission(strapi: Core.Strapi) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' }, populate: ['permissions'] });
  if (!role) return;
  const actions = [
    'api::daily-progress.daily-progress.create',
    'api::daily-progress.daily-progress.me',
  ];
  const existing = new Set((role.permissions ?? []).map((permission: { action: string }) => permission.action));
  for (const action of actions) {
    if (existing.has(action)) continue;
    await strapi.db.query('plugin::users-permissions.permission').create({ data: { action, role: role.id } });
    existing.add(action);
  }
}

async function ensureLessonBookingPermission(strapi: Core.Strapi) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' }, populate: ['permissions'] });
  if (!role) return;
  const actions = [
    'api::lesson-booking.lesson-booking.me',
    'api::lesson-booking.lesson-booking.createForCurrentUser',
    'api::lesson-booking.lesson-booking.cancelMine',
    'api::lesson-booking.lesson-booking.completeForTeacher',
  ];
  const existing = new Set((role.permissions ?? []).map((permission: { action: string }) => permission.action));
  for (const action of actions) {
    if (existing.has(action)) continue;
    await strapi.db.query('plugin::users-permissions.permission').create({ data: { action, role: role.id } });
    existing.add(action);
  }
}

function escapeEmailHtml(value: unknown) {
  return String(value ?? '—').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character] ?? character));
}

async function notifyNewUserRegistration(strapi: Core.Strapi, user: any, registrationData: any) {
  const recipient = String(process.env.ADMIN_NOTIFICATION_EMAIL ?? 'qingniaobird@163.com').trim();
  const userEmail = String(user?.email ?? '').trim();
  if (!recipient || !userEmail) return;

  const fullName = String(user?.fullName ?? user?.displayName ?? user?.username ?? '—').trim();
  const registrationSource = String(user?.registrationSource ?? registrationData?.registrationSource ?? 'website').trim();
  const registrationPlatform = String(user?.registrationPlatform ?? registrationData?.registrationPlatform ?? 'web').trim();
  const referredByCode = String(user?.referredByCode ?? registrationData?.referredByCode ?? '').trim();
  let referrer = '—';
  if (referredByCode) {
    const referrers = await strapi.db.query('plugin::users-permissions.user').findMany({
      where: { referralCode: referredByCode },
      limit: 1,
    });
    const referrerUser = referrers[0];
    if (referrerUser) {
      referrer = `${referrerUser.fullName ?? referrerUser.displayName ?? referrerUser.username ?? '—'} (${referrerUser.email ?? '—'})`;
    } else {
      referrer = referredByCode;
    }
  }

  const createdAt = new Date(user?.createdAt ?? Date.now()).toLocaleString('en-US', {
    timeZone: 'Asia/Shanghai',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const from = process.env.EMAIL_FROM ?? 'SureMandarin <hello@suremandarin.com>';
  const subject = `New SureMandarin registration: ${fullName}`;
  const text = [
    'A new learner has registered on SureMandarin.',
    '',
    `Name: ${fullName}`,
    `Email: ${userEmail}`,
    `Registration source: ${registrationSource}`,
    `Platform: ${registrationPlatform}`,
    `Preferred language: ${user?.preferredLanguage ?? '—'}`,
    `Timezone: ${user?.timezone ?? '—'}`,
    `Phone: ${user?.phone ?? '—'}`,
    `Referrer: ${referrer}`,
    `Registered at: ${createdAt} (China Standard Time)`,
    '',
    'Reply to this email to contact the learner directly.',
  ].join('\n');
  const row = (label: string, value: unknown) => `<tr><td style="padding:8px 12px;color:#64748b;font-weight:700">${escapeEmailHtml(label)}</td><td style="padding:8px 12px;color:#0a1d3d">${escapeEmailHtml(value)}</td></tr>`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0a1d3d;max-width:620px;margin:auto">
      <h2 style="color:#1565ff;margin-bottom:8px">New SureMandarin registration</h2>
      <p>A new learner has registered on the website.</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e6eaf0;border-radius:12px;overflow:hidden">
        ${row('Name', fullName)}
        ${row('Email', userEmail)}
        ${row('Registration source', registrationSource)}
        ${row('Platform', registrationPlatform)}
        ${row('Preferred language', user?.preferredLanguage)}
        ${row('Timezone', user?.timezone)}
        ${row('Phone', user?.phone)}
        ${row('Referrer', referrer)}
        ${row('Registered at', `${createdAt} (China Standard Time)`)}
      </table>
      <p style="margin-top:20px;color:#64748b">Reply to this email to contact the learner directly.</p>
    </div>
  `;

  await strapi.plugin('email').service('email').send({
    to: recipient,
    from,
    replyTo: userEmail,
    subject,
    text,
    html,
  });
}

async function createReferralRecord(strapi: Core.Strapi, user: any, registrationData: any) {
  const referredByCode = String(user?.referredByCode ?? registrationData?.referredByCode ?? '').trim();
  if (!referredByCode || !user?.id) return;
  const referrers = await strapi.db.query('plugin::users-permissions.user').findMany({
    where: { referralCode: referredByCode },
    limit: 1,
  });
  const referrer = referrers[0];
  if (!referrer || referrer.id === user.id) return;
  const existing = await strapi.db.query('api::referral.referral').findMany({
    where: { referredUser: user.id },
    limit: 1,
  });
  if (existing.length) {
    // Retry idempotently if the referral row was created but the lesson credit
    // grant was interrupted during the original registration lifecycle.
    await grantReferralTrialLesson(strapi, user.id);
    return;
  }
  await strapi.documents('api::referral.referral').create({ data: {
    referralCode: referredByCode,
    sourceChannel: String(registrationData?.registrationSource ?? 'website').slice(0, 40),
    referrer: referrer.id,
    referredUser: user.id,
    rewardStatus: 'pending',
    rewardAmount: 0,
    rewardHours: 0,
    rewardCurrency: 'USD',
    registeredAt: new Date().toISOString(),
  } as any });
  await grantReferralTrialLesson(strapi, user.id);
  await strapi.db.query('plugin::users-permissions.user').update({
    where: { id: referrer.id },
    data: { referralCount: Number(referrer.referralCount ?? 0) + 1 },
  });
}

async function markReferralEnrollment(strapi: Core.Strapi, enrollment: any, enrollmentData: any) {
  const userId = enrollment?.user?.id ?? enrollmentData?.user;
  const courseId = enrollment?.course?.id ?? enrollmentData?.course;
  if (!userId) return;
  const referrals = await strapi.db.query('api::referral.referral').findMany({
    where: { referredUser: userId, enrolledAt: null },
    limit: 1,
  });
  const referral = referrals[0];
  if (!referral) return;
  await strapi.db.query('api::referral.referral').update({
    where: { id: referral.id },
    data: {
      ...(courseId ? { course: courseId } : {}),
      enrolledAt: new Date(),
    },
  });
  await evaluateReferralRewards(strapi, referrerIdFromReferral(referral));
}

function referrerIdFromReferral(referral: any) {
  return Number(referral.referrer?.id ?? referral.referrer ?? 0) || undefined;
}

async function ensureArticleContentManagerLayout(strapi: Core.Strapi) {
  const store = strapi.store({ type: 'plugin', name: 'content_manager' });
  const key = 'configuration_content_types::api::article.article';
  const configuration = await store.get({ key }) as {
    metadatas?: Record<string, { edit?: Record<string, unknown>; list?: Record<string, unknown> }>;
    layouts?: { edit?: Array<Array<{ name: string; size?: number }>>; list?: string[] };
  } | undefined;
  if (!configuration?.metadatas || !configuration.layouts) return;

  const categoryMetadata = configuration.metadatas.category;
  const categoryEdit = categoryMetadata?.edit ?? {};
  const categoryList = categoryMetadata?.list ?? {};
  const hiddenFields = new Set(['slug', 'excerpt', 'imageAlt', 'authorName', 'readingMinutes']);
  let editLayout = (configuration.layouts.edit ?? [])
    .map((row) => row.filter((field) => !hiddenFields.has(field.name)))
    .filter((row) => row.length > 0);
  const listLayout = (configuration.layouts.list ?? []).filter((field) => !hiddenFields.has(field));
  const titleField = editLayout.flat().find((field) => field.name === 'title') ?? { name: 'title', size: 6 };
  const categoryField = editLayout.flat().find((field) => field.name === 'category') ?? { name: 'category', size: 6 };
  const field = (name: string, size: number) => ({
    ...(editLayout.flat().find((item) => item.name === name) ?? { name, size }),
    size,
  });
  const layoutFields = new Set(['title', 'category', 'cover', 'publishDate', 'accessLevel', 'featured', 'enabled']);
  const remainingRows = editLayout
    .map((row) => row.filter((item) => !layoutFields.has(item.name)))
    .filter((row) => row.length > 0);
  const bodyRowIndex = remainingRows.findIndex((row) => row.some((item) => item.name === 'body'));
  const insertAt = bodyRowIndex >= 0 ? bodyRowIndex + 1 : 0;
  remainingRows.splice(
    insertAt,
    0,
    [field('cover', 6), field('publishDate', 6)],
    [field('accessLevel', 6), field('featured', 3), field('enabled', 3)],
  );
  editLayout = [[{ ...categoryField, size: 6 }, { ...titleField, size: 6 }], ...remainingRows];
  const metadataChanged = [...hiddenFields].some((field) => {
    const edit = configuration.metadatas?.[field]?.edit;
    return edit && (edit.visible !== false || edit.editable !== false);
  });
  const featuredMetadata = configuration.metadatas.featured;
  const bodyMetadata = configuration.metadatas.body;
  const coverMetadata = configuration.metadatas.cover;
  const accessLevelMetadata = configuration.metadatas.accessLevel;
  const enabledMetadata = configuration.metadatas.enabled;
  const labelsChanged = featuredMetadata?.edit?.label !== '是否置顶'
    || featuredMetadata?.list?.label !== '是否置顶'
    || bodyMetadata?.edit?.label !== '正文内容'
    || bodyMetadata?.edit?.description !== '使用 BlockNote 所见即所得编辑器，可插入图片、视频、表格、标题和列表'
    || coverMetadata?.edit?.label !== '封面图1200*675'
    || coverMetadata?.edit?.description !== '建议上传 1200 × 675 像素图片'
    || accessLevelMetadata?.edit?.label !== '会员等级'
    || accessLevelMetadata?.list?.label !== '会员等级'
    || enabledMetadata?.edit?.label !== '是否展示'
    || enabledMetadata?.list?.label !== '是否展示';
  const changed = JSON.stringify(configuration.layouts.edit) !== JSON.stringify(editLayout)
    || JSON.stringify(configuration.layouts.list) !== JSON.stringify(listLayout)
    || metadataChanged
    || labelsChanged
    || categoryEdit.label !== '发表板块'
    || categoryEdit.description !== '选择文章所属板块'
    || categoryList.label !== '发表板块';
  if (!changed) return;

  if (categoryMetadata) {
    categoryMetadata.edit = {
      ...categoryEdit,
      label: '发表板块',
      description: '选择文章所属板块',
    };
    categoryMetadata.list = {
      ...categoryList,
      label: '发表板块',
    };
  }
  for (const field of hiddenFields) {
    const metadata = configuration.metadatas[field];
    if (!metadata) continue;
    metadata.edit = {
      ...(metadata.edit ?? {}),
      visible: false,
      editable: false,
    };
  }
  if (featuredMetadata) {
    featuredMetadata.edit = { ...(featuredMetadata.edit ?? {}), label: '是否置顶' };
    featuredMetadata.list = { ...(featuredMetadata.list ?? {}), label: '是否置顶' };
  }
  if (bodyMetadata) {
    bodyMetadata.edit = {
      ...(bodyMetadata.edit ?? {}),
      label: '正文内容',
      description: '使用 BlockNote 所见即所得编辑器，可插入图片、视频、表格、标题和列表',
    };
  }
  if (coverMetadata) {
    coverMetadata.edit = {
      ...(coverMetadata.edit ?? {}),
      label: '封面图1200*675',
      description: '建议上传 1200 × 675 像素图片',
    };
  }
  if (accessLevelMetadata) {
    accessLevelMetadata.edit = { ...(accessLevelMetadata.edit ?? {}), label: '会员等级' };
    accessLevelMetadata.list = { ...(accessLevelMetadata.list ?? {}), label: '会员等级' };
  }
  if (enabledMetadata) {
    enabledMetadata.edit = { ...(enabledMetadata.edit ?? {}), label: '是否展示' };
    enabledMetadata.list = { ...(enabledMetadata.list ?? {}), label: '是否展示' };
  }
  configuration.layouts.edit = editLayout;
  configuration.layouts.list = listLayout;
  await store.set({ key, value: configuration });
}

async function ensureUserContentManagerLayout(strapi: Core.Strapi) {
  const store = strapi.store({ type: 'plugin', name: 'content_manager' });
  const key = 'configuration_content_types::plugin::users-permissions.user';
  const configuration = await store.get({ key }) as {
    metadatas?: Record<string, { edit?: Record<string, unknown>; list?: Record<string, unknown> }>;
    layouts?: { edit?: Array<Array<{ name: string; size?: number }>>; list?: string[] };
  } | undefined;
  if (!configuration?.metadatas || !configuration.layouts) return;

  const allFields = (configuration.layouts.edit ?? []).flat();
  const byName = new Map(allFields.map((field) => [field.name, field]));
  const field = (name: string, size = 6) => ({ ...(byName.get(name) ?? { name }), size });
  const featured = [
    ['fullName', 'username'],
    ['email', 'phone'],
    ['membershipLevel', 'membershipStatus'],
    ['lessonHoursBalance', 'referralCount'],
    ['membershipStartedAt', 'membershipExpiresAt'],
    ['country', 'timezone'],
  ].map((row) => row.filter((name) => configuration.metadatas?.[name]).map((name) => field(name)))
    .filter((row) => row.length > 0);
  const featuredNames = new Set(featured.flat().map((item) => item.name));
  const remaining = (configuration.layouts.edit ?? [])
    .map((row) => row.filter((item) => !featuredNames.has(item.name)))
    .filter((row) => row.length > 0);
  const editLayout = [...featured, ...remaining];
  const listLayout = ['username', 'fullName', 'email', 'membershipLevel', 'lessonHoursBalance', 'confirmed', 'blocked']
    .filter((name) => configuration.metadatas?.[name]);

  const labels: Record<string, { label: string; description?: string }> = {
    username: { label: '会员名' },
    fullName: { label: '姓名' },
    email: { label: '邮箱' },
    phone: { label: '联系电话' },
    membershipLevel: { label: '会员等级' },
    membershipStatus: { label: '会员状态' },
    lessonHoursBalance: {
      label: '剩余课时（可人工修改）',
      description: '直接填写会员应有的剩余课时，保存后系统会自动同步课时记录。已预约的课时不能直接扣减。',
    },
    referralCount: { label: '已推荐人数' },
    membershipStartedAt: { label: '会员开始时间' },
    membershipExpiresAt: { label: '会员到期时间' },
  };
  for (const [name, copy] of Object.entries(labels)) {
    const metadata = configuration.metadatas[name];
    if (!metadata) continue;
    metadata.edit = { ...(metadata.edit ?? {}), ...copy };
    metadata.list = { ...(metadata.list ?? {}), label: copy.label };
  }
  const changed = JSON.stringify(configuration.layouts.edit) !== JSON.stringify(editLayout)
    || JSON.stringify(configuration.layouts.list) !== JSON.stringify(listLayout);
  configuration.layouts.edit = editLayout;
  configuration.layouts.list = listLayout;
  if (changed || Object.keys(labels).length) await store.set({ key, value: configuration });
}

async function ensureArticleSeoPermissions(strapi: Core.Strapi) {
  const roles = await strapi.db.query('admin::role').findMany({
    where: { code: { $ne: 'strapi-super-admin' } },
    populate: ['permissions'],
  });
  const actions = new Set([
    'plugin::content-manager.explorer.create',
    'plugin::content-manager.explorer.read',
    'plugin::content-manager.explorer.update',
  ]);
  const seoFields = (fields: unknown) => Array.isArray(fields)
    ? fields.filter((field) => typeof field !== 'string' || !field.startsWith('seo.'))
    : fields;

  for (const role of roles) {
    for (const permission of role.permissions ?? []) {
      if (permission.subject !== 'api::article.article' || !actions.has(permission.action)) continue;
      const properties = (permission.properties ?? {}) as Record<string, unknown>;
      const fields = seoFields(properties.fields);
      if (JSON.stringify(fields) === JSON.stringify(properties.fields)) continue;
      await strapi.db.query('admin::permission').update({
        where: { id: permission.id },
        data: { properties: { ...properties, fields } },
      });
    }
  }
}

async function ensureTestimonialSubmitPermission(strapi: Core.Strapi) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' }, populate: ['permissions'] });
  if (!role) return;
  const action = 'api::testimonial.testimonial.submit';
  const exists = (role.permissions ?? []).some((permission: { action: string }) => permission.action === action);
  if (!exists) await strapi.db.query('plugin::users-permissions.permission').create({ data: { action, role: role.id } });

  // Testimonial creation is handled by the guarded submit action above.
  // Remove the direct core create permission so membership checks cannot be bypassed.
  const directCreatePermissions = await strapi.db.query('plugin::users-permissions.permission').findMany({
    where: { action: 'api::testimonial.testimonial.create' },
  });
  await Promise.all(directCreatePermissions.map((permission: { id: number }) =>
    strapi.db.query('plugin::users-permissions.permission').delete({ where: { id: permission.id } })
  ));
}

async function configureSocialProviders(strapi: Core.Strapi) {
  const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
  const grant = (await store.get({ key: 'grant' }) ?? {}) as Record<string, unknown>;
  const callbackBase = process.env.FRONTEND_URL ?? 'http://localhost:3010';
  const providers = [
    ['google', process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, ['openid', 'email', 'profile']],
    ['twitter', process.env.X_CONSUMER_KEY, process.env.X_CONSUMER_SECRET, undefined],
  ] as const;
  delete grant.linkedin;
  for (const [name, key, secret, scope] of providers) {
    if (!key || !secret) continue;
    grant[name] = { enabled: true, key, secret, callback: `${callbackBase}/api/auth/oauth/callback/${name}`, ...(scope ? { scope } : {}) };
  }
  await store.set({ key: 'grant', value: grant });

  // Strapi's built-in Google adapter only requests the email scope and turns
  // the email prefix into the member name. Use Google's OpenID userinfo
  // endpoint so social registrations receive the verified email and actual
  // account name while remaining in the same Strapi user table.
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const registry = strapi.plugin('users-permissions').service('providers-registry') as {
      add: (name: string, config: Record<string, unknown>) => void;
    };
    registry.add('google', {
      enabled: true,
      icon: 'google',
      grantConfig: {},
      authCallback: async ({ accessToken }: { accessToken: string }) => {
        const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        });
        const profile = await response.json() as {
          email?: string;
          email_verified?: boolean;
          name?: string;
          given_name?: string;
          family_name?: string;
        };
        if (!response.ok || !profile.email) throw new Error('Google did not return an email address.');
        if (profile.email_verified === false) throw new Error('Google email address is not verified.');
        const email = profile.email.trim().toLowerCase();
        const fullName = String(
          profile.name
            ?? [profile.given_name, profile.family_name].filter(Boolean).join(' ')
            ?? email.split('@')[0],
        ).trim() || email.split('@')[0];
        return {
          username: fullName,
          email,
          fullName,
          displayName: fullName,
          registrationSource: 'google',
          registrationPlatform: 'web',
        };
      },
    });
  }

  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
    const registry = strapi.plugin('users-permissions').service('providers-registry') as {
      add: (name: string, config: Record<string, unknown>) => void;
    };
    registry.add('apple', {
      enabled: true,
      icon: 'apple',
      grantConfig: {},
      authCallback: async ({ accessToken, query }: {
        accessToken: string;
        query?: Record<string, unknown>;
      }) => {
        const identity = await verifyAppleIdentityToken(accessToken, String(query?.nonce ?? ''));
        const requestedName = String(query?.fullName ?? '').trim();
        const fullName = requestedName || identity.email.split('@')[0];
        return {
          username: fullName,
          email: identity.email,
          fullName,
          displayName: fullName,
          registrationSource: 'apple',
          registrationPlatform: 'web',
        };
      },
    });
  }
}

async function configurePasswordResetEmail(strapi: Core.Strapi) {
  const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
  const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3010').replace(/\/$/, '');
  const advanced = (await store.get({ key: 'advanced' }) ?? {}) as Record<string, unknown>;
  await store.set({
    key: 'advanced',
    value: { ...advanced, email_reset_password: frontendUrl },
  });

  const email = (await store.get({ key: 'email' }) ?? {}) as Record<string, any>;
  const reset = email.reset_password ?? {};
  const options = reset.options ?? {};
  email.reset_password = {
    ...reset,
    options: {
      ...options,
      from: {
        name: 'SureMandarin',
        email: process.env.EMAIL_FROM_ADDRESS ?? 'hello@suremandarin.com',
      },
      response_email: process.env.EMAIL_REPLY_TO ?? 'qingniaobird@163.com',
      object: 'Reset your SureMandarin password / 重置 SureMandarin 密码',
      message: `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#27354a;max-width:620px;margin:auto">
          <h2 style="color:#1565ff">Reset your SureMandarin password</h2>
          <p>Hello <%= USER.username %>,</p>
          <p>Use the secure button below to choose a new password. This link is for your account only.</p>
          <p><a href="<%= URL %>/en/reset-password?code=<%= TOKEN %>" style="display:inline-block;padding:12px 22px;border-radius:12px;background:#1565ff;color:white;text-decoration:none;font-weight:bold">Reset password</a></p>
          <hr style="border:0;border-top:1px solid #e6eaf0;margin:28px 0" />
          <h2 style="color:#1565ff">重置 SureMandarin 密码</h2>
          <p>您好，<%= USER.username %>：</p>
          <p>请点击下方安全按钮设置新密码。该链接仅供您的账户使用。</p>
          <p><a href="<%= URL %>/zh/reset-password?code=<%= TOKEN %>" style="display:inline-block;padding:12px 22px;border-radius:12px;background:#1565ff;color:white;text-decoration:none;font-weight:bold">重置密码</a></p>
          <p style="color:#7b8798;font-size:13px">如果不是您发起的请求，请忽略本邮件。</p>
        </div>
      `,
    },
  };
  await store.set({ key: 'email', value: email });
}

const chineseHomePageData = {
  pageTitle: 'SureMandarin 中文学习',
  pageDescription: '面向全球学习者的个性化中文课程。',
  heroSlides: [
    {
      eyebrow: '全球中文教育专家',
      title: '自信说中文，连接更多可能。',
      description: '个性化中文学习体验，让语言、文化与未来机会真正连接。',
      imageAlt: 'SureMandarin 中文学习体验',
      enabled: true,
    },
    {
      eyebrow: '在文化中学习',
      title: '学习中文，看见更大的世界。',
      description: '通过文化体验、专业指导和真实交流建立实用中文能力。',
      imageAlt: '在文化体验中学习中文',
      enabled: true,
    },
    {
      eyebrow: '灵活学习',
      title: '你的目标，你的中文旅程。',
      description: '一对一、小组、游学、IB 与在线课程，按照你的方式学习。',
      imageAlt: '灵活的中文学习方案',
      enabled: true,
    },
  ],
  courseSectionTitle: '找到适合你的课程',
  knowledgeSectionTitle: '中文学习知识中心',
  testimonialSectionTitle: '全球学员的真实评价',
  newsletterTitle: '持续获得学习灵感',
  newsletterDescription: '订阅中文学习技巧、文化故事和专属活动。',
};

async function ensureChineseHomePage(strapi: Core.Strapi) {
  const uid = 'api::home-page.home-page' as const;
  const english = await strapi.db.query(uid).findOne({
    where: { locale: 'en', publishedAt: null },
  });
  if (!english?.documentId) return;
  const chinese = await strapi.db.query(uid).findOne({
    where: { documentId: english.documentId, locale: 'zh', publishedAt: null },
  });
  if (chinese) return;
  await strapi.documents(uid).update({
    documentId: english.documentId,
    locale: 'zh',
    status: 'published',
    data: chineseHomePageData,
  });
  strapi.log.info('Created the linked Chinese homepage locale.');
}

async function repairEnglishHomePagePublication(strapi: Core.Strapi) {
  const uid = 'api::home-page.home-page' as const;
  const englishDraft = await strapi.db.query(uid).findOne({
    where: { locale: 'en', publishedAt: null },
  });
  const englishPublished = englishDraft?.documentId
    ? await strapi.db.query(uid).findOne({
        where: {
          documentId: englishDraft.documentId,
          locale: 'en',
          publishedAt: { $notNull: true },
        },
      })
    : null;
  if (
    englishDraft?.documentId &&
    englishDraft.pageTitle === 'SureMandarin Chinese Learning' &&
    englishPublished?.pageTitle === chineseHomePageData.pageTitle
  ) {
    await strapi.documents(uid).publish({
      documentId: englishDraft.documentId,
      locale: 'en',
    });
    strapi.log.info('Restored the English homepage publication after enabling localized fields.');
  }
}

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    const adminRoutes = (strapi.admin as any)?.routes?.admin?.routes;
    if (Array.isArray(adminRoutes) && !adminRoutes.some((route: any) => route.path === '/suremandarin/dashboard-summary')) {
      adminRoutes.push({
        method: 'GET',
        path: '/suremandarin/dashboard-summary',
        handler: async (ctx: any) => {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(startOfDay);
          endOfDay.setDate(endOfDay.getDate() + 1);
          const todayFilter = { createdAt: { $gte: startOfDay } };
          const [
            newMembers,
            totalMembers,
            pendingBookings,
            confirmedLessonsToday,
            newInquiries,
            unhandledInquiries,
            pendingRewards,
            pendingTestimonials,
          ] = await Promise.all([
            strapi.db.query('plugin::users-permissions.user').count({ where: todayFilter }),
            strapi.db.query('plugin::users-permissions.user').count(),
            strapi.db.query('api::lesson-booking.lesson-booking').count({ where: { status: 'requested' } }),
            strapi.db.query('api::lesson-booking.lesson-booking').count({
              where: {
                status: 'confirmed',
                requestedStartAt: { $gte: startOfDay, $lt: endOfDay },
              },
            }),
            strapi.db.query('api::inquiry.inquiry').count({ where: todayFilter }),
            strapi.db.query('api::inquiry.inquiry').count({ where: { status: 'new' } }),
            strapi.db.query('api::lesson-credit.lesson-credit').count({ where: { status: 'pending-review' } }),
            strapi.db.query('api::testimonial.testimonial').count({ where: { enabled: false } }),
          ]);
          ctx.body = {
            data: {
              newMembersToday: Number(newMembers ?? 0),
              totalMembers: Number(totalMembers ?? 0),
              pendingBookings: Number(pendingBookings ?? 0),
              confirmedLessonsToday: Number(confirmedLessonsToday ?? 0),
              newInquiriesToday: Number(newInquiries ?? 0),
              unhandledInquiries: Number(unhandledInquiries ?? 0),
              pendingRewards: Number(pendingRewards ?? 0),
              pendingTestimonials: Number(pendingTestimonials ?? 0),
              updatedAt: new Date().toISOString(),
            },
          };
        },
        config: {
          policies: ['admin::isAuthenticatedAdmin'],
        },
      });
    }
    if (Array.isArray(adminRoutes) && !adminRoutes.some((route: any) => route.path === '/suremandarin/translate-english-draft')) {
      adminRoutes.push({
        method: 'POST',
        path: '/suremandarin/translate-english-draft',
        handler: async (ctx: any) => {
          try {
            const uid = String(ctx.request.body?.uid ?? '');
            const requestedDocumentId = String(ctx.request.body?.documentId ?? '').trim();
            const force = ctx.request.body?.force === true;
            if (!AUTO_TRANSLATE_CONTENT_TYPES.has(uid)) {
              ctx.throw(400, '当前内容类型不支持自动翻译。');
              return;
            }

            const roles = await adminRoleCodes(strapi, ctx.state.user);
            const allowedRoles = new Set(['strapi-super-admin', 'strapi-editor', 'strapi-author']);
            if (!roles.some((code: string) => allowedRoles.has(code))) {
              ctx.throw(403, '当前后台角色没有自动翻译权限。');
              return;
            }
            const isSuperAdmin = roles.includes('strapi-super-admin');
            const query = strapi.db.query(uid as any) as any;
            const sourceWhere: Record<string, unknown> = { locale: 'zh', publishedAt: null };
            if (requestedDocumentId) sourceWhere.documentId = requestedDocumentId;
            let source = await query.findOne({ where: sourceWhere, populate: true });
            if (!source) {
              const publishedWhere: Record<string, unknown> = { locale: 'zh', publishedAt: { $notNull: true } };
              if (requestedDocumentId) publishedWhere.documentId = requestedDocumentId;
              source = await query.findOne({ where: publishedWhere, populate: true });
            }
            if (!source?.documentId) {
              ctx.throw(404, '没有找到已保存的中文版本，请先保存中文内容。');
              return;
            }

            const documentId = String(source.documentId);
            const target = await query.findOne({
              where: { documentId, locale: 'en', publishedAt: null },
              populate: true,
            });
            const schema = (strapi.contentTypes as Record<string, any>)[uid];
            if (!force && hasMeaningfulLocalizedContent(schema, target)) {
              ctx.status = 409;
              ctx.body = {
                error: {
                  code: 'ENGLISH_DRAFT_EXISTS',
                  message: '英文草稿已经有内容。为保护人工校对结果，需要确认后才能重新翻译覆盖。',
                },
              };
              return;
            }

            const { data, slots } = prepareTranslatedFields(strapi, uid, source, isSuperAdmin);
            const translatedCharacters = await translateWithGoogle(strapi, slots);
            await (strapi.documents(uid as any) as any).update({
              documentId,
              locale: 'en',
              status: 'draft',
              data,
            });
            ctx.body = {
              data: {
                uid,
                documentId,
                sourceLocale: 'zh',
                targetLocale: 'en',
                translatedCharacters,
                overwritten: Boolean(target),
                message: '英文草稿已生成，请校对后再保存和发布。',
              },
            };
          } catch (error) {
            const translatedError = error as Error & { status?: number; code?: string };
            const status = Number(translatedError.status ?? 500);
            strapi.log.error(`Unable to generate English draft: ${translatedError.message}`);
            ctx.status = status;
            ctx.body = {
              error: {
                code: translatedError.code ?? 'TRANSLATION_FAILED',
                message: translatedError.message || '生成英文草稿失败，请稍后重试。',
              },
            };
          }
        },
        config: {
          policies: ['admin::isAuthenticatedAdmin'],
        },
      });
    }
    if (Array.isArray(adminRoutes) && !adminRoutes.some((route: any) => route.path === '/suremandarin/contact-user')) {
      adminRoutes.push({
        method: 'POST',
        path: '/suremandarin/contact-user',
        handler: async (ctx: any) => {
          try {
            const roles = await adminRoleCodes(strapi, ctx.state.user);
            const allowedRoles = new Set(['strapi-super-admin', 'strapi-editor', 'strapi-author']);
            if (!roles.some((code: string) => allowedRoles.has(code))) {
              ctx.throw(403, '当前后台角色没有联系用户权限。');
              return;
            }

            const requestedId = String(ctx.request.body?.userId ?? '').trim();
            const subject = String(ctx.request.body?.subject ?? '').trim().slice(0, 160);
            const message = String(ctx.request.body?.message ?? '').trim().slice(0, 12000);
            if (!requestedId || !subject || !message) {
              ctx.throw(400, '请填写邮件主题和内容。');
              return;
            }

            const userQuery = strapi.db.query('plugin::users-permissions.user');
            let user = /^\d+$/.test(requestedId)
              ? await userQuery.findOne({ where: { id: Number(requestedId) } })
              : await userQuery.findOne({ where: { documentId: requestedId } });
            if (!user && !/^\d+$/.test(requestedId)) {
              user = await userQuery.findOne({ where: { id: requestedId } });
            }
            if (!user?.email) {
              ctx.throw(404, '没有找到该用户或用户没有邮箱地址。');
              return;
            }

            const from = process.env.EMAIL_FROM ?? 'SureMandarin <hello@suremandarin.com>';
            const replyTo = process.env.EMAIL_REPLY_TO ?? 'qingniaobird@163.com';
            const htmlMessage = escapeEmailHtml(message).replace(/\r?\n/g, '<br />');
            await strapi.plugin('email').service('email').send({
              to: user.email,
              from,
              replyTo,
              subject,
              text: message,
              html: `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#27354a;max-width:640px;margin:auto"><p>${htmlMessage}</p><hr style="border:0;border-top:1px solid #e6eaf0;margin:24px 0" /><p style="color:#7b8798;font-size:13px">SureMandarin · hello@suremandarin.com</p></div>`,
            });
            ctx.body = { data: { message: '邮件已发送。', email: user.email } };
          } catch (error) {
            const sendError = error as Error & { status?: number };
            const status = Number(sendError.status ?? 500);
            strapi.log.error(`Unable to contact user: ${sendError.message}`);
            ctx.status = status;
            ctx.body = { error: { message: sendError.message || '邮件发送失败，请检查邮件配置。' } };
          }
        },
        config: {
          policies: ['admin::isAuthenticatedAdmin'],
        },
      });
    }
    strapi.customFields.register({
      name: 'blocknote',
      type: 'json',
      inputSize: {
        default: 12,
        isResizable: false,
      },
    });
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    strapi.db.lifecycles.subscribe({
      models: ['api::article.article', 'api::course.course'],
      beforeCreate: (event) => validateCoverImage(strapi, event),
      beforeUpdate: (event) => validateCoverImage(strapi, event),
    });
    strapi.db.lifecycles.subscribe({
      models: ['plugin::users-permissions.user'],
      beforeCreate: (event) => {
        const data = event.params?.data as Record<string, unknown> | undefined;
        const provider = String(data?.provider ?? '').trim().toLowerCase();
        if (!data || !provider || provider === 'local') return;
        const fallbackName = String(data.fullName ?? data.displayName ?? data.username ?? '').trim();
        if (!data.fullName && fallbackName) data.fullName = fallbackName;
        if (!data.displayName && fallbackName) data.displayName = fallbackName;
        if (!data.registrationSource) data.registrationSource = provider === 'twitter' ? 'x' : provider;
        if (!data.registrationPlatform) data.registrationPlatform = 'web';
        if (!data.preferredLanguage) data.preferredLanguage = 'en';
        if (!data.privacyPolicyVersion) data.privacyPolicyVersion = '2026-08';
        if (!data.privacyConsentAt) data.privacyConsentAt = new Date();
      },
      beforeUpdate: async (event) => {
        const data = event.params?.data as Record<string, unknown> | undefined;
        if (!data || !Object.prototype.hasOwnProperty.call(data, 'lessonHoursBalance')) return;
        const current = await strapi.db.query('plugin::users-permissions.user').findOne({ where: event.params?.where });
        if (!current?.id || isSyncingLessonBalance(current.id)) return;
        const target = await validateLessonHoursTarget(strapi, current.id, data.lessonHoursBalance);
        event.state = { ...(event.state ?? {}), lessonHoursAdjustment: { userId: current.id, target } };
      },
      afterCreate: async (event) => {
        void notifyNewUserRegistration(strapi, event.result, event.params?.data).catch((error) => {
          strapi.log.error(`Unable to send new registration notification: ${error instanceof Error ? error.message : String(error)}`);
        });
        try {
          await createReferralRecord(strapi, event.result, event.params?.data);
        } catch (error) {
          strapi.log.error(`Unable to create referral record: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
      afterUpdate: async (event) => {
        const adjustment = event.state?.lessonHoursAdjustment as { userId?: number; target?: number } | undefined;
        if (!adjustment?.userId || adjustment.target === undefined) return;
        await adjustLessonHoursBalance(strapi, adjustment.userId, adjustment.target);
      },
    });
    strapi.db.lifecycles.subscribe({
      models: ['api::enrollment.enrollment'],
      afterCreate: async (event) => {
        try {
          await markReferralEnrollment(strapi, event.result, event.params?.data);
        } catch (error) {
          strapi.log.error(`Unable to update referral enrollment: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    });
    await ensureContentLocales(strapi);
    await migrateArticleBodiesToBlockNote(strapi);
    await ensureAdminLocalePermissions(strapi);
    await ensureEditorMarketingPermissions(strapi);
    await ensurePublicReadPermissions(strapi);
    await ensureAccountOverviewPermission(strapi);
    await ensureDailyProgressPermission(strapi);
    await ensureLessonBookingPermission(strapi);
    await ensureArticleContentManagerLayout(strapi);
    await ensureUserContentManagerLayout(strapi);
    await ensureArticleSeoPermissions(strapi);
    await syncAllLessonHoursBalances(strapi);
    setTimeout(() => {
      ensureArticleContentManagerLayout(strapi).catch(() => undefined);
      ensureUserContentManagerLayout(strapi).catch(() => undefined);
      ensureArticleSeoPermissions(strapi).catch(() => undefined);
    }, 2000);
    await ensureTestimonialSubmitPermission(strapi);
    await configurePasswordResetEmail(strapi);
    await configureSocialProviders(strapi);
    await ensureChineseHomePage(strapi);
    await repairEnglishHomePagePublication(strapi);

    if (process.env.SEED_INITIAL_DATA !== 'true') return;

    const plans = await strapi.documents('api::membership-plan.membership-plan').findMany({ limit: 1 });
    if (!plans.length) {
      await strapi.documents('api::membership-plan.membership-plan').create({ status:'published', data:{
        name:'VIP', code:'vip', description:'付费会员', monthlyPrice:19.9, yearlyPrice:199,
        currency:'USD', trialDays:0, autoRenew:true, recommended:false, enabled:true, sortOrder:1,
      }});
      await strapi.documents('api::membership-plan.membership-plan').create({ status:'published', data:{
        name:'SVIP', code:'svip', description:'高级付费会员', monthlyPrice:39.9, yearlyPrice:399,
        currency:'USD', trialDays:0, autoRenew:true, recommended:true, enabled:true, sortOrder:2,
      }});
    }

    const existingCourses = await strapi.documents('api::course.course').findMany({ limit: 1 });
    if (!existingCourses.length) {
      for (const [title, category] of courses) await strapi.documents('api::course.course').create({ status:'published', data:{
        title, slug:title.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),
        category, summary:`SureMandarin ${title}`, level:'all', deliveryMode:category==='online'?'online':'hybrid',
        accessLevel:'public', currency:'USD', allowStandalonePurchase:false, featured:true, enabled:true,
        sortOrder:courses.findIndex(([name])=>name===title)+1,
      }});
    }

    const categories = await strapi.documents('api::article-category.article-category').findMany({ limit: 1 });
    if (!categories.length) {
      for (const [index, name] of ['Learning Strategies','Chinese Culture','Study Tips','News & Insights'].entries())
        await strapi.documents('api::article-category.article-category').create({ status:'published', data:{ name, slug:name.toLowerCase().replace(/[^a-z0-9]+/g,'-'), sortOrder:index+1 } });
    }

    const articles = await strapi.documents('api::article.article').findMany({ limit: 1 });
    if (!articles.length) {
      const articleData = [
        ['Learning Strategies', 'learning-strategies', 'Smart methods to improve memory, comprehension, and speaking confidence.'],
        ['Chinese Culture', 'chinese-culture', 'Explore traditions, festivals, art, food, and the stories behind them.'],
        ['Study Tips', 'study-tips', 'Study techniques, vocabulary building, and exam preparation advice.'],
        ['News & Insights', 'news-and-insights', 'Updates from SureMandarin and the world of Chinese education.'],
      ] as const;
      for (const [title, slug, excerpt] of articleData) {
        await strapi.documents('api::article.article').create({ status: 'published', data: {
          title, slug, excerpt, body: [{ type: 'paragraph', content: [{ type: 'text', text: excerpt, styles: {} }] }] as never,
          authorName: 'SureMandarin Team', publishDate: new Date().toISOString(), readingMinutes: 5,
          accessLevel: 'public', featured: true, enabled: true,
        }});
      }
    }

    const testimonials = await strapi.documents('api::testimonial.testimonial').findMany({ limit: 1 });
    if (!testimonials.length) {
      const testimonialData = [
        ['Sophie Martin', 'France', 'SureMandarin teachers are patient and inspiring. My Chinese has improved so much!'],
        ['Kevin Tan', 'Singapore', 'The classes are well-structured and practical. I use what I learn every day.'],
        ['Carla Rodriguez', 'Mexico', 'I love the cultural lessons and travel experiences. They make learning fun.'],
        ['Lucas Miller', 'Germany', 'The online platform is easy to use and the community is very supportive.'],
      ] as const;
      for (const [index, [studentName, country, quote]] of testimonialData.entries()) {
        await strapi.documents('api::testimonial.testimonial').create({ status: 'published', data: {
          studentName, country, quote, rating: 5, studentType: 'Language learner',
          featured: true, enabled: true, sortOrder: index + 1,
        }});
      }
    }

    const homePages = await strapi.documents('api::home-page.home-page').findMany({ limit: 1 });
    if (!homePages.length) {
      await strapi.documents('api::home-page.home-page').create({ status: 'published', data: {
        pageTitle: 'SureMandarin Chinese Learning',
        pageDescription: 'Personalized Chinese learning for students worldwide.',
        heroSlides: [
          { eyebrow: 'Global Chinese education experts', title: 'Confident Chinese. Limitless Opportunities.', description: 'Personalized learning experiences that connect you to Chinese language, culture, and a world of possibilities.', enabled: true },
          { eyebrow: 'Learn through culture', title: 'Learn Chinese. See the World.', description: 'Build real language skills through cultural immersion, expert guidance, and meaningful connections.', enabled: true },
          { eyebrow: 'Flexible learning', title: 'Your Goals. Your Learning Journey.', description: 'Flexible private, group, travel, IB, and online courses designed around the way you learn.', enabled: true },
        ],
        courseSectionTitle: 'Find the Right Course for You',
        knowledgeSectionTitle: 'Inspire Your Learning',
        testimonialSectionTitle: 'Loved by Learners Worldwide',
        newsletterTitle: 'Stay Inspired',
        newsletterDescription: 'Get learning tips, cultural stories, and exclusive offers.',
      }});
    }
    await ensureChineseHomePage(strapi);

    const globalSettings = await strapi.documents('api::global-setting.global-setting').findMany({ limit: 1 });
    if (!globalSettings.length) {
      await strapi.documents('api::global-setting.global-setting').create({ status: 'published', data: {
        siteName: 'SureMandarin', defaultLanguage: 'en', contactTitle: 'Contact Us',
        contactDescription: 'We are here to help with your Chinese learning journey.',
        footerDescription: 'Empowering learners worldwide to speak Chinese with confidence and cultural understanding.',
        copyright: `© ${new Date().getFullYear()} SureMandarin. All rights reserved.`,
        privacyUrl: '/privacy', termsUrl: '/terms',
      }});
    }

    strapi.log.info('SureMandarin initial content is ready. Set SEED_INITIAL_DATA=false after first successful startup.');
  },
};
