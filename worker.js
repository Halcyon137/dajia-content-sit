import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(root, process.env.DATA_DIR || './data');
const dataFile = path.join(dataDir, 'items.json');
const url = process.env.SITE_URL;
const username = process.env.SITE_USERNAME;
const password = process.env.SITE_PASSWORD;
const interval = Math.max(5, Number(process.env.FETCH_INTERVAL_MINUTES || 30)) * 60_000;

if (!url || !username || !password) throw new Error('请设置 SITE_URL、SITE_USERNAME、SITE_PASSWORD');
fs.mkdirSync(dataDir, { recursive: true });

async function collect() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    // 站点表单选择器可能因页面版本变化而调整；这里集中在一处维护。
    const user = page.locator('input[type="text"], input[type="email"], input[name*="user" i]').first();
    const pass = page.locator('input[type="password"]').first();
    if (await pass.count()) {
      await user.fill(username);
      await pass.fill(password);
      await page.getByRole('button', { name: /登录|sign in|login/i }).click();
      await page.waitForLoadState('domcontentloaded').catch(() => {});
    }
    const cards = page.locator('article, [data-testid*="topic" i], [class*="topic" i]').filter({ visible: true });
    const count = Math.min(await cards.count(), 20);
    const items = [];
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const expand = card.getByRole('button', { name: /展开全部|展开|show more/i }).first();
      if (await expand.count()) await expand.click().catch(() => {});
      const text = (await card.innerText().catch(() => '')).trim();
      if (!text) continue;
      const files = [];
      for (const link of await card.locator('a, [role="link"], button').all()) {
        const href = await link.getAttribute('href');
        const download = await link.getAttribute('download');
        const name = ((await link.innerText().catch(() => '')) || download || '').trim();
        const looksLikeFile = /\.(pdf|docx?|xlsx?|csv|zip|rar|txt|pptx?)(\?|$)/i.test(href || '') || /\.(pdf|docx?|xlsx?|csv|zip|rar|txt|pptx?)/i.test(name);
        if ((href || download) && name && (download || looksLikeFile || /下载|附件/i.test(name))) files.push({ name: name.replace(/^下载\s*/i, ''), url: href ? new URL(href, url).toString() : null });
      }
      items.push({ id: `${Date.now()}-${i}`, capturedAt: new Date().toISOString(), text: (await card.innerText().catch(() => text)).trim(), files });
    }
    const previous = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : [];
    const merged = [...items, ...previous].slice(0, 500);
    fs.writeFileSync(dataFile, JSON.stringify(merged, null, 2));
    console.log(`Collected ${items.length} items at ${new Date().toISOString()}`);
  } finally { await browser.close(); }
}

collect().catch(err => { console.error(err); process.exitCode = 1; });
setInterval(() => collect().catch(console.error), interval);
