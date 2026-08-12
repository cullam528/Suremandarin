"use client";
import { Globe2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  function change(next: Locale) {
    const segments = pathname.split("/");
    if (segments[1] === "en" || segments[1] === "zh") segments[1] = next;
    else segments.splice(1, 0, next);
    document.cookie = `suremandarin_locale=${next};path=/;max-age=31536000;samesite=lax`;
    router.push(segments.join("/") || `/${next}`);
    router.refresh();
  }
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-navy">
      <Globe2 size={15} />
      <button
        onClick={() => change("en")}
        className={locale === "en" ? "text-brand-blue" : ""}
      >
        EN
      </button>
      <span>/</span>
      <button
        onClick={() => change("zh")}
        className={locale === "zh" ? "text-brand-blue" : ""}
      >
        中文
      </button>
    </div>
  );
}
