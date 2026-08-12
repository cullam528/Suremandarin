# 部署说明

## 本地运行

1. 将 `.env.example` 复制为 `.env`，并替换所有 `replace-me` 密钥。
2. 第一次启动保持 `SEED_INITIAL_DATA=true`，创建初始会员方案、六类课程和四个文章分类。
3. 运行 `pnpm develop`。
4. 打开 `http://localhost:1337/admin` 创建第一个超级管理员。
5. 初始化成功后把 `SEED_INITIAL_DATA=false`。

## 正式环境必需资源

- Node.js 20–26
- PostgreSQL 数据库
- 可持久化的对象存储，例如 S3 兼容存储
- 后台域名，例如 `cms.suremandarin.com`
- API 域名，例如 `api.suremandarin.com`
- 邮件发送服务，用于验证邮箱和重置密码
- PayPal Business Sandbox / Live 应用
- 自动备份和错误监控

推荐奖励的退款观察期默认是 7 天，可通过 `REFERRAL_REFUND_WINDOW_DAYS` 调整。达到
3 名有效付费好友后，系统会生成 2 课时的 `pending-review` 奖励；Super Admin 或
Editor 在后台审核并将课时奖励状态改为 `available` 后，课时才会进入推荐人的可用余额。
系统会在支付完成时立即检查，并每小时自动再次检查，确保退款观察期结束后自动生成待审核奖励。

## 我的课程与老师预约

- `lesson-credit` 是统一课时账本：`referral`/`daily-challenge` 表示邀请或 7 天挑战赠送，`purchase` 表示购买课程获得，`manual` 表示后台人工调整。
- 学员在“我的课程”提交课程、时区和日期时间后，预约状态为“待确认”。
- Super Admin 或 Editor 在 `03 学习 · 老师预约` 中把状态改为“已确认”，系统会自动预留 1 课时；没有可用课时时不能确认。
- 学员取消预约时，已预留课时会自动释放。
- 老师完成课程后，将预约改为“已完成”或通过教师完成接口确认，系统把预留课时改为 `used`，正式扣除 1 课时。
- 学员页面将预约分成“当前课程（待确认、已确认）”和“历史课程（已完成、已取消）”。

## 邮件服务（Resend SMTP）

项目已预置 Strapi 官方 Nodemailer 邮件提供商，默认连接 Resend SMTP。上线前：

1. 在 Resend 创建 API Key，并验证 `suremandarin.com` 域名。
2. 在生产环境变量中填写：

   ```text
   EMAIL_PROVIDER=nodemailer
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USERNAME=resend
   SMTP_PASSWORD=<Resend API Key>
   EMAIL_FROM=SureMandarin <hello@suremandarin.com>
   EMAIL_REPLY_TO=support@suremandarin.com
   ```

3. 在 Strapi 后台的 Email Templates 中确认发件人使用 `EMAIL_FROM`。
4. 用“忘记密码”和“邮箱确认”各测试一次，再切换到正式环境。

本地开发没有 Resend 密钥时，可以使用 Mailpit/Maildev，将 `SMTP_HOST` 改为
`127.0.0.1`、`SMTP_PORT` 改为 `1025`、`SMTP_SECURE=false`。

## PayPal 配置

- `PAYPAL_ENV=sandbox` 或 `live`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`

Webhook 地址：

`POST https://api.example.com/api/v1/webhooks/paypal`

至少订阅：

- `BILLING.SUBSCRIPTION.ACTIVATED`
- `BILLING.SUBSCRIPTION.CANCELLED`
- `BILLING.SUBSCRIPTION.EXPIRED`
- `BILLING.SUBSCRIPTION.SUSPENDED`
- `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
- `PAYMENT.SALE.COMPLETED`
- `PAYMENT.SALE.REFUNDED`
- `PAYMENT.CAPTURE.COMPLETED`

正式上线前必须在 PayPal Sandbox 完成创建订单、批准、扣款、Webhook、取消和退款的全流程测试。
