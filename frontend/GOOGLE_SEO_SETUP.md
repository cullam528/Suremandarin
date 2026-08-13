# SureMandarin Google SEO 上线设置

代码已经自动生成标题、描述、规范链接、双语 `hreflang`、结构化数据、`robots.txt` 和 `sitemap.xml`。下面两步需要网站所有者在 Google 与 Vercel 后台完成。

## 1. 验证 Google Search Console

推荐在 [Google Search Console](https://search.google.com/search-console) 添加“网域”资源：

1. 资源填写 `suremandarin.com`，不要填写 `https://` 或路径。
2. Google 会给出一条 TXT 验证记录。
3. 到域名 DNS 管理页面添加该 TXT 记录。
4. 回到 Search Console 点击“验证”。

如果选择“网址前缀”方式，则填写 `https://www.suremandarin.com/`，复制 HTML 标记中 `content="..."` 的值，然后在 Vercel 项目的 Environment Variables 新建：

```text
GOOGLE_SITE_VERIFICATION=Google提供的content值
```

保存后重新部署 Production，页面会自动输出 Google 验证标签。

## 2. 提交站点地图

验证成功后，在 Search Console 左侧打开“站点地图”，提交：

```text
https://www.suremandarin.com/sitemap.xml
```

只需提交一次。后续新增或更新课程、知识文章时，动态站点地图会自动更新。

## 日常内容规则

- 每篇文章必须有独立标题、摘要、正文和 1200 × 675 封面图。
- 中英文版本分别校对后发布，尽量使用对应语言的自然表达。
- 文章网址 slug 发布后不要频繁修改。
- 不复制其他网站正文，不批量发布只有关键词、没有实际帮助的薄内容。
- 发布重要文章后，可在 Search Console 的“网址检查”中请求编入索引。
