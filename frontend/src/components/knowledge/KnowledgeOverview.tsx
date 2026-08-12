import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BookOpenText,
  Landmark,
  Lightbulb,
  Newspaper,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";
import {
  knowledgeCategories,
  type ArticleDetailData,
  type KnowledgeCategorySlug,
} from "@/lib/strapi";

const categoryIcons = {
  "news-and-insights": Newspaper,
  "study-tips": Lightbulb,
  "chinese-culture": Landmark,
  "learning-strategies": BookOpenText,
} satisfies Record<KnowledgeCategorySlug, typeof Newspaper>;

type KnowledgeSection = {
  category: KnowledgeCategorySlug;
  articles: ArticleDetailData[];
};

function formatDate(value: string, locale: Locale) {
  if (!value) return locale === "zh" ? "最新内容" : "Latest content";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function KnowledgeOverview({
  sections,
  title,
  locale,
}: {
  sections: KnowledgeSection[];
  title: string;
  locale: Locale;
}) {
  return (
    <div className="sm-knowledge-overview soft-gradient min-h-screen">
      <section className="page-shell px-0 pb-12 pt-16 text-center sm:pb-16 sm:pt-24">
        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-brand-navy sm:text-6xl">
          {title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">
          {locale === "zh"
            ? "按主题浏览最新文章，找到适合自己的中文学习方法与文化内容。"
            : "Browse the latest articles by topic and find practical ways to learn Chinese with confidence."}
        </p>
      </section>

      <section className="page-shell space-y-5 pb-24 sm:space-y-7">
        {sections.map(({ category, articles }) => {
          const copy = knowledgeCategories[category][locale];
          const Icon = categoryIcons[category];
          const latestArticles = articles.slice(0, 8);

          return (
            <section
              key={category}
              className="grid gap-6 rounded-[2rem] border border-brand-line bg-white p-5 shadow-sm sm:p-7 lg:grid-cols-[minmax(220px,0.34fr)_minmax(0,1fr)] lg:gap-10 lg:p-8"
            >
              <aside className="flex flex-col justify-between border-b border-brand-line pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
                <div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue">
                    <Icon size={23} strokeWidth={2.2} />
                  </span>
                  <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
                    {copy.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    {copy.description}
                  </p>
                </div>
                <Link
                  href={`/${locale}/knowledge/${category}`}
                  className="mt-6 inline-flex w-fit items-center gap-2 text-sm font-extrabold text-brand-blue transition hover:gap-3"
                >
                  {locale === "zh" ? "查看全部文章" : "View all articles"}
                  <ArrowRight size={16} />
                </Link>
              </aside>

              <div className="min-w-0">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">
                    {locale === "zh" ? "最新 8 条内容" : "Latest 8 articles"}
                  </p>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                    {latestArticles.length}/8
                  </span>
                </div>

                {latestArticles.length ? (
                  <ol className="grid gap-3 md:grid-cols-2">
                    {latestArticles.map((article, index) => (
                      <li key={article.id}>
                        <Link
                          href={`/${locale}/knowledge/${category}/${article.slug}`}
                          className="group flex h-full min-h-[136px] gap-3 rounded-2xl border border-brand-line bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-md"
                        >
                          <span className="relative block h-16 w-20 shrink-0 overflow-hidden rounded-xl sm:h-20 sm:w-28">
                            <Image
                              src={article.image}
                              alt={article.imageAlt}
                              fill
                              sizes="112px"
                              className="object-cover transition duration-500 group-hover:scale-105"
                              unoptimized={article.image.startsWith("http")}
                            />
                          </span>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-extrabold text-brand-blue shadow-sm">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-semibold text-slate-400">
                              {formatDate(article.publishDate, locale)}
                            </span>
                            <span className="mt-2 block line-clamp-2 text-base font-extrabold leading-6 text-brand-navy group-hover:text-brand-blue">
                              {article.title}
                            </span>
                            <span className="mt-2 block line-clamp-2 text-xs leading-5 text-slate-500">
                              {article.excerpt}
                            </span>
                          </span>
                          <ArrowRight
                            size={16}
                            className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-blue"
                          />
                        </Link>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="rounded-2xl border border-dashed border-brand-line bg-slate-50 p-8 text-center text-sm leading-6 text-slate-500">
                    {locale === "zh"
                      ? "这个栏目暂时还没有文章。"
                      : "There are no articles in this category yet."}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </section>
    </div>
  );
}
