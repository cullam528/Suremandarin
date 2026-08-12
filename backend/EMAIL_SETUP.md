# SureMandarin 邮件服务配置

## 已完成

- Strapi 已接入官方 `@strapi/provider-email-nodemailer`。
- 默认使用 Resend SMTP，支持邮箱确认、找回密码以及后续咨询通知。
- 通过环境变量切换到其他 SMTP 服务，不需要修改代码。

## 正式环境需要填写

```text
EMAIL_PROVIDER=nodemailer
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USERNAME=resend
SMTP_PASSWORD=
SMTP_REQUIRE_TLS=false
EMAIL_FROM=SureMandarin <hello@suremandarin.com>
EMAIL_REPLY_TO=support@suremandarin.com
```

`SMTP_PASSWORD` 填 Resend API Key。不要把密钥提交到 GitHub，也不要写进
`.env.example`；请只在 Strapi Cloud、Railway 或其他线上主机的环境变量页面填写。

## Resend 域名设置

在 Resend 中添加 `suremandarin.com`，再按其提示在域名 DNS 中添加验证记录。域名
验证成功后才能稳定使用 `hello@suremandarin.com` 发信。

## 验证清单

1. 注册新用户，确认收到邮箱确认邮件。
2. 使用“忘记密码”，确认收到重置密码邮件。
3. 在 Strapi 后台 Email Templates 中检查发件人和回复地址。
4. 检查垃圾邮件、退信和 Resend 日志。
