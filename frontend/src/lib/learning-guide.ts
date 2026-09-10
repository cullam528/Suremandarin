import type { Locale } from "@/lib/i18n";

type LocalizedText = Record<Locale, string>;

type CourseComparison = {
  slug: string;
  name: LocalizedText;
  audience: LocalizedText;
  focus: LocalizedText;
};

const courseComparisons: CourseComparison[] = [
  {
    slug: "private-course",
    name: { en: "Private course", zh: "一对一私教课程" },
    audience: {
      en: "Learners who want individual attention and their own pace.",
      zh: "希望获得单独指导、按个人节奏学习的学员。",
    },
    focus: {
      en: "One-to-one lessons shaped around your level, goals and interests.",
      zh: "围绕个人水平、目标和兴趣安排一对一课程。",
    },
  },
  {
    slug: "group-course",
    name: { en: "Group course", zh: "小组课程" },
    audience: {
      en: "Learners who enjoy practising with classmates.",
      zh: "喜欢和同学交流、一起练习的学员。",
    },
    focus: {
      en: "Teacher-led discussion, pair practice and a shared learning schedule.",
      zh: "通过教师引导的讨论、同伴练习和共同的学习安排提升表达。",
    },
  },
  {
    slug: "learn-and-travel-course",
    name: { en: "Learn & Travel course", zh: "游学课程" },
    audience: {
      en: "Travellers who want to use Mandarin while exploring China.",
      zh: "希望在中国旅行时学习和使用中文的学员。",
    },
    focus: {
      en: "Practical Mandarin alongside cultural activities; confirm dates and itinerary before booking.",
      zh: "将实用中文与文化体验结合；报名时确认日期和具体行程。",
    },
  },
  {
    slug: "ib-tutorial",
    name: { en: "IB Tutorial", zh: "IB 中文辅导" },
    audience: {
      en: "Students seeking support with their IB Chinese studies.",
      zh: "希望针对 IB 中文学习获得辅导的学生。",
    },
    focus: {
      en: "Language practice, task feedback and assessment preparation based on your course requirements.",
      zh: "根据所学课程要求，安排语言练习、任务反馈和评估准备。",
    },
  },
  {
    slug: "online-course",
    name: { en: "Online course", zh: "在线课程" },
    audience: {
      en: "Learners who want live lessons without travelling to a classroom.",
      zh: "希望在所在地参加真人教师直播课的学员。",
    },
    focus: {
      en: "Remote teacher-led learning; discuss the lesson format and your time zone during consultation.",
      zh: "远程教师指导；咨询时确认授课形式、时区和可上课时间。",
    },
  },
  {
    slug: "exclusive-course",
    name: { en: "Exclusive course", zh: "专属定制课程" },
    audience: {
      en: "Teams, schools, families or learners with a specific brief.",
      zh: "企业团队、学校、家庭及有特殊学习需求的学员。",
    },
    focus: {
      en: "A tailored programme built around agreed learning goals, participants and delivery needs.",
      zh: "根据学习目标、参与人员和授课需求协商定制方案。",
    },
  },
];

export function getCourseComparisons(locale: Locale) {
  return courseComparisons.map((course) => ({
    slug: course.slug,
    name: course.name[locale],
    audience: course.audience[locale],
    focus: course.focus[locale],
  }));
}

export type LearningFaq = {
  id: string;
  question: string;
  answer: string;
  link: { path: string; label: string };
};

type LocalizedFaq = {
  id: string;
  question: LocalizedText;
  answer: LocalizedText;
  link: { path: string; label: LocalizedText };
};

