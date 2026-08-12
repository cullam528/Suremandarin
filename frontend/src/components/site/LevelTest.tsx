"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Headphones,
  Languages,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";

type LevelKey = "beginner" | "intermediate" | "advanced";
type CategoryKey = "pronunciation" | "vocabulary" | "grammar" | "reading" | "listening" | "communication";

type Question = {
  id: string;
  category: CategoryKey;
  difficulty: "基础" | "进阶" | "挑战";
  prompt: string;
  hint?: string;
  options: string[];
  answer: number;
};

type QuestionTemplate = {
  id: string;
  category: CategoryKey;
  difficulty: "基础" | "进阶" | "挑战";
  answer: number;
  en: { prompt: string; hint?: string; options: string[] };
  zh: { prompt: string; hint?: string; options: string[] };
};

const categoryCopy = {
  en: {
    pronunciation: { label: "Pronunciation", short: "Pinyin & tones", icon: Languages },
    vocabulary: { label: "Vocabulary", short: "Words in context", icon: BookOpen },
    grammar: { label: "Grammar", short: "Sentence patterns", icon: Sparkles },
    reading: { label: "Reading", short: "Understand meaning", icon: BookOpen },
    listening: { label: "Listening", short: "Follow a dialogue", icon: Headphones },
    communication: { label: "Communication", short: "Choose naturally", icon: Target },
  },
  zh: {
    pronunciation: { label: "发音与声调", short: "拼音和声调", icon: Languages },
    vocabulary: { label: "词汇", short: "语境中的词语", icon: BookOpen },
    grammar: { label: "语法", short: "句型与结构", icon: Sparkles },
    reading: { label: "阅读", short: "理解文字信息", icon: BookOpen },
    listening: { label: "听力", short: "听懂对话", icon: Headphones },
    communication: { label: "情境表达", short: "选择自然表达", icon: Target },
  },
} as const;

