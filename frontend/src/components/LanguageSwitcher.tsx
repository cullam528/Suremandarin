"use client";
import { Globe2 } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
export function LanguageSwitcher({ locale, languageUrls }: { locale: Locale; languageUrls?: Partial<Record<Locale, string>> }) {
  const pathname = usePathname();
  function target(next: Locale) {
    if (languageUrls?.[next]) return languageUrls[next]!;
    const segments = pathname.split("/");
    if (segments[1] === "en" || segments[1] === "zh") segments[1] = next;
    else segments.splice(1, 0, next);
    return segments.join("/") || `/${next}`;
  }
  function remember(next: Locale) {
    document.cookie = `suremandarin_locale=${next};path=/;max-age=31536000;samesite=lax`;
  }
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-navy">
      <Globe2 size={15} />
      <Link
        href={target("en")}
        hrefLang="en"
        lang="en"
        onClick={() => remember("en")}
        className={locale === "en" ? "text-brand-blue" : ""}
      >
        EN
      </Link>
      <span>/</span>
      <Link
        href={target("zh")}
        hrefLang="zh-Hans"
        lang="zh-CN"
        onClick={() => remember("zh")}
        className={locale === "zh" ? "text-brand-blue" : ""}
      >
        中文
      </Link>
    </div>
  );
}
