export type CoursePageContent = {
  label: string;
  title: string;
  accent: string;
  description: string;
  image: string;
  facts: string[];
  rating: string;
  benefits: Array<[string, string]>;
  audienceIntro: string;
  audiences: Array<[string, string]>;
  achievements: string[];
  roadmap: string[];
  lessonFlow: string[];
};

const sharedBenefits: Array<[string, string]> = [
  [
    "100% Customized",
    "Every lesson is tailored to your level, goals and learning style.",
  ],
  [
    "Faster Progress",
    "Focused lessons help you improve efficiently and confidently.",
  ],
  ["Flexible & Convenient", "Learn at the right time and pace for you."],
  [
    "Experienced Teachers",
    "Learn with professional Chinese teachers and clear guidance.",
  ],
];

const content: Record<string, CoursePageContent> = {
  "private-course": {
    label: "Private course",
    title: "Private Chinese.",
    accent: "Personalized for You.",
    description:
      "One-to-one online Chinese lessons tailored to your goals, pace and interests. Faster progress. Real results.",
    image: "/course-detail/images/private-course-hero-v2.webp",
    facts: [
      "1-on-1 Personal Attention",
      "All Levels Welcome",
      "Online / Shanghai",
      "Flexible Schedule",
    ],
    rating: "4.9 out of 5 based on 500+ reviews",
    benefits: sharedBenefits,
    audienceIntro:
      "Our private course is designed for learners who want personalized guidance and a learning experience built around their unique needs.",
    audiences: [
      [
        "Busy Professionals",
        "Improve communication skills for work, meetings and presentations.",
      ],
      [
        "Students",
        "Build a strong foundation or get ahead for school and exams.",
      ],
      [
        "Expats & Partners",
        "Adapt to life in China and connect with local communities.",
      ],
      ["Travelers", "Learn practical Chinese for smooth and confident travel."],
      [
        "Hobby Learners",
        "Explore Chinese culture and enjoy learning at your own pace.",
      ],
    ],
    achievements: [
      "Speak Chinese with Confidence",
      "Understand More",
      "Expand Opportunities",
      "Reach Your Goals",
    ],
    roadmap: [
      "Assess",
      "Personalized Plan",
      "Engaging Lessons",
      "Track & Improve",
      "Achieve Your Goals",
    ],
    lessonFlow: ["Warm-up", "Learn", "Practice", "Apply", "Review"],
  },
  "group-course": {
    label: "Group course",
    title: "Learn Together.",
    accent: "Grow Together.",
    description:
      "Interactive small-group Chinese classes where you practice with classmates, build confidence and stay motivated together.",
    image: "/images/course-group.webp",
    facts: [
      "Small Interactive Groups",
      "All Levels Available",
      "Online / Shanghai",
      "Fixed Weekly Schedule",
    ],
    rating: "Loved by social and motivated learners",
    benefits: [
      [
        "Small Classes",
        "More speaking time, personal attention and meaningful interaction.",
      ],
      ["Peer Motivation", "Learn alongside classmates who share your goals."],
      [
        "Practical Activities",
        "Use Chinese through discussions, role-play and teamwork.",
      ],
      [
        "Expert Facilitation",
        "Teachers keep every learner involved and progressing.",
      ],
    ],
    audienceIntro:
      "Ideal for learners who enjoy interaction, shared momentum and structured weekly practice.",
    audiences: [
      [
        "Social Learners",
        "Build confidence by practicing with supportive classmates.",
      ],
      ["Friends & Couples", "Join together and share the learning journey."],
      [
        "University Students",
        "Develop practical skills in an energetic environment.",
      ],
      [
        "Workplace Teams",
        "Improve team communication for real business situations.",
      ],
      ["Returning Learners", "Rebuild fluency with regular guided practice."],
    ],
    achievements: [
      "Speak Confidently in a Group",
      "Respond More Naturally",
      "Learn from Peer Practice",
      "Stay Consistent Every Week",
    ],
    roadmap: [
      "Placement Check",
      "Group Matching",
      "Interactive Classes",
      "Group Feedback",
      "Shared Progress",
    ],
    lessonFlow: [
      "Warm-up",
      "Topic Input",
      "Pair Practice",
      "Group Task",
      "Review",
    ],
  },
  "learn-and-travel-course": {
    label: "Learn & Travel course",
    title: "Learn Chinese.",
    accent: "Experience China.",
    description:
      "Combine practical Mandarin lessons with immersive cultural activities and guided travel experiences across China.",
    image: "/images/course-travel.webp",
    facts: [
      "Language + Culture",
      "Beginner Friendly",
      "In China",
      "Program Dates",
    ],
    rating: "A complete language and cultural experience",
    benefits: [
      [
        "Real Immersion",
        "Practice Mandarin naturally in authentic daily situations.",
      ],
      [
        "Curated Experiences",
        "Discover culture, food, history and local communities.",
      ],
      [
        "Travel Support",
        "Learn confidently with organized activities and guidance.",
      ],
      [
        "Lasting Connections",
        "Meet teachers, local hosts and international learners.",
      ],
    ],
    audienceIntro:
      "Designed for curious learners who want to experience Chinese language and culture beyond the classroom.",
    audiences: [
      [
        "Culture Explorers",
        "Understand traditions through first-hand experiences.",
      ],
      ["Students", "Turn a school break into meaningful learning."],
      ["Families", "Share a safe and educational cultural journey."],
      ["Travelers", "Navigate China with greater confidence and connection."],
      [
        "Gap-Year Learners",
        "Combine personal growth, travel and language study.",
      ],
    ],
    achievements: [
      "Handle Everyday Travel Chinese",
      "Understand Cultural Context",
      "Connect with Local People",
      "Create Lasting Memories",
    ],
    roadmap: [
      "Goal & Trip Planning",
      "Pre-departure Chinese",
      "Arrival Orientation",
      "Immersive Activities",
      "Progress Reflection",
    ],
    lessonFlow: ["Preview", "Learn", "Explore", "Use Chinese", "Reflect"],
  },
  "ib-tutorial": {
    label: "IB Tutorial",
    title: "Master IB Chinese.",
    accent: "Aim Higher.",
    description:
      "Focused IB Chinese support for stronger analysis, confident communication and better assessment performance.",
    image: "/images/course-ib.webp",
    facts: [
      "IB-Aligned Support",
      "SL / HL",
      "Online / Shanghai",
      "Exam Focused",
    ],
    rating: "Trusted by ambitious IB learners",
    benefits: [
      [
        "IB-Aligned Plan",
        "Lessons follow your course level and assessment needs.",
      ],
      ["Targeted Feedback", "Improve with specific feedback on every task."],
      ["Exam Strategy", "Understand criteria, timing and response structure."],
      ["Specialist Teachers", "Learn with tutors experienced in IB Chinese."],
    ],
    audienceIntro:
      "For IB learners who need structured support, stronger language skills and focused assessment preparation.",
    audiences: [
      [
        "IB Chinese B Students",
        "Strengthen receptive, productive and interactive skills.",
      ],
      [
        "IB Chinese A Students",
        "Develop analysis, structure and textual understanding.",
      ],
      ["Exam Candidates", "Prepare calmly with focused practice and feedback."],
      ["Bilingual Learners", "Refine accuracy, expression and academic depth."],
      [
        "School Support Learners",
        "Stay on track with coursework and assignments.",
      ],
    ],
    achievements: [
      "Write More Effectively",
      "Analyze Texts with Confidence",
      "Speak Clearly in Assessments",
      "Understand IB Criteria",
    ],
    roadmap: [
      "Diagnostic Review",
      "IB Study Plan",
      "Skill Tutorials",
      "Mock Assessment",
      "Final Preparation",
    ],
    lessonFlow: ["Review", "Model", "Analyze", "Practice", "Feedback"],
  },
  "online-course": {
    label: "Online course",
    title: "Chinese Anywhere.",
    accent: "Progress Everywhere.",
    description:
      "Flexible online Chinese learning with live teaching, practical resources and consistent support wherever you are.",
    image: "/images/course-online.webp",
    facts: ["Learn Anywhere", "All Levels", "100% Online", "Flexible Options"],
    rating: "Flexible learning for students worldwide",
    benefits: [
      [
        "Location Independent",
        "Join your Chinese course from anywhere in the world.",
      ],
      ["Flexible Formats", "Choose live lessons and guided digital practice."],
      [
        "Useful Resources",
        "Keep learning with organized materials between classes.",
      ],
      [
        "Ongoing Support",
        "Receive feedback and stay connected to your teacher.",
      ],
    ],
    audienceIntro:
      "A flexible option for global learners who need quality Chinese education without location limits.",
    audiences: [
      ["Global Learners", "Access professional teaching across time zones."],
      ["Busy Adults", "Fit Chinese learning around work and family."],
      ["Remote Students", "Study consistently without commuting."],
      ["Independent Learners", "Combine guidance with self-paced practice."],
      [
        "Frequent Travelers",
        "Keep progressing wherever your schedule takes you.",
      ],
    ],
    achievements: [
      "Build a Consistent Routine",
      "Learn from Anywhere",
      "Use Digital Resources Effectively",
      "Track Progress Online",
    ],
    roadmap: [
      "Online Assessment",
      "Course Setup",
      "Live Learning",
      "Digital Practice",
      "Progress Review",
    ],
    lessonFlow: [
      "Check-in",
      "Live Input",
      "Practice",
      "Online Task",
      "Feedback",
    ],
  },
  "exclusive-course": {
    label: "Exclusive course",
    title: "Built for Your Goals.",
    accent: "Designed Without Limits.",
    description:
      "Premium bespoke Chinese programs for executives, organizations, schools and learners with highly specific objectives.",
    image: "/images/course-exclusive.webp",
    facts: [
      "Fully Bespoke",
      "Premium Support",
      "Online / On-site",
      "Flexible Delivery",
    ],
    rating: "A high-touch learning experience",
    benefits: [
      [
        "Bespoke Design",
        "Every detail is created around your exact objectives.",
      ],
      ["Premium Team", "Work with carefully selected teachers and advisors."],
      [
        "Flexible Delivery",
        "Combine online, on-site and intensive learning formats.",
      ],
      [
        "Dedicated Support",
        "Receive coordinated service from planning to results.",
      ],
    ],
    audienceIntro:
      "Created for clients who require a distinctive curriculum, premium service and measurable outcomes.",
    audiences: [
      [
        "Executives",
        "Develop high-level Chinese for leadership and negotiation.",
      ],
      ["Companies", "Build programs around industry and organizational needs."],
      ["Schools", "Create tailored Chinese learning for student communities."],
      [
        "VIP Families",
        "Receive coordinated learning for multiple family members.",
      ],
      [
        "Special Projects",
        "Design intensive, event-based or specialist programs.",
      ],
    ],
    achievements: [
      "Meet Specific Communication Goals",
      "Build Industry-Relevant Fluency",
      "Coordinate Multi-Learner Programs",
      "Measure Strategic Outcomes",
    ],
    roadmap: [
      "Executive Consultation",
      "Bespoke Proposal",
      "Team Selection",
      "Program Delivery",
      "Results Review",
    ],
    lessonFlow: ["Brief", "Design", "Deliver", "Coach", "Optimize"],
  },
};