// The visible FAQ and its structured data must use the same questions and answers.
const learningFaqs: LocalizedFaq[] = [
  {
    id: "choose-a-course",
    question: { en: "Which Chinese course should I choose?", zh: "我应该选择哪种中文课程？" },
    answer: {
      en: "Choose private lessons for individual attention, a group course for practice with classmates, or an online course when learning remotely is your priority. Learn & Travel combines language with cultural experiences in China; IB Tutorial supports IB Chinese studies; Exclusive courses address a specific team or personal brief. Compare your goals, current level and availability before choosing.",
      zh: "希望获得单独指导，可以考虑一对一私教；喜欢和同学练习，可以考虑小组课程；需要远程学习，可以考虑在线课程。游学课程结合中文与在华文化体验，IB 中文辅导面向 IB 学习需求，专属定制课程适合团队或个人的特定目标。选择时应综合考虑学习目标、当前水平和可用时间。",
    },
    link: { path: "/courses#course-guide", label: { en: "Compare the six courses", zh: "对比六类课程" } },
  },
  {
    id: "complete-beginners",
    question: { en: "Can I learn with SureMandarin if I am a complete beginner?", zh: "完全没有中文基础可以学习吗？" },
    answer: {
      en: "Yes. Tell us that you are starting from zero when requesting a consultation. A beginner learning plan can start with Pinyin, tones and useful everyday phrases. If you have studied some Chinese but are unsure of your level, try the free level test and discuss the result with an advisor; it is a starting point, not an official language qualification.",
      zh: "可以。预约咨询时选择零基础即可。初学者的学习计划可以从拼音、声调和实用日常表达开始。如果学过一些中文但不确定自己的水平，可以先做免费水平测试，再与顾问讨论结果；测试用于了解学习起点，不代表官方语言能力认证。",
    },
    link: { path: "/level-test", label: { en: "Try the free Chinese level test", zh: "进行免费中文水平测试" } },
  },
  {
    id: "private-and-online",
    question: { en: "What is the difference between private and online Chinese lessons?", zh: "一对一私教和在线中文课程有什么区别？" },
    answer: {
      en: "Private describes who attends: one learner working directly with a teacher. Online describes where the lesson happens: remotely. These are not opposite formats—a private lesson can also be online. Tell your advisor whether individual attention, learning with others or avoiding travel matters most, so the format can be confirmed for your course.",
      zh: "“一对一”描述的是授课人数，即一名学员直接跟随老师学习；“在线”描述的是授课方式，即远程上课。两者并不冲突，一对一课程也可以在线进行。咨询时说明你更重视单独指导、同伴互动还是远程便利，由顾问确认适合的课程形式。",
    },
    link: { path: "/courses/online-course", label: { en: "Explore online lessons", zh: "了解在线课程" } },
  },
  {
    id: "time-zones",
    question: { en: "Can I take Chinese lessons from another country or time zone?", zh: "在其他国家或时区可以上中文课吗？" },
    answer: {
      en: "Online learning allows you to attend remotely. In the consultation form, enter your time zone and preferred date and time. Your requested slot is not a confirmed booking: an advisor will check teacher availability and confirm the arrangement with you. Include your city when a seasonal clock change could affect the time.",
      zh: "可以通过在线课程远程学习。在咨询表单中填写所在时区、希望预约的日期和时间。提交的时间是预约意向，不代表已经确认；顾问会核实教师安排后与你确认。如果所在地实行夏令时，建议同时说明城市，避免时间换算误差。",
    },
    link: { path: "/contact", label: { en: "Discuss your schedule", zh: "咨询上课时间" } },
  },
  {
    id: "lesson-frequency",
    question: { en: "How often should I study Chinese, and when will I see progress?", zh: "每周应该学多久？多久能看到进步？" },
    answer: {
      en: "The right schedule depends on your starting level, target and practice outside lessons. Share the time you can realistically set aside and a specific goal, such as ordering food or preparing an oral presentation. An advisor can help plan lessons and review points. There is no single timetable that guarantees fluency for every learner.",
      zh: "合适的频率取决于学习起点、目标以及课外练习情况。先说明每周实际可投入的时间，并提出具体目标，例如独立点餐或准备口头展示，再由顾问协助安排课程和阶段复习。每个人的学习进度不同，不存在适用于所有人的固定流利时间表。",
    },
    link: { path: "/knowledge/learning-strategies", label: { en: "Read Chinese learning strategies", zh: "阅读中文学习方法" } },
  },
  {
    id: "ib-chinese",
    question: { en: "What information should I provide for IB Chinese tutoring?", zh: "咨询 IB 中文辅导时，需要提供哪些信息？" },
    answer: {
      en: "Share the exact IB Chinese course you take, your level, assessment dates and the skills or tasks you need help with. This lets the tutor discuss relevant language practice, feedback and assessment preparation. Confirm that your specific syllabus and support needs can be covered before enrolling.",
      zh: "请说明正在学习的 IB 中文课程名称、级别、评估日期，以及需要帮助的技能或任务。老师据此讨论适合的语言练习、反馈和评估准备。报名前应确认你的具体课程大纲和辅导需求是否能够覆盖。",
    },
    link: { path: "/courses/ib-tutorial", label: { en: "View IB Chinese tutoring", zh: "查看 IB 中文辅导" } },
  },
  {
    id: "learn-and-travel",
    question: { en: "How does a Learn & Travel Chinese course work?", zh: "游学课程怎样结合中文学习和旅行？" },
    answer: {
      en: "The course combines practical Mandarin learning with cultural experiences in China. Before booking, discuss your destination, travel dates, Chinese level and interests, and confirm the itinerary and what the quoted programme includes. Language goals can focus on useful situations such as transport, shopping and ordering meals.",
      zh: "游学课程将实用中文学习与在中国的文化体验结合。报名前，请说明目的地、旅行日期、中文水平和兴趣，并确认具体行程以及报价包含的项目。语言目标可以围绕乘车、购物、点餐等真实场景展开。",
    },
    link: { path: "/courses/learn-and-travel-course", label: { en: "Explore Learn & Travel", zh: "了解游学课程" } },
  },
  {
    id: "course-prices",
    question: { en: "How much do Chinese lessons cost? Is the consultation free?", zh: "中文课程如何收费？学习咨询免费吗？" },
    answer: {
      en: "The Chinese learning consultation is free and does not require you to enrol. Ask for a course-specific quote based on the lesson format, frequency and learning plan. Confirm lesson duration, total hours, what is included and the cancellation terms before paying. Membership benefits and course tuition should be confirmed separately.",
      zh: "中文学习咨询免费，也不要求你必须报名。课程费用请根据授课形式、频率和学习方案获取具体报价。付款前应确认每节课时长、总课时、包含的服务及取消规则。会员权益和课程学费需要分别确认。",
    },
    link: { path: "/contact", label: { en: "Request a free learning consultation", zh: "预约免费学习咨询" } },
  },
  {
    id: "change-a-lesson",
    question: { en: "Can I change or cancel a lesson?", zh: "可以更改或取消上课时间吗？" },
    answer: {
      en: "Contact your learning advisor in advance. Changes depend on teacher availability and the terms confirmed for your course or booking. Before enrolling, ask about the notice period, cancellations and how missed lessons affect your remaining lesson hours.",
      zh: "请提前联系学习顾问。能否调整取决于教师安排及所报名课程或预约约定的规则。报名前应了解提前通知时间、取消规定，以及缺课如何影响剩余课时。",
    },
    link: { path: "/terms", label: { en: "Read the booking and cancellation terms", zh: "阅读预约与取消条款" } },
  },
  {
    id: "membership-and-courses",
    question: { en: "Are membership and course enrolment the same thing?", zh: "会员和课程报名是同一件事吗？" },
    answer: {
      en: "No. Membership provides the content and service benefits described for that membership. Teacher-led course enrolment and available lesson hours follow the course agreement and your account records. Confirm whether a particular course or service is included before making a payment.",
      zh: "不是。会员提供相应等级说明中的内容和服务权益；真人教师课程报名及可用课时，以课程约定和个人账户记录为准。付款前请确认某项课程或服务是否包含在所选权益内。",
    },
    link: { path: "/pricing", label: { en: "View membership information", zh: "查看会员说明" } },
  },
  {
    id: "free-practice",
    question: { en: "Can I practise Chinese before booking a course?", zh: "报名前可以先练习中文吗？" },
    answer: {
      en: "Yes. You can try the free Chinese level test, read the Knowledge Center and explore the seven-day Daily speaking challenge. These are ways to practise and identify questions to discuss with a teacher; they do not replace a personalised lesson plan or a formal language assessment.",
      zh: "可以。你可以先尝试免费中文水平测试、阅读知识中心内容，或体验 Daily 七天中文口语挑战。这些内容可以帮助练习并发现需要向老师请教的问题，但不能替代个性化课程方案或正式语言能力评估。",
    },
    link: { path: "/daily", label: { en: "Try the seven-day speaking challenge", zh: "体验七天中文口语挑战" } },
  },
];

export function getLearningFaqs(locale: Locale): LearningFaq[] {
  return learningFaqs.map((faq) => ({
    id: faq.id,
    question: faq.question[locale],
    answer: faq.answer[locale],
    link: { path: `/${locale}${faq.link.path}`, label: faq.link.label[locale] },
  }));
}
