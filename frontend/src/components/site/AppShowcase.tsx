import Link from "next/link";
import { Apple, ArrowRight, ExternalLink, Globe2, Share2, Smartphone } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { getHomepageData, type GlobalData } from "@/lib/strapi";

function validSocialUrl(value?: string) {
  if (!value || !/^https?:\/\/\S+$/i.test(value.trim())) return undefined;
  try {
    const url = new URL(value.trim());
    return url.hostname ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export async function AppShowcase({
  locale,
  settings,
  headingLevel = 1,
}: {
  locale: Locale;
  settings?: GlobalData;
  headingLevel?: 1 | 2;
}) {
  const zh = locale === "zh";
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const Subheading = headingLevel === 1 ? "h2" : "h3";
  const global = settings ?? (await getHomepageData(locale)).global;
  const configured = new Map(
    global.socialLinks.map((item) => [item.platform.trim().toLowerCase(), validSocialUrl(item.url)]),
  );
  const socials = [
    { key: "facebook", label: "Facebook", Icon: Share2, href: configured.get("facebook") },
    { key: "tiktok", label: "TikTok", Icon: Smartphone, href: configured.get("tiktok") },
    { key: "x", label: "X", Icon: Globe2, href: configured.get("x") || configured.get("twitter") || "https://x.com/JessSuremanda" },
    { key: "linkedin", label: "LinkedIn", Icon: Share2, href: configured.get("linkedin") },
    { key: "youtube", label: "YouTube", Icon: Share2, href: configured.get("youtube") || "https://www.youtube.com/@Suremandarin" },
    { key: "xiaohongshu", label: zh ? "小红书" : "Xiaohongshu", Icon: Share2, href: configured.get("xiaohongshu") || configured.get("xhs") || configured.get("小红书") || "https://xhslink.cn/m/5k2RxYiaMts" },
  ].filter((social) => social.href);
  return (
    <section className="sm-app-showcase soft-gradient py-16 sm:py-24">
      <div className="page-shell">
        <div className="max-w-3xl">
          <p className="section-kicker">
            {zh ? "App 与小程序" : "App & mini program"}
          </p>
          <Heading className="mt-4 text-4xl font-extrabold tracking-tight text-brand-navy sm:text-6xl">
            {zh ? "把中文学习带在身边" : "Take your Chinese journey everywhere"}
          </Heading>
          <p className="mt-5 text-base leading-8 text-slate-600">
            {zh
              ? "现在即可在浏览器中体验 SureMandarin Daily 七天中文口语挑战，也可将网页版添加到手机主屏幕。iOS、Android App 和微信小程序尚未上线。"
              : "Start the SureMandarin Daily seven-day Chinese speaking challenge in your browser, or add the web app to your phone’s home screen. Native iOS and Android apps and the WeChat mini program are not available yet."}
          </p>
          <Link href={`/${locale}/daily`} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">
            {zh ? "开始七天中文口语挑战" : "Start the seven-day speaking challenge"}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <DownloadCard locale={locale} kind="ios" headingLevel={headingLevel === 1 ? 2 : 3} />
          <DownloadCard locale={locale} kind="android" headingLevel={headingLevel === 1 ? 2 : 3} />
          <div className="rounded-3xl bg-brand-navy p-7 text-white shadow-xl">
            <Globe2 className="text-brand-cyan" size={30} aria-hidden="true" />
            <Subheading className="mt-6 text-2xl font-extrabold">
              {zh ? "微信小程序" : "WeChat mini program"}
            </Subheading>
            <p className="mt-3 text-sm leading-7 text-blue-100">
              {zh
                ? "敬请期待。上线前，你可以使用 Daily 网页版练习中文。"
                : "Coming soon. Until it is available, practise Chinese with Daily on the web."}
            </p>
            <span className="mt-6 inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-bold text-white">
              {zh ? "尚未上线" : "Not yet available"}
            </span>
          </div>
        </div>
        <div className="mt-14 rounded-3xl bg-white p-8 shadow-xl sm:p-10">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="section-kicker">
                {zh ? "关注我们" : "Follow along"}
              </p>
              <Subheading className="mt-3 text-3xl font-extrabold text-brand-navy">
                {zh ? "在社交平台获取最新动态" : "Stay connected on social"}
              </Subheading>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-500">
              {zh
                ? "课程活动、中文学习技巧和社区故事会同步发布。"
                : "Get course updates, learning tips, community stories, and cultural moments."}
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {socials.map(({ key, label, Icon, href }) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-2xl border border-brand-line p-5 text-brand-navy transition hover:border-brand-blue hover:bg-blue-50"
                >
                  <span className="flex items-center gap-3 font-extrabold">
                    <Icon size={21} aria-hidden="true" />
                    {label}
                  </span>
                  <ExternalLink size={16} aria-hidden="true" />
                </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DownloadCard({
  locale,
  kind,
  headingLevel,
}: {
  locale: Locale;
  kind: "ios" | "android";
  headingLevel: 2 | 3;
}) {
  const zh = locale === "zh";
  const ios = kind === "ios";
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="rounded-3xl border border-brand-line bg-white p-7 shadow-sm">
      <div className="flex items-center gap-3 text-brand-blue">
        {ios ? <Apple size={27} aria-hidden="true" /> : <Smartphone size={27} aria-hidden="true" />}
        <span className="text-sm font-extrabold uppercase tracking-widest">
          {ios ? "iOS" : "Android"}
        </span>
      </div>
      <Heading className="mt-6 text-2xl font-extrabold text-brand-navy">
        {ios ? "iOS App" : "Android App"}
      </Heading>
      <p className="mt-3 text-sm leading-7 text-slate-500">
        {zh
          ? "敬请期待。现在可以先在手机浏览器打开 Daily，开始口语练习。"
          : "Coming soon. For now, open Daily in your phone’s browser to start speaking practice."}
      </p>
      <span className="mt-6 inline-flex rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
        {zh ? "尚未上线" : "Not yet available"}
      </span>
    </article>
  );
}
