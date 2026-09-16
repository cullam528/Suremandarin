import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  Compass,
  GraduationCap,
  Globe2,
  HeartHandshake,
  Mail,
  MapPin,
  MessageCircleHeart,
  Phone,
  ShieldCheck,
  Target,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { getLearningFaqs } from "@/lib/learning-guide";

type MarketingKind =
  | "about"
  | "contact"
  | "teachers"
  | "faq"
  | "knowledge"
  | "app"
  | "inquiry";
const copy = {
  about: {
    en: [
      "About SureMandarin",
      "Chinese learning with confidence, culture, and connection.",
      "We help learners around the world build practical Chinese skills through thoughtful teaching, cultural context, and a learning plan that fits real life.",
    ],
    zh: [
      "关于 SureMandarin",
      "在自信、文化与连接中学好中文。",
      "我们通过专业教学、文化理解和适合真实生活的学习方案，帮助全球学习者建立实用中文能力。",
    ],
  },
  contact: {
    en: [
      "Contact Us",
      "Tell us where you want your Chinese journey to go.",
      "Share your goals and a learning advisor will help you find the right course.",
    ],
    zh: [
      "联系我们",
      "告诉我们，你想把中文学习带到哪里。",
      "留下你的学习目标，学习顾问会帮你找到合适的课程。",
    ],
  },
  teachers: {
    en: [
      "Our Teachers",
      "Expert guidance with a human connection.",
      "Meet the educators who make every lesson clear, practical, encouraging, and connected to the world beyond the classroom.",
    ],
    zh: [
      "教师团队",
      "专业指导，也有温度的连接。",
      "认识我们的中文教师，让每一节课都清晰、实用、有鼓励，也连接课堂之外的真实世界。",
    ],
  },
  faq: {
    en: [
      "Help Center",
      "Answers before your first lesson.",
      "Find clear answers about course formats, levels, scheduling, payments, and learning support.",
    ],
    zh: [
      "帮助中心",
      "在开始第一节课前，先找到答案。",
      "了解课程形式、学习水平、时间安排、付款和学习支持等常见问题。",
    ],
  },
  knowledge: {
    en: [
      "Knowledge Center",
      "Practical ideas for your Chinese journey.",
      "Explore learning strategies, study tips, Chinese culture, and the latest SureMandarin insights.",
    ],
    zh: [
      "知识中心",
      "为中文学习旅程提供实用灵感。",
      "探索学习方法、学习技巧、中国文化和 SureMandarin 最新见解。",
    ],
  },
  app: {
    en: [
      "Learn Everywhere",
      "Your Chinese journey across web, app, and mini program.",
      "Keep your courses, progress, resources, and community close wherever your day takes you.",
    ],
    zh: [
      "随时随地学习",
      "网站、App 和小程序，共同记录你的中文旅程。",
      "无论身处何地，都能方便访问课程、进度、学习资料和学习社区。",
    ],
  },
  inquiry: {
    en: [
      "Thank you",
      "Your consultation request is on its way.",
      "A learning advisor will review your goals and contact you shortly.",
    ],
    zh: [
      "感谢你的咨询",
      "我们已经收到你的咨询申请。",
      "学习顾问会查看你的目标，并尽快与你联系。",
    ],
  },
} as const;
const icons = [BookOpen, Globe2, HeartHandshake, UsersRound];

