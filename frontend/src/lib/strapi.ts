import { cache } from "react";
import { localizeHomepage, type Locale } from "@/lib/i18n";

const STRAPI_URL =
  process.env.STRAPI_URL ??
  process.env.NEXT_PUBLIC_STRAPI_URL ??
  "https://api.suremandarin.com";

type StrapiMedia = { url?: string; alternativeText?: string | null } | null;

export type HeroSlideData = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
};

export type CourseData = {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  image: string;
  imageAlt: string;
};

export type ArticleData = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  image: string;
  imageAlt: string;
};

export type ArticleDetailData = ArticleData & {
  body: string | unknown[];
  authorName: string;
  publishDate: string;
  readingMinutes: number;
  categoryName: string;
};

export type TestimonialData = {
  id: string;
  name: string;
  country: string;
  quote: string;
  rating: number;
  image: string;
  goal?: string;
  levelBefore?: string;
  result?: string;
  duration?: string;
  videoUrl?: string;
  verified?: boolean;
};

export type GlobalData = {
  siteName: string;
  logo?: string;
  footerDescription: string;
  copyright: string;
  privacyUrl: string;
  termsUrl: string;
  contactTitle: string;
  contactDescription: string;
  contactMethods: Array<{ type: string; label: string; value: string }>;
  socialLinks: Array<{ platform: string; url: string }>;
  wechatQrCode?: string;
  whatsappQrCode?: string;
};

export type HomepageData = {
  pageTitle: string;
  pageDescription: string;
  slides: HeroSlideData[];
  courseSectionTitle: string;
  courses: CourseData[];
  knowledgeSectionTitle: string;
  articles: ArticleData[];
  testimonialSectionTitle: string;
  testimonials: TestimonialData[];
  newsletterTitle: string;
  newsletterDescription: string;
  global: GlobalData;
};

export type CourseDetailData = {
  course: CourseData & {
    audience: string;
    level: string;
    deliveryMode: string;
    duration: string;
  };
  global: GlobalData;
  testimonials: TestimonialData[];
};

const fallbackSlideImages = [
  "/images/hero-panda.webp",
  "/images/hero-culture.webp",
  "/images/hero-global-learners.webp",
];
const fallbackCourseImages: Record<string, string> = {
  private: "/images/course-private.webp",
  group: "/images/course-group.webp",
  "learn-travel": "/images/course-travel.webp",
  "ib-tutorial": "/images/course-ib.webp",
  online: "/images/course-online.webp",
  exclusive: "/images/course-exclusive.webp",
};
const fallbackArticleImages = [
  "/images/knowledge-strategies.webp",
  "/images/course-travel.webp",
  "/images/course-ib.webp",
  "/images/hero-global-learners.webp",
];
const fallbackArticleImagesByCategory: Record<KnowledgeCategorySlug, string> = {
  "learning-strategies": "/images/knowledge-strategies.webp",
  "chinese-culture": "/images/course-travel.webp",
  "study-tips": "/images/course-ib.webp",
  "news-and-insights": "/images/hero-global-learners.webp",
};
const fallbackAvatarImages = [
  "/images/course-group.webp",
  "/images/course-ib.webp",
  "/images/course-travel.webp",
  "/images/course-online.webp",
];

const fallbackGlobal: GlobalData = {
  siteName: "SureMandarin",
  footerDescription:
    "Empowering learners worldwide to speak Chinese with confidence and cultural understanding.",
  copyright: `© ${new Date().getFullYear()} SureMandarin. All rights reserved.`,
  privacyUrl: "/privacy",
  termsUrl: "/terms",
  contactTitle: "Contact Us",
  contactDescription: "Feel free to reach out anytime.",
  contactMethods: [],
  socialLinks: [],
  whatsappQrCode: undefined,
};

export const knowledgeCategories = {
  "news-and-insights": {
    en: {
      title: "News & Insights",
      description:
        "Updates from SureMandarin and the world of Chinese education.",
    },
    zh: {
      title: "新闻见解",
      description: "了解 SureMandarin 与中文教育领域的最新动态。",
    },
  },
  "study-tips": {
    en: {
      title: "Study Tips",
      description:
        "Practical techniques for vocabulary, daily study, and exam preparation.",
    },
    zh: {
      title: "学习技巧",
      description: "获得词汇积累、日常学习和考试准备建议。",
    },
  },
  "chinese-culture": {
    en: {
      title: "Chinese Culture",
      description:
        "Explore traditions, festivals, art, food, and the stories behind them.",
    },
    zh: {
      title: "中国文化",
      description: "了解中国传统、节日、艺术、美食和背后的故事。",
    },
  },
  "learning-strategies": {
    en: {
      title: "Learning Strategies",
      description:
        "Smart methods to improve memory, comprehension, and speaking confidence.",
    },
    zh: {
      title: "学习方法",
      description: "掌握更有效的记忆、理解和表达方法。",
    },
  },
} as const;

export type KnowledgeCategorySlug = keyof typeof knowledgeCategories;

type KnowledgeTopic = {
  slug: string;
  en: { title: string; excerpt: string };
  zh: { title: string; excerpt: string };
  image: string;
};

