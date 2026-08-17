import type { Locale } from "@/lib/i18n";

export type DailyChallengeDay = {
  dayNumber: number;
  slug: string;
  title: string;
  titleZh: string;
  phraseZh: string;
  phraseEn: string;
  prompt: string;
  promptZh: string;
  category: string;
  estimatedMinutes: number;
  image: string;
  audioUrl: string;
};

const challengeDays: Array<Omit<DailyChallengeDay, "title" | "prompt">> = [
  {
    dayNumber: 1,
    slug: "introductions",
    titleZh: "自我介绍",
    phraseZh: "你好，我叫……",
    phraseEn: "Hello, my name is…",
    promptZh: "用中文介绍自己的名字和来自哪里。",
    category: "Everyday Chinese",
    estimatedMinutes: 5,
    image: "/images/hero-global-learners.webp",
    audioUrl: "/daily/audio/day1.m4a",
  },
  {
    dayNumber: 2,
    slug: "ordering-coffee",
    titleZh: "点一杯咖啡",
    phraseZh: "我想要一杯咖啡",
    phraseEn: "I would like a cup of coffee.",
    promptZh: "练习在咖啡店自然地点单。",
    category: "Real-life speaking",
    estimatedMinutes: 5,
    image: "/daily/coffee-cup.png",
    audioUrl: "/daily/audio/day2.m4a",
  },
  {
    dayNumber: 3,
    slug: "asking-directions",
    titleZh: "问路",
    phraseZh: "请问，地铁站怎么走？",
    phraseEn: "Excuse me, how do I get to the subway station?",
    promptZh: "学会在城市里礼貌地问路。",
    category: "Travel Chinese",
    estimatedMinutes: 6,
    image: "/images/hero-panda.webp",
    audioUrl: "/daily/audio/day3.m4a",
  },
  {
    dayNumber: 4,
    slug: "hobbies",
    titleZh: "聊聊兴趣",
    phraseZh: "我喜欢旅行，也喜欢学习中文。",
    phraseEn: "I like travelling, and I also like learning Chinese.",
    promptZh: "用一个完整句子分享你的兴趣。",
    category: "Conversation",
    estimatedMinutes: 5,
    image: "/images/course-travel.webp",
    audioUrl: "/daily/audio/day4.m4a",
  },
  {
    dayNumber: 5,
    slug: "daily-routine",
    titleZh: "我的一天",
    phraseZh: "我每天早上学习中文。",
    phraseEn: "I study Chinese every morning.",
    promptZh: "用时间词说说你的日常安排。",
    category: "Useful patterns",
    estimatedMinutes: 6,
    image: "/images/course-online.webp",
    audioUrl: "/daily/audio/day5.m4a",
  },
  {
    dayNumber: 6,
    slug: "slowly-please",
    titleZh: "请说慢一点",
    phraseZh: "你可以说慢一点吗？",
    phraseEn: "Could you speak a little more slowly?",
    promptZh: "掌握让真实对话继续下去的关键表达。",
    category: "Confidence builder",
    estimatedMinutes: 5,
    image: "/images/course-group.webp",
    audioUrl: "/daily/audio/day6.m4a",
  },
  {
    dayNumber: 7,
    slug: "why-i-learn",
    titleZh: "我的中文故事",
    phraseZh: "我学习中文，因为我想更了解中国。",
    phraseEn: "I learn Chinese because I want to understand China better.",
    promptZh: "完成 60 秒中文分享，留下你的学习宣言。",
    category: "Final challenge",
    estimatedMinutes: 8,
    image: "/images/hero-culture.webp",
    audioUrl: "/daily/audio/day7.m4a",
  },
];

export function getDailyChallengeDays(locale: Locale): DailyChallengeDay[] {
  return challengeDays.map((day) => ({
    ...day,
    title: locale === "zh" ? day.titleZh : englishTitles[day.slug] ?? day.titleZh,
    prompt: locale === "zh" ? day.promptZh : englishPrompts[day.slug] ?? day.promptZh,
  }));
}


const englishTitles: Record<string, string> = {
  introductions: "Introduce yourself",
  "ordering-coffee": "Ordering coffee",
  "asking-directions": "Asking directions",
  hobbies: "Talk about your hobbies",
  "daily-routine": "My daily routine",
  "slowly-please": "Please speak slowly",
  "why-i-learn": "My Chinese story",
};

const englishPrompts: Record<string, string> = {
  introductions: "Introduce your name and where you are from in Chinese.",
  "ordering-coffee": "Practise ordering naturally at a coffee shop.",
  "asking-directions": "Learn to ask for directions politely in a city.",
  hobbies: "Share one interest using a complete sentence.",
  "daily-routine": "Describe your day with useful time words.",
  "slowly-please": "Keep a real conversation moving with this key phrase.",
  "why-i-learn": "Record a 60-second Chinese statement about your journey.",
};

