import Image from "next/image";
import type { GlobalData } from "@/lib/strapi";
import type { Locale } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
const columns = [
  {
    title: "Explore",
    links: ["Home", "Courses", "Daily", "Level Test", "Pricing", "Referral Program", "Knowledge Center", "They Say", "Teachers"],
  },
  {
    title: "Support",
    links: ["Help Center", "Study Guide", "FAQ", "Contact Us", "Site Map"],
  },
  {
    title: "Company",
    links: ["About Us", "Careers", "Partners", "Newsroom", "Privacy Policy"],
  },
];
const zhColumns = [
  {
    title: "探索",
    links: ["首页", "课程", "7天挑战", "水平测试", "会员方案", "推荐计划", "知识中心", "学员评价", "教师团队"],
  },
  {
    title: "支持",
    links: ["帮助中心", "学习指南", "常见问题", "联系我们", "网站地图"],
  },
  {
    title: "公司",
    links: ["关于我们", "加入我们", "合作伙伴", "新闻中心", "隐私政策"],
  },
];
const socialLinks = [
  {
    label: "小红书 / Xiaohongshu",
    image: "/images/xiaohongshu.webp",
    href: "https://xhslink.cn/m/5k2RxYiaMts",
  },
  { label: "LinkedIn", image: "/images/linkedin.webp", href: "https://linkedin.com/in/想（jessica-li-889b483b" },
  { label: "YouTube", image: "/images/youtube.webp", href: "https://www.youtube.com/@Suremandarin" },
  { label: "X", image: "/images/x.webp", href: "https://x.com/JessSuremanda" },
];
const socialAssetVersion = "20260811";
export function Footer({
  settings,
  locale = "en",
}: {
  settings: GlobalData;
  locale?: Locale;
}) {
  const footerColumns = locale === "zh" ? zhColumns : columns;
  const footerHref = (link: string) => {
    const routes: Record<string, string> =
      locale === "zh"
        ? {
            首页: `/${locale}#home`,
            课程: `/${locale}/courses`,
            "7天挑战": `/${locale}/daily`,
            水平测试: `/${locale}/level-test`,
            会员方案: `/${locale}/pricing`,
            推荐计划: `/${locale}/referral`,
            知识中心: `/${locale}/knowledge`,
            学员评价: `/${locale}/theysay`,
            教师团队: `/${locale}/teachers`,
            帮助中心: `/${locale}/faq`,
            学习指南: `/${locale}/knowledge`,
            常见问题: `/${locale}/faq`,
            联系我们: `/${locale}/contact`,
            网站地图: `/${locale}`,
            关于我们: `/${locale}/about`,
            加入我们: `/${locale}/about`,
            合作伙伴: `/${locale}/contact`,
            新闻中心: `/${locale}/knowledge/news-and-insights`,
            隐私政策: `/${locale}/privacy`,
          }
        : {
            Home: `/${locale}#home`,
            Courses: `/${locale}/courses`,
            Daily: `/${locale}/daily`,
            "Level Test": `/${locale}/level-test`,
            Pricing: `/${locale}/pricing`,
            "Referral Program": `/${locale}/referral`,
            "Knowledge Center": `/${locale}/knowledge`,
            "They Say": `/${locale}/theysay`,
            Teachers: `/${locale}/teachers`,
            "Help Center": `/${locale}/faq`,
            "Study Guide": `/${locale}/knowledge`,
            FAQ: `/${locale}/faq`,
            "Contact Us": `/${locale}/contact`,
            "Site Map": `/${locale}`,
            "About Us": `/${locale}/about`,
            Careers: `/${locale}/about`,
            Partners: `/${locale}/contact`,
            Newsroom: `/${locale}/knowledge/news-and-insights`,
            "Privacy Policy": `/${locale}/privacy`,
          };
    return routes[link] ?? `/${locale}`;
  };
  return (
    <footer id="about" className="sm-site-footer bg-brand-navy text-white">
      <div className="sm-site-footer-grid page-shell grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)_1fr]">
        <section className="sm-footer-brand">
          <div className="flex items-center gap-3">
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
          </div>
          <p className="mt-4 max-w-xs text-xs leading-6 text-slate-300">
            {locale === "zh"
              ? "帮助全球学习者自信说中文，深入理解中国文化。"
              : settings.footerDescription}
          </p>
          <div className="mt-5 flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
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
        </section>
        {footerColumns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="sm-footer-column hidden lg:block">
            <h2 className="mb-4 text-sm font-bold">{column.title}</h2>
            {column.links.map((link) => (
              <a
                key={link}
                href={footerHref(link)}
                className="mb-2 block text-xs text-slate-300 hover:text-white"
              >
                {link}
              </a>
            ))}
          </nav>
        ))}
        {footerColumns.map((column) => (
          <details key={`mobile-${column.title}`} className="sm-footer-accordion lg:hidden">
            <summary>{column.title}<span aria-hidden="true">+</span></summary>
            <div className="sm-footer-accordion-links">
              {column.links.map((link) => (
                <a key={link} href={footerHref(link)}>{link}</a>
              ))}
            </div>
          </details>
        ))}
        <section className="sm-footer-contact">
          <h2 className="mb-4 text-sm font-bold">
            {locale === "zh" ? "联系我们" : "Connect With Us"}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              {settings.whatsappQrCode ? (
                <Image
                  src={settings.whatsappQrCode}
                  alt="SureMandarin WhatsApp QR code"
                  width={112}
                  height={112}
                  className="mx-auto size-24 rounded-lg bg-white object-contain"
                />
              ) : (
                <div className="mx-auto grid size-24 place-items-center rounded-lg bg-white text-[10px] font-extrabold text-brand-navy">
                  QR CODE
                </div>
              )}
              <p className="mt-2 text-xs font-bold lowercase text-slate-300">whatsapp</p>
            </div>
            <div className="text-center">
              {settings.wechatQrCode ? (
                <Image
                  src={settings.wechatQrCode}
                  alt="SureMandarin WeChat QR code"
                  width={112}
                  height={112}
                  className="mx-auto size-24 rounded-lg bg-white object-contain"
                />
              ) : (
                <div className="mx-auto grid size-24 place-items-center rounded-lg bg-white text-[10px] font-extrabold text-brand-navy">
                  QR CODE
                </div>
              )}
              <p className="mt-2 text-xs font-bold lowercase text-slate-300">wechat</p>
            </div>
          </div>
        </section>
      </div>
      <div className="page-shell flex flex-col gap-3 border-t border-white/10 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <LanguageSwitcher locale={locale} />
        <p>{settings.copyright}</p>
        <p>
          <a href={`/${locale}/terms`}>
            {locale === "zh" ? "使用条款" : "Terms of Use"}
          </a>{" "}
          ·{" "}
          <a href={`/${locale}/privacy`}>
            {locale === "zh" ? "隐私政策" : "Privacy Policy"}
          </a>{" "}
          ·{" "}
          <a href={`/${locale}/cookies`}>
            {locale === "zh" ? "Cookie 政策" : "Cookie Policy"}
          </a>
        </p>
      </div>
    </footer>
  );
}