const fallbackKnowledgeTopics: Record<KnowledgeCategorySlug, KnowledgeTopic[]> = {
  "news-and-insights": [
    { slug: "how-ai-is-changing-language-learning", en: { title: "How AI Is Changing Language Learning", excerpt: "What AI can do for practice — and why a real teacher still matters." }, zh: { title: "AI 正在如何改变语言学习", excerpt: "了解 AI 能帮助你练什么，以及为什么真人老师仍然重要。" }, image: "/images/hero-global-learners.webp" },
    { slug: "mandarin-learning-trends-2026", en: { title: "Mandarin Learning Trends to Watch in 2026", excerpt: "The habits, formats, and learner goals shaping modern Chinese education." }, zh: { title: "2026 中文学习趋势", excerpt: "看看正在改变中文教育的学习习惯、课程形态与学习目标。" }, image: "/images/course-online.webp" },
    { slug: "why-speaking-first-works", en: { title: "Why Speaking-First Learning Works", excerpt: "A practical look at why early conversation builds confidence faster." }, zh: { title: "为什么先开口更有效", excerpt: "从学习规律出发，解释为什么尽早对话能更快建立信心。" }, image: "/images/course-group.webp" },
    { slug: "the-new-global-mandarin-classroom", en: { title: "The New Global Mandarin Classroom", excerpt: "How online, travel, and private learning now work together." }, zh: { title: "全球中文课堂的新样子", excerpt: "在线、小组、游学与私教正在如何组合成更灵活的学习体验。" }, image: "/images/hero-culture.webp" },
    { slug: "hsk-and-real-life-chinese", en: { title: "HSK Scores and Real-Life Chinese", excerpt: "How to balance exam progress with the language you use every day." }, zh: { title: "HSK 成绩与真实中文", excerpt: "如何兼顾考试进步与日常真正用得上的中文。" }, image: "/images/course-ib.webp" },
    { slug: "making-chinese-learning-stick", en: { title: "Making Chinese Learning Stick", excerpt: "The small routines that help new vocabulary stay with you." }, zh: { title: "让中文学习真正留下来", excerpt: "几个简单习惯，帮助新词汇从短期记忆进入长期使用。" }, image: "/images/knowledge-strategies.webp" },
    { slug: "teachers-as-learning-designers", en: { title: "Teachers as Learning Designers", excerpt: "Why the best teachers adapt the path, not just the lesson." }, zh: { title: "老师也是学习设计师", excerpt: "优秀老师为什么会调整学习路径，而不只是讲完一节课。" }, image: "/images/course-private.webp" },
    { slug: "culture-makes-language-memorable", en: { title: "Why Culture Makes Language Memorable", excerpt: "Stories, food, and places give new Chinese words a reason to stay." }, zh: { title: "文化让语言更容易记住", excerpt: "故事、美食与真实场景，能让新词汇拥有更牢固的记忆理由。" }, image: "/images/course-travel.webp" },
    { slug: "from-app-practice-to-live-class", en: { title: "From App Practice to a Live Class", excerpt: "A simple path from daily self-study to meaningful teacher feedback." }, zh: { title: "从 App 练习走向真人课堂", excerpt: "从每天自学到获得老师反馈，一条简单而有效的学习路径。" }, image: "/images/app.webp" },
    { slug: "learning-chinese-abroad", en: { title: "Learning Chinese Before You Move Abroad", excerpt: "What to practise before your first week in a Chinese-speaking city." }, zh: { title: "出发前先学好这些中文", excerpt: "去中文环境生活前，最值得提前练习的真实表达。" }, image: "/images/hero-panda.webp" },
    { slug: "the-confidence-gap", en: { title: "Closing the Confidence Gap", excerpt: "Why understanding Chinese is not the same as feeling ready to speak it." }, zh: { title: "跨过理解与开口之间的距离", excerpt: "听得懂不等于敢开口，看看如何系统地跨过这道门槛。" }, image: "/images/course-exclusive.webp" },
    { slug: "a-better-first-chinese-lesson", en: { title: "What Makes a Better First Chinese Lesson", excerpt: "The five signals of a welcoming, useful, and motivating first session." }, zh: { title: "一节好的中文体验课应该是什么样", excerpt: "五个信号，帮你判断第一次中文体验课是否真正有帮助。" }, image: "/images/hero-global-learners.webp" },
  ],
  "study-tips": [
    { slug: "five-minute-vocabulary-review", en: { title: "The Five-Minute Vocabulary Review", excerpt: "A tiny review loop for remembering words without studying for hours." }, zh: { title: "五分钟词汇复习法", excerpt: "不用长时间苦学，用一个小循环让词汇真正记住。" }, image: "/images/course-ib.webp" },
    { slug: "how-to-practise-tones", en: { title: "How to Practise Mandarin Tones", excerpt: "A calm daily routine for hearing, copying, and using the four tones." }, zh: { title: "普通话声调怎么练", excerpt: "通过听、模仿和使用，建立稳定声调的每日练习方法。" }, image: "/images/course-online.webp" },
    { slug: "build-a-chinese-study-routine", en: { title: "Build a Chinese Study Routine That Lasts", excerpt: "Design your week around energy, time, and one clear speaking goal." }, zh: { title: "建立能够坚持的中文学习计划", excerpt: "根据精力、时间和一个明确的开口目标安排每周学习。" }, image: "/images/knowledge-strategies.webp" },
    { slug: "learn-characters-without-overwhelm", en: { title: "Learn Characters Without Feeling Overwhelmed", excerpt: "Use components, stories, and spaced review to make Hanzi approachable." }, zh: { title: "不焦虑地学习汉字", excerpt: "用部件、故事和间隔复习，让汉字学习变得有入口。" }, image: "/images/hero-culture.webp" },
    { slug: "how-to-use-pinyin-well", en: { title: "How to Use Pinyin Well", excerpt: "Pinyin is a bridge to sound — not a replacement for listening." }, zh: { title: "如何正确使用拼音", excerpt: "拼音是通往发音的桥梁，而不是替代听力的拐杖。" }, image: "/images/course-group.webp" },
    { slug: "learn-chinese-with-audio", en: { title: "Learn Chinese with Audio", excerpt: "Turn short audio clips into a repeatable listening and speaking exercise." }, zh: { title: "用音频学中文", excerpt: "把短音频变成每天都能重复的听力与口语练习。" }, image: "/images/app.webp" },
    { slug: "language-learning-on-a-busy-week", en: { title: "Language Learning on a Busy Week", excerpt: "How to keep momentum when your calendar is full." }, zh: { title: "忙碌的一周也能学中文", excerpt: "日程很满时，怎样保持中文学习的连续性。" }, image: "/images/course-private.webp" },
    { slug: "turn-commute-time-into-chinese", en: { title: "Turn Commute Time into Chinese Time", excerpt: "A low-friction plan for listening, shadowing, and reviewing on the go." }, zh: { title: "把通勤时间变成中文时间", excerpt: "一套适合路上的听、跟读和复习安排。" }, image: "/images/hero-global-learners.webp" },
    { slug: "how-to-remember-measure-words", en: { title: "Remember Chinese Measure Words", excerpt: "Learn measure words through useful groups instead of isolated lists." }, zh: { title: "记住中文量词", excerpt: "通过有规律的词组学习量词，而不是死背一张长表。" }, image: "/images/course-travel.webp" },
    { slug: "make-your-own-sentence-bank", en: { title: "Make Your Own Chinese Sentence Bank", excerpt: "Collect adaptable patterns that help you speak before you feel fluent." }, zh: { title: "建立自己的中文句型库", excerpt: "收集可替换的句型，让你还没完全流利就能先开口。" }, image: "/images/course-exclusive.webp" },
    { slug: "study-for-a-chinese-presentation", en: { title: "Study for a Chinese Presentation", excerpt: "A step-by-step method for preparing clear, natural spoken Chinese." }, zh: { title: "如何准备中文演讲", excerpt: "一步步准备清晰、自然又适合自己水平的中文表达。" }, image: "/images/course-ib.webp" },
    { slug: "the-best-way-to-review-a-lesson", en: { title: "The Best Way to Review a Lesson", excerpt: "A 24-hour review routine that turns class notes into usable language." }, zh: { title: "一节课后最有效的复习方式", excerpt: "课后 24 小时内复习，把课堂笔记变成真正能用的中文。" }, image: "/images/knowledge-strategies.webp" },
  ],
  "chinese-culture": [
    { slug: "why-chinese-tea-is-a-conversation", en: { title: "Why Chinese Tea Is More Than a Drink", excerpt: "Tea culture opens a gentle door into Chinese hospitality and language." }, zh: { title: "中国茶为什么不只是饮料", excerpt: "从茶文化走进中国人的待客方式，也顺便学会相关表达。" }, image: "/images/course-travel.webp" },
    { slug: "spring-festival-family-language", en: { title: "The Family Language of Spring Festival", excerpt: "Useful words and customs for understanding China’s most important holiday." }, zh: { title: "春节里的家庭语言", excerpt: "通过词汇与习俗，理解中国最重要节日背后的家庭文化。" }, image: "/images/hero-culture.webp" },
    { slug: "a-beginners-guide-to-chinese-food", en: { title: "A Beginner’s Guide to Chinese Food", excerpt: "How to read a menu, order politely, and discover regional flavours." }, zh: { title: "中文学习者的中国美食入门", excerpt: "学会看菜单、礼貌点餐，也认识中国不同地区的味道。" }, image: "/images/hero-panda.webp" },
    { slug: "understanding-chinese-names", en: { title: "Understanding Chinese Names", excerpt: "What a family name, given name, and chosen Chinese name can tell you." }, zh: { title: "读懂中文名字", excerpt: "了解姓、名与中文名背后的文化信息和社交礼仪。" }, image: "/images/course-group.webp" },
    { slug: "the-art-of-giving-gifts", en: { title: "The Art of Giving Gifts in China", excerpt: "Simple cultural context for choosing, offering, and receiving a gift." }, zh: { title: "中国送礼的分寸与礼貌", excerpt: "了解挑选、递出和接受礼物时的文化分寸。" }, image: "/images/course-exclusive.webp" },
    { slug: "why-wechat-matters", en: { title: "Why WeChat Matters in Everyday China", excerpt: "A cultural guide to communication, payments, groups, and daily life." }, zh: { title: "为什么微信如此重要", excerpt: "从沟通、支付到群聊，理解微信在中国日常生活中的位置。" }, image: "/images/app.webp" },
    { slug: "chinese-festivals-beyond-lanterns", en: { title: "Chinese Festivals Beyond the Lanterns", excerpt: "Meet a few lesser-known festivals and the words that bring them alive." }, zh: { title: "不只有灯笼：中国节日的更多面貌", excerpt: "认识几个不那么熟悉的节日，也学会描述它们的词汇。" }, image: "/images/hero-culture.webp" },
    { slug: "a-walk-through-a-chinese-market", en: { title: "A Walk Through a Chinese Market", excerpt: "The language, sounds, and social rhythm behind a lively local market." }, zh: { title: "逛中国市场", excerpt: "从语言、声音与人情往来，感受热闹市场里的生活节奏。" }, image: "/images/course-travel.webp" },
    { slug: "chinese-courtesy-phrases", en: { title: "Chinese Courtesy Phrases That Build Connection", excerpt: "Small expressions that make everyday interactions warmer and smoother." }, zh: { title: "拉近距离的中文礼貌表达", excerpt: "几个小表达，让你的日常交流更自然、更有温度。" }, image: "/images/course-private.webp" },
    { slug: "the-story-of-pandas-and-china", en: { title: "Pandas, Place, and Cultural Memory", excerpt: "Why the panda carries such a special place in China’s cultural imagination." }, zh: { title: "大熊猫与中国文化记忆", excerpt: "为什么熊猫在中国文化想象中拥有如此特别的位置。" }, image: "/images/hero-panda.webp" },
    { slug: "travel-slowly-in-china", en: { title: "How to Travel Slowly in China", excerpt: "Choose a city, follow a local rhythm, and let language lead the way." }, zh: { title: "在中国慢慢旅行", excerpt: "选一座城市、跟着当地节奏走，让语言带你发现更多细节。" }, image: "/images/course-travel.webp" },
    { slug: "modern-chinese-city-life", en: { title: "A Window into Modern Chinese City Life", excerpt: "Explore neighbourhoods, cafés, parks, and the language of a changing city." }, zh: { title: "现代中国城市生活的一扇窗", excerpt: "从社区、咖啡馆和公园，看见正在变化的中国城市与语言。" }, image: "/images/hero-global-learners.webp" },
  ],
  "learning-strategies": [
    { slug: "the-meaning-first-method", en: { title: "The Meaning-First Method", excerpt: "Understand the message before worrying about every individual word." }, zh: { title: "先理解意思，再拆解词语", excerpt: "先抓住信息，再处理词汇细节，学习会更轻松。" }, image: "/images/knowledge-strategies.webp" },
    { slug: "learn-in-phrases-not-words", en: { title: "Learn in Phrases, Not Isolated Words", excerpt: "Why useful chunks make Mandarin easier to recall in conversation." }, zh: { title: "用词组学习，而不是孤立背词", excerpt: "高频词组能让你在真实对话中更快想起中文。" }, image: "/images/course-online.webp" },
    { slug: "a-simple-spaced-repetition-plan", en: { title: "A Simple Spaced-Repetition Plan", excerpt: "A realistic review rhythm for building long-term Chinese memory." }, zh: { title: "简单的间隔复习计划", excerpt: "一套现实可执行的复习节奏，帮助中文记忆保持更久。" }, image: "/images/course-ib.webp" },
    { slug: "shadowing-for-natural-rhythm", en: { title: "Shadowing for a More Natural Rhythm", excerpt: "Copy the speaker’s timing and melody before chasing speed." }, zh: { title: "用跟读练出自然节奏", excerpt: "先模仿时间感和语调，再逐步提高说话速度。" }, image: "/images/course-group.webp" },
    { slug: "use-questions-to-start-speaking", en: { title: "Use Questions to Start Speaking", excerpt: "One good question can create ten minutes of useful Chinese practice." }, zh: { title: "用问题打开中文对话", excerpt: "一个好问题，就能创造十分钟真实而有用的中文练习。" }, image: "/images/course-private.webp" },
    { slug: "the-three-layer-listening-routine", en: { title: "The Three-Layer Listening Routine", excerpt: "Listen for the idea, the words, and the tones — in that order." }, zh: { title: "三层听力练习法", excerpt: "按信息、词汇、声调三个层次听中文，效率更高。" }, image: "/images/app.webp" },
    { slug: "turn-mistakes-into-feedback", en: { title: "Turn Mistakes into Feedback", excerpt: "A kinder way to notice patterns and improve without losing momentum." }, zh: { title: "把错误变成反馈", excerpt: "用更温和的方式发现规律，在不打击动力的情况下进步。" }, image: "/images/hero-global-learners.webp" },
    { slug: "set-a-speaking-goal", en: { title: "Set a Speaking Goal You Can Measure", excerpt: "Replace vague goals with one conversation you want to handle." }, zh: { title: "设定可以衡量的口语目标", excerpt: "把模糊目标换成一段你希望能够完成的真实对话。" }, image: "/images/course-exclusive.webp" },
    { slug: "learn-with-a-real-person", en: { title: "Why Learning with a Real Person Accelerates Progress", excerpt: "Feedback, accountability, and human connection fill the gaps apps cannot." }, zh: { title: "为什么真人学习能加速进步", excerpt: "反馈、陪伴和真实连接，是单靠 App 很难补足的部分。" }, image: "/images/course-private.webp" },
    { slug: "from-recognition-to-recall", en: { title: "Move from Recognition to Recall", excerpt: "The small step that turns ‘I know this word’ into ‘I can use it’." }, zh: { title: "从看懂词到主动说出来", excerpt: "完成从‘认识这个词’到‘我会使用它’的关键一步。" }, image: "/images/knowledge-strategies.webp" },
    { slug: "make-a-weekly-learning-review", en: { title: "Make a Weekly Learning Review", excerpt: "Reflect on wins, friction, and the next useful phrase to practise." }, zh: { title: "每周做一次学习复盘", excerpt: "回顾收获、卡点和下一句最值得练习的中文表达。" }, image: "/images/course-travel.webp" },
    { slug: "design-your-personal-chinese-path", en: { title: "Design Your Personal Chinese Path", excerpt: "Connect your goals, schedule, course format, and real-life interests." }, zh: { title: "设计你的中文学习路径", excerpt: "把目标、时间、课程形式和真实兴趣连接成一条路。" }, image: "/images/hero-culture.webp" },
  ],
};

