export type EditorialGuide = {
  en: { body: string; excerpt: string };
  zh: { body: string; excerpt: string };
};

// Original learning guides for existing article URLs. Published CMS content takes precedence.
export const editorialGuides: Record<string, EditorialGuide> = {
  "how-ai-is-changing-language-learning": {
    en: {
      excerpt: "Use AI for a focused Mandarin role-play, check its corrections, and bring the difficult moments to a real teacher.",
      body: `AI can provide another place to practise Chinese between lessons. Its most useful role is specific: help you rehearse a situation, try a sentence, or compare ways of saying something. A fluent-looking answer is not proof that its Chinese, explanation, or pronunciation feedback is correct.

## Give the practice a clear job

Instead of asking a chatbot to “teach me Chinese,” set one scene and a limit. Try this prompt:

> Act as a café server. Use short Mandarin sentences suitable for a beginner. Ask one question at a time. Wait for my answer, then correct only the most important mistake. Show pinyin after I try.

Prepare three phrases before you start:

- 我要热咖啡。Wǒ yào rè kāfēi. — I would like hot coffee.
- 可以少放糖吗？Kěyǐ shǎo fàng táng ma? — Could you use less sugar?
- 请再说一次。Qǐng zài shuō yí cì. — Please say that again.

Answer first without a translation tool. Then compare the correction with your intended meaning. If you meant “less sugar,” check that the suggested sentence has not changed it to “no sugar.”

## Keep a small correction record

Save your original sentence, the proposed correction, and one question. For example: “Why is 热 before 咖啡 here?” Ask for an explanation and a second example, then check a doubtful answer with a teacher or a reliable dictionary. Avoid collecting ten alternative expressions when you cannot yet use the first one.

Typed exchanges do not show how you pronounce tones. Even when a tool accepts speech, an accurate transcript is not the same as a pronunciation assessment. A teacher can listen to the actual sound and choose the next correction with you.

[UNESCO's guidance on generative AI in education](https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research) supports a human-centred approach and attention to privacy. Practise with invented bookings rather than sharing personal documents or customer information.

## Turn the rehearsal into a conversation

Close the chat and order again from memory. Change one detail: hot coffee becomes hot tea, 热茶 rè chá. Keep the sentence you could not finish for your next [live online Chinese lesson](/en/courses/online-course). For another short speaking task, visit [SureMandarin Daily](/en/daily).`,
    },
    zh: {
      excerpt: "用 AI 练习具体中文场景，检查修改是否准确，再把真正困难的地方带到真人课堂。",
      body: `AI 可以成为中文课之外的练习伙伴，帮助你排练一个场景、尝试一句表达，或比较两种说法。但回答看起来流利，不代表其中的中文、语法解释或发音判断一定正确。最好先给它一个小任务，再判断练习是否真的帮助你表达了原本的意思。

## 每次只练一个场景

不要只输入“教我中文”，可以使用下面这段提示：

> 请扮演咖啡店店员，用适合初学者的简短中文，一次只问一个问题。等我回答后，只纠正最影响理解的一处错误。我先尝试，再显示拼音。

开始前准备三句话：

- 我要热咖啡。Wǒ yào rè kāfēi. — I would like hot coffee.
- 可以少放糖吗？Kěyǐ shǎo fàng táng ma? — Could you use less sugar?
- 请再说一次。Qǐng zài shuō yí cì. — Please say that again.

先不用翻译工具，独立回答。查看修改时，先比较意思是否相同。例如，你想表达“少放糖”，就检查 AI 有没有擅自改成“不放糖”。如果词汇突然变难，可以要求它保留你已经学过的词。

## 留下一份小小的纠错记录

每次只保存原句、建议修改和一个问题。例如：“为什么‘热’放在‘咖啡’前面？”请它解释并给出另一个例句，再把有疑问的解释交给老师或可靠词典核对。还不能使用第一句话时，不必同时收藏十种替代表达。

打字练习不能说明你的声调是否准确。即使工具能接受语音，转写正确也不等于完成了发音评估。老师可以听实际声音，结合你的学习目标，判断现在最值得纠正的地方。

[联合国教科文组织的生成式 AI 教育指南](https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research)强调以人为中心，并关注隐私。练习预约和工作场景时，可以使用虚构信息，不需要上传个人证件或客户资料。

## 从屏幕练习走向真实表达

关闭聊天记录，再凭记忆点一次咖啡。第二次把“热咖啡”换成“热茶 rè chá”，观察自己能否灵活替换。把仍然说不完整的句子带到下一节[在线中文课程](/zh/courses/online-course)，请老师帮助检查。也可以在[SureMandarin 7 天挑战](/zh/daily)中继续完成短口语练习。`,
    },
  },
  "hsk-and-real-life-chinese": {
    en: {
      excerpt: "Connect HSK preparation with everyday listening and speaking through one topic, two tasks, and a practical progress record.",
      body: `HSK preparation and everyday Chinese can support each other, but they are not identical tasks. Recognising an answer in a practice question differs from finding your own words while someone waits for a reply. Plan for both instead of treating a score as a complete description of your communication skills.

## Check the exam you actually plan to take

Use the [official Chinese Tests Service website](https://www.chinesetest.cn/) for the relevant syllabus, sample questions, registration information, and test-centre notices. Confirm the format with your chosen centre. Do not build a study plan around an old vocabulary list or assume that every institution has the same admission requirement.

Write two separate goals: the exam you are preparing for and a situation you want to handle. “Improve my Chinese” is difficult to practise; “change an appointment and understand the new time” gives you a clear speaking task.

## Give one topic two kinds of practice

Take scheduling. First, complete a suitable listening or reading exercise from your exam materials. Check why each wrong answer was wrong. Then put the same vocabulary into a conversation:

- 我想改一下时间。Wǒ xiǎng gǎi yíxià shíjiān. — I would like to change the time.
- 星期三下午可以吗？Xīngqīsān xiàwǔ kěyǐ ma? — Would Wednesday afternoon work?
- 几点比较方便？Jǐ diǎn bǐjiào fāngbiàn? — What time would be more convenient?

Ask a partner to offer a different day. Respond without reading your script. This checks whether you can adapt familiar vocabulary when the conversation changes, not just repeat a prepared answer.

## Track what happens after the answer

Keep a short record: what you understood, what you said independently, and where you needed help. A correct multiple-choice answer with an uncertain explanation needs review. A spoken answer that communicates successfully but takes a long pause needs a different kind of practice.

Bring both observations to a teacher. A [private Chinese course](/en/courses/private-course) can leave room for your exam target and everyday situations. Our [Chinese level test](/en/level-test) offers a starting point for a learning conversation; it is not an official HSK result or a substitute for the test provider's assessment.`,
    },
    zh: {
      excerpt: "把 HSK 备考和日常沟通结合起来：同一个主题，同时练习试题理解、真实回应和学习复盘。",
      body: `HSK 备考与日常中文能够相互帮助，但练习任务并不完全相同。在选择题里认出正确答案，与别人等你回答时独立组织语言，是两种不同的表现。因此，学习计划既可以保留考试目标，也应该给真实沟通留下空间，不必把一个分数当作个人中文能力的全部说明。

## 先确认自己准备参加的考试

请通过[中文考试服务网官方入口](https://www.chinesetest.cn/)查看适用大纲、样题、报名信息和考点通知，并向选定考点确认考试形式。不要只依赖旧词表安排学习，也不要假设所有学校或机构的申请要求相同。

分别写下两个目标：准备什么考试，以及希望独立完成什么事情。“提高中文”不容易安排练习；“修改预约，并听懂新的时间”就能变成一个具体任务。

## 同一个主题，做两种练习

以安排时间为例，先完成备考材料中适合自己的一段听力或阅读，检查每个错误选项为什么不对。接着把刚才的词语用于对话：

- 我想改一下时间。Wǒ xiǎng gǎi yíxià shíjiān. — I would like to change the time.
- 星期三下午可以吗？Xīngqīsān xiàwǔ kěyǐ ma? — Would Wednesday afternoon work?
- 几点比较方便？Jǐ diǎn bǐjiào fāngbiàn? — What time would be more convenient?

请同伴故意提出另一天，你不看稿子回应。如果“星期三”改成“星期四”后就无法继续，可以先练习替换日期，而不是立即增加更多生词。这样检查的是你能否灵活使用熟悉内容，而不只是背出准备好的答案。

## 记录答案之外的表现

每次留下三条记录：听懂了什么、独立说出了什么、在哪里需要帮助。选择题答对但说不清理由，说明需要核对理解；意思表达清楚但停顿很长，则可以安排重复提取和对话练习。这两种情况不必使用同一种补课方法。

把试题错误和口语困难一起带给老师。[一对一中文课程](/zh/courses/private-course)可以围绕你的考试目标与生活场景安排练习。也可以先完成[中文水平测试](/zh/level-test)，为沟通学习计划提供起点；站内测试不是官方 HSK 成绩，也不能替代考试机构的正式评估。`,
    },
  },
  "how-to-practise-tones": {
    en: {
      excerpt: "Practise Mandarin tones with meaningful contrasts, two-syllable words, short recordings, and one correction at a time.",
      body: `To practise Mandarin tones, connect the sound to a meaning, then move from single syllables into words and sentences. Drawing a pitch line is a useful reminder, but listening and checking your own voice are what make the exercise concrete.

## Hear a difference before copying it

Start with 妈 mā, “mum,” and 马 mǎ, “horse.” Listen to a clear recording of each, in a mixed order, without looking at the spelling. Point to the meaning you heard, then check. If you keep confusing the pair, spend another round listening before trying to speak faster.

The usual beginner labels are high and level for the first tone, rising for the second, low or dipping for the third, and falling for the fourth. Keep your voice comfortable. Tone practice does not require shouting or singing at an unusually high pitch.

## Practise the tone inside a word

Use a small set of useful words:

- 咖啡 kāfēi — coffee: first tone + first tone.
- 中文 Zhōngwén — Chinese: first tone + second tone.
- 水果 shuǐguǒ — fruit: two underlying third tones.
- 谢谢 xièxie — thank you: fourth tone + a light neutral syllable.

In a two-third-tone word such as 水果, the first syllable takes a rising tone in normal speech, although dictionary pinyin keeps its third-tone mark. [Hong Kong Polytechnic University's tone-sandhi explanation](https://www.polyu.edu.hk/bepth/introduction-to-phonetics/tones/tone-sandhi/) explains this distinction. Do not force a large dip and rise onto every third-tone syllable in connected speech.

## Make one short recording

Say 我喝咖啡。Wǒ hē kāfēi. — “I drink coffee.” Listen once for the tones in 咖啡, rather than judging your entire accent. Record a second attempt after checking a model or receiving feedback. Keep the clearer attempt and note the specific change you made.

For today's task, practise three words, then use each in a sentence whose meaning you understand. Ask a teacher to identify one recurring confusion in a [private lesson](/en/courses/private-course). Use [Daily speaking practice](/en/daily) for a manageable next task, and judge progress by clearer, more consistent words rather than speed alone.`,
    },
    zh: {
      excerpt: "把普通话声调放进有意义的词和句子里，通过听辨、双音节词、短录音和针对性反馈逐步练习。",
      body: `练普通话声调，可以先把声音和意思联系起来，再从单个音节走向词语和句子。声调曲线能帮助记忆，但真正的练习需要听清区别、尝试发音，并检查自己的录音，而不是只会说出“第几声”。

## 先听出区别，再模仿

从“妈 mā”和“马 mǎ”开始。准备清晰的示范录音，打乱顺序播放，先不看拼音，只选择听到的意思，然后核对。如果总把这两个音混淆，先多听一轮，不用急着提高说话速度。

初学时可以把第一声理解为高而平，第二声为上升，第三声为低或先降后升，第四声为下降。练习时保持舒服的音域，不需要大声喊，也不需要把声音抬到不自然的高度。曲线只是入门提醒，连起来说话时还要听真实语流。

## 在完整词语里练声调

选择几个日常会用的词：

- 咖啡 kāfēi：第一声＋第一声。
- 中文 Zhōngwén：第一声＋第二声。
- 水果 shuǐguǒ：两个字的本调都是第三声。
- 谢谢 xièxie：第四声＋较轻的轻声音节。

像“水果”这样的两个第三声连读，前一个音节在实际说话中读成上升调，但词典拼音仍保留第三声标记。[香港理工大学的变调教学说明](https://www.polyu.edu.hk/bepth/introduction-to-phonetics/tones/tone-sandhi/)解释了这个区别。不要看到第三声，就在每个句中音节上刻意完成一次夸张的先降后升。

## 只录一句，只检查一个问题

试着说：“我喝咖啡。Wǒ hē kāfēi.” 听录音时只检查“咖啡”两个音节，不必同时评价自己的全部口音。核对示范或得到反馈后，再录一次，留下更清楚的版本，并记下具体调整了什么。

今天可以选三个词，各放进一句自己理解的短句。请老师在[一对一课程](/zh/courses/private-course)中帮助找出一个反复出现的声调问题，再集中练习；也可以使用[7 天中文挑战](/zh/daily)保持短口语练习。判断进步时，先看词语是否更清楚、更稳定，不只看说得有多快。`,
    },
  },
  "how-to-use-pinyin-well": {
    en: {
      excerpt: "Learn pinyin alongside audio and meaning, keep tone marks, and gradually practise recalling Chinese without the written prompt.",
      body: `Pinyin represents Mandarin pronunciation with Roman letters and tone marks. It helps you look up words and connect writing with sound, but its letters do not always work like English spelling. The aim is to hear and say a Chinese word, not to pronounce a familiar-looking sequence as English.

## Store sound, meaning, and writing together

Make a learning note with four parts: 汉字, pinyin, meaning, and a short recording. For example:

- 中文 — Zhōngwén — Chinese.
- 学习 — xuéxí — to study or learn.
- 喝茶 — hē chá — to drink tea.

Listen before reading the pinyin aloud. Then cover the transcription and try the word from the meaning. Uncover it only to check. [MIT OpenCourseWare's introductory Chinese materials](https://ocw.mit.edu/courses/res-21g-003-learning-chinese-a-foundation-course-in-mandarin-spring-2011/) provide text and accompanying audio for studying these connections.

## Keep the details that distinguish words

Do not drop tone marks from your notes: 买 mǎi means “buy,” while 卖 mài means “sell.” Practise them in short, different contexts, such as 买茶 mǎi chá, “buy tea,” and 卖茶 mài chá, “sell tea.” Point to the meaning before speaking.

Pay attention to syllable boundaries too. 西安 Xī'ān has two syllables; 先 xiān has one. The apostrophe helps you see that distinction. Spaces in normal pinyin generally separate words, not every individual character, so avoid assuming that every visible chunk must contain only one syllable.

## Remove the support in stages

Use three passes through the same short sentence:

1. Listen while reading 我在学习中文。Wǒ zài xuéxí Zhōngwén. — “I am learning Chinese.”
2. Read the characters and say it without looking at the pinyin.
3. Hide both lines and say something true about your own learning.

If the second pass is too difficult, restore the pinyin for the unfamiliar word only. There is no need to remove it all at once. Character recognition and pronunciation can develop at different speeds.

Bring confusing sounds to a [beginner-friendly private Chinese lesson](/en/courses/private-course). If you are unsure where to start, use the [Chinese level test](/en/level-test) to identify questions for a learning advisor, then practise a few useful words well.`,
    },
    zh: {
      excerpt: "把拼音、录音、汉字和意思一起学，保留声调标记，再逐步练习不看拼音也能说出中文。",
      body: `拼音用字母和声调符号记录普通话发音，能帮助查词，并把文字与声音联系起来。但拼音字母并不总按英语字母的方式发音。学习目标是听懂并说出一个中文词，而不是把一串看起来熟悉的字母按英语读出来。

## 把四种信息放在一起

每条学习笔记可以包括汉字、拼音、意思和一段短录音，例如：

- 中文 — Zhōngwén — Chinese。
- 学习 — xuéxí — to study or learn。
- 喝茶 — hē chá — to drink tea。

先听示范，再看拼音读。之后遮住拼音，根据意思尝试说出词语，最后揭开核对。[MIT OpenCourseWare 的中文入门材料](https://ocw.mit.edu/courses/res-21g-003-learning-chinese-a-foundation-course-in-mandarin-spring-2011/)提供文字和配套录音，可以用来练习声音与文字之间的联系。不要只收藏没有听过的拼音笔记。

## 别省略能区分意思的细节

记录词语时保留声调：“买 mǎi”是 buy，“卖 mài”是 sell。可以分别练“买茶 mǎi chá”和“卖茶 mài chá”，说之前先确定自己表达的是购买还是出售。这样声调就与真实意思相连，而不只是词语旁边的装饰。

也要注意音节边界。“西安 Xī'ān”有两个音节，“先 xiān”只有一个；隔音符号能帮助看出区别。正常拼音中的空格通常按词划分，并不是每个汉字后都加空格，因此一个连续书写的词可能包含多个音节。

## 分三次减少对拼音的依赖

用同一句话做三个步骤：

1. 一边听，一边读：“我在学习中文。Wǒ zài xuéxí Zhōngwén.”
2. 只看汉字，不看拼音，再说一遍。
3. 把两行都遮住，用这句话介绍自己真实的学习情况。

如果第二步困难，只给还不熟悉的词恢复拼音，不必一次全部去掉。认字和发音可以有不同的学习速度。完成第三步后，隔一会儿再尝试一次，检查自己是否仍然能说出来，而不是只记住刚才的视觉位置。

容易混淆的声音可以带到[一对一中文课程](/zh/courses/private-course)请老师检查。如果不确定从哪里开始，可以先做[中文水平测试](/zh/level-test)，整理需要向学习顾问询问的问题，再把少量常用词练扎实。`,
    },
  },
  "a-beginners-guide-to-chinese-food": {
    en: {
      excerpt: "Use practical Mandarin for reading a menu, ordering a dish, asking about ingredients, and checking the bill.",
      body: `You do not need to recognise every dish on a Chinese menu before ordering. Start with the main ingredient, how it is cooked, and what you need to ask. Food names can be playful or regional, so a familiar character is a clue rather than a complete ingredient list.

## Find a few useful menu words

Look for 米饭 mǐfàn, rice; 面条 miàntiáo, noodles; 牛肉 niúròu, beef; 鸡肉 jīròu, chicken; and 蔬菜 shūcài, vegetables. Cooking words such as 炒 chǎo, stir-fry, and 蒸 zhēng, steam, can help you form a first impression.

Ask about a dish before guessing its contents:

- 这道菜有什么？Zhè dào cài yǒu shénme? — What is in this dish?
- 辣吗？Là ma? — Is it spicy?
- 可以少放辣椒吗？Kěyǐ shǎo fàng làjiāo ma? — Could you use less chilli?

A request for less chilli is not a guarantee about ingredients. If an ingredient matters to you, name it explicitly and confirm that the staff understand.

## Build a short ordering exchange

Try this with a partner or teacher:

> Guest: 请给我一份炒饭。Qǐng gěi wǒ yí fèn chǎofàn. — One portion of fried rice, please.
>
> Server: 要喝什么？Yào hē shénme? — What would you like to drink?
>
> Guest: 热茶，谢谢。Rè chá, xièxie. — Hot tea, thank you.

Change the dish on the second attempt. Then let your partner say that it is unavailable. Practise pointing to another option and asking its name rather than restarting your memorised dialogue.

## Check details without rushing

“可以看看菜单吗？Kěyǐ kànkan càidān ma?” asks to see the menu. “请结账。Qǐng jiézhàng.” asks for the bill. Before paying, compare the dishes and quantities with what you ordered. Ask the server to explain an unfamiliar item.

For today's practice, choose three dishes from a real menu and prepare one question about each. Treat regional food as something to explore, not a rule that everyone in a city eats the same way. A [Learn & Travel Chinese course](/en/courses/learn-and-travel-course) can connect language with cultural situations; [Daily speaking practice](/en/daily) offers another place to rehearse a short request.`,
    },
    zh: {
      excerpt: "从看菜单到点菜、询问食材和结账，用简单实用的中文完成一次更有把握的用餐交流。",
      body: `在中国餐厅点餐，不必先认识菜单上的每一道菜。可以从主要食材、烹饪方式，以及自己需要问的问题入手。有些菜名带有地方特色或形象比喻，所以认出一个熟悉的字，只能提供线索，不能代替完整的食材说明。

## 先认识常见菜单词

从“米饭 mǐfàn”“面条 miàntiáo”“牛肉 niúròu”“鸡肉 jīròu”“蔬菜 shūcài”开始。再认识“炒 chǎo”和“蒸 zhēng”等做法，就能对不少菜形成初步判断。遇到不熟悉的名称，可以直接问，不必假装已经理解。

- 这道菜有什么？Zhè dào cài yǒu shénme? — What is in this dish?
- 辣吗？Là ma? — Is it spicy?
- 可以少放辣椒吗？Kěyǐ shǎo fàng làjiāo ma? — Could you use less chilli?

“少放辣椒”只是对辣度的请求，不能保证菜里没有某种食材。如果你需要确认特定原料，请直接说清楚它的名称，并确认工作人员理解了你的意思。

## 练习一段短点餐对话

可以与同伴或老师分别扮演顾客和服务员：

> 顾客：请给我一份炒饭。Qǐng gěi wǒ yí fèn chǎofàn. — One portion of fried rice, please.
>
> 服务员：要喝什么？Yào hē shénme? — What would you like to drink?
>
> 顾客：热茶，谢谢。Rè chá, xièxie. — Hot tea, thank you.

第二次替换菜名。第三次让同伴告诉你这道菜没有了，练习指向另一个选项、询问名称并重新选择。这样练习的是实际应对，而不只是从头到尾背出一段固定台词。

## 不着急，先确认细节

“可以看看菜单吗？Kěyǐ kànkan càidān ma?” 用于请对方提供菜单。“请结账。Qǐng jiézhàng.” 用于结账。付款前，可以核对菜品和数量；不明白账单上的项目时，请服务员解释，不必因为担心中文不够好就跳过确认。

今天的任务是从一份真实菜单中选择三道菜，每道准备一个问题。探索地方菜时，保留好奇心，不把“某地菜”当成当地每个人都一样的饮食习惯。[中文游学课程](/zh/courses/learn-and-travel-course)可以把语言练习和文化场景联系起来；也可以在[7 天中文挑战](/zh/daily)中继续练习简短请求。`,
    },
  },
  "understanding-chinese-names": {
    en: {
      excerpt: "Recognise family and given names, ask how someone wants to be addressed, and practise introducing yourself in Mandarin.",
      body: `In a Chinese name written in the usual Chinese order, the family name comes before the given name. For 李明 Lǐ Míng, 李 Lǐ is the family name and 明 Míng is the given name. But international settings, personal preferences, and different naming traditions can change how a name is presented. Ask rather than relying on its position alone.

## Learn how the person introduces themselves

Listen for “我姓李。Wǒ xìng Lǐ.” — “My family name is Li,” or “我叫李明。Wǒ jiào Lǐ Míng.” — “My name is Li Ming.” The verb 姓 xìng introduces a family name; 叫 jiào can introduce the name a person uses.

Try a short introduction of your own:

> 你好，我叫安娜。Nǐ hǎo, wǒ jiào Ānnà. — Hello, my name is Anna.
>
> 请问，怎么称呼您？Qǐngwèn, zěnme chēnghu nín? — May I ask how I should address you?

This lets the other person choose the name or title they prefer. It is often more useful than asking you to guess the correct level of formality.

## Use titles with attention to context

If your teacher introduces herself as 李老师 Lǐ lǎoshī, “Teacher Li,” follow that form. A surname plus 老师 is a familiar classroom address. Do not attach a title simply because you have guessed someone's age, occupation, or gender. Friends and colleagues may prefer a full name, given name, or another chosen name.

When exchanging written details, ask “您的名字怎么写？Nín de míngzi zěnme xiě?” — “How do you write your name?” Several characters can share a pronunciation. Copy the spelling the person gives you instead of choosing a character from sound alone.

## Choose your own Chinese name thoughtfully

A Chinese name is optional. If you want one, discuss its pronunciation, meaning, and naturalness with a teacher, then practise introducing it. Do not assume a literal dictionary translation of your English name will work well as a personal name.

For today's task, practise meeting two people who prefer different forms of address. A [group Chinese course](/en/courses/group-course) provides a setting for introductions and follow-up questions. You can also rehearse a short self-introduction in [SureMandarin Daily](/en/daily).`,
    },
    zh: {
      excerpt: "分清中文姓名中的姓与名，学会询问对方希望怎样被称呼，并练习自然、尊重个人习惯的自我介绍。",
      body: `按中文通常的姓名顺序，姓在前，名在后。例如“李明 Lǐ Míng”中，“李”是姓，“明”是名。但国际交流中的书写方式、个人偏好以及不同命名传统，可能影响姓名的呈现顺序。遇到不确定的情况，询问本人比根据位置猜测更可靠。

## 先听对方怎样介绍自己

“我姓李。Wǒ xìng Lǐ.” 表示 My family name is Li；“我叫李明。Wǒ jiào Lǐ Míng.” 表示 My name is Li Ming。“姓 xìng”介绍姓氏，“叫 jiào”可以介绍本人使用的名字。把这两个句型分开练，能减少把完整姓名误当成姓氏的情况。

你也可以这样开始交流：

> 你好，我叫安娜。Nǐ hǎo, wǒ jiào Ānnà. — Hello, my name is Anna.
>
> 请问，怎么称呼您？Qǐngwèn, zěnme chēnghu nín? — May I ask how I should address you?

这个问题让对方选择自己喜欢的名字或称呼，不需要你先猜测双方应该有多正式。听到回答后，可以自然地重复一次，顺便确认发音。

## 根据情境使用称谓

如果老师介绍自己为“李老师 Lǐ lǎoshī”，可以沿用这个称呼。姓氏加“老师”是课堂里常见的称呼方式。但不要仅凭自己猜测的年龄、职业或性别，随意给别人加上称谓。朋友和同事可能喜欢全名、名字，或者自己选择的其他称呼。

需要交换书面信息时，可以问：“您的名字怎么写？Nín de míngzi zěnme xiě?” 多个汉字可能有相同读音，因此应按对方提供的写法记录，不要只听声音就自行选字。记联系人时，可以同时保存本人认可的拼写和称呼。

## 中文名可以慢慢选择

学习中文不一定要立即取中文名。如果希望有一个，可以请老师一起检查读音、字义以及作为人名是否自然，再练习介绍它。不要假设把英文名字逐字查词翻译，就能得到合适的中文姓名；最终也应尊重本人对名字的选择。

今天可以安排两个见面场景，让同伴分别使用不同的称呼偏好，练习听懂并跟随对方。[小组中文课程](/zh/courses/group-course)适合练习自我介绍和后续提问，也可以通过[7 天中文挑战](/zh/daily)排练一段简短的个人介绍。`,
    },
  },
  "a-simple-spaced-repetition-plan": {
    en: {
      excerpt: "Build a small Chinese vocabulary review routine that tests recall, corrects mistakes, and brings words back into real sentences.",
      body: `Spaced repetition means returning to material across separate study sessions. For Chinese, make those returns active: try to remember a word or sentence before revealing it. A card that looks familiar is not necessarily a phrase you can produce when you need it.

[Research on retrieval practice and vocabulary learning](https://doi.org/10.1073/pnas.2413511121) examines how recalling words under different cues can support retention. The routine below is a practical starting suggestion, not a scientifically fixed schedule for every learner.

## Make a card that asks you to do something

Start with five expressions you expect to use. Put a situation on the front, not the Chinese answer. For example:

> Front: Ask whether someone has time tomorrow.
>
> Back: 你明天有空吗？Nǐ míngtiān yǒu kòng ma? — Do you have time tomorrow?

Include an audio model if available. 空 is kòng in 有空, “have free time”; recording it inside this expression helps you learn the relevant pronunciation and meaning together.

## Try a small review rhythm

Review later the same day, then the next day, a few days later, and roughly a week later. At each review, say the answer before turning the card. Check both meaning and pronunciation.

If you cannot recall it, look at the answer, say it with understanding, and test it again after other cards. Bring that item back sooner next time. If recall feels comfortable on separate occasions, leave a longer gap. Your actual performance should adjust the schedule.

## Change the cue, not just the card order

Once you can ask about tomorrow, change the situation: ask about this afternoon. Try 你今天下午有空吗？Nǐ jīntiān xiàwǔ yǒu kòng ma? Then answer the question yourself: 我下午有课。Wǒ xiàwǔ yǒu kè. — “I have a class this afternoon.”

This checks whether the expression can support a conversation. Keep a separate note for a missing word, a wrong tone, or a sentence you understand but cannot retrieve.

If reviews pile up, pause new cards and keep the useful expressions. A small collection you can use is easier to maintain than an expanding backlog. Test a reviewed phrase in [Daily speaking practice](/en/daily), or ask a teacher in your [online Chinese course](/en/courses/online-course) to reuse it in a fresh conversation.`,
    },
    zh: {
      excerpt: "用少量实用表达建立中文间隔复习：先主动回想，再核对错误，并把记住的词带回真实句子。",
      body: `间隔复习，是把同一内容安排在分开的学习时段中再次接触。学习中文时，可以把每次复习变成主动回想：先尝试说出词语或句子，再翻开答案。看到卡片觉得眼熟，不一定代表需要开口时能独立使用。

[关于词汇检索练习的研究](https://doi.org/10.1073/pnas.2413511121)考察了不同提示下回想词语与记忆保持的关系。下面的安排是便于开始执行的建议，并不是适用于所有学习者的固定科学时间表。

## 让卡片要求你完成一个任务

先选五个近期可能用到的表达。卡片正面写场景，不直接写中文答案，例如：

> 正面：询问对方明天有没有时间。
>
> 背面：你明天有空吗？Nǐ míngtiān yǒu kòng ma? — Do you have time tomorrow?

有条件时附上清晰录音。“空”在“有空”里读 kòng，把它记在完整表达中，能够同时保留这个用法的读音和意思。不要把卡片做成一大段解释，以至于每次都不知道究竟要回想什么。

## 从一个小节奏开始

可以在当天稍晚、第二天、再隔几天以及大约一周后复习。每次先说答案，再查看卡片，同时核对意思和发音。记得意思但声调不确定，也应留下记录，而不是简单地标成“已掌握”。

如果想不起来，查看答案、理解后读出，再做几张其他卡片，然后回来重试；下一轮更早安排这个词。如果在不同时间都能轻松说出，就可以拉长间隔。复习节奏应跟着实际表现调整。

## 不只打乱顺序，也改变提示

会问“明天有空吗”后，把场景换成“今天下午”：你今天下午有空吗？Nǐ jīntiān xiàwǔ yǒu kòng ma? 再自己回答：“我下午有课。Wǒ xiàwǔ yǒu kè.”

这样检查的是表达能否进入对话。分别记录“缺少一个词”“声调有误”“看得懂但想不起来”，可以更清楚地决定下一次怎么练。如果卡片积压，先暂停新增，只保留近期有用的表达，不必为了打卡数量不断增加负担。

把复习过的一句话用于[7 天中文挑战](/zh/daily)，或者请[在线中文课程](/zh/courses/online-course)的老师换一个情境再次提问，让记忆与真实回应联系起来。`,
    },
  },
  "shadowing-for-natural-rhythm": {
    en: {
      excerpt: "Use short, understandable Mandarin recordings to practise timing and connected speech, then check that you can speak without copying.",
      body: `Shadowing is speaking along with, or just behind, a recorded speaker. It gives you a way to notice the timing of a Mandarin phrase, but copying sound is only one part of learning. First understand the sentence; afterwards check whether you can use it without the recording.

## Choose a manageable model

Pick a clear sentence or a short exchange you mostly understand. Avoid starting with a fast television scene full of unknown words. A teacher's model or the audio accompanying [MIT's introductory Chinese course](https://ocw.mit.edu/courses/res-21g-003-learning-chinese-a-foundation-course-in-mandarin-spring-2011/) can give you material to work with.

Use this sentence as an example:

> 我今天下午有课。Wǒ jīntiān xiàwǔ yǒu kè. — I have a class this afternoon.

Identify who is speaking, when the class is, and what 有课 means. If you cannot explain the sentence, check the meaning before repeating it several times.

## Move from repetition to shadowing

1. Listen without speaking. Notice where the speaker groups words and pauses.
2. Pause the recording and repeat a short chunk. Join the chunks when they feel manageable.
3. Play the sentence again and speak just behind the model. Follow the timing without trying to overpower the recording.
4. Stop the audio and record the complete sentence yourself.

If you keep dropping words, return to pause-and-repeat. You are practising coordination and listening, not trying to win a speed contest. Use a comfortable speaking voice and take a break if your throat feels strained.

## Compare one feature at a time

Listen to your version and the model. Did you insert a pause in the middle of 今天? Did the last word disappear because you ran out of time? Choose one difference to work on. For uncertain tones, ask a teacher to listen rather than assuming that matching the overall melody proves every syllable is correct.

## Make the sentence your own

Replace 下午 xiàwǔ, afternoon, with 上午 shàngwǔ, morning. Then ask a partner when their class is and listen to the reply. This final step reveals whether you can move beyond imitation.

Practise turn-taking in a [group Chinese lesson](/en/courses/group-course), or use [SureMandarin Daily](/en/daily) for a short speaking task. Keep a recording you can compare with your next attempt, not a score you feel obliged to chase.`,
    },
    zh: {
      excerpt: "选择听得懂的短录音，从暂停模仿到同步跟读，再检查离开录音后能否独立表达。",
      body: `影子跟读，是与录音同时或稍晚一点说出听到的内容。它可以帮助你注意普通话短句的时间安排和连贯方式，但模仿声音只是学习的一部分。开始前先理解意思，结束后再检查离开录音是否仍然会用这句话。

## 选择自己能够处理的示范

先选一句清楚的短句，或大部分能听懂的简短对话。不要一开始就追赶充满生词的快速影视片段。老师提供的录音，或者[MIT 中文入门课程的配套音频](https://ocw.mit.edu/courses/res-21g-003-learning-chinese-a-foundation-course-in-mandarin-spring-2011/)，都可以作为选择练习材料的起点。

以这句话为例：

> 我今天下午有课。Wǒ jīntiān xiàwǔ yǒu kè. — I have a class this afternoon.

先确认谁有课、什么时候有课，以及“有课”表达什么。如果还不能解释整句，就先查清意思，不要只是机械重复声音。

## 从暂停模仿走向跟读

1. 先只听不说，注意说话人怎样把词连在一起、在哪里停顿。
2. 暂停录音，模仿一个短语；能够处理后，再把短语连起来。
3. 重新播放，稍晚于示范开口，跟随节奏，不用提高音量盖过录音。
4. 关闭示范，独立录下整句话。

如果反复漏词，就回到暂停后重复的步骤。练习的是听与说的配合，不是比谁追得更快。保持舒服的音量，喉咙不适时先休息；不要把声音疲劳当作练习充分的标志。

## 每次只比较一个特点

交替听自己的录音和示范：是否在“今天”中间停顿了？是否前面拖得太长，导致最后一个字消失？选一个具体差别，下次只改这一处。声调拿不准时，请老师听实际音节，不要因为整句旋律相似，就认为每个字的声调都正确了。

## 最后一定要换成自己的内容

把“下午 xiàwǔ”换成“上午 shàngwǔ”，再问同伴什么时候上课，并听懂回答。这个步骤能检查自己是否从模仿走向了表达，而不是只能跟随同一段录音。

可以在[小组中文课程](/zh/courses/group-course)中练习轮流提问，也可以使用[7 天中文挑战](/zh/daily)安排短口语任务。保存一段便于下次对比的录音，记录实际改进，不必为了追逐一个分数而忽略意思是否表达清楚。`,
    },
  },
};
