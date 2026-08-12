import type { Locale } from "@/lib/i18n";

type LegalKind = "privacy" | "terms" | "cookies";

const content = {
  privacy: {
    en: {
      label: "Privacy",
      title: "Privacy Policy",
      intro:
        "This policy explains how SureMandarin collects, uses, stores, and protects information when you use our website, learning services, mobile applications, and mini program.",
    },
    zh: {
      label: "隐私政策",
      title: "隐私政策",
      intro:
        "本政策说明您使用 SureMandarin 网站、中文学习服务、移动应用和小程序时，我们如何收集、使用、保存和保护相关信息。",
    },
  },
  terms: {
    en: {
      label: "Legal",
      title: "Terms of Use",
      intro:
        "These terms set out the rules for using SureMandarin services, courses, content, membership plans, and related digital products.",
    },
    zh: {
      label: "法律条款",
      title: "使用条款",
      intro:
        "本条款说明您使用 SureMandarin 网站、课程、内容、会员方案和相关数字服务时需要遵守的规则。",
    },
  },
  cookies: {
    en: {
      label: "Privacy choices",
      title: "Cookie Policy",
      intro:
        "This policy explains how SureMandarin uses cookies and similar technologies to keep the service secure, remember preferences, and understand how the website is used.",
    },
    zh: {
      label: "隐私选择",
      title: "Cookie 政策",
      intro:
        "本政策说明 SureMandarin 如何使用 Cookie 及类似技术来保障服务安全、记住您的偏好并了解网站使用情况。",
    },
  },
} as const;

const sections: Record<
  LegalKind,
  Record<Locale, Array<{ heading: string; paragraphs: string[] }>>