const questionBank: QuestionTemplate[] = [
  { id: "p1", category: "pronunciation", difficulty: "基础", answer: 2, en: { prompt: "Which pinyin has the third tone?", hint: "The third tone usually dips before rising.", options: ["mā", "má", "mǎ", "mà"] }, zh: { prompt: "下面哪个拼音是第三声？", hint: "第三声通常先下降再上扬。", options: ["mā", "má", "mǎ", "mà"] } },
  { id: "p2", category: "pronunciation", difficulty: "基础", answer: 0, en: { prompt: "Which pinyin correctly matches “老师”?", hint: "老师 means teacher.", options: ["lǎoshī", "láoshí", "làoshī", "lǎosì"] }, zh: { prompt: "“老师”的正确拼音是哪一个？", hint: "老师是指 teacher。", options: ["lǎoshī", "láoshí", "làoshī", "lǎosì"] } },
  { id: "p3", category: "pronunciation", difficulty: "进阶", answer: 1, en: { prompt: "Which syllable uses the fourth tone?", options: ["shī", "shì", "shí", "shǐ"] }, zh: { prompt: "下面哪个音节使用第四声？", options: ["shī", "shì", "shí", "shǐ"] } },
  { id: "p4", category: "pronunciation", difficulty: "基础", answer: 2, en: { prompt: "Which pinyin correctly matches “学生”?", options: ["xǔshēng", "xuéshěng", "xuéshēng", "xuěshēng"] }, zh: { prompt: "“学生”的正确拼音是哪一个？", options: ["xǔshēng", "xuéshěng", "xuéshēng", "xuěshēng"] } },
  { id: "p5", category: "pronunciation", difficulty: "挑战", answer: 0, en: { prompt: "Which pinyin starts with the ‘zh’ sound?", options: ["zhī", "jī", "xī", "chī"] }, zh: { prompt: "下面哪个拼音以“zh”音开头？", options: ["zhī", "jī", "xī", "chī"] } },
  { id: "v1", category: "vocabulary", difficulty: "基础", answer: 1, en: { prompt: "What does “苹果” mean?", options: ["Orange", "Apple", "Bread", "Water"] }, zh: { prompt: "“苹果”是什么意思？", options: ["橙子", "苹果", "面包", "水"] } },
  { id: "v2", category: "vocabulary", difficulty: "进阶", answer: 0, en: { prompt: "Choose the natural measure word: 一 ___ 书", hint: "Use this measure word for books.", options: ["本", "只", "张", "杯"] }, zh: { prompt: "选择最自然的量词：一 ___ 书", hint: "书通常使用这个量词。", options: ["本", "只", "张", "杯"] } },
  { id: "v3", category: "vocabulary", difficulty: "进阶", answer: 2, en: { prompt: "What does “方便” mean in “这里交通很方便”？", options: ["Expensive", "Crowded", "Convenient", "Quiet"] }, zh: { prompt: "“这里交通很方便”中的“方便”是什么意思？", options: ["很贵", "拥挤", "便利", "安静"] } },
  { id: "v4", category: "vocabulary", difficulty: "进阶", answer: 1, en: { prompt: "“附近” means…", options: ["Far away", "Nearby", "Tomorrow", "Together"] }, zh: { prompt: "“附近”的意思是……", options: ["很远", "旁边不远的地方", "明天", "一起"] } },
  { id: "v5", category: "vocabulary", difficulty: "基础", answer: 3, en: { prompt: "Complete the phrase: 一 ___ 水", options: ["张", "本", "只", "瓶"] }, zh: { prompt: "选择正确的量词：一 ___ 水", options: ["张", "本", "只", "瓶"] } },
  { id: "g1", category: "grammar", difficulty: "基础", answer: 2, en: { prompt: "Choose the most natural word order.", options: ["我中文每天学习。", "每天我学习中文。", "我每天学习中文。", "学习中文我每天。"] }, zh: { prompt: "选择最自然的语序。", options: ["我中文每天学习。", "每天我学习中文。", "我每天学习中文。", "学习中文我每天。"] } },
  { id: "g2", category: "grammar", difficulty: "进阶", answer: 1, en: { prompt: "Complete the sentence: 我昨天 ___ 一部电影。", hint: "Use the completed-action marker.", options: ["看", "看了", "看着", "要看"] }, zh: { prompt: "完成句子：我昨天 ___ 一部电影。", hint: "表示动作已经完成。", options: ["看", "看了", "看着", "要看"] } },
  { id: "g3", category: "grammar", difficulty: "进阶", answer: 0, en: { prompt: "What does “我比他高” mean?", options: ["I am taller than him.", "He is taller than me.", "We are the same height.", "I want to see him."] }, zh: { prompt: "“我比他高”是什么意思？", options: ["我比他高。", "他比我高。", "我们一样高。", "我想见他。"] } },
  { id: "g4", category: "grammar", difficulty: "挑战", answer: 2, en: { prompt: "Complete the pattern: 如果你有时间，___ 一起喝茶。", options: ["但是", "因为", "我们就", "已经"] }, zh: { prompt: "完成句子：如果你有时间，___ 一起喝茶。", options: ["但是", "因为", "我们就", "已经"] } },
  { id: "g5", category: "grammar", difficulty: "挑战", answer: 1, en: { prompt: "Choose the sentence that means ‘I understood the teacher.’", options: ["我听老师。", "我听懂老师了。", "我听着老师。", "我听要老师。"] }, zh: { prompt: "选择表示“我理解了老师”的句子。", options: ["我听老师。", "我听懂老师了。", "我听着老师。", "我听要老师。"] } },
  { id: "r1", category: "reading", difficulty: "进阶", answer: 1, en: { prompt: "小王每天早上七点起床，八点去上班。 What time does 小王 go to work?", options: ["At 7:00", "At 8:00", "At 9:00", "At noon"] }, zh: { prompt: "小王每天早上七点起床，八点去上班。小王几点去上班？", options: ["七点", "八点", "九点", "中午"] } },
  { id: "r2", category: "reading", difficulty: "挑战", answer: 2, en: { prompt: "因为下雨，今天的活动改在室内举行。 Why was the activity moved indoors?", options: ["It was too hot", "The teacher was late", "It was raining", "The room was busy"] }, zh: { prompt: "因为下雨，今天的活动改在室内举行。活动为什么改到室内？", options: ["天气太热", "老师迟到了", "下雨了", "房间很忙"] } },
  { id: "r3", category: "reading", difficulty: "进阶", answer: 0, en: { prompt: "小李学中文三个月了，每天练习半小时。 How long does she practise each day?", options: ["30 minutes", "3 minutes", "3 hours", "Every three days"] }, zh: { prompt: "小李学中文三个月了，每天练习半小时。她每天练习多长时间？", options: ["半小时", "三分钟", "三小时", "每三天"] } },
  { id: "r4", category: "reading", difficulty: "挑战", answer: 3, en: { prompt: "虽然今天很忙，但是他还是完成了作业。 What did he do?", options: ["He cancelled class.", "He went travelling.", "He forgot the homework.", "He finished the homework."] }, zh: { prompt: "虽然今天很忙，但是他还是完成了作业。他做了什么？", options: ["取消了课程", "去旅行了", "忘了作业", "完成了作业"] } },
  { id: "r5", category: "reading", difficulty: "挑战", answer: 1, en: { prompt: "小陈想买一件生日礼物，因为朋友下周过生日。 Why does 小陈 want to buy a gift?", options: ["Her birthday is today.", "Her friend’s birthday is next week.", "She is moving house.", "The shop is closing."] }, zh: { prompt: "小陈想买一件生日礼物，因为朋友下周过生日。她为什么买礼物？", options: ["今天是她的生日", "朋友下周过生日", "她要搬家", "商店要关门"] } },
  { id: "l1", category: "listening", difficulty: "基础", answer: 1, en: { prompt: "Read the mini-dialogue: A: 你喝咖啡吗？ B: 不，我喝茶。 What does B drink?", options: ["Coffee", "Tea", "Milk", "Juice"] }, zh: { prompt: "读对话：A：你喝咖啡吗？B：不，我喝茶。B喝什么？", options: ["咖啡", "茶", "牛奶", "果汁"] } },
  { id: "l2", category: "listening", difficulty: "进阶", answer: 2, en: { prompt: "A: 明天你去北京吗？ B: 不去，我周五才出发。 When will B leave?", options: ["Today", "Tomorrow", "Friday", "Next month"] }, zh: { prompt: "A：明天你去北京吗？B：不去，我周五才出发。B什么时候出发？", options: ["今天", "明天", "周五", "下个月"] } },
  { id: "l3", category: "listening", difficulty: "基础", answer: 0, en: { prompt: "A: 你住在哪儿？ B: 我住在学校附近。 Where does B live?", options: ["Near the school", "At the station", "In a hotel", "Far from town"] }, zh: { prompt: "A：你住在哪儿？B：我住在学校附近。B住在哪里？", options: ["学校附近", "车站", "酒店", "离城里很远"] } },
  { id: "l4", category: "listening", difficulty: "进阶", answer: 3, en: { prompt: "A: 这件衣服多少钱？ B: 一百二十块。 How much is it?", options: ["20 yuan", "100 yuan", "12 yuan", "120 yuan"] }, zh: { prompt: "A：这件衣服多少钱？B：一百二十块。这件衣服多少钱？", options: ["二十元", "一百元", "十二元", "一百二十元"] } },
  { id: "l5", category: "listening", difficulty: "进阶", answer: 1, en: { prompt: "A: 你喜欢看电影还是看书？ B: 我更喜欢看书。 What does B prefer?", options: ["Watching films", "Reading books", "Playing sports", "Cooking"] }, zh: { prompt: "A：你喜欢看电影还是看书？B：我更喜欢看书。B更喜欢什么？", options: ["看电影", "看书", "运动", "做饭"] } },
  { id: "c1", category: "communication", difficulty: "进阶", answer: 0, en: { prompt: "Someone says: 你吃饭了吗？ What is a natural reply if you have eaten?", options: ["吃过了，你呢？", "我昨天吃饭。", "饭在书包。", "不喜欢中国。"] }, zh: { prompt: "别人问：你吃饭了吗？如果你已经吃过了，怎样回答最自然？", options: ["吃过了，你呢？", "我昨天吃饭。", "饭在书包。", "不喜欢中国。"] } },
  { id: "c2", category: "communication", difficulty: "挑战", answer: 1, en: { prompt: "You want to politely ask a teacher to repeat. Which sentence is best?", options: ["你说！", "请再说一遍，可以吗？", "我不要听。", "说得很快。"] }, zh: { prompt: "你想礼貌地请老师再说一遍，哪句话最好？", options: ["你说！", "请再说一遍，可以吗？", "我不要听。", "说得很快。"] } },
  { id: "c3", category: "communication", difficulty: "进阶", answer: 2, en: { prompt: "A friend invites you to lunch. Which reply accepts naturally?", options: ["不在饭。", "昨天很忙。", "好啊，几点？", "我叫中文。"] }, zh: { prompt: "朋友邀请你一起吃午饭，哪种回答表示自然接受？", options: ["不在饭。", "昨天很忙。", "好啊，几点？", "我叫中文。"] } },
  { id: "c4", category: "communication", difficulty: "基础", answer: 0, en: { prompt: "Someone says 对不起. What is a natural reply?", options: ["没关系。", "多少钱？", "我住北京。", "明天昨天。"] }, zh: { prompt: "别人说“对不起”，怎样回答最自然？", options: ["没关系。", "多少钱？", "我住北京。", "明天昨天。"] } },
  { id: "c5", category: "communication", difficulty: "挑战", answer: 3, en: { prompt: "Which sentence politely asks for directions to the subway?", options: ["地铁很贵。", "我走昨天。", "你喜欢地铁吗？", "请问，地铁站怎么走？"] }, zh: { prompt: "哪句话可以礼貌地询问地铁站怎么走？", options: ["地铁很贵。", "我走昨天。", "你喜欢地铁吗？", "请问，地铁站怎么走？"] } },
];

