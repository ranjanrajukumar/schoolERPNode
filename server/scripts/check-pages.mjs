// Opens every page in the menu as the admin in a real browser and reports crashes, console errors and empty pages.
// For pages with a "+ New…" button it also opens that popup. The API (:4000) and the client (:5173) must be running.
//   node scripts/check-pages.mjs          (npm run check:pages)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = process.env.WEB || 'http://localhost:5173';
const here = path.dirname(fileURLToPath(import.meta.url));
const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => p && fs.existsSync(p));
if (!CHROME) {
  console.log('Chrome was not found (set CHROME_PATH).');
  process.exit(0);
}

const menu = fs.readFileSync(path.join(here, '../../client/src/config/menu.js'), 'utf8');
const routes = [...new Set([...menu.matchAll(/\['[^'\n]+', '(\/[^']*)'/g)].map((m) => m[1]))].filter(
  (r) => r !== '/portal',
);

const { default: puppeteer } = await import('puppeteer-core');
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
page.on('dialog', (d) => d.dismiss());
await page.setViewport({ width: 1300, height: 1000 });
await page.goto(`${WEB}/login`, { waitUntil: 'networkidle0' });
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('button[type=submit]')]);

let problems = 0;
let issues = [];
page.on('pageerror', (e) => issues.push(`crash: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
    issues.push(`console: ${m.text().slice(0, 160)}`);
});
page.on('response', (r) => {
  if (r.status() >= 500) issues.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`);
});

for (const route of routes) {
  issues = [];
  await page.goto(`${WEB}${route}`, { waitUntil: 'networkidle0' }).catch(() => issues.push('did not load'));
  await new Promise((r) => setTimeout(r, 400));
  const body = await page.evaluate(() => document.querySelector('main, .content, #root')?.innerText ?? '');
  if (body.trim().length < 20) issues.push('page is empty');
  if (/something went wrong|cannot read|is not a function|undefined is not/i.test(body))
    issues.push(
      `error text on page: ${body.match(/something went wrong|cannot read[^\n]*|[^\n]*is not a function/i)?.[0]}`,
    );
  const opened = await page.evaluate(() => {
    const b = document.querySelector('.profile-head .big-action');
    if (b && b.tagName === 'BUTTON' && !b.disabled && /^\+/.test(b.innerText.trim())) {
      b.click();
      return b.innerText.trim();
    }
    return null;
  });
  if (opened) {
    await new Promise((r) => setTimeout(r, 400));
    if (!(await page.$('.modal'))) issues.push(`"${opened}" opened no popup`);
    await page.keyboard.press('Escape');
  }
  if (issues.length) {
    problems++;
    console.log(`✖ ${route}\n   ${[...new Set(issues)].join('\n   ')}`);
  } else console.log(`✔ ${route}${opened ? `  (${opened})` : ''}`);
}
await browser.close();
console.log(`\n${routes.length - problems} of ${routes.length} pages are clean.`);
process.exit(problems ? 1 : 0);
