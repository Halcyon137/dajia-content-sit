import { chromium } from 'playwright';
import fs from 'node:fs';

const url = process.env.SITE_URL || 'https://xq.openshare.eu.cc/groups/28858542222551';
const rootUrl = new URL('/', url).toString();
const profile = process.env.BROWSER_PROFILE || './.browser-session';
fs.mkdirSync(profile, { recursive: true });

const context = await chromium.launchPersistentContext(profile, {
  headless: false,
  acceptDownloads: true,
  viewport: { width: 1440, height: 900 }
});
const page = context.pages()[0] || await context.newPage();
await page.goto(rootUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.waitForTimeout(1200);
const user = process.env.SITE_USERNAME;
const password = process.env.SITE_PASSWORD;
if (user && password) {
  await page.locator('button').filter({ hasText: '注册 / 登录' }).first().click().catch(() => {});
  await page.waitForTimeout(500);
  const uf = page.locator('input[type="text"]:visible, input[type="email"]:visible').first();
  const pf = page.locator('input[type="password"]:visible').first();
  if (await uf.count() && await pf.count()) { await uf.fill(user); await pf.fill(password); await page.getByRole('button', { name: /^登录$/ }).last().click().catch(() => {}); }
}
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {});
console.log('浏览器已打开并尝试登录；看到群组内容后回到终端按 Enter 保存会话。');
const save = async () => {
  await context.storageState({ path: './browser-state.json' });
  await context.close();
  console.log('登录会话已保存到 browser-state.json');
};
setTimeout(save, 5000);
