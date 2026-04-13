const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const USER_ID = 1247347556;

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

function log(msg) {
  process.stderr.write(`[scrape] ${msg}\n`);
}

(async () => {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    const context = await browser.newContext({ locale: 'zh-CN' });
    const page = await context.newPage();

    // Step 1: Visit homepage to establish session & bypass WAF
    log('Visiting xueqiu.com homepage...');
    await page.goto('https://xueqiu.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    // Step 2: Set up API interception
    const apiPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Timed out waiting for API response')),
        30000
      );
      page.on('response', async (response) => {
        if (response.url().includes('v4/statuses/user_timeline.json')) {
          try {
            const json = await response.json();
            clearTimeout(timeout);
            resolve(json);
          } catch (e) {
            // ignore
          }
        }
      });
    });

    // Step 3: Navigate to user profile
    log('Navigating to profile page...');
    await page.goto(`https://xueqiu.com/u/${USER_ID}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    log('Waiting for API response...');
    const apiData = await apiPromise;

    // Step 4: Parse
    const statuses = (apiData && apiData.statuses) || [];
    const now = Date.now();
    const cutoff = now - 48 * 60 * 60 * 1000;

    let posts = statuses.filter((s) => s.created_at >= cutoff);
    if (posts.length === 0) posts = statuses.slice(0, 20);

    const output = posts.map((s) => ({
      id: s.id,
      created_at: new Date(s.created_at).toISOString(),
      text: stripHtml(s.description || s.text),
      retweet_count: s.retweet_count || 0,
      reply_count: s.reply_count || 0,
      fav_count: s.fav_count || 0,
      url: `https://xueqiu.com/${s.user_id || USER_ID}/${s.id}`,
    }));

    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    log(`Done. Found ${output.length} posts.`);
  } catch (err) {
    log(`Error: ${err.message}`);
    process.stdout.write('[]\n');
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
