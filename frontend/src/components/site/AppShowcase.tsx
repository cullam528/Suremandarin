import { Apple, ExternalLink, Globe2, Share2, Smartphone } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { getHomepageData, type GlobalData } from "@/lib/strapi";

export async function AppShowcase({
  locale,
  settings,
}: {
  locale: Locale;
  settings?: GlobalData;
}) {
  const zh = locale === "zh";
  const global = settings ?? (await getHomepageData(locale)).global;
  const configured = new Map(
    global.socialLinks.map((item) => [item.platform.toLowerCase(), item.url]),
  );
  const socials = [
    ["facebook", "Facebook", Share2],
    ["tiktok", "TikTok", Smartphone],
    ["x", "X", Globe2],
    ["linkedin", "LinkedIn", Share2],
  ] as const;
  return (
    <section className="sm-app-showcase soft-gradient py-16 sm:py-24">
      <div className="page-shell">
        <div className="max-w-3xl">
          <p className="section-kicker">
            {zh ? "App 与小程序" : "App & mini program"}
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-brand-navy sm:text-6xl">
            {zh ? "把中文学习带在身边" : "Take your Chinese journey everywhere"}
          </h1>
          <p className="mt-5 text-base leading-8 text-slate-600">
            {zh
              ? "使用 iOS、Android App 和小程序，随时访问课程、学习进度、资料与社区。"
              : "Use the iOS and Android apps or mini program to keep your courses, progress, resources, and community close."}
          </p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <DownloadCard locale={locale} kind="ios" />
          <DownloadCard locale={locale} kind="android" />
          <div className="rounded-3xl bg-brand-navy p-7 text-white shadow-xl">
            <Globe2 className="text-brand-cyan" size={30} />
            <h2 className="mt-6 text-2xl font-extrabold">
              {zh ? "微信小程序" : "WeChat mini program"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-blue-100">
              {zh
                ? "无需安装，打开微信即可开始学习。"
                : "Start learning inside WeChat without installing another app."}
            </p>
            <div className="mt-6 grid size-36 place-items-center rounded-2xl bg-white text-center text-xs font-extrabold text-brand-navy">
              {zh ? "小程序二维码" : "Mini program QR"}
            </div>
          </div>
        </div>
        <div className="mt-14 rounded-3xl bg-white p-8 shadow-xl sm:p-10">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="section-kicker">
                {zh ? "关注我们" : "Follow along"}
              </p>
              <h2 className="mt-3 text-3xl font-extrabold text-brand-navy">
                {zh ? "在社交平台获取最新动态" : "Stay connected on social"}
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-500">
              {zh
                ? "课程活动、中文学习技巧和社区故事会同步发布。"
                : "Get course updates, learning tips, community stories, and cultural moments."}
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {socials.map(([key, label, Icon]) => {
              const href = configured.get(key);
              return (
                <a
                  key={key}
                  href={href || "#"}
                  target={href ? "_blank" : undefined}
                  rel={href ? "noreferrer" : undefined}
                  className={`flex items-center justify-between rounded-2xl border p-5 transition ${href ? "border-brand-line text-brand-navy hover:border-brand-blue hover:bg-blue-50" : "cursor-not-allowed border-dashed border-slate-200 text-slate-400"}`}
                  aria-disabled={!href}
                >
                  <span className="flex items-center gap-3 font-extrabold">
                    <Icon size={21} />
                    {label}
                  </span>
                  {href ? (
                    <ExternalLink size={16} />
                  ) : (
                    <span className="text-[10px]">
                      {zh ? "待配置" : "Add link"}
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          {zh
            ? "二维码和社交链接可在 Strapi 全局设置中替换。"
            : "QR images and social links can be replaced from Strapi Global Settings."}
        </p>
      </div>
    </section>
  );
}

function DownloadCard({
  locale,
  kind,
}: {
  locale: Locale;
  kind: "ios" | "android";
}) {
  const zh = locale === "zh";
  const ios = kind === "ios";
  return (
    <article className="rounded-3xl border border-brand-line bg-white p-7 shadow-sm">
      <div className="flex items-center gap-3 text-brand-blue">
        {ios ? <Apple size={27} /> : <Smartphone size={27} />}
        <span className="text-sm font-extrabold uppercase tracking-widest">
          {ios ? "iOS" : "Android"}
        </span>
      </div>
      <h2 className="mt-6 text-2xl font-extrabold text-brand-navy">
        {ios
          ? zh
            ? "下载 iOS App"
            : "Download for iOS"
          : zh
            ? "下载 Android App"
            : "Download for Android"}
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-500">
        {zh
          ? "扫码下载并同步你的学习账户。"
          : "Scan to download and keep your learning account in sync."}
      </p>
      <div
        className="mt-6 grid size-40 place-items-center rounded-2xl border-8 border-white bg-slate-100 bg-[length:16px_16px] shadow-inner"
        style={{
          backgroundImage:
            "linear-gradient(45deg,#0a1d3d 25%,transparent 25%,transparent 75%,#0a1d3d 75%),linear-gradient(45deg,#0a1d3d 25%,transparent 25%,transparent 75%,#0a1d3d 75%)",
          backgroundPosition: "0 0,8px 8px",
        }}
        aria-label={`${ios ? "iOS" : "Android"} QR code placeholder`}
      >
        <span className="rounded bg-white px-2 py-1 text-[10px] font-extrabold text-brand-navy">
          QR CODE
        </span>
      </div>
      <p className="mt-4 text-xs text-slate-400">
        {zh
          ? "App 上线后替换为真实下载二维码"
          : "Replace with the live store QR after launch"}
      </p>
    </article>
  );
}
