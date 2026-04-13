# xueqiu-dyp-digest

Scrape [段永平 (Duan Yongping)](https://xueqiu.com/u/1247347556)'s latest posts from [Xueqiu (雪球)](https://xueqiu.com) and output clean JSON — ready for daily email digests, RSS feeds, or any downstream pipeline.

抓取[段永平](https://xueqiu.com/u/1247347556)在[雪球](https://xueqiu.com)上的最新动态，输出干净的 JSON 数据 —— 可用于每日邮件摘要、RSS 订阅或任何数据处理流程。

## Why this exists / 为什么做这个

Xueqiu is protected by Alibaba Cloud WAF + slider CAPTCHA, which blocks all standard HTTP scraping methods (requests, curl, fetch, etc.). This scraper uses **Playwright with stealth mode** to bypass the WAF by:

1. Visiting the homepage first to establish a valid session
2. Navigating to the user profile with a real browser context
3. Intercepting the internal API response (`v4/statuses/user_timeline.json`) as the page loads

No login required. No cookies to maintain. Fully automated.

---

雪球使用了阿里云 WAF + 滑块验证码，所有常规的 HTTP 抓取方式（requests、curl、fetch 等）都会被拦截。本工具通过 **Playwright + Stealth 模式**绕过 WAF：

1. 先访问雪球首页，建立有效的会话
2. 用真实浏览器上下文访问用户主页
3. 拦截页面加载时的内部 API 响应（`v4/statuses/user_timeline.json`）

无需登录、无需维护 Cookie、全自动运行。

## Output / 输出格式

The scraper outputs a JSON array to `stdout`. Each post includes:

每条动态包含以下字段：

```json
{
  "id": 383629866,
  "created_at": "2026-04-13T05:37:30.000Z",
  "text": "其实是因为公司的买家只有一个人，就是公司自己。别的人说啥都不重要。",
  "retweet_count": 52,
  "reply_count": 2,
  "fav_count": 71,
  "like_count": 721,
  "url": "https://xueqiu.com/1247347556/383629866",
  "retweeted_status": {
    "id": 383628959,
    "title": "段永平：从2011年就在雪球说苹果，说了十几年才涨上来的——公开分享从来不影响赚钱",
    "text": "段永平昨天发了一条回复...",
    "author": "多伦多的大道信徒",
    "created_at": "2026-04-13T05:32:53.000Z",
    "url": "https://xueqiu.com/7736566551/383628959",
    "is_column": true,
    "stock_correlation": ["AAPL", "SH600519", "09992"]
  }
}
```

| Field / 字段 | Description / 说明 |
|---|---|
| `id` | Post ID / 帖子 ID |
| `created_at` | ISO timestamp / 发布时间 |
| `text` | Post content (HTML stripped) / 帖子内容（已去除 HTML） |
| `retweet_count` | Retweets / 转发数 |
| `reply_count` | Replies / 评论数 |
| `fav_count` | Favorites / 收藏数 |
| `like_count` | Likes / 点赞数 |
| `url` | Link to original post / 原帖链接 |
| `retweeted_status` | Original post being replied to (if any) / 被回复的原帖（如有） |
| `retweeted_status.author` | Original post author / 原帖作者 |
| `retweeted_status.stock_correlation` | Related stock tickers / 相关股票代码 |

- `retweeted_status` is included when the post is a reply or retweet, providing full context of the original post
- Posts from the last 48 hours are returned; if none exist, falls back to the latest 20
- All progress logging goes to `stderr`, so `stdout` is always clean JSON

---

- 当帖子是回复或转发时，会包含 `retweeted_status` 字段，提供完整的原帖上下文
- 默认返回最近 48 小时内的动态；如果没有，则返回最新的 20 条
- 所有日志输出到 `stderr`，`stdout` 始终是干净的 JSON

## Quick start / 快速开始

```bash
# 克隆仓库
git clone https://github.com/Eva433/xueqiu-dyp-digest.git
cd xueqiu-dyp-digest

# 安装依赖
npm install

# 安装 Chromium 浏览器（Playwright 需要）
npx playwright install chromium

# 运行
node scrape.js
```

保存输出到文件 / Save output to a file:

```bash
node scrape.js > posts.json 2>/dev/null
```

## Scraping a different user / 抓取其他用户

Edit `USER_ID` at the top of `scrape.js`:

修改 `scrape.js` 顶部的 `USER_ID`：

```js
const USER_ID = 1247347556; // 改成任意雪球用户 ID
```

用户 ID 可以在个人主页的 URL 中找到：`https://xueqiu.com/u/{USER_ID}`

## Use with Claude Code / 配合 Claude Code 自动发送每日邮件

This repo was designed to work with [Claude Code remote triggers](https://docs.anthropic.com/en/docs/claude-code) for automated daily email digests:

本仓库可以配合 [Claude Code 远程触发器](https://docs.anthropic.com/en/docs/claude-code)实现每日自动邮件摘要：

1. A cron-based remote trigger runs daily at 09:00 Beijing time / 每天北京时间 09:00 定时触发
2. It clones this repo, installs deps, and runs `node scrape.js` / 拉取仓库、安装依赖、运行爬虫
3. Claude reads the JSON output, generates a formatted HTML digest / Claude 读取 JSON，生成 HTML 格式的日报
4. The digest is sent via email / 通过邮件发送日报

To set up your own, create a remote trigger with / 创建远程触发器时配置：

- **Source / 代码源**: this git repo / 本仓库
- **Cron / 定时**: `0 1 * * *` (UTC 01:00 = 北京时间 09:00)
- **Tools / 工具**: `Bash`, `Read`, `Write`, `mcp__outlook__OUTLOOK_SEND_EMAIL`（或其他邮件工具）

## Requirements / 环境要求

- Node.js >= 18
- Chromium（通过 `npx playwright install chromium` 自动安装）

## How it works / 工作原理

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  访问雪球首页     │────>│  跳转用户主页     │────>│  拦截 API 响应   │
│  Visit homepage  │     │  Navigate to     │     │  Intercept API  │
│  (建立会话)       │     │  user profile    │     │  response       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                         │
                                                         v
                                                  ┌─────────────────┐
                                                  │  输出 JSON 到    │
                                                  │  stdout          │
                                                  └─────────────────┘
```

The key insight: Xueqiu's SPA loads user posts via an internal JSON API (`v4/statuses/user_timeline.json`). By using a stealth browser that passes WAF checks, we can intercept this API response directly — no HTML parsing needed.

核心思路：雪球的单页应用通过内部 JSON API（`v4/statuses/user_timeline.json`）加载用户动态。利用能通过 WAF 检测的 stealth 浏览器，我们可以直接拦截这个 API 响应 —— 完全不需要解析 HTML。

## License

MIT
