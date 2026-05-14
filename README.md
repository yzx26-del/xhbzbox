# 声轨档案 · 音乐史 CMS

这是一个部署到 Vercel 的单页音乐内容 CMS。前端入口是 `index.html`，服务端接口在 `api/` 目录。

## Vercel 环境变量

请在 Vercel Project Settings 里配置：

- `DEEPSEEK_API_KEY`
- `TMDB_API_KEY`
- `RAWG_API_KEY`

Supabase 目前使用前端 anon key 连接，适合公开客户端使用；如果需要更严格的权限控制，请在 Supabase 里配置 RLS 策略。

## 本地运行

安装 Vercel CLI 后运行：

```bash
vercel dev
```

如果只想看静态页面，可以直接打开 `index.html`，但 `/api/*` 榜单、AI 解析、影视和游戏数据接口需要通过 Vercel dev 或线上部署运行。