const categoryKeys: CategoryKey[] = ["pronunciation", "vocabulary", "grammar", "reading", "listening", "communication"];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function buildQuestions(locale: Locale, randomize: boolean): Question[] {
  return categoryKeys.flatMap((category) => {
    const pool = questionBank.filter((question) => question.category === category);
    const selected = (randomize ? shuffle(pool) : pool).slice(0, 2);
    return selected.map((question) => ({ id: question.id, category: question.category, difficulty: question.difficulty, answer: question.answer, ...question[locale] }));
  });
}

const resultCopy = {
  en: {
    beginner: { label: "Beginner pathway", title: "Build a confident foundation", text: "Your next step is a clear foundation in pronunciation, core vocabulary, and everyday sentence patterns." },
    intermediate: { label: "Intermediate pathway", title: "Turn knowledge into fluent habits", text: "You already have useful building blocks. Focus on listening speed, natural grammar, and real conversation." },
    advanced: { label: "Advanced pathway", title: "Make your Chinese precise and powerful", text: "You are ready for nuance, confident communication, and specialised goals such as business Chinese, HSK, IB, or cultural fluency." },
  },
  zh: {
    beginner: { label: "入门学习路径", title: "从基础开始，自信开口", text: "建议先系统巩固发音、核心词汇和日常句型，建立稳定的中文学习基础。" },
    intermediate: { label: "进阶学习路径", title: "把知识变成流利表达", text: "你已经具备实用基础，下一步重点提升听力速度、自然语法和真实场景对话。" },
    advanced: { label: "高级学习路径", title: "让中文表达更精准、更有力量", text: "你可以挑战更复杂的语境、专业沟通、HSK、IB 中文和深入的文化表达。" },
  },
} as const;

