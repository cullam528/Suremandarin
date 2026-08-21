# SureMandarin 邮件服务配置

## 已完成

- Strapi 已接入 SureMandarin 的 Resend HTTPS API 提供器。
- 默认通过 HTTPS 443 端口发送，支持 Render 免费实例。
- 支持邮箱确认、找回密码、注册提醒以及后台联系用户。

## 正式环境需要填写

```text
RESEND_API_KEY=
EMAIL_FROM=SureMandarin <hello@suremandarin.com>
EMAIL_FROM_ADDRESS=hello@suremandarin.com
EMAIL_REPLY_TO=qingniaobird@163.com
ADMIN_NOTIFICATION_EMAIL=qingniaobird@163.com
```

`RESEND_API_KEY` 填 Resend API Key。不要把密钥提交到 GitHub，也不要写进
`.env.example`；请只在 Strapi Cloud、Railway 或其他线上主机的环境变量页面填写。

部署过渡期间，如果 Render 里仍只有旧的 `SMTP_PASSWORD`，系统会临时把它当作
Resend API Key 使用。如果新的 `RESEND_API_KEY` 认证失败，系统也会自动尝试旧密钥。
添加 `RESEND_API_KEY` 并确认邮件正常后，可以删除全部旧 SMTP 变量。

用户注册后，系统会将姓名、邮箱、注册渠道、平台、时区、电话和推荐人信息发送到
`ADMIN_NOTIFICATION_EMAIL`。邮件使用 `EMAIL_FROM` 作为发件人，并将新用户邮箱设置为
`Reply-To`，因此在 163 邮箱中直接点击“回复”即可联系该用户。

## Resend 域名设置

在 Resend 中添加 `suremandarin.com`，再按其提示在域名 DNS 中添加验证记录。域名
验证成功后才能稳定使用 `hello@suremandarin.com` 发信。

## 验证清单

1. 注册新用户，确认收到邮箱确认邮件。
2. 使用“忘记密码”，确认收到重置密码邮件。
3. 在 Strapi 后台邮件配置页点击连接测试；该测试只验证 API 认证，不会实际发送邮件。
4. 在 Email Templates 中检查发件人和回复地址。
5. 检查垃圾邮件、退信和 Resend 日志。
