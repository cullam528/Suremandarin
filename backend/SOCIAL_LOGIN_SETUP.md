# SureMandarin 快捷登录配置

本次调整是把网站的 Facebook 登录替换为 LinkedIn 登录，Google 和 X 登录保留。Facebook 登录停用不等于删除已有会员：不要删除用户、订单、课时或修改用户原有登录来源。

这份文档用于配置和检查，**不代表 LinkedIn 已经可以正式使用**。开发者应用、权限和环境变量配置完成并部署后，还需要用真实 LinkedIn 账号在网站上亲自授权，才能确认整个登录流程通过。

正式地址：

- 网站：[www.suremandarin.com](https://www.suremandarin.com)
- 内容后台：[api.suremandarin.com/admin](https://api.suremandarin.com/admin)
- Render 后台服务名称：`suremandarin-api`

## 一、先准备 LinkedIn 公司主页

登录你自己的真实 LinkedIn 账号，准备一个属于 SureMandarin 的 **LinkedIn 公司主页（Company Page）**。

注意区分：

| 类型 | 地址通常长这样 | 是否用来关联开发者应用 |
| --- | --- | --- |
| 公司主页 | `https://www.linkedin.com/company/公司名称/` | 是，选择 SureMandarin 的公司主页 |
| 个人资料 | `https://www.linkedin.com/in/个人名称/` | 否，不要填 Jessica 的个人资料地址 |

创建应用时要关联公司主页，主页会作为应用的发布方。公司主页没有准备好时，先在 LinkedIn 创建；已有公司主页则直接使用，不必重复创建。[LinkedIn 官方创建应用说明](https://www.linkedin.com/help/lms/answer/a526048)

## 二、创建或打开 LinkedIn 开发者应用

1. 打开 [LinkedIn Developer Portal → My apps](https://www.linkedin.com/developers/apps)。
2. 已有 SureMandarin 应用就打开它；没有则点击 **Create app**。
3. 按页面要求填写：
   - **App name**：`SureMandarin`
   - **LinkedIn Page**：选择第一步的公司主页。
   - **App logo**：上传 SureMandarin Logo。
   - 如果要求填写网站：`https://www.suremandarin.com`
   - 如果要求填写隐私政策：`https://www.suremandarin.com/en/privacy`
4. 阅读平台条款，由你确认同意后创建应用。

如果应用的 **Settings** 页提示公司主页尚未验证：

1. 点击 **Verify**。
2. 在弹窗中点击 **Generate URL**，复制验证链接。
3. 让该公司主页的 **Super admin（超级管理员）** 打开链接并确认关联。如果你本人就是该主页的超级管理员，可以自己完成。
4. 返回应用设置检查验证状态。

这里的 Super admin 指 **LinkedIn 公司主页管理员**，不是 SureMandarin 的 Strapi 后台管理员。两者没有自动关联。[LinkedIn 官方主页验证步骤](https://www.linkedin.com/help/linkedin/answer/a1676254)

## 三、启用正确的登录产品

在开发者应用中打开 **Products**，找到完整名称：

**Sign In with LinkedIn using OpenID Connect**

点击 **Request access**，按提示完成申请；已经启用则不必重复操作。确认产品已可用，并在 **Auth** 页检查登录所需权限：

```text
openid profile email
```

这是普通快捷登录使用的权限：识别 LinkedIn 账号、读取基本资料，并请求邮箱。不要选成 **Verified on LinkedIn**，也不需要为登录申请广告或企业营销产品。登录权限属于自助开放权限，不走企业合作类特殊审批；如果页面仍显示处理中，以应用实际权限状态为准，不要反复创建应用。[官方 OIDC 登录文档](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)、[官方开放权限说明](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access)

不要照旧教程配置 `r_liteprofile` 或 `r_emailaddress`。本次接入使用 `openid profile email`，开发端读取资料的接口是 `https://api.linkedin.com/v2/userinfo`，不是旧版 `/v2/me`。[官方 OIDC 登录文档](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)

## 四、填写 LinkedIn 回调地址

在应用 **Auth → OAuth 2.0 settings → Authorized redirect URLs for your app** 中添加下面这一整行并保存：

```text
https://api.suremandarin.com/api/connect/linkedin/callback
```

**只把上面这个后台地址填到 LinkedIn 的回调配置里。**

- 不要填 `https://www.suremandarin.com` 网站首页。
- 不要填 `/en/login`、`/zh/login` 或 `/admin/auth/login`。
- 不要填前端内部地址 `https://www.suremandarin.com/api/auth/oauth/callback/linkedin`；这是网站处理登录结果的内部环节，不是这里要求的 LinkedIn 回调。
- 不要在末尾额外加 `/`，不要加 `#` 或中英文空格。

LinkedIn 要求绝对 HTTPS 回调地址，并要求实际登录请求的地址与开发者后台登记的地址匹配。[官方 OAuth 回调配置说明](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)

## 五、把应用凭证填到 Render

在 LinkedIn 应用的 **Auth** 页找到 **Client ID** 和 **Client Secret**。接着：

1. 打开 [Render Dashboard](https://dashboard.render.com/)。
2. 进入服务 **suremandarin-api**。
3. 点击 **Environment**，进入环境变量编辑页面。
4. 新增下面两个变量，把值粘贴到右侧对应输入框：

   | 变量名 | 填什么 |
   | --- | --- |
   | `LINKEDIN_CLIENT_ID` | LinkedIn Auth 页的 Client ID |
   | `LINKEDIN_CLIENT_SECRET` | LinkedIn Auth 页的 Client Secret |

5. 核对以下已有变量，不要填成 Render 临时域名：

   ```env
   PUBLIC_URL=https://api.suremandarin.com
   FRONTEND_URL=https://www.suremandarin.com
   ```

6. 保留已有 Google、X 和其他服务配置，不要为了接入 LinkedIn 清空整张环境变量表。
7. 保存并重新部署服务。如果保存按钮同时提供部署选项，选择保存并重新部署；如果只是保存，则再触发一次部署。等服务显示正常运行后再测试。

安全提醒：Client Secret 只存放在 **Render 后端环境变量**。不要放进前端、`NEXT_PUBLIC_*` 变量、Git/GitHub 仓库或聊天消息。截图时也要遮住密钥。没有凭证时不要填写假的占位值来强行启用。

## 六、亲自测试一次完整登录

1. 确认包含此次代码变更的前端、后台均已部署。
2. 打开网站的 [英文登录页](https://www.suremandarin.com/en/login) 或 [中文登录页](https://www.suremandarin.com/zh/login)。
3. 点击 LinkedIn 登录按钮，确认打开的是 LinkedIn 自己的授权页面。
4. 使用你自己的 LinkedIn 账号登录，阅读授权内容并自行决定是否同意。
5. 授权后应返回 SureMandarin，并能打开个人账户页面；刷新后也应保持正确登录状态。
6. 退出网站，再用同一个 LinkedIn 账号登录，确认进入同一账户，没有重复创建会员。
7. 再检查 Google 和 X 原有登录入口没有受到影响。

**只看到按钮、服务部署成功或代码测试通过，都不能代替第 3～6 步的真人授权测试。**

## 七、邮箱和已有账户如何处理

- 首次登录、资料满足注册条件且邮箱未被其他账户占用时，网站可以建立普通会员账户；第三方登录不会授予 Strapi 后台管理权限。
- LinkedIn 不保证每次都返回邮箱。`email` 和 `email_verified` 都可能缺失；`email_verified` 只是主邮箱的验证标记，不代表实名或身份认证。[官方返回字段说明](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
- 如果提示没有可用邮箱，请改用网站的 **邮箱注册**，不要反复点击 LinkedIn，也不要创建虚假邮箱来绕过检查。
- 如果该邮箱已经有 SureMandarin 账户，请使用原有可用登录方式，例如 Google 或邮箱密码。系统不自动把不同登录方式的账户合并，避免会员资料、订单或课时归属出错。
- 如果原先只用 Facebook，停用后没有其他可用登录方式，请联系管理员核实处理；不要删除原会员或重复注册来替代旧账户。

## 八、常见问题

| 提示或现象 | 优先检查 |
| --- | --- |
| LinkedIn 按钮不可用，或提示暂未配置 | Render 是否已设置两项 LinkedIn 变量；前后端是否都部署了本次变更；后台是否已完成重启。 |
| `redirect_uri` 不匹配、`invalid_redirect_uri` | LinkedIn Auth 页是否登记了第四步完整地址；Render 的 `PUBLIC_URL` 是否为 `https://api.suremandarin.com`；不要混用 www、api 和 Render 临时域名。 |
| `invalid_scope`、权限未授权 | 是否启用了 **Sign In with LinkedIn using OpenID Connect**；是否已有 `openid profile email` 权限；不要使用旧权限名称。 |
| Client ID/Secret 无效，或 `invalid_client` | 两个值是否来自同一个 LinkedIn 应用，是否复制完整、有无多余空格；修改后是否重新部署。不要把密钥贴到聊天排查。 |
| 公司主页没有通过验证 | 确认关联的是公司 Page，而非个人资料；让该 LinkedIn Page 的超级管理员打开验证链接确认。 |
| 提示邮箱缺失或不可用 | LinkedIn 可能不返回邮箱；使用网站邮箱注册。 |
| 提示该邮箱已有账户 | 使用该账户原有可用登录方式；不要自动合并或手工覆盖用户登录来源。 |
| 取消授权后回到登录页 | 用户可以拒绝授权；重新点击登录并自主授权，或使用邮箱方式。 |
| 授权返回后仍未登录 | 记录出现提示的页面地址和错误文字，隐藏令牌、授权码和密钥后交给维护人员检查；不能仅凭部署成功认定登录可用。 |

回调不一致和权限错误的官方排查依据见 [LinkedIn OAuth 错误说明](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)。

## 九、Google、X 原配置备忘

下面两种登录保留。已经可以使用时，无需重新申请应用，也不要更换现有凭证。

| 平台 | Render 变量名 | 平台开发者后台登记的回调地址 |
| --- | --- | --- |
| Google | `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET` | `https://api.suremandarin.com/api/connect/google/callback` |
| X | `X_CONSUMER_KEY`、`X_CONSUMER_SECRET` | `https://api.suremandarin.com/api/connect/twitter/callback` |

当前 X 登录使用 **OAuth 1.0a**，变量需要对应的 **Consumer Key / Consumer Secret（API Key / API Key Secret）**，不是 OAuth 2.0 的 Client ID / Client Secret，也不是 Bearer Token。虽然平台改名为 X，现有后台回调路径仍然是 `twitter`，不要自行改成 `x`。

这些凭证与 LinkedIn 一样，都只保留在服务端环境变量中。本次停用 Facebook 不要求删除既有会员，也不要求清理历史用户数据。