function fallbackKnowledgeBody(category: KnowledgeCategorySlug, locale: Locale, topic: KnowledgeTopic, index: number) {
  const title = topic[locale].title;
  if (locale === "zh") {
    const categoryTip: Record<KnowledgeCategorySlug, string> = {
      "news-and-insights": "把教育趋势放回真实学习场景中，你会更容易判断什么值得尝试。",
      "study-tips": "今天就选一个小动作开始，不需要等到拥有完整的学习时间。",
      "chinese-culture": "语言和文化一起学习，词汇才会从课本走进真实生活。",
      "learning-strategies": "有效的方法不是让你做更多，而是让每一次练习都更有方向。",
    };
    return `## ${title}\n\n${topic.zh.excerpt}\n\n### 你可以这样开始\n1. 用 3 分钟读完这篇内容，圈出一个你想记住的表达。\n2. 把它放进今天的中文对话或笔记里，至少主动使用一次。\n3. 在 24 小时后复习，并记录自己哪里最容易卡住。\n\n### SureMandarin 学习提示\n${categoryTip[category]}\n\n> 第 ${index + 1} 篇练习建议：不要追求一次学完，先让一个表达真正进入你的生活。`;
  }
  const categoryTip: Record<KnowledgeCategorySlug, string> = {
    "news-and-insights": "Put education trends back into a real learner journey before deciding what is worth trying.",
    "study-tips": "Start with one tiny action today; you do not need a perfect block of study time.",
    "chinese-culture": "Language becomes memorable when culture gives every new phrase a place to live.",
    "learning-strategies": "A strong method does not make you do more — it gives every practice session a clearer job.",
  };
  return `## ${title}\n\n${topic.en.excerpt}\n\n### A practical way to begin\n1. Read this piece in three minutes and circle one expression you want to keep.\n2. Use it once in a note, conversation, or voice practice today.\n3. Review it after 24 hours and write down the moment that still feels difficult.\n\n### A SureMandarin learning note\n${categoryTip[category]}\n\n> Practice ${index + 1}: do not aim to finish everything at once. Help one useful phrase enter your real life.`;
}