export function MarketingPage({
  kind,
  locale,
}: {
  kind: MarketingKind;
  locale: Locale;
}) {
  if (kind === "about") return <AboutPageContent locale={locale} />;
  if (kind === "teachers") return <TeachersPageContent locale={locale} />;
  const zh = locale === "zh";
  const [label, title, intro] = copy[kind][locale];
  const cards = zh
        ? ["清晰的学习路径", "灵活的课程安排", "跨平台学习记录", "专业顾问支持"]
        : [
            "A clear learning path",
            "Flexible scheduling",
            "Cross-platform progress",
            "Advisor support",
          ];
  return (
    <section className="sm-marketing-page soft-gradient py-16 sm:py-24">
      <div className="page-shell">
        <div className="max-w-3xl">
          <p className="section-kicker">{label}</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-brand-navy sm:text-6xl">
            {title}
          </h1>
          <p className="mt-5 text-base leading-8 text-slate-600">{intro}</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((item, i) => {
            const Icon = icons[i];
            return (
              <article
                key={item}
                className="rounded-2xl border border-brand-line bg-white p-7 shadow-sm"
              >
                <Icon className="text-brand-blue" size={28} />
                <h2 className="mt-5 font-extrabold text-brand-navy">{item}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {zh
                    ? "从清晰目标出发，获得可持续的学习支持。"
                    : "Start with a clear goal and get support that keeps learning moving."}
                </p>
              </article>
            );
          })}
        </div>
        <div className="mt-12 grid gap-8 rounded-3xl bg-white p-8 shadow-xl sm:p-12 lg:grid-cols-[1fr_.8fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-extrabold text-brand-navy">
              {kind === "contact" || kind === "inquiry"
                ? zh
                  ? "下一步，从一次交流开始"
                  : "The next step starts with a conversation"
                : kind === "app"
                  ? zh
                    ? "把学习带在身边"
                    : "Keep learning close"
                  : zh
                    ? "为你的目标找到合适的下一步"
                    : "Find the right next step for your goals"}
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              {zh
                ? "了解课程、学习资料和会员权益，开始更有方向的中文学习。"
                : "Explore courses, resources, and membership benefits for a more focused Chinese learning journey."}
            </p>
            <Link
              href={
                kind === "contact"
                  ? "#consultation"
                  : `/${locale}/courses/private-course`
              }
              className="brand-gradient mt-7 inline-flex items-center gap-2 rounded-xl px-6 py-3 font-extrabold text-white"
            >
              {zh ? "开始了解" : "Get started"}
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="grid gap-3">
            {["Personalized", "Practical", "Connected"].map((item) => (
              <p
                key={item}
                className="flex items-center gap-3 rounded-xl bg-brand-soft p-4 text-sm font-bold text-brand-navy"
              >
                <CheckCircle2 className="text-brand-green" size={19} />
                {zh
                  ? (
                      {
                        Personalized: "个性化",
                        Practical: "重实践",
                        Connected: "有连接",
                      } as Record<string, string>
                    )[item]
                  : item}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CenterDetail({
  icon: Icon,
  label,
  value,
  compact = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`grid shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-blue ${compact ? "size-9" : "size-10"}`}
      >
        <Icon size={compact ? 16 : 18} />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-bold text-slate-500">{label}</dt>
        <dd
          className={`${compact ? "mt-0.5 text-xs" : "mt-1 text-sm"} break-words font-bold leading-5 text-brand-navy`}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}

function AboutPageContent({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const trustPillars = zh
    ? [
        [
          ShieldCheck,
          "教师有标准",
          "每位老师都经过筛选、培训与持续反馈，认真对待每一节课。",
        ],
        [
          Target,
          "目标看得见",
          "从首次评估到阶段复盘，把学习目标拆成清晰、可感知的进步。",
        ],
        [
          MessageCircleHeart,
          "沟通有温度",
          "我们及时回应问题，也尊重每位学习者的节奏、背景和生活安排。",
        ],
        [
          Compass,
          "文化有深度",
          "语言不只是词汇和语法，更是理解中国、连接真实世界的入口。",
        ],
      ]
    : [
        [
          ShieldCheck,
          "Teachers with standards",
          "Every teacher is selected, trained, and supported to take every lesson seriously.",
        ],
        [
          Target,
          "Progress you can see",
          "We turn a first assessment into clear goals, checkpoints, and meaningful progress.",
        ],
        [
          MessageCircleHeart,
          "Care in every conversation",
          "We respond thoughtfully and respect each learner’s pace, background, and life.",
        ],
        [
          Compass,
          "Culture with depth",
          "Language is more than vocabulary and grammar. It is a way into China and the wider world.",
        ],
      ];
  const teachingSteps = zh
    ? [
        ["01", "先了解", "了解你的水平、目标、时间和真实使用场景。"],
        ["02", "再设计", "由教师和学习顾问共同制定适合你的学习路径。"],
        ["03", "认真教学", "每节课都有明确目标、充分准备和及时反馈。"],
        ["04", "持续陪伴", "定期复盘学习进度，需要时及时调整方案。"],
      ]
    : [
        [
          "01",
          "Understand first",
          "We learn your level, goals, schedule, and real-life context.",
        ],
        [
          "02",
          "Design with care",
          "Teachers and advisors shape a learning path around you.",
        ],
        [
          "03",
          "Teach responsibly",
          "Every lesson has a clear goal, thoughtful preparation, and feedback.",
        ],
        [
          "04",
          "Stay alongside you",
          "We review progress regularly and adjust when your life changes.",
        ],
      ];
  const trainingCenters = zh
    ? [
        {
          city: "北京",
          province: "北京市",
          type: "总部",
          address: "详细地址待确认",
          contact: "总部服务团队",
          phone: "待公布",
          email: "info@suremandarin.com",
        },
        {
          city: "沈阳",
          province: "辽宁省",
          type: "授权培训中心",
          address: "详细地址待确认",
          contact: "沈阳中心课程顾问",
          phone: "待公布",
          email: "info@suremandarin.com",
        },
        {
          city: "南京",
          province: "江苏省",
          type: "授权培训中心",
          address: "详细地址待确认",
          contact: "南京中心课程顾问",
          phone: "待公布",
          email: "info@suremandarin.com",
        },
        {
          city: "重庆",
          province: "重庆市",
          type: "授权培训中心",
          address: "详细地址待确认",
          contact: "重庆中心课程顾问",
          phone: "待公布",
          email: "info@suremandarin.com",
        },
      ]
    : [
        {
          city: "Beijing",
          province: "Beijing Municipality",
          type: "Headquarters",
          address: "Full address to be confirmed",
          contact: "Headquarters service team",
          phone: "To be announced",
          email: "info@suremandarin.com",
        },
        {
          city: "Shenyang",
          province: "Liaoning Province",
          type: "Authorized Training Center",
          address: "Full address to be confirmed",
          contact: "Shenyang course advisor",
          phone: "To be announced",
          email: "info@suremandarin.com",
        },
        {
          city: "Nanjing",
          province: "Jiangsu Province",
          type: "Authorized Training Center",
          address: "Full address to be confirmed",
          contact: "Nanjing course advisor",
          phone: "To be announced",
          email: "info@suremandarin.com",
        },
        {
          city: "Chongqing",
          province: "Chongqing Municipality",
          type: "Authorized Training Center",
          address: "Full address to be confirmed",
          contact: "Chongqing course advisor",
          phone: "To be announced",
          email: "info@suremandarin.com",
        },
      ];
  return (
    <>
      <section className="relative overflow-hidden bg-brand-navy text-white">
        <div className="absolute -right-24 -top-32 size-[30rem] rounded-full bg-brand-blue/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 size-72 rounded-full bg-brand-cyan/10 blur-3xl" />
        <div className="page-shell relative grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:gap-20 lg:py-28">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[.18em] text-cyan-100">
              {zh
                ? "关于 SureMandarin · 我们是谁"
                : "About SureMandarin · Who we are"}
            </p>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.06] tracking-[-.055em] sm:text-6xl lg:text-7xl">
              {zh ? (
                <>
                  认真教好中文，
                  <span className="block text-cyan-200">
                    也认真对待每一位学习者。
                  </span>
                </>
              ) : (
                <>
                  Chinese learning,
                  <span className="block text-cyan-200">
                    built around people.
                  </span>
                </>
              )}
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-slate-200 sm:text-lg">
              {zh
                ? "SureMandarin 是一个以教师责任和学习者成长为核心的中文教育机构。我们把专业课程、真实文化和持续支持，变成一段值得信任的学习关系。"
                : "SureMandarin is a Chinese education studio built around teacher responsibility and learner growth. We bring together rigorous courses, real cultural context, and steady support to create a learning relationship you can trust."}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#founder"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-extrabold text-brand-navy transition hover:bg-cyan-50"
              >
                {zh ? "认识创始人" : "Meet our founder"}
                <ArrowRight size={17} />
              </a>
            </div>
            <div className="mt-12 grid max-w-xl grid-cols-3 gap-5 border-t border-white/15 pt-6">
              {[
                ["01", zh ? "以学习者为中心" : "Learner-led"],
                ["02", zh ? "教师负责到底" : "Teacher-owned"],
                ["03", zh ? "连接真实世界" : "World-connected"],
              ].map(([number, label]) => (
                <div key={number}>
                  <p className="text-2xl font-extrabold text-cyan-200">
                    {number}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-300">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
            <div className="absolute -inset-3 rounded-[2rem] border border-white/15" />
            <div className="relative overflow-hidden rounded-[1.75rem] bg-white/10 p-2 shadow-2xl shadow-black/20 backdrop-blur-sm">
              <Image
                src="/course-detail/images/leader-Jessica.webp"
                alt={
                  zh
                    ? "SureMandarin 创始人在课堂工作"
                    : "SureMandarin founder working with learners"
                }
                width={1280}
                height={1280}
                priority
                className="aspect-[4/5] w-full rounded-[1.35rem] object-cover object-top"
              />
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/20 bg-brand-navy/80 p-4 backdrop-blur-md">
                <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-cyan-200">
                  {zh ? "创始人寄语" : "A note from our founder"}
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-white">
                  {zh
                    ? "好的老师，不只教会你答案，也会认真陪你走完过程。"
                    : "A good teacher does more than give answers. They stay with you through the process."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="founder" className="bg-white py-20 sm:py-28">
        <div className="page-shell grid gap-12 lg:grid-cols-[.86fr_1.14fr] lg:items-center lg:gap-20">
          <div className="relative order-2 lg:order-1">
            <div className="absolute -left-5 -top-5 h-28 w-28 rounded-3xl bg-brand-soft" />
            <div className="relative overflow-hidden rounded-[2rem] border border-brand-line bg-slate-100 p-2 shadow-xl shadow-blue-900/10">
              <Image
                src="/course-detail/images/leader-Jessica.webp"
                alt={
                  zh
                    ? "创始人在教学空间工作"
                    : "Founder working in the teaching studio"
                }
                width={1280}
                height={1280}
                className="aspect-[4/5] w-full rounded-[1.5rem] object-cover object-top"
              />
            </div>
            <div className="absolute -bottom-6 -right-4 rounded-2xl border border-brand-line bg-white p-4 shadow-xl sm:-right-8">
              <p className="text-xs font-extrabold uppercase tracking-[.15em] text-brand-blue">
                {zh ? "创始人：Jessica" : "Founder: Jessica"}
              </p>
              <p className="mt-1 text-sm font-bold text-brand-navy">
                {zh
                  ? "2007 年起教授中文 / 学员来自 25+ 个国家"
                  : "Mandarin teacher since 2007 / over 25 country students"}
              </p>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-[-.04em] text-brand-navy sm:text-5xl">
              {zh
                ? "高级感，不是距离感，而是对细节的认真。"
                : "A premium learning experience is built on care, not distance."}
            </h2>
            <p className="mt-6 text-base leading-8 text-slate-600">
              {zh
                ? "从课程目标、教师备课到课后反馈，SureMandarin 关注学习体验中的每一个细节。我们相信，真正让人愿意长期学习的，不是漂亮的承诺，而是一次次被认真回应的经历。"
                : "From the learning goal and teacher preparation to the follow-up after class, SureMandarin cares about the details that shape the experience. We believe long-term motivation comes not from polished promises, but from being taken seriously again and again."}
            </p>
            <blockquote className="mt-8 border-l-4 border-brand-cyan bg-brand-soft px-6 py-5 text-lg font-bold leading-8 text-brand-navy">
              “
              {zh
                ? "我希望每一位学习者都能感受到：有人真正了解他的目标，也愿意为他的进步负责。"
                : "I want every learner to feel that someone understands their goal and is willing to be responsible for their progress."}
              ”
            </blockquote>
            <div className="mt-8 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-brand-navy text-cyan-200">
                <GraduationCap size={21} />
              </span>
              <div>
                <p className="font-extrabold text-brand-navy">
                  {zh
                    ? "SureMandarin 创始团队"
                    : "The SureMandarin founding team"}
                </p>
                <p className="text-sm text-slate-500">
                  {zh
                    ? "中文教育 · 课程设计 · 学习者支持"
                    : "Chinese education · curriculum · learner support"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="approach" className="bg-slate-50 py-20 sm:py-28">
        <div className="page-shell">
          <div className="max-w-2xl">
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-.04em] text-brand-navy sm:text-5xl">
              {zh
                ? "专业、负责、有温度。"
                : "Professional, responsible, and human."}
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              {zh
                ? "我们把机构的标准，落实到每一位老师、每一次沟通和每一节课程中。"
                : "We turn our standards into the way every teacher prepares, every advisor communicates, and every lesson is delivered."}
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trustPillars.map(([Icon, title, text]) => (
              <article
                key={String(title)}
                className="rounded-2xl border border-brand-line bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-blue">
                  <Icon size={23} />
                </span>
                <h3 className="mt-5 font-extrabold text-brand-navy">
                  {String(title)}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {String(text)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-navy py-20 text-white sm:py-28">
        <div className="page-shell grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-start lg:gap-20">
          <div>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-[-.04em] sm:text-5xl">
              {zh
                ? "责任，是课程的一部分。"
                : "Responsibility is part of the curriculum."}
            </h2>
            <p className="mt-6 leading-8 text-slate-300">
              {zh
                ? "学习的结果来自长期积累。我们用一套清晰的流程，让学习者知道下一步是什么，也让每位老师知道应该如何支持。"
                : "Progress is built over time. A clear process helps learners see what comes next and gives every teacher a practical way to support them."}
            </p>
            <Link
              href={`/${locale}/courses`}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-extrabold text-brand-navy transition hover:bg-cyan-50"
            >
              {zh ? "查看课程体系" : "Explore our courses"}
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="grid gap-3">
            {teachingSteps.map(([number, title, text]) => (
              <div
                key={number}
                className="grid gap-4 rounded-2xl border border-white/15 bg-white/5 p-5 sm:grid-cols-[64px_180px_1fr] sm:items-center"
              >
                <span className="text-2xl font-extrabold text-cyan-200">
                  {number}
                </span>
                <h3 className="font-extrabold">{title}</h3>
                <p className="text-sm leading-6 text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="training-centers" className="soft-gradient py-20 sm:py-28">
        <div className="page-shell">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-extrabold tracking-[-.04em] text-brand-navy sm:text-5xl">
              {zh ? "各地授权培训中心一览" : "Authorized training centers"}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
              {zh
                ? "从北京总部到各地授权中心，为学习者提供课程咨询、学习支持与本地服务。"
                : "Our Beijing headquarters and authorized centers provide local course advice, learning support, and learner services."}
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-[1.05fr_.95fr] lg:items-stretch">
            <article className="relative overflow-hidden rounded-[2rem] border border-brand-line bg-white p-7 shadow-xl shadow-blue-900/[.07] sm:p-10">
              <div className="absolute -right-24 -top-24 size-64 rounded-full bg-brand-cyan/10 blur-3xl" />
              <div className="relative">
                <div className="flex items-start justify-between gap-5">
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-navy text-cyan-200">
                    <Building2 size={27} />
                  </span>
                  <span className="rounded-full bg-brand-soft px-4 py-2 text-xs font-extrabold text-brand-blue">
                    {trainingCenters[0].type}
                  </span>
                </div>
                <p className="mt-10 text-sm font-bold text-brand-blue">
                  {trainingCenters[0].province}
                </p>
                <h3 className="mt-2 text-4xl font-extrabold tracking-[-.04em] text-brand-navy sm:text-5xl">
                  {trainingCenters[0].city}
                </h3>
                <address className="mt-8 not-italic">
                  <dl className="grid gap-5">
                    <CenterDetail
                      icon={MapPin}
                      label={zh ? "地址" : "Address"}
                      value={trainingCenters[0].address}
                    />
                    <CenterDetail
                      icon={UsersRound}
                      label={zh ? "联系人" : "Contact"}
                      value={trainingCenters[0].contact}
                    />
                    <CenterDetail
                      icon={Phone}
                      label={zh ? "电话" : "Telephone"}
                      value={trainingCenters[0].phone}
                    />
                    <CenterDetail
                      icon={Mail}
                      label={zh ? "邮箱" : "Email"}
                      value={trainingCenters[0].email}
                    />
                  </dl>
                </address>
              </div>
            </article>

            <div className="grid gap-5">
              {trainingCenters.slice(1).map((center) => (
                <article
                  key={center.city}
                  className="rounded-2xl border border-brand-line bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-brand-blue">
                        {center.province}
                      </p>
                      <h3 className="mt-1 text-2xl font-extrabold text-brand-navy">
                        {center.city}
                      </h3>
                    </div>
                    <span className="self-start rounded-full bg-brand-soft px-3 py-1.5 text-[11px] font-extrabold text-brand-blue">
                      {center.type}
                    </span>
                  </div>
                  <address className="mt-5 not-italic">
                    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                      <CenterDetail
                        icon={MapPin}
                        label={zh ? "地址" : "Address"}
                        value={center.address}
                        compact
                      />
                      <CenterDetail
                        icon={UsersRound}
                        label={zh ? "联系人" : "Contact"}
                        value={center.contact}
                        compact
                      />
                      <CenterDetail
                        icon={Phone}
                        label={zh ? "电话" : "Telephone"}
                        value={center.phone}
                        compact
                      />
                      <CenterDetail
                        icon={Mail}
                        label={zh ? "邮箱" : "Email"}
                        value={center.email}
                        compact
                      />
                    </dl>
                  </address>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-6 rounded-[2rem] bg-brand-navy p-7 text-white shadow-xl shadow-blue-900/15 sm:p-9 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-cyan-200">
                <Globe2 size={24} />
              </span>
              <div>
                <h3 className="text-lg font-extrabold leading-7 sm:text-2xl">
                  {zh ? "让优质中文教育走向更多城市" : "Bring quality Chinese education to more cities"}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  {zh
                    ? "欢迎教育机构、教师团队及本地合作伙伴联系我们，共同建设值得信任的中文学习服务。"
                    : "We welcome schools, teaching teams, and local partners who want to build trusted Chinese learning services together."}
                </p>
              </div>
            </div>
            <Link
              href={`/${locale}/contact#consultation`}
              className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-4 text-center text-sm font-extrabold text-brand-navy shadow-lg transition hover:bg-cyan-50 active:translate-y-px sm:whitespace-nowrap"
            >
              {zh
                ? "全世界更多地区诚邀与您合作！"
                : "Partner with SureMandarin worldwide"}
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="soft-gradient py-20 sm:py-24">
        <div className="page-shell flex flex-col gap-6 rounded-[2rem] border border-brand-line bg-white/80 p-8 shadow-xl shadow-blue-900/5 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-.04em] text-brand-navy sm:text-4xl">
              {zh
                ? "你的中文目标，值得一套认真方案。"
                : "Your Chinese goals deserve a thoughtful plan."}
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              {zh
                ? "告诉我们你的目标、时间和学习经历，学习顾问会帮助你找到合适的起点。"
                : "Tell us your goals, schedule, and learning experience. A learning advisor will help you find the right starting point."}
            </p>
          </div>
          <Link
            href={`/${locale}/contact`}
            className="brand-gradient inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-extrabold text-white shadow-lg shadow-blue-200"
          >
            {zh ? "联系学习顾问" : "Talk to an advisor"}
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </>
  );
}

function TeachersPageContent({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const matchingSteps = zh
    ? [
        ["说说你的目标", "你是刚开始学中文，还是希望在工作、旅行或考试中用得更好？在咨询表单里告诉我们。"],
        ["确认水平与时间", "填写当前中文水平、目标课程、时区和方便上课的时间。还不确定水平，可以先做免费测试。"],
        ["一起确认课程安排", "学习顾问会根据你的需求沟通老师与课程安排。确认老师、时间和课程细节后，再决定如何开始。"],
      ]
    : [
        ["Tell us your goal", "Starting from zero, speaking at work, preparing for an exam or travelling in China? Share what you want to do in Chinese."],
        ["Share your level and schedule", "Include your current level, preferred course, time zone and available times. If you are unsure of your level, start with the free assessment."],
        ["Agree on the lesson plan", "An advisor will discuss a teacher and course arrangement with you. Confirm the teacher, schedule and lesson details before deciding how to begin."],
      ];

  return (
    <>
      <section className="soft-gradient py-16 sm:py-24">
        <div className="page-shell grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:gap-16">
          <div>
            <p className="section-kicker">{zh ? "中文老师 · 学习匹配" : "Your teacher. Your learning path."}</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-[-.045em] text-brand-navy sm:text-6xl">
              {zh ? "认识 Jessica，从你的中文目标开始。" : "Meet Jessica. Start with your Chinese goals."}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              {zh
                ? "SureMandarin 创始人 Jessica 自 2007 年起教授中文，学员来自 25 个以上国家。选择课程时，不只看课程名称，也要看你想用中文完成什么，以及什么样的学习节奏适合你。"
                : "Jessica, the founder of SureMandarin, has taught Mandarin since 2007 to learners from over 25 countries. Choosing a course starts with what you want to do in Chinese and the learning pace that fits your life."}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={`/${locale}/contact#consultation`}
                className="brand-gradient inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-200"
              >
                {zh ? "咨询老师与课程安排" : "Discuss a teacher and course"}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link
                href={`/${locale}/about#founder`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-brand-blue bg-white px-6 py-3.5 text-sm font-extrabold text-brand-blue"
              >
                {zh ? "了解 SureMandarin" : "About SureMandarin"}
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-6 text-slate-500">
              {zh
                ? "老师与时间安排以顾问确认结果为准；提交咨询不代表已预约成功。"
                : "Teacher availability and lesson times are confirmed by an advisor. Sending an enquiry does not reserve a lesson."}
            </p>
          </div>
          <figure className="mx-auto w-full max-w-lg overflow-hidden rounded-[2rem] border border-brand-line bg-white shadow-xl shadow-blue-900/10">
            <Image
              src="/course-detail/images/teacher-jessica.webp"
              alt={zh ? "SureMandarin 创始人、中文老师 Jessica" : "Jessica, founder and Mandarin teacher at SureMandarin"}
              width={1280}
              height={1280}
              sizes="(min-width: 1024px) 42vw, (min-width: 640px) 512px, 100vw"
              priority
              className="aspect-[4/5] w-full object-cover object-top"
            />
            <figcaption className="border-t border-brand-line p-6 sm:p-7">
              <p className="text-xs font-extrabold uppercase tracking-[.15em] text-brand-blue">{zh ? "创始人 · 中文老师" : "Founder · Mandarin teacher"}</p>
              <h2 className="mt-2 text-2xl font-extrabold text-brand-navy">Jessica</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{zh ? "2007 年起教授中文 · 学员来自 25+ 个国家" : "Teaching Mandarin since 2007 · Learners from 25+ countries"}</p>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-24" aria-labelledby="teacher-matching">
        <div className="page-shell">
          <div className="max-w-3xl">
            <p className="section-kicker">{zh ? "如何开始" : "How to get started"}</p>
            <h2 id="teacher-matching" className="mt-4 text-3xl font-extrabold tracking-[-.035em] text-brand-navy sm:text-4xl">
              {zh ? "先了解你，再讨论合适的老师。" : "First, we get to know you."}
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              {zh ? "无需在一排不熟悉的老师中盲选。用一次咨询，把学习目标、时间与课程需求说清楚。" : "You do not need to choose from unfamiliar profiles. Use a consultation to discuss your goals, schedule and course preferences."}
            </p>
          </div>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {matchingSteps.map(([title, text], index) => (
              <li key={title} className="rounded-2xl border border-brand-line bg-brand-soft/50 p-6 sm:p-8">
                <span className="text-sm font-extrabold text-brand-blue">{zh ? `第 ${index + 1} 步` : `Step ${index + 1}`}</span>
                <h3 className="mt-4 text-xl font-extrabold text-brand-navy">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-col gap-4 border-t border-brand-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-600">{zh ? "还不确定从哪里开始？先了解课程，或测一测当前水平。" : "Not sure where to begin? Explore the courses or check your current level."}</p>
            <div className="flex shrink-0 flex-wrap gap-5">
              <Link href={`/${locale}/courses`} className="inline-flex items-center gap-2 text-sm font-bold text-brand-blue hover:underline">{zh ? "查看课程" : "Explore courses"}<ArrowRight size={15} aria-hidden="true" /></Link>
              <Link href={`/${locale}/level-test`} className="inline-flex items-center gap-2 text-sm font-bold text-brand-blue hover:underline">{zh ? "免费水平测试" : "Free level assessment"}<ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function FaqContent({ locale }: { locale: Locale }) {
  const items = getLearningFaqs(locale);
  const zh = locale === "zh";
  return (
    <section id="faq" className="soft-gradient py-16 sm:py-24">
      <div className="page-shell max-w-4xl">
        <p className="section-kicker">{zh ? "常见问题" : "FAQ"}</p>
        <h1 className="mt-4 text-4xl font-extrabold text-brand-navy sm:text-6xl">
          {zh
            ? "开始学习前，先了解这些"
            : "Before you begin, find your answers"}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
          {zh
            ? "从零基础、选课和跨时区上课，到费用、预约与会员权益，了解开始中文学习前需要确认的事情。"
            : "Answers about starting from zero, choosing a course, learning across time zones, lesson costs, bookings and membership."}
        </p>
        <div className="mt-10 grid gap-4">
          {items.map(({ id, question, answer, link }) => (
            <article id={id} key={id} className="scroll-mt-28 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-extrabold text-brand-navy">{question}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{answer}</p>
              <Link href={link.path} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-blue hover:underline">
                {link.label}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
        <Link href={`/${locale}/contact`} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">
          {zh ? "还有问题？预约免费学习咨询" : "More questions? Book a free learning consultation"}
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
