import Link from "next/link";
import { BookOpen, CreditCard, FileText, Gauge, Gift, UserRound } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { AccountOverview } from "@/lib/account-data";
import { ReferralCenter } from "@/components/site/ReferralCenter";
import { MyCoursesPanel } from "@/components/site/MyCoursesPanel";

type Section =
  | "profile"
  | "subscriptions"
  | "orders"
  | "progress"
  | "my-courses"
  | "referrals";
const labels = {
  profile: ["Profile", "个人资料"],
  subscriptions: ["Membership", "会员订阅"],
  orders: ["Orders", "订单记录"],
  progress: ["Progress", "学习进度"],
  "my-courses": ["My Courses", "我的课程"],
  referrals: ["My Referrals", "我的推荐"],
} as const;

export function AccountSection({
  locale,
  section,
  user,
  overview,
}: {
  locale: Locale;
  section: Section;
  user: {
    fullName?: string;
    username?: string;
    email?: string;
    membershipLevel?: string;
    membershipStatus?: string;
    referralCode?: string;
  };
  overview: AccountOverview | null;
}) {
  const zh = locale === "zh";
  const nav = Object.entries(labels) as Array<
    [Section, readonly [string, string]]
  >;
  const title = labels[section][zh ? 1 : 0];
  return (
    <section className="sm-account-section soft-gradient min-h-[calc(100vh-5rem)] py-12 sm:py-16">
      <div className="page-shell grid gap-6 lg:grid-cols-[250px_1fr]">
        <aside className="rounded-3xl bg-brand-navy p-5 text-white">
          <p className="px-3 text-center text-lg font-extrabold tracking-wide text-brand-cyan sm:text-xl">
            {zh ? "我的账户" : "My account"}
          </p>
          <div className="mt-5 grid gap-2">
            {nav.map(([key, copy]) => (
              <Link
                key={key}
                href={`/${locale}/account/${key}`}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold ${key === section ? "bg-brand-blue" : "text-blue-100 hover:bg-white/10"}`}
              >
                <NavIcon section={key} />
                {zh ? copy[1] : copy[0]}
              </Link>
            ))}
          </div>
        </aside>
        <div className="rounded-3xl bg-white p-7 shadow-xl sm:p-10">
          <h1 className="mt-3 text-4xl font-extrabold text-brand-navy">
            {title}
          </h1>
          <p className="mt-3 text-slate-500">
            {zh
              ? "管理你的账户信息、会员权益和学习进度。"
              : "Manage your profile, membership benefits, and learning progress."}
          </p>
          {section === "profile" && <Profile user={user} locale={locale} overview={overview} />}
          {section === "subscriptions" &&
            (overview?.subscriptions.length ? (
              <div className="mt-10 grid gap-4">
                {overview.subscriptions.map((item) => (
                  <article
                    key={item.subscriptionNumber}
                    className="rounded-2xl border border-brand-line p-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-xl font-extrabold text-brand-navy">
                        {item.plan?.name || item.plan?.code || "Membership"}
                      </h2>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold uppercase text-emerald-700">
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      {zh ? "订阅编号" : "Subscription"}:{" "}
                      {item.subscriptionNumber}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {item.autoRenew
                        ? zh
                          ? "自动续费已开启"
                          : "Auto-renew is on"
                        : zh
                          ? "自动续费已关闭"
                          : "Auto-renew is off"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<CreditCard />}
                title={zh ? "当前会员订阅" : "Current membership"}
                text={
                  zh
                    ? "你可以在会员方案页选择 VIP 或 SVIP。"
                    : "Choose VIP or SVIP from the membership plans page."
                }
                href={`/${locale}/pricing`}
                link={zh ? "查看会员方案" : "View membership plans"}
              />
            ))}
          {section === "orders" &&
            (overview?.orders.length ? (
              <div className="mt-10 overflow-x-auto rounded-2xl border border-brand-line">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-brand-soft text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4">{zh ? "订单" : "Order"}</th>
                      <th className="px-5 py-4">{zh ? "产品" : "Product"}</th>
                      <th className="px-5 py-4">{zh ? "金额" : "Amount"}</th>
                      <th className="px-5 py-4">{zh ? "状态" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.orders.map((item) => (
                      <tr
                        key={item.orderNumber}
                        className="border-t border-brand-line"
                      >
                        <td className="px-5 py-4 font-bold text-brand-navy">
                          {item.orderNumber}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {item.productName}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {item.currency} {item.paidAmount ?? "—"}
                        </td>
                        <td className="px-5 py-4 font-bold text-brand-blue">
                          {item.orderStatus}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={<FileText />}
                title={zh ? "还没有订单" : "No orders yet"}
                text={
                  zh
                    ? "完成课程报名或会员付款后，订单会显示在这里。"
                    : "Course and membership purchases will appear here after checkout."
                }
                href={`/${locale}/pricing`}
                link={zh ? "浏览会员方案" : "Browse plans"}
              />
            ))}
          {section === "progress" &&
            (overview?.progress.length ? (
              <div className="mt-10 grid gap-4">
                {overview.progress.map((item, index) => (
                  <article
                    key={`${item.course?.slug || "course"}-${index}`}
                    className="rounded-2xl border border-brand-line p-6"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h2 className="font-extrabold text-brand-navy">
                        {item.course?.title || (zh ? "课程" : "Course")}
                      </h2>
                      <span className="text-sm font-extrabold text-brand-blue">
                        {item.progressPercent}%
                      </span>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-blue-50">
                      <div
                        className="h-2 rounded-full bg-brand-blue"
                        style={{
                          width: `${Math.min(100, Math.max(0, item.progressPercent))}%`,
                        }}
                      />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      {item.completed
                        ? zh
                          ? "已完成"
                          : "Completed"
                        : item.lesson?.title ||
                          (zh ? "继续学习" : "Continue learning")}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Gauge />}
                title={zh ? "学习进度" : "Learning progress"}
                text={
                  zh
                    ? "开始课程后，你的学习进度会在这里持续更新。"
                    : "Your progress will appear here once you begin a course."
                }
                href={`/${locale}/#courses`}
                link={zh ? "选择课程" : "Choose a course"}
              />
            ))}
          {section === "my-courses" && <MyCoursesPanel locale={locale} overview={overview} currentUserId={Number((user as { id?: number }).id ?? 0)} />}
          {section === "referrals" && (
            <ReferralCenter
              locale={locale}
              referralCode={user.referralCode || `SM-${(user.username || user.email || "LEARNER").replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase()}`}
              referrerName={user.fullName || user.username || (locale === "zh" ? "SureMandarin 学员" : "A SureMandarin learner")}
              overview={overview}
            />
          )}
          </div>
        </div>
    </section>
  );
}
function NavIcon({ section }: { section: Section }) {
  const Icon =
    section === "profile"
      ? UserRound
      : section === "subscriptions"
        ? CreditCard
        : section === "orders"
          ? FileText
          : section === "progress"
            ? Gauge
          : section === "referrals"
            ? Gift
            : BookOpen;
  return <Icon size={17} />;
}
function Profile({
  user,
  locale,
  overview,
}: {
  user: {
    fullName?: string;
    username?: string;
    email?: string;
    membershipLevel?: string;
    membershipStatus?: string;
  };
  locale: Locale;
  overview: AccountOverview | null;
}) {
  const zh = locale === "zh";
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      <Info
        label={zh ? "姓名" : "Name"}
        value={user.fullName || user.username || "—"}
      />
      <Info label={zh ? "邮箱" : "Email"} value={user.email || "—"} />
      <Info
        label={zh ? "会员等级" : "Membership"}
        value={(user.membershipLevel || "registered").toUpperCase()}
      />
      <Info
        label={zh ? "状态" : "Status"}
        value={user.membershipStatus || (zh ? "正常" : "Active")}
      />
      <div className="rounded-2xl border border-brand-line bg-brand-soft p-5 sm:col-span-2">
        <p className="text-xs font-bold uppercase text-brand-blue">{zh ? "试听课时" : "Trial lesson credits"}</p>
        <p className="mt-2 text-2xl font-extrabold text-brand-navy">
          {Number(overview?.lessonCredits?.availableHours ?? 0).toFixed(1)} {zh ? "课时可用" : "hours available"}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {zh ? "完成 SureMandarin 7 天中文口语挑战后，系统会自动发放 1 节试听课时。" : "Complete the SureMandarin 7-Day Speaking Challenge to receive one free trial lesson."}
        </p>
      </div>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-brand-line p-5">
      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-2 font-extrabold text-brand-navy">{value}</p>
    </div>
  );
}
function EmptyState({
  icon,
  title,
  text,
  href,
  link,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  href: string;
  link: string;
}) {
  return (
    <div className="mt-10 rounded-2xl border border-brand-line bg-brand-soft p-8">
      <span className="grid size-12 place-items-center rounded-xl bg-white text-brand-blue">
        {icon}
      </span>
      <h2 className="mt-5 text-2xl font-extrabold text-brand-navy">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">{text}</p>
      <Link
        href={href}
        className="mt-6 inline-flex rounded-xl bg-brand-navy px-5 py-3 text-sm font-extrabold text-white"
      >
        {link}
      </Link>
    </div>
  );
}
