import Image from "next/image";
import {
  ArrowRight,
  BookOpenText,
  Landmark,
  Lightbulb,
  Newspaper,
} from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import type { ArticleData } from "@/lib/strapi";
import type { Locale } from "@/lib/i18n";

const icons = [Lightbulb, Landmark, BookOpenText, Newspaper];
export function KnowledgeCenter({
  articles,
  title,
  locale = "en",
}: {
  articles: ArticleData[];
  title: string;
  locale?: Locale;
}) {
  return (
    <section id="knowledge" className="sm-home-knowledge bg-slate-50 py-24">
      <div className="page-shell">
        <SectionHeading
          kicker=""
          title={title}
          text={
            locale === "zh"
              ? "实用学习方法、文化见解与最新资讯。"
              : "Practical tips, cultural insights, and the latest updates."
          }
        />
        <div className="sm-home-knowledge-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {articles.map((article, index) => {
            const Icon = icons[index % icons.length];
            return (
              <article
                key={article.id}
                className="sm-home-knowledge-card overflow-hidden rounded-2xl border border-brand-line bg-white"
              >
                <div className="relative h-48">
                  <Image
                    src={article.image}
                    alt={article.imageAlt}
                    fill
                    sizes="(max-width: 640px) 100vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <Icon className="mb-4 text-brand-blue" />
                  <h3 className="font-bold text-brand-navy">{article.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {article.excerpt}
                  </p>
                  <a
                    href={`/${locale}/knowledge/${article.slug}`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-blue"
                  >
                    {locale === "zh" ? "阅读全文" : "Read more"}{" "}
                    <ArrowRight size={15} />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
