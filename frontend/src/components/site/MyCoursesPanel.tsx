"use client";

import { CalendarClock, CheckCircle2, Clock3, Gift, GraduationCap, History, Loader2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { AccountOverview } from "@/lib/account-data";

const courseOptions = [
  ["private-course", "Private Course", "私教课程"],
  ["group-course", "Group Course", "小组课程"],
  ["learn-and-travel-course", "Learn & Travel Course", "游学课程"],
  ["ib-tutorial", "IB Tutorial", "IB 辅导"],
  ["online-course", "Online Course", "在线课程"],
  ["exclusive-course", "Exclusive Course", "专属课程"],
] as const;

function localDateTimeToUtc(value: string, timeZone: string) {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(asIfUtc));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const viewedAsUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour) % 24, Number(values.minute), Number(values.second));
  return new Date(asIfUtc + (asIfUtc - viewedAsUtc)).toISOString();
}

function dateLabel(value: string, timeZone: string, locale: Locale) {
  try {
    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

const statusCopy = {
  requested: ["待确认", "Pending confirmation", "bg-amber-50 text-amber-700"],
  confirmed: ["已确认", "Confirmed", "bg-blue-50 text-brand-blue"],
  completed: ["已完成", "Completed", "bg-emerald-50 text-emerald-700"],
  cancelled: ["已取消", "Cancelled", "bg-slate-100 text-slate-500"],
} as const;

export function MyCoursesPanel({ locale, overview, currentUserId }: { locale: Locale; overview: AccountOverview | null; currentUserId: number }) {
  const zh = locale === "zh";
  const bookings = overview?.lessonBookings ?? [];
  const credits = overview?.lessonCredits?.credits ?? [];
  const sourceHours = overview?.lessonCredits?.bySource ?? {};
  const [courseSlug, setCourseSlug] = useState(bookings.find((item) => item.course?.slug)?.course?.slug ?? "private-course");
  const [teacherName, setTeacherName] = useState(zh ? "请平台推荐老师" : "Recommend a teacher");
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai");
  const [requestedAt, setRequestedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const availableHours = Number(overview?.lessonCredits?.availableHours ?? 0);
  const reservedHours = Number(overview?.lessonCredits?.reservedHours ?? credits.filter((item) => item.status === "reserved").reduce((sum, item) => sum + item.hours, 0));
  const upcoming = useMemo(() => bookings.filter((item) => ["requested", "confirmed"].includes(item.status)), [bookings]);
  const history = useMemo(() => bookings.filter((item) => ["completed", "cancelled"].includes(item.status)), [bookings]);

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestedAt) return setMessage(zh ? "请选择预约日期和时间。" : "Choose a date and time first.");
    if (availableHours < 1) return setMessage(zh ? "当前没有可用课时，请先获得或购买课时。" : "You need at least one available lesson hour to request a booking.");
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/lesson-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseSlug, teacherName, timezone, requestedStartAt: localDateTimeToUtc(requestedAt, timezone), notes, source: "web" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || payload?.error || (zh ? "预约提交失败。" : "Unable to submit the booking."));
      setMessage(zh ? "预约申请已提交，等待后台确认。" : "Booking request submitted. We will confirm it soon.");
      setRequestedAt("");
      setNotes("");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function cancelBooking(id: number) {
    if (!window.confirm(zh ? "确定取消这次预约吗？" : "Cancel this booking?")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/lesson-bookings/${id}/cancel`, { method: "POST" });
      if (!response.ok) throw new Error(zh ? "取消失败，请稍后重试。" : "Unable to cancel this booking.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  }

  async function completeBooking(id: number) {
    if (!window.confirm(zh ? "确认这节课已经完成吗？系统会扣除 1 课时。" : "Confirm this lesson is complete? One lesson hour will be used.")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/lesson-bookings/${id}/complete`, { method: "POST" });
      if (!response.ok) throw new Error(zh ? "操作失败，请稍后重试。" : "Unable to complete this lesson.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  }

  return (
    <div className="mt-10 space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BalanceCard icon={<Clock3 size={18} />} value={`${availableHours.toFixed(1)} ${zh ? "课时" : "hours"}`} label={zh ? "可用课时" : "Available hours"} tone="blue" />
        <BalanceCard icon={<Gift size={18} />} value={`${Number(sourceHours.referral ?? 0) + Number(sourceHours["daily-challenge"] ?? 0)} ${zh ? "课时" : "hours"}`} label={zh ? "邀请与挑战赠送" : "Referral & challenge"} tone="green" />
        <BalanceCard icon={<GraduationCap size={18} />} value={`${Number(sourceHours.purchase ?? 0)} ${zh ? "课时" : "hours"}`} label={zh ? "购买课时" : "Purchased hours"} tone="orange" />
        <BalanceCard icon={<CalendarClock size={18} />} value={`${reservedHours.toFixed(1)} ${zh ? "课时" : "hours"}`} label={zh ? "预约占用中" : "Reserved for bookings"} tone="slate" />
      </div>

      <div className="rounded-3xl border border-brand-line bg-brand-soft p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-kicker">{zh ? "老师预约" : "Teacher booking"}</p>
            <h2 className="mt-2 text-2xl font-extrabold text-brand-navy">{zh ? "预约你的下一节课" : "Book your next lesson"}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{zh ? "选择课程、时区和希望的日期时间。提交后由 Super Admin 或 Editor 确认；确认时会暂时预留 1 课时，上完课后由老师点击完成并正式扣除。" : "Choose a course, timezone, and preferred time. Super Admin or Editor confirms the request; one hour is reserved at confirmation and consumed when the teacher marks the lesson complete."}</p>
          </div>
          <span className="rounded-full bg-white px-3 py-2 text-xs font-extrabold text-brand-blue">{zh ? "1 节课 = 1 课时" : "1 lesson = 1 hour"}</span>
        </div>
        <form onSubmit={submitBooking} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-brand-navy">{zh ? "目标课程" : "Course"}
            <select value={courseSlug} onChange={(event) => setCourseSlug(event.target.value)} className="rounded-xl border border-brand-line bg-white px-4 py-3 font-normal outline-none focus:border-brand-blue">
              {courseOptions.map(([slug, en, cn]) => <option key={slug} value={slug}>{zh ? cn : en}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-brand-navy">{zh ? "老师" : "Teacher"}
            <input value={teacherName} onChange={(event) => setTeacherName(event.target.value)} placeholder={zh ? "可填写偏好，或让平台推荐" : "Add a preference or let us recommend"} className="rounded-xl border border-brand-line bg-white px-4 py-3 font-normal outline-none focus:border-brand-blue" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-brand-navy">{zh ? "时区" : "Timezone"}
            <select value={timezone} onChange={(event) => setTimezone(event.target.value)} className="rounded-xl border border-brand-line bg-white px-4 py-3 font-normal outline-none focus:border-brand-blue">
              {[timezone, "Asia/Shanghai", "Asia/Tokyo", "Asia/Singapore", "Europe/London", "Europe/Paris", "America/New_York", "America/Los_Angeles", "Australia/Sydney"].filter((value, index, values) => values.indexOf(value) === index).map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-brand-navy">{zh ? "预约日期和时间" : "Preferred date and time"}
            <input type="datetime-local" value={requestedAt} onChange={(event) => setRequestedAt(event.target.value)} className="rounded-xl border border-brand-line bg-white px-4 py-3 font-normal outline-none focus:border-brand-blue" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-brand-navy md:col-span-2">{zh ? "备注" : "Notes"}
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder={zh ? "告诉我们你的学习目标或时间偏好" : "Share your goals or scheduling preferences"} className="rounded-xl border border-brand-line bg-white px-4 py-3 font-normal outline-none focus:border-brand-blue" />
          </label>
          <div className="flex flex-wrap items-center gap-4 md:col-span-2">
            <button type="submit" disabled={busy || availableHours < 1} className="inline-flex items-center gap-2 rounded-xl brand-gradient px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-200 disabled:cursor-not-allowed disabled:opacity-50">
              {busy && <Loader2 size={16} className="animate-spin" />}{zh ? "提交预约申请" : "Submit booking request"}
            </button>
            {availableHours < 1 && <span className="text-xs font-bold text-amber-700">{zh ? "当前没有可用课时" : "No available lesson hours"}</span>}
            {message && <span className="text-sm font-bold text-brand-blue">{message}</span>}
          </div>
        </form>
      </div>

      <BookingList title={zh ? "当前课程" : "Current lessons"} icon={<CalendarClock size={19} />} bookings={upcoming} locale={locale} currentUserId={currentUserId} onCancel={cancelBooking} onComplete={completeBooking} busy={busy} empty={zh ? "还没有待确认或已确认的课程。" : "No pending or confirmed lessons yet."} />
      <BookingList title={zh ? "历史课程" : "Lesson history"} icon={<History size={19} />} bookings={history} locale={locale} currentUserId={currentUserId} onCancel={cancelBooking} onComplete={completeBooking} busy={busy} empty={zh ? "完成或取消的课程会显示在这里。" : "Completed and cancelled lessons will appear here."} />
    </div>
  );
}

function BalanceCard({ icon, value, label, tone }: { icon: React.ReactNode; value: string; label: string; tone: "blue" | "green" | "orange" | "slate" }) {
  const styles = { blue: "bg-blue-50 text-brand-blue", green: "bg-emerald-50 text-emerald-700", orange: "bg-orange-50 text-orange-700", slate: "bg-slate-100 text-slate-600" };
  return <div className="rounded-2xl border border-brand-line bg-white p-4"><span className={`grid size-9 place-items-center rounded-xl ${styles[tone]}`}>{icon}</span><p className="mt-3 text-xl font-extrabold text-brand-navy">{value}</p><p className="mt-1 text-xs font-bold text-slate-500">{label}</p></div>;
}

function BookingList({ title, icon, bookings, locale, currentUserId, onCancel, onComplete, busy, empty }: { title: string; icon: React.ReactNode; bookings: AccountOverview["lessonBookings"]; locale: Locale; currentUserId: number; onCancel: (id: number) => void; onComplete: (id: number) => void; busy: boolean; empty: string }) {
  const zh = locale === "zh";
  return <section><div className="flex items-center gap-2"><span className="text-brand-blue">{icon}</span><h2 className="text-xl font-extrabold text-brand-navy">{title}</h2></div>{bookings.length ? <div className="mt-4 grid gap-4">{bookings.map((booking) => { const copy = statusCopy[booking.status as keyof typeof statusCopy] ?? statusCopy.requested; return <article key={booking.id} className="rounded-2xl border border-brand-line bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-brand-blue">{booking.course?.title || (zh ? "中文课程" : "Chinese course")}</p><h3 className="mt-2 text-lg font-extrabold text-brand-navy">{dateLabel(booking.requestedStartAt, booking.timezone, locale)}</h3><p className="mt-1 text-sm text-slate-500">{booking.timezone} · {booking.teacherName || (zh ? "待安排老师" : "Teacher to be assigned")}</p></div><span className={`rounded-full px-3 py-1 text-xs font-extrabold ${copy[2]}`}>{zh ? copy[0] : copy[1]}</span></div>{booking.notes && <p className="mt-4 rounded-xl bg-brand-soft px-4 py-3 text-sm leading-6 text-slate-600">{booking.notes}</p>}<div className="mt-4 flex flex-wrap gap-4">{["requested", "confirmed"].includes(booking.status) && <button type="button" disabled={busy} onClick={() => onCancel(booking.id)} className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-500 hover:text-red-600 disabled:opacity-50"><XCircle size={15} />{zh ? "取消预约" : "Cancel booking"}</button>}{booking.status === "confirmed" && booking.teacherUserId === currentUserId && <button type="button" disabled={busy} onClick={() => onComplete(booking.id)} className="inline-flex items-center gap-2 text-xs font-extrabold text-emerald-700 hover:text-emerald-800 disabled:opacity-50"><CheckCircle2 size={15} />{zh ? "老师确认已完成" : "Mark lesson complete"}</button>}</div></article>; })}</div> : <p className="mt-4 rounded-2xl border border-dashed border-brand-line bg-brand-soft px-5 py-7 text-sm text-slate-500">{empty}</p>}</section>;
}
