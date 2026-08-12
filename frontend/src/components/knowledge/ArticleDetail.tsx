import Image from "next/image";
import Link from "next/link";
import { Fragment, type ElementType, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Clock3, UserRound } from "lucide-react";
import type { ArticleDetailData, KnowledgeCategorySlug } from "@/lib/strapi";
import { knowledgeCategories } from "@/lib/strapi";
import type { Locale } from "@/lib/i18n";

function blockText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const item = value as { text?: unknown; children?: unknown[]; content?: unknown };
  if (typeof item.text === "string") return item.text;
  if (item.content !== undefined) return blockText(item.content);
  return Array.isArray(item.children)
    ? item.children.map(blockText).join("")
    : "";
}

type ArticleBlock = {
  type?: string;
  level?: number;
  format?: string;
  text?: string;
  url?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  children?: ArticleBlock[];
  image?: { url?: string; alternativeText?: string; width?: number; height?: number };
  content?: unknown;
  props?: {
    level?: number;
    textAlignment?: "left" | "center" | "right" | "justify";
    url?: string;
    caption?: string;
    name?: string;
    checked?: boolean;
    previewWidth?: number;
  };
};

type BlockNoteInline = {
  type?: string;
  text?: string;
  href?: string;
  styles?: Record<string, boolean | string>;
  content?: BlockNoteInline[];
};

type BlockNoteTableContent = {
  type?: string;
  headerRows?: number;
  rows?: Array<{ cells?: Array<BlockNoteInline[] | { content?: BlockNoteInline[] }> }>;
};

function contentAssetUrl(url: string): string {
  return url.startsWith('/uploads/')
    ? `/strapi-media/${url.slice('/uploads/'.length)}`
    : url;
}

function renderBlockNoteInline(content: unknown, keyPrefix: string): ReactNode {
  if (!Array.isArray(content)) return null;
  return content.map((rawItem, index) => {
    const item = rawItem as BlockNoteInline;
    const key = `${keyPrefix}-${index}`;
    const value = item.text ?? renderBlockNoteInline(item.content, `${key}-link`);
    let node: ReactNode = value;
    if (item.styles?.bold) node = <strong>{node}</strong>;
    if (item.styles?.italic) node = <em>{node}</em>;
    if (item.styles?.underline) node = <u>{node}</u>;
    if (item.styles?.strike) node = <del>{node}</del>;
    if (item.styles?.code) node = <code>{node}</code>;
    if (item.styles?.textColor && item.styles.textColor !== 'default') {
      node = <span style={{ color: String(item.styles.textColor) }}>{node}</span>;
    }
    if (item.styles?.backgroundColor && item.styles.backgroundColor !== 'default') {
      node = <span style={{ backgroundColor: String(item.styles.backgroundColor) }}>{node}</span>;
    }
    if (item.type === 'link' && item.href) {
      node = <a href={item.href} target="_blank" rel="noreferrer">{node}</a>;
    }
    return <Fragment key={key}>{node}</Fragment>;
  });
}