> = {
  privacy: {
    en: [
      {
        heading: "1. Who we are",
        paragraphs: [
          "SureMandarin provides Chinese language learning, cultural education, course consultation, membership, and related digital services. The organisation responsible for your information is SureMandarin. Please contact us at info@suremandarin.com for privacy questions or requests.",
        ],
      },
      {
        heading: "2. Information we collect",
        paragraphs: [
          "We may collect account information such as your name, email address, country, preferred language, and password credentials. We may collect information you submit through course consultations, newsletters, support requests, and membership forms.",
          "When you make a payment, payment details are processed by the selected payment provider. We receive limited transaction information such as payment status, plan, currency, and transaction reference, rather than your full card details.",
          "We may also receive technical information such as device type, browser, approximate location, IP address, cookies, and pages or features used.",
        ],
      },
      {
        heading: "3. How we use information",
        paragraphs: [
          "We use information to create and secure your account, provide courses and learning services, respond to enquiries, process memberships and payments, send requested communications, improve the website and learning experience, prevent abuse, and meet legal obligations.",
          "We send marketing messages only where permitted and provide an unsubscribe or opt-out option.",
        ],
      },
      {
        heading: "4. Sharing and international transfers",
        paragraphs: [
          "We may share information with service providers that help us host the website, operate Strapi, authenticate accounts, send email, process payments, provide analytics, or deliver the website and app. These providers may process information in countries other than your own.",
          "We do not sell personal information. We disclose information when reasonably necessary to protect users, enforce our terms, respond to legal process, or protect our rights.",
        ],
      },
      {
        heading: "5. Retention and security",
        paragraphs: [
          "We keep information only for as long as reasonably necessary for the purposes described here, including account, payment, tax, dispute, and legal record keeping. We use access controls, encrypted connections, and other reasonable safeguards, but no online service can guarantee absolute security.",
        ],
      },
      {
        heading: "6. Your choices and rights",
        paragraphs: [
          "Depending on where you live, you may have rights to access, correct, delete, restrict, object to, or export personal information, and to withdraw consent where processing is based on consent. Contact us at info@suremandarin.com. We may need to verify your identity before completing a request.",
        ],
      },
      {
        heading: "7. Children",
        paragraphs: [
          "Our services are not directed to children who cannot lawfully use them without appropriate consent. If you believe a child has provided personal information improperly, contact us so we can review and remove it where appropriate.",
        ],
      },
      {
        heading: "8. Changes and contact",
        paragraphs: [
          "We may update this policy when our services, technology, or legal obligations change. The latest version will be posted on this page with its effective date. This is a general template and should be reviewed against the jurisdictions in which SureMandarin operates before production launch.",
        ],
      },
    ],
    zh: [
      {
        heading: "1. 我们是谁",
        paragraphs: [
          "SureMandarin 提供中文学习、文化教育、课程咨询、会员和相关数字服务。负责处理您信息的主体为 SureMandarin。如有隐私问题或请求，请发送邮件至 info@suremandarin.com。",
        ],
      },
      {
        heading: "2. 我们收集的信息",
        paragraphs: [
          "我们可能收集姓名、电子邮箱、国家/地区、首选语言和账户密码等注册信息，也会收集您在课程咨询、订阅、客服和会员表单中主动提交的信息。",
          "付款时，支付信息由相应支付服务商处理。我们通常只接收支付状态、套餐、币种和交易编号等有限信息，不接收完整银行卡信息。",
          "我们还可能收集设备类型、浏览器、概略位置、IP 地址、Cookie 以及您使用的页面和功能等技术信息。",
        ],
      },
      {
        heading: "3. 信息如何使用",
        paragraphs: [
          "我们使用这些信息来创建和保护账户、提供课程和学习服务、回复咨询、处理会员和付款、发送您主动订阅的通知、改进网站和学习体验、防止滥用并履行法律义务。",
          "营销信息仅在法律允许的情况下发送，并提供取消订阅或拒绝接收的方式。",
        ],
      },
      {
        heading: "4. 信息共享和跨境传输",
        paragraphs: [
          "我们可能与协助网站托管、Strapi 后台、账户认证、邮件发送、支付处理、数据分析和网站/App 交付的服务商共享必要信息。这些服务商可能在您所在国家/地区以外处理信息。",
          "我们不会出售个人信息。为保护用户、执行使用条款、回应合法请求或保护我们的权利，在合理必要时我们可能披露相关信息。",
        ],
      },
      {
        heading: "5. 保存期限与安全",
        paragraphs: [
          "我们仅在实现本政策目的所需的合理期限内保存信息，同时考虑账户、支付、税务、争议和法律记录需要。我们会使用访问控制、加密连接和其他合理安全措施，但任何在线服务都无法保证绝对安全。",
        ],
      },
      {
        heading: "6. 您的选择和权利",
        paragraphs: [
          "根据您所在地区的法律，您可能有权访问、更正、删除、限制处理、反对处理或导出个人信息，并可在基于同意处理时撤回同意。如需提出请求，请联系 info@suremandarin.com。我们可能需要先验证您的身份。",
        ],
      },
      {
        heading: "7. 儿童信息",
        paragraphs: [
          "我们的服务不针对依法不能在适当同意下使用服务的儿童。如果您认为儿童不当提交了个人信息，请联系我们，我们会在适当情况下进行核查和删除。",
        ],
      },
      {
        heading: "8. 更新与联系方式",
        paragraphs: [
          "当服务、技术或法律义务发生变化时，我们可能更新本政策。最新版本及生效日期会发布在本页面。本页面是通用模板，正式上线前应结合 SureMandarin 实际运营地区进行法律审核。",
        ],
      },
    ],
  },
  terms: {
    en: [
      {
        heading: "1. Accepting these terms",
        paragraphs: [
          "By accessing SureMandarin, creating an account, booking a course, or purchasing a membership, you agree to these terms and our Privacy Policy. If you do not agree, do not use the service.",
        ],
      },
      {
        heading: "2. Accounts",
        paragraphs: [
          "You must provide accurate information, keep your login credentials confidential, and promptly tell us if you suspect unauthorised access. You are responsible for activity carried out through your account unless caused by our failure to use reasonable security measures.",
        ],
      },
      {
        heading: "3. Courses and memberships",
        paragraphs: [
          "Course descriptions, schedules, teachers, availability, and prices may change. A course booking or membership becomes active after confirmation and successful payment where payment is required. Membership benefits depend on the plan shown at the time of purchase and may be subject to reasonable usage limits.",
        ],
      },
      {
        heading: "4. Payments, cancellation, and refunds",
        paragraphs: [
          "Payments are processed by the payment provider shown at checkout. You authorise the applicable charge and agree to provide current billing information. Cancellation, renewal, refund, and rescheduling rules will be shown before you complete a booking or subscription. Where mandatory consumer law gives you additional rights, those rights remain unaffected.",
        ],
      },
      {
        heading: "5. Acceptable use",
        paragraphs: [
          "Do not misuse the service, interfere with its operation, scrape or copy protected content without permission, attempt unauthorised access, upload harmful code, impersonate another person, or use learning materials to infringe another person's rights.",
        ],
      },
      {
        heading: "6. Content and intellectual property",
        paragraphs: [
          "SureMandarin and its licensors own the website, brand assets, course materials, software, and original content unless stated otherwise. We grant you a limited, personal, non-transferable right to use purchased learning materials for your own learning. You may not resell, publish, or redistribute them.",
        ],
      },
      {
        heading: "7. Third-party services",
        paragraphs: [
          "The service may contain links or integrations for authentication, payments, video, analytics, or social platforms. Those services have their own terms and policies. We are not responsible for third-party services outside our reasonable control.",
        ],
      },
      {
        heading: "8. Disclaimer and liability",
        paragraphs: [
          "We aim to provide reliable learning services but do not promise uninterrupted availability or a particular learning result. To the maximum extent permitted by law, SureMandarin is not liable for indirect or consequential loss. Nothing in these terms limits liability that cannot legally be limited.",
        ],
      },
      {
        heading: "9. Changes and contact",
        paragraphs: [
          "We may update these terms as the service develops. Continued use after an update means you accept the updated terms. Questions should be sent to info@suremandarin.com. This is a general template and requires legal review before production use.",
        ],
      },
    ],
    zh: [
      {
        heading: "1. 接受本条款",
        paragraphs: [
          "访问 SureMandarin、创建账户、预约课程或购买会员，即表示您同意本使用条款和隐私政策。如不同意，请停止使用服务。",
        ],
      },
      {
        heading: "2. 账户",
        paragraphs: [
          "您应提供真实准确的信息，妥善保管登录凭据，并在发现未经授权的访问时及时联系我们。除非由我们未采取合理安全措施造成，您应对账户下的活动负责。",
        ],
      },
      {
        heading: "3. 课程与会员",
        paragraphs: [
          "课程说明、时间安排、教师、名额和价格可能发生变化。需要付款的课程或会员在确认并成功付款后生效。会员权益以购买时显示的套餐内容为准，并可能适用合理使用限制。",
        ],
      },
      {
        heading: "4. 付款、取消与退款",
        paragraphs: [
          "付款由结算页面显示的支付服务商处理。您授权支付相应费用，并同意提供最新的账单信息。取消、续费、退款和改课规则会在预约或订阅前展示。法律规定的消费者权利不受本条款影响。",
        ],
      },
      {
        heading: "5. 可接受的使用方式",
        paragraphs: [
          "不得滥用服务、干扰系统运行、未经许可抓取或复制受保护内容、尝试未经授权访问、上传恶意代码、冒充他人，或使用学习材料侵犯他人权利。",
        ],
      },
      {
        heading: "6. 内容与知识产权",
        paragraphs: [
          "除非另有说明，网站、品牌素材、课程材料、软件和原创内容归 SureMandarin 或其许可方所有。我们授予您个人、有限、不可转让的学习材料使用权，不得转售、公开发布或再分发。",
        ],
      },
      {
        heading: "7. 第三方服务",
        paragraphs: [
          "网站可能接入账户认证、支付、视频、分析或社交平台。这些服务有各自的条款和政策，我们不对合理控制范围以外的第三方服务负责。",
        ],
      },
      {
        heading: "8. 免责声明与责任",
        paragraphs: [
          "我们会努力提供稳定的学习服务，但不保证持续不中断或必然取得特定学习结果。在法律允许的最大范围内，SureMandarin 不对间接或后果性损失负责。法律不能排除的责任不受本条限制。",
        ],
      },
      {
        heading: "9. 更新与联系方式",
        paragraphs: [
          "随着服务发展，我们可能更新本条款。更新后继续使用服务即表示接受新版条款。如有问题，请联系 info@suremandarin.com。本页面是通用模板，正式上线前需要法律审核。",
        ],
      },
    ],
  },
  cookies: {
    en: [
      {
        heading: "1. What cookies are",
        paragraphs: [
          "Cookies are small files placed on your device by a website. Similar technologies, such as local storage or pixels, may serve comparable purposes.",
        ],
      },
      {
        heading: "2. How we use them",
        paragraphs: [
          "We use necessary technologies to keep accounts secure, maintain sessions, remember language preferences, protect forms, and make core features work. Where enabled, preference or analytics technologies help us remember choices and understand aggregate usage.",
        ],
      },
      {
        heading: "3. Third parties",
        paragraphs: [
          "Payment, authentication, video, analytics, and embedded content providers may set their own technologies when you use those features. Their processing is governed by their own policies.",
        ],
      },
      {
        heading: "4. Managing cookies",
        paragraphs: [
          "You can manage or delete cookies through your browser settings. Blocking necessary cookies may prevent login, language switching, payments, or other features from working correctly. Where a consent tool is enabled, you can change optional choices there.",
        ],
      },
      {
        heading: "5. Updates and contact",
        paragraphs: [
          "We may update this policy when our technologies change. Questions about cookies can be sent to info@suremandarin.com. This is a general template and should be checked against the actual analytics, advertising, and consent tools enabled before launch.",
        ],
      },
    ],
    zh: [
      {
        heading: "1. 什么是 Cookie",
        paragraphs: [
          "Cookie 是网站写入您设备的小型文件。本地存储或像素等类似技术也可能实现相近功能。",
        ],
      },
      {
        heading: "2. 我们如何使用",
        paragraphs: [
          "我们使用必要技术来保护账户、维持登录状态、记住语言偏好、保护表单并确保核心功能运行。在启用的情况下，偏好或分析技术还会帮助我们记住选择并了解汇总使用情况。",
        ],
      },
      {
        heading: "3. 第三方技术",
        paragraphs: [
          "当您使用支付、认证、视频、分析或嵌入内容功能时，相关服务商可能设置自己的技术。其处理行为受各自政策约束。",
        ],
      },
      {
        heading: "4. 如何管理 Cookie",
        paragraphs: [
          "您可以通过浏览器设置管理或删除 Cookie。禁用必要 Cookie 可能导致登录、语言切换、支付或其他功能无法正常运行。如果网站启用了同意管理工具，您也可以在那里修改可选技术的选择。",
        ],
      },
      {
        heading: "5. 更新与联系方式",
        paragraphs: [
          "当网站技术发生变化时，我们可能更新本政策。如有 Cookie 问题，请联系 info@suremandarin.com。本页面是通用模板，正式上线前应根据实际启用的分析、广告和同意管理工具进行核对。",
        ],
      },
    ],
  },
};

