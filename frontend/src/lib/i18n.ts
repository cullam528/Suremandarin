import type { HomepageData } from "@/lib/strapi";
export type Locale = "en" | "zh";
export const locales: Locale[] = ["en", "zh"];
export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

const courseZh: Record<string, [string, string]> = {
  "private-course": [
    "一对一私教课程",
    "根据你的目标、水平和节奏定制专属中文学习方案。",
  ],
  "group-course": [
    "小组课程",
    "在小班互动、讨论与协作练习中提升中文表达能力。",
  ],
  "learn-and-travel-course": [
    "游学课程",
    "把中文课堂与中国文化体验和旅行实践结合起来。",
  ],
  "ib-tutorial": ["IB 中文辅导", "针对 IB 中文课程、作业和考试提供专业辅导。"],
  "online-course": [
    "在线课程",
    "不受地点限制，灵活参加直播课程并持续获得教师指导。",
  ],
  "exclusive-course": [
    "专属定制课程",
    "为企业、学校、家庭和特殊学习目标设计高端定制方案。",
  ],
};
export function localizeHomepage(
  data: HomepageData,
  locale: Locale,
): HomepageData {
  if (locale === "en") return data;
  const slides = [
    [
      "全球中文教育专家",
      "自信说中文，连接更多可能。",
      "个性化中文学习体验，让语言、文化与未来机会真正连接。",
    ],
    [
      "在文化中学习",
      "学习中文，看见更大的世界。",
      "通过文化体验、专业指导和真实交流建立实用中文能力。",
    ],
    [
      "灵活学习",
      "你的目标，你的中文旅程。",
      "一对一、小组、游学、IB 与在线课程，按照你的方式学习。",
    ],
  ];
  return {
    ...data,
    pageTitle: "SureMandarin 中文学习",
    pageDescription: "面向全球学习者的个性化中文课程。",
    slides: data.slides.map((s, i) => ({
      ...s,
      eyebrow: slides[i]?.[0] ?? s.eyebrow,
      title: slides[i]?.[1] ?? s.title,
      description: slides[i]?.[2] ?? s.description,
    })),
    courseSectionTitle: "找到适合你的课程",
    courses: data.courses.map((c) => ({
      ...c,
      title: courseZh[c.slug]?.[0] ?? c.title,
      summary: courseZh[c.slug]?.[1] ?? c.summary,
    })),
    knowledgeSectionTitle: "中文学习知识中心",
    articles: data.articles.map((a, i) => ({
      ...a,
      title: ["学习方法", "中国文化", "学习技巧", "新闻见解"][i] ?? a.title,
      excerpt:
        [
          "掌握更有效的记忆、理解和表达方法。",
          "了解中国传统、节日、艺术、美食和背后的故事。",
          "获得词汇积累、日常学习和考试准备建议。",
          "了解 SureMandarin 与中文教育领域的最新动态。",
        ][i] ?? a.excerpt,
    })),
    testimonialSectionTitle: "全球学员的真实评价",
    newsletterTitle: "持续获得学习灵感",
    newsletterDescription: "订阅中文学习技巧、文化故事和专属活动。",
  };
}

export const ui = {
  en: {
    home: "Home",
    courses: "Courses",
    daily: "Daily",
    levelTest: "Level Test",
    knowledge: "Knowledge",
    say: "They Say",
    about: "About Us",
    login: "Login",
    signup: "Sign Up",
    account: "My Account",
    logout: "Log out",
    contact: "Contact Us",
  },
  zh: {
    home: "首页",
    courses: "课程",
    daily: "7天挑战",
    levelTest: "水平测试",
    knowledge: "知识中心",
    say: "学员评价",
    about: "关于我们",
    login: "登录",
    signup: "注册",
    account: "我的账户",
    logout: "退出登录",
    contact: "联系我们",
  },
};
