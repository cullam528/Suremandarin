# SureMandarin SEO / AI 搜索运营手册

正式前台域名：`https://www.suremandarin.com`。后台 `api.suremandarin.com` 不作为课程营销页面提交收录。

SEO / GEO 的目标是让搜索引擎容易抓取、理解和核实课程及机构信息，并把合适的访客带到咨询流程。代码优化不能承诺排名、收录时间或 AI 一定推荐；Google 的 AI 搜索沿用搜索的基础要求，不存在付费开通或特定文件即可保证推荐的机制。[Google AI 搜索说明](https://developers.google.com/search/docs/appearance/ai-features)

## 1. 上线后需要站长完成的一次性设置

1. 在 [Google Search Console](https://search.google.com/search-console) 添加 `suremandarin.com` 域名资源，并按页面要求在域名 DNS 添加验证 TXT。若使用网址前缀资源，请填完整的 `https://www.suremandarin.com/`，也可以使用下面的 HTML 验证变量。DNS 验证值必须使用 Google 给本账号生成的值。
2. 在 Search Console 的“站点地图”提交 `https://www.suremandarin.com/sitemap.xml`。使用“网址检查”抽查英文首页、中文首页、一个课程详情、一个知识文章，并查看 Google 选择的规范网址。
3. 在 [Bing Webmaster Tools](https://www.bing.com/webmasters) 添加同一正式网站；可按 Bing 提示从 Search Console 导入，或使用 HTML 标签验证。提交同一份 sitemap，并使用 URL Inspection 检查抓取结果。[Bing 站点验证](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b)、[Bing 站点地图](https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed)
4. 如果启用了 Cloudflare/WAF/机器人防护，使用站长工具的实际抓取检查确认公开页面未被验证码、登录页或挑战页拦截。登录注册的人机验证可以保留。

这些需要网站所有者账号的操作，并不会因为发布本次代码而自动完成。验证标签不是密码，不要把后台密码、Resend 密钥或 Supabase 密钥填在这里。

## 2. 前台环境变量

在 Vercel 前台项目的 Settings → Environment Variables 设置；修改后需要重新部署对应环境。

| 变量 | 作用 | 正式站设置 |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 规范网址、分享地址、sitemap 的正式域名 | `https://www.suremandarin.com` |
| `GOOGLE_SITE_VERIFICATION` | Search Console HTML 验证标签的 content 值 | 选用 HTML 验证时填写；DNS 已验证可不填 |
| `BING_SITE_VERIFICATION` | Bing HTML 验证标签 `msvalidate.01` 的 content 值 | 选用 HTML 验证时填写 |
| `SEO_NOINDEX` | 显式禁止当前部署被收录 | 正式站留空或 `false`；测试站可设 `true` |
| `VERCEL_ENV` | Vercel 自动提供环境名称 | 不手动覆盖；非 `production` 部署禁止收录 |

兼容已有的 `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`、`NEXT_PUBLIC_BING_SITE_VERIFICATION`，优先使用表格中的服务器端变量。

预览部署会返回 `X-Robots-Tag: noindex, nofollow`，robots.txt 阻止抓取，页面元信息也禁止收录；正式域名保留正常收录。登录、注册、账户、支付结果和接口响应额外发送 `noindex` HTTP 头，不出现在公共站点地图。认证页面不再被 robots.txt 禁止抓取，搜索引擎才能读取它们的 noindex。`noindex` 不是访问权限；账户内容仍由原有登录权限保护。[Google robots 与 noindex 说明](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)

robots.txt 的禁止抓取本身不能删除已经收录的网址；若旧测试地址已出现在搜索结果中，需要站长工具处理移除，并允许引擎实际读取 noindex，或启用部署访问保护。

## 3. 非技术编辑的文章发布流程

1. 先选“发表板块”，一篇文章集中回答一个实际问题，例如“零基础如何开始学拼音”“IB 中文口语如何准备”“线上中文课一周安排几次”。避免四个栏目重复发布同一篇。
2. 标题具体描述问题，正文开头先给清晰回答，再写步骤、例句、适用人群和常见误区。图片写与画面一致的说明；不要把完整正文放在图片里。
3. 添加能验证的老师经验、实际教学方法和原创案例。机构地址、老师履历、奖项、课时、奖励条件必须与真实运营一致；示例头像、示例评价和占位联系方式不作为真实证明发布。
4. 正文自然链接到一个相关课程、免费水平测试或咨询页。不要每段堆同一个关键词，也不要让所有文字都成为链接。
5. 先完成中文，再生成英文草稿，人工检查课程名称、时间、金额和例句后分别发布。自动翻译不是英文已经审核完成。
6. 发布后实际打开两个语言网址，确认标题、正文、封面和咨询入口正确。更新旧文时更新确实改变的内容，避免只改日期制造“新文章”。

课程、机构介绍和常见问题也采用同一原则：谁适合、怎样上课、包含什么、如何安排、下一步做什么，写明白即可。没有确定的价格就写咨询获取报价，不编造价格或评分。

## 4. GEO：帮助 AI 正确理解机构

- 在 About、老师资料、课程和公开社交主页中保持品牌名、创始人姓名、联系方式及服务范围一致。
- 使用可直接阅读的文字解释六种课程的区别，并在相关知识文章中链接到对应课程。结构化数据必须与页面展示内容一致。
- 发布能被引用的原创教学内容：带解释的中文例句、老师纠错过程、学习计划、真实学员故事；外部事实给出可靠来源。
- `/llms.txt` 是提供给愿意读取它的工具的一份可选导航，不是 AI 排名开关。Google 官方明确说明 Search 不使用这类特殊文件，包括其生成式 AI 功能；重点仍是公开、可抓取、有用、可信的网页。[Google AI 优化指南](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)

## 5. 每月看这些结果

| 查看位置 | 关注什么 | 下一步 |
| --- | --- | --- |
| Search Console 搜索效果 | 非品牌中文学习相关词的展示、点击，哪个国家和设备带来访问 | 改进已有展示但点击少的标题、摘要和正文 |
| Search Console 网页索引 | 意外的 noindex、404、抓取失败、规范网址冲突 | 先修错误，不批量请求所有网址重复收录 |
| Bing 站点地图 / URL Inspection | 新内容是否可抓取、sitemap 是否成功处理 | 优先排查失败页面和错误链接 |
| 网站营销咨询线索 | 搜索来源有多少有效咨询、咨询是否转成试听或报名 | 优化高访问低咨询页面的说明和表单 |
| 手机端实际访问 | 首屏、图片、表单、登录和预约是否顺畅 | 先修影响学习和留资的速度与操作问题 |

优先持续完善少量高质量内容，而不是每天批量生成大量相似文章。SEO 的评估要结合有效咨询和报名，不能只看访问量。

## 6. 当前架构说明

- `/` 保留按语言偏好跳转 `/en` 或 `/zh` 的行为；分享推荐参数仍由原注册/推荐流程处理。
- 无语言的历史公开网址已有永久跳转，保留其行为；不把实际内容不同的页面强行合并。
- 中文页面的服务端内容容器已标记 `lang="zh-CN"`，英文标记 `lang="en"`。共享最外层 `<html>` 当前仍为英文；本轮没有为了修改它引入全站逐请求动态渲染。后续若改成语言独立根布局，应另行验证语言切换、404 和所有历史链接。[Next.js 根布局与参数说明](https://nextjs.org/docs/app/api-reference/file-conventions/layout)
- IE 提示保留，但标题改为二级标题，避免隐藏的兼容性提示占用页面主标题层级。

## 7. 本次内容与后台控制

- 首页、课程、知识文章已读取后台 SEO 模块中的搜索标题、摘要、分享图片和“不收录”选项。该模块仍遵循原有后台角色权限；本次没有更改管理员权限。
- 新增 8 篇完整学习指南，每篇都有中英文版本；没有虚构发布日期。它们目前由网站代码维护，位于 `frontend/src/lib/editorial-guides.ts`，同 slug 的已发布后台文章会优先展示。
- 其他重复示例文章不再出现在知识列表或站点地图中，旧示例地址保留并设置不收录，没有删除后台数据。后台新增的实际文章正常进入所属栏目。
- 中文课程后台尚未发布时，保留现有人工编写的中文课程介绍；后台发布中文版本后优先使用后台内容。关闭课程不会凭空恢复六门默认课程；显式关闭的中文课程也不会再次出现。
- 公开文章接口限制为已发布、已展示且符合访问等级的内容；关联查询不能绕过文章权限。会员内容不进入公开站点地图。
- 会员专享文章通过登录会话单独读取，由后台校验等级；不使用共享缓存、不允许收录。匿名访问或无权限时不会返回正文。
- 如果后台接管了八篇内置指南中的某个路径，之后将其隐藏、撤为草稿或设为会员专享，不会重新出现代码备用文章。
- 文章翻译通过后台文档关联匹配，即使中英文网址不同，也能输出正确的语言链接。课程、文章和机构介绍的结构化数据不编造评分、地址或价格。

## 8. 自动检查与 IndexNow

在 `frontend` 目录执行：

```sh
node --test scripts/seo-data.test.cjs
node --test scripts/member-article.test.cjs
npm run seo:audit -- https://www.suremandarin.com --all
npm run seo:indexnow
```

最后一条默认仅检查并显示待提交清单。确认正式站部署成功、清单正确后，执行 `npm run seo:indexnow -- --submit` 通知支持 IndexNow 的搜索引擎。也可在命令后指定刚更新的网址，避免每次重复提交全站。

公开验证文件 `3495bfb560ad1c1c37a69e68911dac65.txt` 是站点所有权证明，不是私人密钥，必须可公开访问。提交返回 200 / 202 只代表接收或等待验证，不代表收录或排名；Google Search Console 的站点地图仍需单独提交。[IndexNow 协议](https://www.indexnow.org/documentation)

上线后继续补充真实中心地址、联系方式、老师资料和获准公开的学员案例。Search Console 与 Bing 的账号验证值需要从各自账号获取，不能由代码伪造。
