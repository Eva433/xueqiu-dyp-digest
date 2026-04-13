# xueqiu-dyp-digest

Scrape [段永平 (Duan Yongping)](https://xueqiu.com/u/1247347556)'s latest posts from [Xueqiu (雪球)](https://xueqiu.com) and output clean JSON — ready for daily email digests, RSS feeds, or any downstream pipeline.

## Why this exists

Xueqiu is protected by Alibaba Cloud WAF + slider CAPTCHA, which blocks all standard HTTP scraping methods (requests, curl, fetch, etc.). This scraper uses **Playwright with stealth mode** to bypass the WAF by:

1. Visiting the homepage first to establish a valid session
2. Navigating to the user profile with a real browser context
3. Intercepting the internal API response (`v4/statuses/user_timeline.json`) as the page loads

No login required. No cookies to maintain. Fully automated.

## Output

The scraper outputs a JSON array to `stdout`. Each post includes:

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

- `retweeted_status` is included when the post is a reply or retweet, providing full context of the original post (author, title, text, stock tickers, link)
- Posts from the last 48 hours are returned; if none exist, falls back to the latest 20
- All progress logging goes to `stderr`, so `stdout` is always clean JSON

## Quick start

```bash
# Clone
git clone https://github.com/Eva433/xueqiu-dyp-digest.git
cd xueqiu-dyp-digest

# Install dependencies
npm install

# Install Chromium for Playwright
npx playwright install chromium

# Run
node scrape.js
```

To save output to a file:

```bash
node scrape.js > posts.json 2>/dev/null
```

## Scraping a different user

Edit `USER_ID` at the top of `scrape.js`:

```js
const USER_ID = 1247347556; // Change to any Xueqiu user ID
```

You can find the user ID in the URL of their profile page: `https://xueqiu.com/u/{USER_ID}`

## Use with Claude Code (automated daily email)

This repo was designed to work with [Claude Code remote triggers](https://docs.anthropic.com/en/docs/claude-code) for automated daily email digests. The setup:

1. A cron-based remote trigger runs daily at 09:00 Beijing time
2. It clones this repo, installs deps, and runs `node scrape.js`
3. Claude reads the JSON output, generates a formatted HTML digest in Chinese
4. The digest is sent via Outlook email

To set up your own, create a remote trigger with:
- **Source**: this git repo
- **Cron**: `0 1 * * *` (09:00 Beijing time)
- **Tools**: `Bash`, `Read`, `Write`, `mcp__outlook__OUTLOOK_SEND_EMAIL` (or your preferred email tool)

## Requirements

- Node.js >= 18
- Chromium (auto-installed via `npx playwright install chromium`)

## How it works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Visit xueqiu   │────>│  Navigate to     │────>│  Intercept API  │
│  homepage        │     │  user profile    │     │  response       │
│  (get session)   │     │  (trigger load)  │     │  (parse JSON)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                         │
                                                         v
                                                  ┌─────────────────┐
                                                  │  Output clean   │
                                                  │  JSON to stdout │
                                                  └─────────────────┘
```

The key insight: Xueqiu's SPA loads user posts via an internal JSON API (`v4/statuses/user_timeline.json`). By using a stealth browser that passes WAF checks, we can intercept this API response directly — no HTML parsing needed.

## License

MIT