export function getCoursePageContent(slug: string) {
  return content[slug] ?? content["private-course"];
}

const zhIdentity: Record<
  string,
  {
    label: string;
    title: string;
    accent: string;
    description: string;
    facts: string[];
  }
> = {
  "private-course": {
    label: "一对一私教课程",
    title: "专属中文课程。",
    accent: "真正为你定制。",
    description:
      "根据你的目标、节奏和兴趣定制一对一中文课程，更快进步，获得真实成果。",
    facts: ["一对一专属指导", "适合所有水平", "在线 / 上海", "灵活安排时间"],
  },
  "group-course": {
    label: "小组课程",
    title: "一起学习。",
    accent: "共同进步。",
    description:
      "通过小班互动、讨论和协作练习建立表达信心，与同伴共同保持学习动力。",
    facts: ["互动小班", "多种水平", "在线 / 上海", "固定每周课程"],
  },
  "learn-and-travel-course": {
    label: "游学课程",
    title: "学习中文。",
    accent: "亲身体验中国。",
    description: "把实用中文课堂、文化活动和中国旅行体验结合起来。",
    facts: ["语言与文化", "零基础友好", "中国境内", "指定项目日期"],
  },
  "ib-tutorial": {
    label: "IB 中文辅导",
    title: "掌握 IB 中文。",
    accent: "向更高目标前进。",
    description: "针对 IB 中文分析、表达和考试表现提供专业辅导。",
    facts: ["IB 体系辅导", "SL / HL", "在线 / 上海", "考试导向"],
  },
  "online-course": {
    label: "在线课程",
    title: "随时随地学中文。",
    accent: "持续取得进步。",
    description: "通过直播教学、实用资料和持续指导，在任何地方灵活学习中文。",
    facts: ["随处学习", "适合所有水平", "完全在线", "灵活选择"],
  },
  "exclusive-course": {
    label: "专属定制课程",
    title: "围绕你的目标。",
    accent: "不受标准课程限制。",
    description: "为企业、学校、家庭和特殊目标设计高端专属中文项目。",
    facts: ["完全定制", "专属服务", "在线 / 线下", "灵活交付"],
  },
};
export function getLocalizedCoursePageContent(
  slug: string,
  locale: "en" | "zh",
) {
  const base = getCoursePageContent(slug);
  if (locale === "en") return base;
  const identity = zhIdentity[slug] ?? zhIdentity["private-course"];
  return {
    ...base,
    ...identity,
    rating: "深受全球中文学习者信赖",
    benefits: [
      ["个性化方案", "课程内容围绕你的水平、目标与学习方式设计。"],
      ["进步更高效", "聚焦真正需要提升的语言能力。"],
      ["学习更灵活", "按照适合你的时间和节奏持续学习。"],
      ["专业教师", "由经验丰富的中文教师提供清晰指导。"],
    ] as Array<[string, string]>,
    audienceIntro: "适合希望获得专业指导、稳定进步和实用中文能力的学习者。",
    audiences: [
      ["职场人士", "提升工作、会议和沟通中的中文能力。"],
      ["在校学生", "建立扎实基础并完成学业或考试目标。"],
      ["外籍人士与家庭", "更好适应在中国的生活与交流。"],
      ["旅行者", "掌握旅行中真正实用的中文。"],
      ["兴趣学习者", "按照自己的节奏探索中文与中国文化。"],
    ] as Array<[string, string]>,
    achievements: [
      "更自信地表达中文",
      "理解更多真实中文",
      "拓展学习和职业机会",
      "实现个人学习目标",
    ],
    roadmap: [
      "水平评估",
      "制定学习计划",
      "开始互动课程",
      "跟踪并持续改进",
      "实现学习目标",
    ],
    lessonFlow: ["热身复习", "学习新内容", "指导练习", "实际运用", "反馈总结"],
  };
}
