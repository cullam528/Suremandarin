import Image from "next/image";
import Link from "next/link";
import type { GlobalData } from "@/lib/strapi";
import type { Locale } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
const columns = [
  {
    title: { en: "Explore", zh: "探索" },
    links: [
      { path: "", en: "Home", zh: "首页" },
      { path: "/courses", en: "Courses", zh: "课程" },
      { path: "/daily", en: "Daily", zh: "7 天挑战" },
      { path: "/level-test", en: "Level Test", zh: "水平测试" },
      { path: "/pricing", en: "Membership", zh: "会员方案" },
      { path: "/referral", en: "Referral Program", zh: "推荐计划" },
      { path: "/knowledge", en: "Knowledge Center", zh: "知识中心" },
      { path: "/theysay", en: "They Say", zh: "学员评价" },
      { path: "/teachers", en: "Teachers", zh: "教师介绍" },
    ],
  },
  {
    title: { en: "Support", zh: "支持" },
    links: [
      { path: "/faq", en: "Help & FAQ", zh: "帮助与常见问题" },
      { path: "/contact", en: "Contact Us", zh: "联系我们" },
      { path: "/app", en: "Learn on your phone", zh: "手机端学习" },
      { path: "/site-map", en: "Site Map", zh: "网站地图" },
    ],
  },
  {
    title: { en: "Company", zh: "公司" },
    links: [
      { path: "/about", en: "About Us", zh: "关于我们" },
      { path: "/about#training-centers", en: "Training Centers", zh: "培训中心" },
      { path: "/knowledge/news-and-insights", en: "News & Insights", zh: "新闻与见解" },
    ],
  },
] as const;
const socialDefinitions = [
  { key: "xiaohongshu", label: "小红书 / Xiaohongshu", image: "/images/xiaohongshu.webp", href: "https://xhslink.cn/m/5k2RxYiaMts" },
  // LinkedIn is shown only when a valid profile is configured in the CMS.
  { key: "linkedin", label: "LinkedIn", image: "/images/linkedin.webp", href: "" },
  { key: "youtube", label: "YouTube", image: "/images/youtube.webp", href: "https://www.youtube.com/@Suremandarin" },
  { key: "x", label: "X", image: "/images/x.webp", href: "https://x.com/JessSuremanda" },
];
const socialAssetVersion = "20260811";
export function Footer({
  settings,
  locale = "en",
  languageUrls,
}: {
  settings: GlobalData;
  locale?: Locale;
  languageUrls?: Partial<Record<Locale, string>>;
}) {
  const footerColumns = columns.map((column) => ({
    title: column.title[locale],
    links: column.links.map((link) => ({ label: link[locale], href: `/${locale}${link.path}` })),
  }));
  const socialLinks = socialDefinitions.flatMap((social) => {
    const configured = settings.socialLinks.find((item) => item.platform.trim().toLowerCase() === social.key);
    const href = configured?.url.trim() || social.href;
    try {
      const url = new URL(href);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return [];
      if (social.key === "linkedin" && (!["linkedin.com", "www.linkedin.com"].includes(url.hostname) || !/^[/](in|company)[/][a-zA-Z0-9-]+[/]?$/.test(url.pathname))) return [];
      return [{ ...social, href: url.href }];
    } catch {
      return [];
    }
  });
  return (
    <footer id="about" className="sm-site-footer bg-brand-navy text-white">
      <div className="sm-site-footer-grid page-shell grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)_1fr]">
        <section className="sm-footer-brand">
          <div className="sm-footer-brand-row flex items-center gap-3">
            <Image
              src="/images/app.webp"
              alt="SureMandarin app icon"
              width={58}
              height={58}
              className="size-14 object-contain"
            />
            <strong className="text-xl">
              {settings.siteName || "SureMandarin"}
            </strong>
            <div className="sm-footer-socials ml-auto flex items-center gap-3 lg:hidden">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className="transition-opacity hover:opacity-75"
                >
                  <Image
                    src={`${social.image}?v=${socialAssetVersion}`}
                    alt=""
                    width={36}
                    height={36}
                    className="size-9 object-contain"
                  />
                </a>
              ))}
            </div>
          </div>
          <p className="mt-4 max-w-xs text-xs leading-6 text-slate-300">
            {locale === "zh"
              ? "帮助全球学习者自信说中文，深入理解中国文化。"
              : settings.footerDescription}
          </p>
          <div className="mt-5 hidden items-center gap-3 lg:flex">
            {socialLinks.map((social) => (
              <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label} title={social.label} className="transition-opacity hover:opacity-75">
                <Image src={`${social.image}?v=${socialAssetVersion}`} alt="" width={36} height={36} className="size-9 object-contain" />
              </a>
            ))}
          </div>
        </section>
        {footerColumns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="sm-footer-column hidden lg:block">
            <h2 className="mb-4 text-sm font-bold">{column.title}</h2>
            {column.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className="mb-2 block text-xs text-slate-300 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
        {footerColumns.map((column) => (
          <details key={`mobile-${column.title}`} className="sm-footer-accordion lg:hidden">
            <summary>{column.title}<span aria-hidden="true">+</span></summary>
            <div className="sm-footer-accordion-links">
              {column.links.map((link) => (
                <Link key={link.href} href={link.href} prefetch={false}>{link.label}</Link>
              ))}
            </div>
          </details>
        ))}
        <section className="sm-footer-contact">
          <h2 className="mb-4 text-sm font-bold">
            {locale === "zh" ? "联系我们" : "Connect With Us"}
          </h2>
          <div className="sm-footer-qr-grid grid grid-cols-2 gap-3">
            <div className="sm-footer-qr-item text-center">
              <Image
                src="/images/wx.webp"
                alt="SureMandarin WeChat QR code"
                width={112}
                height={112}
                className="mx-auto size-24 rounded-lg bg-white object-contain"
              />
              <p className="mt-2 text-xs font-bold lowercase text-slate-300">wechat</p>
            </div>
            <div className="sm-footer-qr-item text-center">
              <Image
                src="/images/xhs.webp"
                alt="SureMandarin Xiaohongshu QR code"
                width={112}
                height={112}
                className="mx-auto size-24 rounded-lg bg-white object-contain"
              />
              <p className="mt-2 text-xs font-bold lowercase text-slate-300">xiaohongshu</p>
            </div>
          </div>
        </section>
      </div>
      <div className="page-shell flex flex-col gap-3 border-t border-white/10 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <LanguageSwitcher locale={locale} languageUrls={languageUrls} />
        <p>{settings.copyright}</p>
        <p>
          <Link href={`/${locale}/terms`} prefetch={false}>
            {locale === "zh" ? "使用条款" : "Terms of Use"}
          </Link>{" "}
          ·{" "}
          <Link href={`/${locale}/privacy`} prefetch={false}>
            {locale === "zh" ? "隐私政策" : "Privacy Policy"}
          </Link>{" "}
          ·{" "}
          <Link href={`/${locale}/cookies`} prefetch={false}>
            {locale === "zh" ? "Cookie 政策" : "Cookie Policy"}
          </Link>
        </p>
      </div>
    </footer>
  );
}
