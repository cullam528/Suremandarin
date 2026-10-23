# PR #1：Vercel Preview 部署排查与预发布验证

## 已确认的失败原因

目标为 `cullam/suremandarin` 的 **Preview**，分支 `security/auth-hardening-20261023`。最初失败部署为 [`dpl_8XdaQTCCazwZahYt6L8rK943uho6`](https://vercel.com/cullam/suremandarin/8XdaQTCCazwZahYt6L8rK943uho6)，提交 `2e5d00a780ae78a4cc330e54b8cbb4d4c9d5d0bd`。其 `target` 为 `null`（非 Production），状态为 `ERROR`。

构建日志确认依赖安装完成，随后 `next build` 加载 `next.config.ts` 时，`getAuthSecurityConfig()` 抛出 `SECURITY_UNAVAILABLE`，最终 `pnpm run build` 退出码为 1。这不是已观察到的依赖安装错误或 TypeScript 编译错误；构建尚未进行到那些阶段。

环境变量接口在 `decrypt=false` 下检查名称、环境范围与分支范围：通用 Preview 配置为 **0 项**，本 PR 分支覆盖为 **0 项**。没有请求解密接口，没有拉取 `.env`，没有读取生产密钥值。Production 配置不会自动继承到 Preview；本次没有修改任何 Production 配置。

`next build` 在 Preview 中同样运行生产模式构建，因此会触发安全配置检查。这项检查需要保留：缺少真实服务配置时，不应用回退密钥、假服务地址或托管环境测试密钥制造部署成功。

## 必须补齐的 Preview 配置

在 [Vercel 项目环境变量设置](https://vercel.com/cullam/suremandarin/settings/environment-variables) 中选择 **Preview**，Git Branch 限定为 **`security/auth-hardening-20261023`**。不要勾选 Production，不要复制生产凭据，不要将密钥粘贴到聊天、PR 或日志。

以下八项均未出现在当前 Preview 配置中：

| 名称 | 填入内容与要求 |
| --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | 独立预发布 Turnstile widget 的公开 site key；该值会进入浏览器构建产物。 |
| `TURNSTILE_SECRET_KEY` | 与上述 widget 配套的预发布 secret；仅服务器使用，存为 Secret/Sensitive。托管环境拒绝 Cloudflare 测试密钥。 |
| `TURNSTILE_HOSTNAMES` | 允许的完整主机名，不带协议或路径、不用通配符。建议使用下面的稳定分支域名，并在 Turnstile widget 中也允许它。 |
| `UPSTASH_REDIS_REST_URL` | 独立预发布 Redis 的 HTTPS REST origin，不是 `redis://`/`rediss://` 连接串；不能带认证信息、路径、查询或 fragment。 |
| `UPSTASH_REDIS_REST_TOKEN` | 该预发布 Redis 的凭据，需支持 `EVAL` 与 `SET`；存为 Secret/Sensitive。 |
| `AUTH_RATE_LIMIT_PREFIX` | 稳定的预发布命名空间，例如 `suremandarin-pr1`；同一环境的全部实例必须相同，不按构建 ID 改变。 |
| `AUTH_GATEWAY_SECRET` | 独立随机生成的 32 字节，编码为 64 位十六进制；预发布前端与预发布 Strapi 使用同一值，存为 Secret/Sensitive。 |
| `STRAPI_URL` | 独立预发布 Strapi 的 HTTPS origin。不要指向生产后端；无须设置重复的 `NEXT_PUBLIC_STRAPI_URL`。 |

Vercel 已为该分支生成的稳定域名为：

`suremandarin-git-security-auth-hardening-20261023-cullam.vercel.app`

建议另设 `NEXT_PUBLIC_SITE_URL=https://suremandarin-git-security-auth-hardening-20261023-cullam.vercel.app`、`SEO_NOINDEX=true`。Preview 原本也自动发送 noindex。`AUTH_TRUSTED_IP_HEADER` 在 Vercel 不需要填写；不要用它信任客户端可伪造的代理头。旧的 `CAPTCHA_SECRET` 已被移除，不是新方案所需配置。

公开 site key 在构建时写入客户端包；补齐配置后必须重新构建这条分支，已有失败部署不会自行恢复。使用稳定分支 URL 验证即可；如需使用临时部署 URL，也必须把该完整 hostname 加入服务端和 Turnstile 的允许列表。

## 预发布后端的边界

必须使用独立 Strapi、独立数据库以及测试账户，不把 Preview 指向生产。预发布 Strapi 至少需要独立的 `APP_KEYS`、`API_TOKEN_SALT`、`ADMIN_JWT_SECRET`、`TRANSFER_TOKEN_SALT`、`JWT_SECRET`、`ENCRYPTION_KEY`，以及与前端相同的 `AUTH_GATEWAY_SECRET`。托管数据库使用独立 PostgreSQL 连接与相应 SSL 设置；SQLite 仅用于本地隔离验证。

按预发布地址配置 `PUBLIC_URL`、`CLIENT_ORIGINS`、`CLIENT_APP_URL` 和 `FRONTEND_URL`。用测试邮件服务/账号设置 `RESEND_API_KEY`、`EMAIL_FROM`、`EMAIL_FROM_ADDRESS` 和 `EMAIL_REPLY_TO`，确认数据库中的邮件模板和确认/重置跳转地址也指向预发布站点。真实收信测试只使用获授权的测试邮箱。`ADMIN_NOTIFICATION_EMAIL` 必须显式设为空（关闭注册通知）或仅预发布使用的地址，避免默认值把测试通知发往现有业务邮箱。禁用无关定时任务（`CRON_ENABLED=false`）并关闭初始数据播种（`SEED_INITIAL_DATA=false`），支付、翻译、社交登录和存储凭据不应从生产复制。

如启用邮箱确认，还需设置 Strapi Users & Permissions 的 `email_confirmation=true`、`email_confirmation_redirection` 为预发布登录页，并将 **email_confirmation 邮件模板的发件人**改为已验证的预发布发件人。当前启动逻辑只修正密码重置模板；新数据库的确认模板默认发件人不能视为已获邮件服务授权。不要填写旧的 `SMTP_PASSWORD` 回退值。

## 配置完成后的验证顺序

1. 核实重新构建的目标仍为 Preview、分支仍为本 PR，记录提交 SHA 和部署 ID；先确认构建达到 `READY`。
2. 打开稳定分支 URL，验证英文与中文的登录、注册、找回密码页面及 noindex；确认 Turnstile 能正常加载，加载失败时不能提交。
3. 使用获授权的测试账户和测试邮箱，验证注册、邮箱确认、正确/错误密码登录、找回/重置密码、会话 cookie 和退出。需要人工完成的验证码由测试者自行完成。
4. 验证预发布 Strapi 原生账户入口没有网关凭据时被拒绝，合法前端请求能通过；核实实际入口传递的客户端 IP，不信任自带的代理头。
5. 以低速、受控的测试请求核实实际 Siteverify 拒绝无效/过期/重复 token；核实共享 Redis 的并发防重放、统一配额、过期恢复和服务故障时的 503。不得对生产运行这些测试。

格式校验通过只能证明配置形状正确，不能证明凭据真实有效、域名归属正确、邮件已投递或实际多区域服务稳定。缺少任一真实依赖时，相关验证继续标为待验证，PR 保持草稿。

## 本轮验证记录

初始远端失败与空 Preview 配置已经确认。诊断改动使用同一份校验逻辑：构建日志一次列出全部缺失/格式错误的变量名，只输出固定的 `missing` / `invalid` 原因；URL 解析错误不回显输入值。受保护 API 仍只返回通用 `503 SECURITY_UNAVAILABLE`，不向客户端公开配置细节。

| 本轮检查 | 结果 |
| --- | --- |
| 实际 `next build`，空环境 + `VERCEL=1`、`VERCEL_ENV=preview` | 按预期拒绝，并一次列出上述八个缺失变量。 |
| 实际 `next build`，合成配置 + 只读 loopback CMS | 退出码 0；Node 24.19.0，模拟 Preview 构建模式。未连接真实 Turnstile/Redis，不代表凭据或服务有效。 |
| 前端完整测试（包括真实 Redis 多进程与 6 项新增配置诊断测试） | 208/208 通过，0 失败、0 跳过。 |
| 后端原有完整测试 | 43/43 通过，0 失败、0 跳过。 |
| 前端 TypeScript 检查 | 通过。 |
| 前端 ESLint | 0 错误，2 条原有 `MyCoursesPanel.tsx` useMemo 警告。 |
| 独立代码复核 | 未发现运行时校验放松或配置值泄漏；公开 site key 与 hostname 说明和当前前端一致。 |
| 真实本地 Strapi 5.52 + 一次性 SQLite | 7/7 流程组通过，创建 2 个合成用户，2 封邮件仅进入进程内接收器；3 次出站连接尝试被隔离边界阻止。子进程已结束，临时应用及数据库已清理。 |

真实 Strapi 流程组覆盖网关在 JSON 解析前阻断直连、注册持久化、已认证会员读取、正确/错误密码登录、密码重置模板与 token、重置后旧密码失效和 token 顺序重放拒绝、HttpOnly/Secure 刷新 cookie、刷新/注销撤销，以及开启邮箱确认后的待确认注册、确认链接与确认前后登录。它验证的是 Strapi 原生 HTTP 入口和真实数据库，并未穿过真实 Turnstile 或 Vercel，也不证明真实邮件送达。

可在 `backend` 中先构建，再运行 `npm run test:auth-staging` 复现。脚本要求可用的 `better-sqlite3` 本地绑定；本轮仅为该依赖构建原生模块。脚本使用干净的环境变量白名单、空 `ENV_PATH`、一次性配置/数据库、仅 loopback HTTP 和本地邮件接收器，禁止读取仓库 `.env` 或外发邮件。

真实 Turnstile、Upstash、托管 Strapi 和邮件联调目前因预发布配置缺失而未完成。不能将本地邮件接收器等同于真实邮件投递。

参考：[Vercel 环境范围](https://vercel.com/docs/environment-variables)、[分支环境变量](https://vercel.com/docs/cli/env)、[原安全加固报告](./auth-security-hardening-2026-10-23.md)。