export function LegalPage({
  kind,
  locale,
}: {
  kind: LegalKind;
  locale: Locale;
}) {
  const copy = content[kind][locale];
  return (
    <div className="soft-gradient min-h-[calc(100vh-5rem)] py-12 sm:py-20">
      <div className="page-shell max-w-5xl">
        <div className="rounded-[2rem] bg-white p-7 shadow-xl sm:p-12 lg:p-16">
          <p className="section-kicker">{copy.label}</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-brand-navy sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600">
            {copy.intro}
          </p>
          <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            {locale === "zh"
              ? "通用模板：正式上线前请根据公司注册地、实际服务商和运营地区进行法律审核。"
              : "General template: please review this page with legal counsel against your entity, providers, and operating regions before launch."}
          </p>
          <div className="mt-12 grid gap-9">
            {sections[kind][locale].map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl font-extrabold text-brand-navy">
                  {section.heading}
                </h2>
                <div className="mt-3 grid gap-3 text-sm leading-7 text-slate-600">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <p className="mt-12 border-t border-brand-line pt-6 text-xs text-slate-400">
            {locale === "zh"
              ? "最后更新：2026 年 8 月 5 日"
              : "Last updated: August 5, 2026"}
          </p>
        </div>
      </div>
    </div>
  );
}
