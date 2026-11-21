import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const url = process.env.SITE_URL;
const username = process.env.SITE_USERNAME;
const password = process.env.SITE_PASSWORD;
const output = path.resolve('data.json');

if (!url || !username || !password) throw new Error('缺少 SITE_URL、SITE_USERNAME 或 SITE_PASSWORD');

const browser = await chromium.launch({ headless: true });
const context = fs.existsSync(path.resolve('browser-state.json'))
  ? await browser.newContext({ storageState: path.resolve('browser-state.json'), acceptDownloads: true })
  : await browser.newContext({ acceptDownloads: true });
const page = await context.newPage();
try {
  await page.goto(new URL('/', url).toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(1500);
  await page.locator('button').filter({ hasText: '注册 / 登录' }).first().click().catch(() => {});
  await page.waitForTimeout(500);
  const loginPass = page.locator('input[type="password"]:visible').first();
  const loginUser = page.locator('input[type="text"]:visible, input[type="email"]:visible').first();
  if (await loginPass.count() && await loginUser.count()) {
    await loginUser.fill(username); await loginPass.fill(password);
    await page.getByRole('button', { name: /^登录$/ }).last().click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
  }
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(4000);
  const cards = page.locator('div').filter({ hasText: '获取于:' }).filter({ visible: true });
  const items = [];
  const watermark = /(版权所有，侵权必究|请勿转发|转发必究|授权用户专享|未经授权禁止复制传播|内容已添加防伪标识|内容已加密保护|请放弃转发|不要尝试挑战|我可以让你转发|本文仅供授权用户阅读|严禁转发分享)/;
  const cleanLines = (value) => value.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    .filter(s => !watermark.test(s)).filter(s => !/^获取于\s*:/.test(s))
    .filter(s => !/\.(pdf|docx?|xlsx?|csv|zip|rar|txt|pptx?)(\s|$)/i.test(s))
    .filter(s => !/^(下载|查看|附件|文件)\b|下载\s*\d+\s*次|\d+(?:\.\d+)?\s*(?:KB|MB)\b/i.test(s))
    .filter(s => !/^(话题列表|展开全部|收起|上一页|下一页|第\s*\d+\s*页)/.test(s))
    .filter(s => !(s.length === 1 && /[\u4e00-\u9fff，。！？、：；（）()“”‘’…—,.!?]/.test(s)));
  const seen = new Set();
  for (let i = 0; i < await cards.count() && items.length < 10; i++) {
    const card = cards.nth(i);
    const text = (await card.innerText().catch(() => '')).trim();
    if (!text || text.length < 80 || /订阅方案|VIP会员/.test(text)) continue;
    const key = text.replace(/\s+/g, ' ').slice(0, 500);
    if (seen.has(key)) continue; seen.add(key);
    const expand = card.getByRole('button', { name: /展开全部|展开|show more/i }).first();
    if (await expand.count()) await expand.click().catch(() => {});
    const links = await card.locator('a, [role="link"], button').all();
    const files = [];
    for (const link of links) {
      const href = await link.getAttribute('href');
      const download = await link.getAttribute('download');
      const name = ((await link.innerText().catch(() => '')) || download || '').trim();
      const looksLikeFile = /\.(pdf|docx?|xlsx?|csv|zip|rar|txt|pptx?)(\?|$)/i.test(href || '') || /\.(pdf|docx?|xlsx?|csv|zip|rar|txt|pptx?)/i.test(name);
      if ((href || download) && name && (download || looksLikeFile || /下载|附件/i.test(name))) files.push({ name: name.replace(/^下载\s*/i, ''), url: href ? new URL(href, url).toString() : null });
    }
    const cardText = (await card.innerText().catch(() => text)).trim();
    for (const m of cardText.matchAll(/([^\n]+\.(?:pdf|docx?|xlsx?|csv|zip|rar|txt|pptx?))\s*\n\s*([\d.]+\s*(?:KB|MB))/gi)) {
      if (!files.some(f => f.name === m[1].trim())) files.push({ name: m[1].trim(), size: m[2].trim(), url: null });
    }
    const lines = cleanLines(cardText);
    const meta = lines.findIndex(s => /^获取于\s*:/.test(s));
    const content = meta >= 0 ? lines.slice(meta + 1) : lines;
    const publishedAt = content.find(s => /\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}\/\d{1,2}/.test(s)) || '';
    const title = content.find(s => s.length >= 5 && !/^\d+$/.test(s) && !/^看多君/.test(s)) || '抓取内容';
    const body = content.filter(s => s !== title && s !== publishedAt && !/^看多君/.test(s) && !/^\d+$/.test(s));
    items.push({ id: `${Date.now()}-${i}`, capturedAt: new Date().toISOString(), publishedAt, title, text: body.join('\n'), files });
  }
  const existing = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, 'utf8')) : [];
  const merged = [...items, ...existing].filter((item, index, all) => index === all.findIndex(x => x.text === item.text)).slice(0, 10);
  fs.writeFileSync(output, JSON.stringify(merged, null, 2));
  console.log(`Saved ${items.length} items`);
} finally { await context.close(); await browser.close(); }
