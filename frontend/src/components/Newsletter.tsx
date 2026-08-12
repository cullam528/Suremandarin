import { ArrowRight, Mail } from "lucide-react";
import type { Locale } from "@/lib/i18n";
export function Newsletter({
  title,
  description,
  locale = "en",
}: {
  title: string;
  description: string;
  locale?: Locale;
}) {
  return (
    <section className="sm-newsletter page-shell footer-gradient flex flex-col gap-6 rounded-t-2xl px-8 py-8 text-white md:flex-row md:items-center md:justify-between md:px-16">
      <div className="flex items-center gap-4">
        <Mail size={38} />
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-white/85">{description}</p>
        </div>
      </div>
      <form action={`/${locale}/courses/online-course`} method="get" className="relative z-10 flex w-full max-w-lg rounded-xl bg-white p-1.5 md:mr-20">
        <input type="hidden" name="leadSource" value="footer-newsletter" />
        <input type="hidden" name="campaign" value="footer-newsletter" />
        <label className="flex-1">
          <span className="sr-only">Email</span>
          <input
            type="email"
            required
            name="email"
            placeholder={
              locale === "zh" ? "请输入电子邮箱" : "Enter your email"
            }
            className="h-11 w-full bg-transparent px-4 text-sm text-brand-navy outline-none"
          />
        </label>
        <button type="submit" className="flex items-center gap-2 rounded-lg bg-brand-soft px-5 text-sm font-bold text-brand-navy">
          {locale === "zh" ? "订阅" : "Subscribe"} <ArrowRight size={15} />
        </button>
      </form>
    </section>
  );
}