function renderBlockNoteBlock(block: ArticleBlock, index: number, locale: Locale): ReactNode {
  const key = `blocknote-${index}`;
  const inline = renderBlockNoteInline(block.content, key);
  const alignment = block.props?.textAlignment;
  const style = alignment ? { textAlign: alignment } : undefined;
  const nested = block.children?.length
    ? <div className="ml-5 border-l border-slate-200 pl-5">{block.children.map((child, childIndex) => renderBlockNoteBlock(child, Number(`${index}${childIndex}`), locale))}</div>
    : null;

  switch (block.type) {
    case 'heading': {
      const level = Math.min(Math.max(block.props?.level ?? 2, 1), 6);
      const Heading = (`h${level}`) as ElementType;
      return <Fragment key={key}><Heading style={style}>{inline}</Heading>{nested}</Fragment>;
    }
    case 'quote':
      return <Fragment key={key}><blockquote>{inline}</blockquote>{nested}</Fragment>;
    case 'codeBlock':
      return <pre key={key}><code>{blockText(block.content)}</code></pre>;
    case 'bulletListItem':
      return <ul key={key}><li style={style}>{inline}{nested}</li></ul>;
    case 'numberedListItem':
      return <ol key={key}><li style={style}>{inline}{nested}</li></ol>;
    case 'checkListItem':
      return <label key={key} className="my-3 flex items-start gap-3"><input type="checkbox" checked={Boolean(block.props?.checked)} readOnly className="mt-2" /><span>{inline}</span></label>;
    case 'divider':
      return <hr key={key} className="my-10 border-slate-200" />;
    case 'image': {
      if (!block.props?.url) return null;
      const imageSrc = contentAssetUrl(block.props.url);
      return <figure key={key} className="my-8 flex flex-col gap-2" style={{ alignItems: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start' }}>
        <Image
          src={imageSrc}
          alt={block.props.caption ?? ''}
          width={1200}
          height={675}
          sizes="(max-width: 768px) 100vw, 760px"
          unoptimized={/^https?:\/\//i.test(imageSrc)}
          className="h-auto max-w-full rounded-2xl shadow-sm"
          style={block.props.previewWidth ? { width: block.props.previewWidth } : undefined}
        />
        {block.props.caption ? <figcaption className="text-sm text-slate-500">{block.props.caption}</figcaption> : null}
      </figure>;
    }
    case 'video': {
      const url = block.props?.url ? contentAssetUrl(block.props.url) : '';
      const video = getVideoEmbed(url);
      if (video?.kind === 'file') return <video key={key} className="my-8 w-full rounded-2xl bg-slate-950 shadow-lg" controls playsInline preload="metadata" src={video.src} />;
      if (video?.kind === 'youtube' || video?.kind === 'vimeo') return <span key={key} className="my-8 block aspect-video overflow-hidden rounded-2xl bg-slate-950 shadow-lg"><iframe className="h-full w-full" src={video.src} title={locale === 'zh' ? '文章视频' : 'Article video'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></span>;
      return null;
    }
    case 'audio':
      return block.props?.url ? <audio key={key} className="my-6 w-full" controls src={contentAssetUrl(block.props.url)} /> : null;
    case 'file':
      return block.props?.url ? <p key={key}><a href={contentAssetUrl(block.props.url)} target="_blank" rel="noreferrer">{block.props.name || block.props.caption || (locale === 'zh' ? '下载附件' : 'Download attachment')}</a></p> : null;
    case 'table': {
      const table = block.content as BlockNoteTableContent;
      return <div key={key} className="my-8 overflow-x-auto"><table><tbody>{(table.rows ?? []).map((row, rowIndex) => <tr key={`${key}-row-${rowIndex}`}>{(row.cells ?? []).map((rawCell, cellIndex) => {
        const cell = Array.isArray(rawCell) ? rawCell : rawCell.content;
        const Cell = rowIndex < (table.headerRows ?? 0) ? 'th' : 'td';
        return <Cell key={`${key}-cell-${rowIndex}-${cellIndex}`}>{renderBlockNoteInline(cell, `${key}-cell-${rowIndex}-${cellIndex}`)}</Cell>;
      })}</tr>)}</tbody></table></div>;
    }
    case 'paragraph':
    default:
      return <Fragment key={key}><p style={style}>{inline}</p>{nested}</Fragment>;
  }
}

function renderInlineChildren(children: unknown[] | undefined, keyPrefix: string): ReactNode {
  return (children ?? []).map((child, index) => {
    const item = child as ArticleBlock;
    const content = item.text ?? renderInlineChildren(item.children, `${keyPrefix}-${index}`);
    const key = `${keyPrefix}-${index}`;
    if (item.type === 'link' && item.url) {
      return <a key={key} href={item.url} target="_blank" rel="noreferrer">{content}</a>;
    }
    if (item.bold) return <strong key={key}>{content}</strong>;
    if (item.italic) return <em key={key}>{content}</em>;
    if (item.underline) return <u key={key}>{content}</u>;
    if (item.strikethrough) return <del key={key}>{content}</del>;
    if (item.code) return <code key={key}>{content}</code>;
    return <Fragment key={key}>{content}</Fragment>;
  });
}

function renderBlock(block: ArticleBlock, index: number, locale: Locale): ReactNode {
  const children = renderInlineChildren(block.children, `block-${index}`);
  const key = `block-${index}`;
  switch (block.type) {
    case 'heading-one': return <h2 key={key}>{children}</h2>;
    case 'heading-two': return <h3 key={key}>{children}</h3>;
    case 'heading-three': return <h4 key={key}>{children}</h4>;
    case 'heading-four': return <h5 key={key}>{children}</h5>;
    case 'heading-five': return <h6 key={key}>{children}</h6>;
    case 'heading-six': return <h6 key={key}>{children}</h6>;
    case 'heading': {
      const level = Math.min(Math.max(block.level ?? 2, 1), 6);
      const Heading = (`h${level}`) as ElementType;
      return <Heading key={key}>{children}</Heading>;
    }
    case 'quote': return <blockquote key={key}>{children}</blockquote>;
    case 'code': return <pre key={key}><code>{blockText(block)}</code></pre>;
    case 'list-ordered':
    case 'list-unordered': {
      const List = block.type === 'list-ordered' ? 'ol' : 'ul';
      return <List key={key}>{(block.children ?? []).map((item, itemIndex) => renderBlock(item, Number(`${index}.${itemIndex}`), locale))}</List>;
    }
    case 'list-item': return <li key={key}>{children}</li>;
    case 'image': {
      const image = block.image;
      if (!image?.url) return null;
      const imageSrc = contentAssetUrl(image.url);
      return <figure key={key} className="my-8 flex flex-col items-center gap-2">
        <Image
          src={imageSrc}
          alt={image.alternativeText ?? ''}
          width={image.width ?? 1200}
          height={image.height ?? 675}
          sizes="(max-width: 768px) 100vw, 760px"
          unoptimized={/^https?:\/\//i.test(imageSrc)}
          className="h-auto max-w-full rounded-2xl shadow-sm"
        />
        {image.alternativeText ? <figcaption className="text-sm text-slate-500">{image.alternativeText}</figcaption> : null}
      </figure>;
    }
    case 'video': {
      const video = getVideoEmbed(blockText(block));
      if (video?.kind === 'file') return <video key={key} className="my-8 w-full rounded-2xl bg-slate-950 shadow-lg" controls playsInline preload="metadata" src={video.src} />;
      if (video?.kind === 'youtube' || video?.kind === 'vimeo') return <span key={key} className="my-8 block aspect-video overflow-hidden rounded-2xl bg-slate-950 shadow-lg"><iframe className="h-full w-full" src={video.src} title={locale === 'zh' ? '文章视频' : 'Article video'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></span>;
      return <p key={key} className="my-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{locale === 'zh' ? '视频链接待填写' : 'Video URL is not available yet.'}</p>;
    }
    case 'divider': return <hr key={key} className="my-10 border-slate-200" />;
    case 'centered': return <p key={key} className="text-center">{children}</p>;
    case 'paragraph':
    default: return <p key={key}>{children || blockText(block)}</p>;
  }
}

type VideoEmbed =
  | { kind: "file"; src: string }
  | { kind: "youtube" | "vimeo"; src: string };

function getVideoEmbed(href: string): VideoEmbed | null {
  const url = href.trim();
  if (!/^(https?:\/\/|\/|\.\/)/i.test(url)) return null;

  const youtubeId = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i,
  )?.[1];
  if (youtubeId) {
    return { kind: "youtube", src: `https://www.youtube.com/embed/${youtubeId}` };
  }

  const vimeoId = url.match(/(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/i)?.[1];
  if (vimeoId) {
    return { kind: "vimeo", src: `https://player.vimeo.com/video/${vimeoId}` };
  }

  if (/\.(?:mp4|webm|ogg|mov|m4v|m3u8)(?:[?#].*)?$/i.test(url)) {
    return { kind: "file", src: url };
  }

  return null;
}

export function ArticleDetail({
  article,
  category,
  locale,
}: {
  article: ArticleDetailData;
  category: KnowledgeCategorySlug;
  locale: Locale;
}) {
  const categoryCopy = knowledgeCategories[category][locale];
  const markdownBody = typeof article.body === "string" ? article.body.trim() : "";
  const blocks: ArticleBlock[] = Array.isArray(article.body)
    ? article.body.filter((item) => {
        const block = item as ArticleBlock;
        return blockText(item).trim() || Boolean(block.props?.url) || block.type === "image" || block.type === "divider" || block.type === "table";
      }) as ArticleBlock[]
    : [];
  const isBlockNote = blocks.some((block) => block.content !== undefined || block.props !== undefined || ['bulletListItem', 'numberedListItem', 'checkListItem', 'codeBlock'].includes(block.type ?? ''));
  return (
    <div className="soft-gradient min-h-screen pb-24">
      <article className="page-shell max-w-5xl pt-10 sm:pt-16">
        <Link
          href={`/${locale}/knowledge/${category}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-brand-blue"
        >
          <ArrowLeft size={16} />{" "}
          {locale === "zh"
            ? `返回${categoryCopy.title}`
            : `Back to ${categoryCopy.title}`}
        </Link>
        <div className="mt-8 overflow-hidden rounded-[2rem] bg-white shadow-xl">
          <div className="relative h-72 sm:h-[28rem]">
            <Image
              src={article.image}
              alt={article.imageAlt}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 960px"
              className="object-cover"
            />
          </div>
          <div className="px-6 py-10 sm:px-14 sm:py-14">
            <p className="section-kicker">{categoryCopy.title}</p>
            <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight text-brand-navy sm:text-5xl">
              {article.title}
            </h1>
            <div className="mt-6 flex flex-wrap gap-5 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2">
                <UserRound size={16} />
                {article.authorName}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 size={16} />
                {article.readingMinutes}{" "}
                {locale === "zh" ? "分钟阅读" : "min read"}
              </span>
            </div>
            <p className="mt-8 border-l-4 border-brand-cyan pl-5 text-lg font-semibold leading-8 text-brand-navy">
              {article.excerpt}
            </p>
            <div className="prose prose-slate mt-10 max-w-none text-base leading-8">
              {markdownBody ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children }) => {
                      const video = href ? getVideoEmbed(href) : null;
                      if (video?.kind === "file") {
                        return (
                          <video
                            className="my-8 w-full rounded-2xl bg-slate-950 shadow-lg"
                            controls
                            playsInline
                            preload="metadata"
                            src={video.src}
                          />
                        );
                      }
                      if (video?.kind === "youtube" || video?.kind === "vimeo") {
                        return (
                          <span className="my-8 block aspect-video overflow-hidden rounded-2xl bg-slate-950 shadow-lg">
                            <iframe
                              className="h-full w-full"
                              src={video.src}
                              title={locale === "zh" ? "文章视频" : "Article video"}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                            />
                          </span>
                        );
                      }
                      return (
                        <a href={href} target="_blank" rel="noreferrer">
                          {children}
                        </a>
                      );
                    },
                  }}
                >
                  {markdownBody}
                </ReactMarkdown>
              ) : blocks.length ? (
                blocks.map((block, index) => isBlockNote
                  ? renderBlockNoteBlock(block as ArticleBlock, index, locale)
                  : renderBlock(block as ArticleBlock, index, locale))
              ) : (
                <p>
                  {locale === "zh"
                    ? "完整文章内容即将发布，欢迎先留下你的学习目标，我们会为你推荐合适的课程。"
                    : "The full article is coming soon. Tell us your learning goal and we will recommend the right course for you."}
                </p>
              )}
            </div>
            <div className="mt-12 rounded-2xl bg-brand-soft p-7 sm:p-9">
              <h2 className="text-2xl font-extrabold text-brand-navy">
                {locale === "zh"
                  ? "想系统提升中文？"
                  : "Ready to make steady progress?"}
              </h2>
              <p className="mt-3 leading-7 text-slate-600">
                {locale === "zh"
                  ? "预约一次免费咨询，我们会根据你的目标推荐合适的学习方案。"
                  : "Book a free consultation and get a learning plan designed around your goals."}
              </p>
              <Link
                href={`/${locale}/#signup`}
                className="brand-gradient mt-6 inline-flex rounded-xl px-6 py-3 font-extrabold text-white"
              >
                {locale === "zh" ? "预约免费咨询" : "Book a free consultation"}
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