function getFallbackKnowledgeArticles(category: KnowledgeCategorySlug, locale: Locale): ArticleDetailData[] {
  return fallbackKnowledgeTopics[category].map((topic, index) => ({
    id: `fallback-${category}-${index + 1}`,
    title: topic[locale].title,
    slug: topic.slug,
    excerpt: topic[locale].excerpt,
    image: topic.image,
    imageAlt: `${topic[locale].title} — SureMandarin Knowledge Center`,
    body: fallbackKnowledgeBody(category, locale, topic, index),
    authorName: "SureMandarin Editorial Team",
    publishDate: new Date(Date.UTC(2026, 0, 20 - index)).toISOString(),
    readingMinutes: 4 + (index % 4),
    categoryName: knowledgeCategories[category][locale].title,
  }));
}

function mediaUrl(media: StrapiMedia, fallback?: string) {
  if (!media?.url) return fallback;
  if (media.url.startsWith("/uploads/"))
    return `/strapi-media/${media.url.slice("/uploads/".length)}`;
  return media.url;
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${STRAPI_URL}${path}`, {
    next: { revalidate: 60, tags: ["strapi-homepage"] },
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok)
    throw new Error(`Strapi request failed: ${response.status} ${path}`);
  return response.json() as Promise<T>;
}

async function optionalRequest<T>(path: string, empty: T): Promise<T> {
  const response = await fetch(`${STRAPI_URL}${path}`, {
    next: { revalidate: 60, tags: ["strapi-homepage"] },
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(3000),
  });
  if (response.status === 404) return empty;
  if (!response.ok)
    throw new Error(`Strapi request failed: ${response.status} ${path}`);
  return response.json() as Promise<T>;
}

function localizedPath(path: string, locale: Locale) {
  return `${path}${path.includes("?") ? "&" : "?"}locale=${locale}`;
}

const fallback: HomepageData = {
  pageTitle: "SureMandarin Chinese Learning",
  pageDescription: "Personalized Chinese learning for students worldwide.",
  slides: [
    [
      "Global Chinese education experts",
      "Confident Chinese.\nLimitless Opportunities.",
      "Personalized learning experiences that connect you to Chinese language, culture, and a world of possibilities.",
    ],
    [
      "Learn through culture",
      "Learn Chinese.\nSee the World.",
      "Build real language skills through cultural immersion, expert guidance, and meaningful connections.",
    ],
    [
      "Flexible learning",
      "Your Goals.\nYour Learning Journey.",
      "Flexible private, group, travel, IB, and online courses designed around the way you learn.",
    ],
  ].map(([eyebrow, title, description], index) => ({
    id: `slide-${index}`,
    eyebrow,
    title,
    description,
    image: fallbackSlideImages[index],
    imageAlt: "SureMandarin learning experience",
  })),
  courseSectionTitle: "Find the Right Course for You",
  courses: [
    [
      "Private Course",
      "private-course",
      "private",
      "1-on-1 customized learning with professional teachers, tailored to your goals and pace.",
    ],
    [
      "Group Course",
      "group-course",
      "group",
      "Learn with a small group, practice together, and grow through interaction and teamwork.",
    ],
    [
      "Learn & Travel Course",
      "learn-and-travel-course",
      "learn-travel",
      "Combine Chinese learning with immersive cultural experiences across China.",
    ],
    [
      "IB Tutorial",
      "ib-tutorial",
      "ib-tutorial",
      "Expert guidance for IB Chinese students to excel in assessments and communication.",
    ],
    [
      "Online Course",
      "online-course",
      "online",
      "Flexible self-paced or live online courses you can join from anywhere.",
    ],
    [
      "Exclusive Course",
      "exclusive-course",
      "exclusive",
      "Premium programs for enterprises, universities, and special learning needs.",
    ],
  ].map(([title, slug, category, summary], index) => ({
    id: `course-${index}`,
    title,
    slug,
    category,
    summary,
    image: fallbackCourseImages[category],
    imageAlt: `${title} learning scene`,
  })),
  knowledgeSectionTitle: "Inspire Your Learning",
  articles: [
    [
      "Learning Strategies",
      "learning-strategies",
      "Smart methods to improve memory, comprehension, and speaking confidence.",
    ],
    [
      "Chinese Culture",
      "chinese-culture",
      "Explore traditions, festivals, art, food, and the stories behind them.",
    ],
    [
      "Study Tips",
      "study-tips",
      "Study techniques, vocabulary building, and exam preparation advice.",
    ],
    [
      "News & Insights",
      "news-and-insights",
      "Updates from SureMandarin and the world of Chinese education.",
    ],
  ].map(([title, slug, excerpt], index) => ({
    id: `article-${index}`,
    title,
    slug,
    excerpt,
    image: fallbackArticleImages[index],
    imageAlt: `${title} editorial cover`,
  })),
  testimonialSectionTitle: "Loved by Learners Worldwide",
  testimonials: [
    [
      "Sophie Martin",
      "France",
      "SureMandarin teachers are patient and inspiring. My Chinese has improved so much!",
    ],
    [
      "Kevin Tan",
      "Singapore",
      "The classes are well-structured and practical. I use what I learn every day.",
    ],
    [
      "Carla Rodriguez",
      "Mexico",
      "I love the cultural lessons and travel experiences. They make learning fun.",
    ],
    [
      "Lucas Miller",
      "Germany",
      "The online platform is easy to use and the community is very supportive.",
    ],
  ].map(([name, country, quote], index) => ({
    id: `testimonial-${index}`,
    name,
    country,
    quote,
    rating: 5,
    image: fallbackAvatarImages[index],
    goal: ["Everyday conversation", "Business Chinese", "Travel and culture", "Online confidence"][index],
    levelBefore: ["New learner", "Basic conversation", "Beginner", "Intermediate"][index],
    result: ["Introduced herself in Chinese after 8 weeks", "Uses Chinese in client conversations", "Completed a cultural learning trip", "Speaks more confidently every week"][index],
    duration: ["8 weeks", "12 weeks", "6 weeks", "10 weeks"][index],
    verified: true,
  })),
  newsletterTitle: "Stay Inspired",
  newsletterDescription:
    "Get learning tips, cultural stories, and exclusive offers.",
  global: fallbackGlobal,
};

function parseGlobalData(
  settings: Record<string, unknown>,
  localeFallback: GlobalData,
): GlobalData {
  const contactMethods = Array.isArray(settings.contactMethods)
    ? (settings.contactMethods as Array<Record<string, unknown>>)
    : [];
  const socialLinks = Array.isArray(settings.socialLinks)
    ? (settings.socialLinks as Array<Record<string, unknown>>)
    : [];

  return {
    ...localeFallback,
    siteName: String(settings.siteName ?? localeFallback.siteName),
    logo: mediaUrl(settings.logo as StrapiMedia),
    footerDescription: String(
      settings.footerDescription ?? localeFallback.footerDescription,
    ),
    copyright: String(settings.copyright ?? localeFallback.copyright),
    privacyUrl: String(settings.privacyUrl ?? localeFallback.privacyUrl),
    termsUrl: String(settings.termsUrl ?? localeFallback.termsUrl),
    contactTitle: String(settings.contactTitle ?? localeFallback.contactTitle),
    contactDescription: String(
      settings.contactDescription ?? localeFallback.contactDescription,
    ),
    contactMethods: contactMethods
      .filter((item) => item.enabled !== false)
      .map((item) => ({
        type: String(item.type ?? ""),
        label: String(item.label ?? ""),
        value: String(item.value ?? ""),
      })),
    socialLinks: socialLinks
      .filter((item) => item.enabled !== false)
      .map((item) => ({
        platform: String(item.platform ?? ""),
        url: String(item.url ?? ""),
      })),
    wechatQrCode: mediaUrl(settings.wechatQrCode as StrapiMedia),
    whatsappQrCode: mediaUrl(settings.whatsappQrCode as StrapiMedia),
  };
}

export const getGlobalData = cache(async (locale: Locale = "en") => {
  const localeFallback = localizeHomepage(fallback, locale).global;
  try {
    const response = await optionalRequest<{ data: Record<string, unknown> | null }>(
      localizedPath(
        "/api/global-setting?populate=logo&populate=wechatQrCode&populate=whatsappQrCode&populate=contactMethods&populate=socialLinks",
        locale,
      ),
      { data: null },
    );
    return parseGlobalData(response.data ?? {}, localeFallback);
  } catch (error) {
    console.error("Using fallback global settings because Strapi is unavailable.", error);
    return localeFallback;
  }
});

export async function getHomepageData(
  locale: Locale = "en",
): Promise<HomepageData> {
  const localeFallback = localizeHomepage(fallback, locale);
  try {
    const [
      homeResponse,
      globalData,
      courseResponse,
      articleResponse,
      testimonialResponse,
    ] = await Promise.all([
      optionalRequest<{ data: Record<string, unknown> | null }>(
        localizedPath(
          "/api/home-page?populate[heroSlides][populate]=image&populate[seo][populate]=shareImage",
          locale,
        ),
        { data: null },
      ),
      getGlobalData(locale),
      request<{ data: Array<Record<string, unknown>> }>(
        localizedPath(
          "/api/courses?populate=cover&sort=sortOrder:asc&filters[enabled][$eq]=true",
          locale,
        ),
      ),
      request<{ data: Array<Record<string, unknown>> }>(
        localizedPath(
          "/api/articles?populate=cover&sort=publishDate:desc&filters[enabled][$eq]=true&pagination[limit]=4",
          locale,
        ),
      ),
      request<{ data: Array<Record<string, unknown>> }>(
        localizedPath(
          "/api/testimonials?populate=avatar&sort=sortOrder:asc&filters[enabled][$eq]=true&pagination[limit]=8",
          locale,
        ),
      ),
    ]);

    const home = homeResponse.data ?? {};
    const rawSlides = Array.isArray(home.heroSlides)
      ? (home.heroSlides as Array<Record<string, unknown>>)
      : [];
    const slides = rawSlides
      .filter((slide) => slide.enabled !== false)
      .map((slide, index) => ({
        id: String(slide.id ?? index),
        eyebrow: String(slide.eyebrow ?? ""),
        title: String(slide.title ?? "").replace(". ", ".\n"),
        description: String(slide.description ?? ""),
        image: mediaUrl(
          slide.image as StrapiMedia,
          fallbackSlideImages[index % fallbackSlideImages.length],
        )!,
        imageAlt: String(
          slide.imageAlt ??
            (slide.image as StrapiMedia)?.alternativeText ??
            "SureMandarin learning experience",
        ),
      }));

    const courses = courseResponse.data.slice(0, 6).map((course) => ({
      id: String(course.documentId ?? course.id),
      title: String(course.title ?? ""),
      slug: String(course.slug ?? ""),
      category: String(course.category ?? ""),
      summary: String(course.summary ?? ""),
      image: mediaUrl(
        course.cover as StrapiMedia,
        fallbackCourseImages[String(course.category)] ??
          "/images/course-private.webp",
      )!,
      imageAlt: String(
        course.imageAlt ??
          (course.cover as StrapiMedia)?.alternativeText ??
          `${course.title} learning scene`,
      ),
    }));

    const articles = articleResponse.data.map((article, index) => ({
      id: String(article.documentId ?? article.id),
      title: String(article.title ?? ""),
      slug: String(article.slug ?? ""),
      excerpt: String(article.excerpt ?? ""),
      image: mediaUrl(
        article.cover as StrapiMedia,
        fallbackArticleImages[index % fallbackArticleImages.length],
      )!,
      imageAlt: String(
        article.imageAlt ??
          (article.cover as StrapiMedia)?.alternativeText ??
          `${article.title} editorial cover`,
      ),
    }));

    const testimonials = testimonialResponse.data.map((item, index) => ({
      id: String(item.documentId ?? item.id),
      name: String(item.studentName ?? ""),
      country: String(item.country ?? ""),
      quote: String(item.quote ?? ""),
      rating: Number(item.rating ?? 5),
      image: mediaUrl(
        item.avatar as StrapiMedia,
        fallbackAvatarImages[index % fallbackAvatarImages.length],
      )!,
      goal: item.goal ? String(item.goal) : undefined,
      levelBefore: item.levelBefore ? String(item.levelBefore) : undefined,
      result: item.result ? String(item.result) : undefined,
      duration: item.duration ? String(item.duration) : undefined,
      videoUrl: item.videoUrl ? String(item.videoUrl) : undefined,
      verified: item.verified !== false,
    }));

    return {
      ...localeFallback,
      pageTitle: String(home.pageTitle ?? localeFallback.pageTitle),
      pageDescription: String(
        home.pageDescription ?? localeFallback.pageDescription,
      ),
      slides: slides.length ? slides : localeFallback.slides,
      courseSectionTitle: String(
        home.courseSectionTitle ?? localeFallback.courseSectionTitle,
      ),
      courses: courses.length ? courses : localeFallback.courses,
      knowledgeSectionTitle: String(
        home.knowledgeSectionTitle ?? localeFallback.knowledgeSectionTitle,
      ),
      articles: articles.length ? articles : localeFallback.articles,
      testimonialSectionTitle: String(
        home.testimonialSectionTitle ?? localeFallback.testimonialSectionTitle,
      ),
      testimonials: testimonials.length
        ? testimonials
        : localeFallback.testimonials,
      newsletterTitle: String(
        home.newsletterTitle ?? localeFallback.newsletterTitle,
      ),
      newsletterDescription: String(
        home.newsletterDescription ?? localeFallback.newsletterDescription,
      ),
      global: globalData,
    };
  } catch (error) {
    console.error(
      "Using homepage fallback data because Strapi is unavailable.",
      error,
    );
    return localeFallback;
  }
}

export async function getCourseDetailData(
  slug: string,
  locale: Locale = "en",
): Promise<CourseDetailData | null> {
  const home = await getHomepageData(locale);
  const fallbackCourse = home.courses.find((item) => item.slug === slug);
  try {
    const response = await request<{ data: Array<Record<string, unknown>> }>(
      localizedPath(
        `/api/courses?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=cover`,
        locale,
      ),
    );
    const raw = response.data[0];
    if (!raw && !fallbackCourse) return null;
    const base = fallbackCourse ?? home.courses[0];
    return {
      course: {
        ...base,
        id: String(raw?.documentId ?? raw?.id ?? base.id),
        title: String(raw?.title ?? base.title),
        slug: String(raw?.slug ?? base.slug),
        category: String(raw?.category ?? base.category),
        summary: String(raw?.summary ?? base.summary),
        image: mediaUrl(raw?.cover as StrapiMedia, base.image)!,
        imageAlt: String(
          raw?.imageAlt ??
            (raw?.cover as StrapiMedia)?.alternativeText ??
            base.imageAlt,
        ),
        audience: String(raw?.audience ?? "Adults and young learners"),
        level: String(raw?.level ?? "All levels"),
        deliveryMode: String(raw?.deliveryMode ?? "Online or in person"),
        duration: String(raw?.duration ?? "Flexible schedule"),
      },
      global: home.global,
      testimonials: home.testimonials,
    };
  } catch {
    if (!fallbackCourse) return null;
    return {
      course: {
        ...fallbackCourse,
        audience: "Adults and young learners",
        level: "All levels",
        deliveryMode: "Online or in person",
        duration: "Flexible schedule",
      },
      global: home.global,
      testimonials: home.testimonials,
    };
  }
}

function parseArticle(
  raw: Record<string, unknown>,
  index: number,
  categorySlug?: KnowledgeCategorySlug,
): ArticleDetailData {
  const category = raw.category as Record<string, unknown> | null | undefined;
  return {
    id: String(raw.documentId ?? raw.id ?? `article-${index}`),
    title: String(raw.title ?? ""),
    slug: String(raw.slug ?? ""),
    excerpt: String(raw.excerpt ?? ""),
    image: mediaUrl(
      raw.cover as StrapiMedia,
      categorySlug
        ? fallbackArticleImagesByCategory[categorySlug]
        : fallbackArticleImages[index % fallbackArticleImages.length],
    )!,
    imageAlt: String(
      raw.imageAlt ??
        (raw.cover as StrapiMedia)?.alternativeText ??
        `${raw.title ?? "Article"} editorial cover`,
    ),
    body: (() => {
      if (Array.isArray(raw.body)) return raw.body;
      if (typeof raw.body === "string") {
        try {
          const parsed = JSON.parse(raw.body);
          return Array.isArray(parsed) ? parsed : raw.body;
        } catch {
          return raw.body;
        }
      }
      return "";
    })(),
    authorName: String(raw.authorName ?? "SureMandarin Editorial Team"),
    publishDate: String(raw.publishDate ?? raw.publishedAt ?? ""),
    readingMinutes: Number(raw.readingMinutes ?? 5),
    categoryName: String(category?.name ?? "Knowledge Center"),
  };
}

export async function getKnowledgeArticles(
  category: KnowledgeCategorySlug,
  locale: Locale = "en",
) {
  try {
    const response = await request<{ data: Array<Record<string, unknown>> }>(
      localizedPath(
        "/api/articles?populate=cover,category&sort=publishDate:desc&filters[enabled][$eq]=true&pagination[limit]=100",
        locale,
      ),
    );
    const matchingArticles = response.data.filter((article) => {
      const relation = article.category as Record<string, unknown> | null | undefined;
      return String(article.slug ?? "") === category || String(relation?.slug ?? "") === category;
    });
    if (matchingArticles.length) {
      const remoteArticles = matchingArticles.map((article, index) => parseArticle(article, index, category));
      const fallbackArticles = getFallbackKnowledgeArticles(category, locale);
      const remoteSlugs = new Set(remoteArticles.map((article) => article.slug));
      return [...remoteArticles, ...fallbackArticles.filter((article) => !remoteSlugs.has(article.slug))].slice(0, 12);
    }
  } catch {
    // Use the curated fallback below when the CMS is unavailable.
  }
  return getFallbackKnowledgeArticles(category, locale);
}

export async function getKnowledgeArticle(
  slug: string,
  category: KnowledgeCategorySlug,
  locale: Locale = "en",
) {
  try {
    const response = await request<{ data: Array<Record<string, unknown>> }>(
      localizedPath(
        `/api/articles?populate=cover,category&filters[slug][$eq]=${encodeURIComponent(slug)}&filters[enabled][$eq]=true`,
        locale,
      ),
    );
    if (response.data[0]) return parseArticle(response.data[0], 0, category);
  } catch {
    // Use the curated fallback below when the CMS is unavailable.
  }
  return getFallbackKnowledgeArticles(category, locale).find((article) => article.slug === slug) ?? null;
}
