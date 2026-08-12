# Google、LinkedIn、X 登录配置

代码已经接入三个 Strapi 用户登录提供商。第三方平台不会允许使用占位密钥，正式启用前必须分别创建开发者应用。

## Strapi 环境变量

```env
PUBLIC_URL=https://api.example.com
FRONTEND_URL=https://www.example.com
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
X_CONSUMER_KEY=
X_CONSUMER_SECRET=
```

## 第三方平台回调地址

- Google：`https://api.example.com/api/connect/google/callback`
- LinkedIn：`https://api.example.com/api/connect/linkedin/callback`
- X：`https://api.example.com/api/connect/twitter/callback`

本地调试时将域名替换为 `http://localhost:1337`。

## 自动注册结果

首次登录会由 Strapi 自动建立前台用户，并保存第三方平台返回的账号名和邮箱。会员等级使用默认值 `registered`，会员状态为 `free`。第三方平台没有返回邮箱时不能安全创建本站账号，需要用户先在对应平台授权邮箱权限。
