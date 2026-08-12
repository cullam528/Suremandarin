import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpenText } from "lucide-react";
import type { ArticleDetailData } from "@/lib/strapi";
import { knowledgeCategories, type KnowledgeCategorySlug } from "@/lib/strapi";
import type { Locale } from "@/lib/i18n";

export function KnowledgeListing({
  articles,
  category,
  locale,
}: {
  articles: ArticleDetailData[];
  category: KnowledgeCategorySlug;
  locale: Locale;
}) {
  const copy = knowledgeCategories[category][locale];
  return (
    <div className="sm-knowledge-listing soft-gradient min-h-screen">
      <section className="sm-knowledge-listing-hero page-shell py-16 text-center sm:py-24">
        <p className="section-kicker">
          {locale === "zh" ? "知识中心" : "Knowledge Center"}
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-brand-navy sm:text-6xl">
          {copy.title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">
          {copy.description}
        </p>
      </section>
      <section className="page-shell pb-24">
        <div className="sm-knowledge-listing-grid grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <article
              key={article.id}
              className="group overflow-hidden rounded-3xl border border-brand-line bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <Link href={`/${locale}/knowledge/${category}/${article.slug}`}>
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={article.image}
                    alt={article.imageAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
              </Link>
              <div className="p-7">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-blue">
                  <BookOpenText size={15} />
                  {copy.title}
                </div>
                <h2 className="mt-4 text-xl font-extrabold leading-tight text-brand-navy">
                  <Link
                    href={`/${locale}/knowledge/${category}/${article.slug}`}
                  >
                    {article.title}
                  </Link>
                </h2>
                <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-500">
                  {article.excerpt}
                </p>
                <Link
                  href={`/${locale}/knowledge/${category}/${article.slug}`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-brand-blue"
                >
                  {locale === "zh" ? "阅读全文" : "Read article"}{" "}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
        {!articles.length && (
          <div className="rounded-3xl border border-brand-line bg-white p-12 text-center text-slate-500">
            {locale === "zh"
              ? "这个栏目暂时还没有文章。"
              : "There are no articles in this category yet."}
          </div>
        )}
      </section>
    </div>
  );
}