export const dailyCopy = {
  en: {
    eyebrow: "SureMandarin Daily",
    title: "7 days to speak more Chinese",
    description:
      "A tiny daily practice that turns real-life phrases into confident conversations.",
    streak: "day streak",
    day: "Day",
    of: "of",
    listen: "Listen",
    speaking: "Speaking practice",
    start: "Start speaking",
    stop: "Stop recording",
    ready: "Your practice is ready",
    completed: "Great work — day complete",
    next: "Continue tomorrow",
    reward: "You unlocked a free trial lesson",
    rewardDescription:
      "Complete all 7 days while signed in and we will automatically add one free trial lesson to your account.",
    rewardGranted: "Your free 1-lesson trial has been added to your account.",
    rewardLogin: "Complete the challenge, then sign in to claim your free trial lesson.",
    share: "Share your streak",
    install: "Install Daily",
    consult: "Get my free learning plan",
    back: "Back to day",
    minutes: "min",
    free: "Free · No payment required",
    reply: "We reply within 24H",
    guestNote: "Not signed in: your progress is saved only on this device. Sign in to save it to your account and sync across devices.",
    signInToSync: "Sign in to sync your progress across devices.",
    speechUnsupported: "Microphone recording is not supported in this browser. Please open Daily in Safari, Chrome, or Edge.",
    speechRetry: "We heard you, but the phrase was not close enough. Try once more.",
    microphoneDenied: "Microphone access is blocked. Allow microphone access in your browser settings, then try again.",
    microphoneMissing: "No microphone was found on this device.",
    microphoneBusy: "The microphone is being used by another app. Close it and try again.",
    microphoneFailed: "The microphone could not start. Please close other apps or open this page in Safari or Chrome.",
    noSpeechDetected: "We could not hear any speech. Move closer to the microphone and try again.",
    switchToRecorder: "Automatic speech recognition is unavailable here. Tap Start speaking again to use compatible recording mode.",
    recorderMode: "Compatible recording mode is active. Speak the phrase, then tap Stop recording.",
    recordingCaptured: "Your voice was recorded. Play it back, then confirm today’s practice.",
    recordingTooShort: "The recording was too short. Hold the button longer and say the full phrase.",
    confirmRecording: "Use this recording",
    recordAgain: "Record again",
    recognized: "We heard:",
    unlockTomorrow: "The next day unlocks tomorrow after today’s practice is complete.",
  },
  zh: {
    eyebrow: "SureMandarin Daily",
    title: "7 天开口说中文",
    description: "每天一点真实表达，把会的词变成敢说的对话。",
    streak: "天连续打卡",
    day: "第",
    of: "/ 7 天",
    listen: "听一听",
    speaking: "开口练习",
    start: "开始说",
    stop: "停止录音",
    ready: "练习已经准备好",
    completed: "太棒了，今天完成！",
    next: "明天继续",
    reward: "解锁 1 节免费试听课时",
    rewardDescription: "登录状态下完成 7 天挑战，系统会自动向你的账户发放 1 节免费试听课时。",
    rewardGranted: "1 节免费试听课时已发放到你的账户。",
    rewardLogin: "完成挑战后登录或注册，即可领取 1 节免费试听课时。",
    share: "分享你的连续打卡",
    install: "安装 Daily",
    consult: "获取我的免费学习方案",
    back: "返回本日练习",
    minutes: "分钟",
    free: "免费 · 无需付款",
    reply: "24 小时内回复",
    guestNote: "未登录：进度只能保存在本地设备；登录后会保存到个人账户，并支持多设备同步。",
    signInToSync: "登录后，进度会在不同设备自动同步。",
    speechUnsupported: "当前浏览器不支持麦克风录音，请使用 Safari、Chrome 或 Edge 打开 Daily。",
    speechRetry: "听到了你的声音，但和目标句子还不够接近，再试一次。",
    microphoneDenied: "麦克风权限被阻止，请在浏览器设置中允许麦克风后重试。",
    microphoneMissing: "当前设备没有检测到可用麦克风。",
    microphoneBusy: "麦克风正在被其他应用占用，请关闭后重试。",
    microphoneFailed: "麦克风无法启动，请关闭占用麦克风的应用，或使用 Safari/Chrome 重新打开。",
    noSpeechDetected: "没有检测到清晰声音，请靠近麦克风并重新尝试。",
    switchToRecorder: "当前环境无法自动识别语音，已切换兼容录音模式，请再次点击“开始说”。",
    recorderMode: "兼容录音模式已启动，请说出目标句子，然后点击“停止录音”。",
    recordingCaptured: "声音已成功录入，请试听后确认完成今日练习。",
    recordingTooShort: "录音时间太短，请按住更久并完整说出句子。",
    confirmRecording: "确认使用本次录音",
    recordAgain: "重新录音",
    recognized: "识别结果：",
    unlockTomorrow: "下一天会在完成今天练习后的第二天解锁。",
  },
} as const;

export const dailyProgressKey = "suremandarin_daily_progress_v1";