const levelToApiValue: Record<LevelKey, "beginner" | "intermediate" | "advanced"> = {
  beginner: "beginner",
  intermediate: "intermediate",
  advanced: "advanced",
};

function calculateLevel(score: number, categoryScores: Record<CategoryKey, number>): LevelKey {
  const pronunciationAndGrammar = categoryScores.pronunciation + categoryScores.grammar;
  if (score >= 10 && pronunciationAndGrammar >= 3) return "advanced";
  if (score >= 6 && pronunciationAndGrammar >= 2) return "intermediate";
  return "beginner";
}

export function LevelTest({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const [questions, setQuestions] = useState<Question[]>(() => buildQuestions(locale, true));
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<LevelKey | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const score = useMemo(() => answers.reduce((total, answer, index) => total + (answer === questions[index]?.answer ? 1 : 0), 0), [answers, questions]);
  const categoryScores = useMemo(() => questions.reduce((scores, question, index) => {
    if (answers[index] === question.answer) scores[question.category] += 1;
    return scores;
  }, { pronunciation: 0, vocabulary: 0, grammar: 0, reading: 0, listening: 0, communication: 0 } as Record<CategoryKey, number>), [answers, questions]);
  const progress = result ? 100 : Math.round(((step + 1) / questions.length) * 100);
  const resultData = result ? resultCopy[locale][result] : null;
  const recommendedCourse = useMemo(() => {
    if (result === "advanced") return "private-course";
    if (result === "intermediate") return "online-course";
    return "group-course";
  }, [result]);
  const quickStats = [
    { Icon: Clock3, label: zh ? "约 5 分钟" : "About 5 min" },
    { Icon: Target, label: zh ? "12 道真实题" : "12 real questions" },
    { Icon: Sparkles, label: zh ? "多维度结果" : "Multi-skill result" },
  ];

  function chooseAnswer(value: number) {
    const nextAnswers = [...answers.slice(0, step), value];
    setAnswers(nextAnswers);
    if (step === questions.length - 1) {
      const nextScore = nextAnswers.reduce((total, answer, index) => total + (answer === questions[index]?.answer ? 1 : 0), 0);
      const nextCategoryScores = questions.reduce((scores, question, index) => {
        if (nextAnswers[index] === question.answer) scores[question.category] += 1;
        return scores;
      }, { pronunciation: 0, vocabulary: 0, grammar: 0, reading: 0, listening: 0, communication: 0 } as Record<CategoryKey, number>);
      setResult(calculateLevel(nextScore, nextCategoryScores));
    } else {
      setStep((current) => current + 1);
    }
  }

  function goBack() {
    setStep((current) => Math.max(0, current - 1));
    setAnswers((current) => current.slice(0, -1));
  }

  function restart() {
    setQuestions(buildQuestions(locale, true));
    setStep(0);
    setAnswers([]);
    setResult(null);
    setSubmitted(false);
    setError("");
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result) return;
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          courseSlug: "level-test",
          currentLevel: levelToApiValue[result],
          learningGoal: form.get("goal"),
          sourcePage: `/${locale}/level-test`,
          campaign: "level-test",
          privacyConsent: form.get("privacyConsent") === "on",
          testScore: score,
          testTotal: questions.length,
          testLevel: result,
          testBreakdown: categoryScores,
          testAnswers: answers.map((answer, index) => ({
            questionId: questions[index]?.id,
            category: questions[index]?.category,
            selectedAnswer: answer,
            correct: answer === questions[index]?.answer,
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : zh ? "提交失败，请稍后重试。" : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="sm-level-test soft-gradient min-h-[calc(100vh-5rem)] py-10 sm:py-16">
      <div className="page-shell grid gap-8 lg:grid-cols-[.78fr_1.22fr] lg:items-start lg:gap-12">
        <div>
          <p className="section-kicker">{zh ? "免费中文水平测试" : "Free Chinese level test"}</p>
          <h1 className="mt-4 max-w-xl text-4xl font-extrabold leading-[1.08] tracking-[-.05em] text-brand-navy sm:text-6xl">
            {zh ? "用真实题目，找到适合你的中文起点。" : "Use real questions to find your Chinese starting point."}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
            {zh ? "不只是自我感觉判断。测试会从发音、词汇、语法、阅读、听力和情境表达六个维度评估你的中文能力。" : "This is more than a self-rating. We check pronunciation, vocabulary, grammar, reading, listening, and real-life communication."}
          </p>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {quickStats.map(({ Icon, label }) => (
              <div key={label} className="rounded-2xl border border-brand-line bg-white/80 p-4 shadow-sm">
                <Icon size={18} className="text-brand-blue" />
                <p className="mt-3 text-xs font-extrabold leading-5 text-brand-navy">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 rounded-3xl border border-white/80 bg-white/65 p-5 backdrop-blur sm:p-6">
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-brand-blue">{zh ? "测试包含" : "What we check"}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(Object.keys(categoryCopy[locale]) as CategoryKey[]).map((category) => {
                const item = categoryCopy[locale][category];
                const Icon = item.icon;
                return <div key={category} className="flex items-center gap-3 text-sm font-bold text-brand-navy"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-brand-blue"><Icon size={17} /></span><span>{item.label}<small className="block text-[11px] font-medium text-slate-500">{item.short}</small></span></div>;
              })}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-brand-line bg-white p-5 shadow-xl shadow-blue-900/10 sm:p-8">
          {!result ? (
            <div>
              <div className="flex items-center justify-between gap-4 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                <span>{zh ? `第 ${step + 1} 题 / 共 ${questions.length} 题` : `Question ${step + 1} of ${questions.length}`}</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-blue-50"><div className="h-2 rounded-full bg-brand-blue transition-all" style={{ width: `${Math.max(progress, 7)}%` }} /></div>

              <div className="mt-8 flex items-center justify-between gap-3">
                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-extrabold text-brand-blue">{categoryCopy[locale][questions[step].category].label}</span>
                <span className="text-[11px] font-bold text-slate-400">{zh ? questions[step].difficulty : ["Foundation", "Core", "Challenge"][questions[step].difficulty === "基础" ? 0 : questions[step].difficulty === "进阶" ? 1 : 2]}</span>
              </div>
              <h2 className="mt-5 text-2xl font-extrabold leading-tight text-brand-navy sm:text-3xl">{questions[step].prompt}</h2>
              {questions[step].hint && <p className="mt-3 rounded-xl bg-brand-soft px-4 py-3 text-xs font-medium leading-6 text-slate-600">{questions[step].hint}</p>}
              <div className="mt-6 grid gap-3">
                {questions[step].options.map((choice, index) => (
                  <button type="button" key={choice} onClick={() => chooseAnswer(index)} className="group flex items-center gap-3 rounded-2xl border border-brand-line px-4 py-4 text-left text-sm font-bold text-brand-navy transition hover:-translate-y-0.5 hover:border-brand-blue hover:bg-blue-50 sm:px-5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-xs font-extrabold text-slate-500 transition group-hover:bg-white group-hover:text-brand-blue">{String.fromCharCode(65 + index)}</span>
                    <span className="flex-1">{choice}</span><ArrowRight size={17} className="shrink-0 text-brand-blue" />
                  </button>
                ))}
              </div>
              {step > 0 && <button type="button" onClick={goBack} className="mt-6 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-brand-blue"><ChevronLeft size={15} /> {zh ? "返回上一题" : "Back"}</button>}
            </div>
          ) : submitted ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto size-14 text-brand-green" />
              <h2 className="mt-5 text-2xl font-extrabold text-brand-navy">{zh ? "结果已发送" : "Your result is on its way"}</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">{zh ? "学习顾问会根据你的水平和目标联系你，帮助你选择最合适的课程。" : "A learning advisor will use your level and goals to help you choose the right course."}</p>
              <div className="mt-7 flex flex-wrap justify-center gap-3"><Link href={`/${locale}/courses/${recommendedCourse}`} className="brand-gradient inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold text-white">{zh ? "查看推荐课程" : "View recommended course"}<ArrowRight size={16} /></Link><button type="button" onClick={restart} className="rounded-xl border border-brand-blue px-5 py-3 text-sm font-extrabold text-brand-blue">{zh ? "重新测试" : "Retake test"}</button></div>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="section-kicker">{resultData?.label}</p><h2 className="mt-3 text-3xl font-extrabold leading-tight text-brand-navy">{resultData?.title}</h2></div><div className="grid size-20 shrink-0 place-items-center rounded-full border-[7px] border-blue-100 bg-blue-50 text-center"><strong className="text-2xl text-brand-blue">{score}</strong><span className="-mt-2 text-[10px] font-bold text-slate-500">/ {questions.length}</span></div></div>
              <p className="mt-4 text-sm leading-7 text-slate-600">{resultData?.text}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {(Object.keys(categoryCopy[locale]) as CategoryKey[]).map((category) => { const item = categoryCopy[locale][category]; const Icon = item.icon; const max = questions.filter((question) => question.category === category).length; const value = categoryScores[category]; return <div key={category} className="rounded-2xl border border-brand-line bg-slate-50/70 p-3"><div className="flex items-center justify-between gap-2 text-xs font-extrabold text-brand-navy"><span className="flex items-center gap-2"><Icon size={15} className="text-brand-blue" />{item.label}</span><span>{value}/{max}</span></div><div className="mt-2 h-1.5 rounded-full bg-white"><div className="h-1.5 rounded-full bg-brand-blue" style={{ width: `${(value / max) * 100}%` }} /></div></div>; })}
              </div>
              <div className="mt-6 rounded-2xl bg-brand-soft p-4 text-sm font-bold text-brand-navy">{zh ? "推荐方向：" : "Recommended direction: "}{result === "advanced" ? (zh ? "一对一 / 专业目标" : "Private or specialised goals") : result === "intermediate" ? (zh ? "在线 / 口语提升" : "Online or conversation growth") : (zh ? "小组 / 一对一基础" : "Group or private foundations")}</div>
              <form onSubmit={submitLead} className="mt-7 grid gap-3"><input required name="name" placeholder={zh ? "你的姓名" : "Your name"} className="course-input" /><input required type="email" name="email" placeholder={zh ? "电子邮箱" : "Email address"} className="course-input" /><select required name="goal" className="course-input"><option value="">{zh ? "你的主要学习目标" : "Your main learning goal"}</option><option value="conversation">{zh ? "日常交流" : "Everyday conversation"}</option><option value="hsk">HSK / {zh ? "考试" : "Exam"}</option><option value="business">{zh ? "商务中文" : "Business Chinese"}</option><option value="travel">{zh ? "旅行与文化" : "Travel and culture"}</option><option value="ib">IB Chinese</option></select><label className="flex gap-3 text-xs leading-5 text-slate-600"><input required type="checkbox" name="privacyConsent" className="mt-1" />{zh ? "我同意隐私政策和使用条款。" : "I agree to the Privacy Policy and Terms of Use."}</label>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">{error}</p>}<button disabled={loading} className="brand-gradient mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold text-white disabled:opacity-60">{loading ? (zh ? "正在提交…" : "Sending…") : (zh ? "获取我的学习建议" : "Get my learning plan")}<ArrowRight size={16} /></button></form>
              <button type="button" onClick={restart} className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-brand-blue"><RotateCcw size={13} />{zh ? "重新测试" : "Retake the test"}</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
