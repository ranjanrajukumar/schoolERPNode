// Browser test of the visual report designer, driven through the real screen.
//   node --test test/designer.ui.test.mjs        (the API on :4000 and the client on :5173 must be running)
// Needs Chrome: set CHROME_PATH if it is not in the usual place. The test skips itself when no browser is found.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const API = process.env.API || 'http://localhost:4000/api';
const WEB = process.env.WEB || 'http://localhost:5173';
const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => p && fs.existsSync(p));
const NAME = `Zz UI design ${Date.now().toString(36).slice(-5)}`;

let puppeteer;
let browser;
let page;
let token;
let templateId = null;
const errors = [];

const api = async (p, { method = 'GET', body } = {}) => {
  const res = await fetch(API + p, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};
const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, what, ms = 30000) => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) assert.fail(`timed out waiting for ${what}`);
    await wait(250);
  }
};
const clickText = async (text, exact = true) => {
  const ok = await page.evaluate(
    (t, ex) => {
      const b = [...document.querySelectorAll('button')].find(
        (x) => !x.disabled && (ex ? x.innerText.trim() === t : x.innerText.includes(t)),
      );
      if (b) b.click();
      return Boolean(b);
    },
    text,
    exact,
  );
  assert.ok(ok, `no enabled button "${text}"`);
};
/** Drops a field chip or a tool chip onto a band, the way a person drags it, with real drag events. */
const dropOn = (chipText, bandLabel, dx = 20, dy = 4) =>
  page.evaluate(
    (chip, band, x, y) => {
      const li = [...document.querySelectorAll('.rd-chips li')].find((e) =>
        e.textContent.trim().endsWith(chip),
      );
      const body = [...document.querySelectorAll('.rd-band')]
        .find((e) => e.querySelector('.rd-band-tag').textContent.trim().toLowerCase() === band.toLowerCase())
        ?.querySelector('.rd-band-body');
      if (!li || !body) return `missing ${!li ? 'chip ' + chip : 'band ' + band}`;
      const dt = new DataTransfer();
      li.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
      const r = body.getBoundingClientRect();
      const at = {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
        clientX: r.left + x,
        clientY: r.top + y,
      };
      body.dispatchEvent(new DragEvent('dragover', at));
      body.dispatchEvent(new DragEvent('drop', at));
      return 'ok';
    },
    chipText,
    bandLabel,
    dx,
    dy,
  );
const bandTexts = (bandLabel) =>
  page.evaluate(
    (band) =>
      [
        ...([...document.querySelectorAll('.rd-band')]
          .find(
            (e) => e.querySelector('.rd-band-tag').textContent.trim().toLowerCase() === band.toLowerCase(),
          )
          ?.querySelectorAll('.rd-el') ?? []),
      ].map((e) => e.innerText.trim()),
    bandLabel,
  );
const propValue = (label) =>
  page.evaluate((l) => {
    const el = [...document.querySelectorAll('.rd-right .rd-num, .rd-right .rd-four label')].find(
      (e) => e.querySelector('small')?.textContent.trim() === l,
    );
    return el?.querySelector('input')?.value ?? null;
  }, label);

describe(
  'report designer in the browser',
  { skip: !CHROME && 'Chrome was not found (set CHROME_PATH)' },
  () => {
    before(async () => {
      ({ default: puppeteer } = await import('puppeteer-core'));
      browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
      page = await browser.newPage();
      page.on('dialog', (d) => d.accept('test'));
      page.on('pageerror', (e) => errors.push(e.message));
      await page.setViewport({ width: 1500, height: 1100 });
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@school.local', password: 'admin123' }),
      });
      token = (await res.json()).token;
      assert.ok(token, 'could not sign in as the admin');
      await page.goto(`${WEB}/login`, { waitUntil: 'networkidle0' });
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click('button[type=submit]'),
      ]);
      await page.goto(`${WEB}/report-designer`, { waitUntil: 'networkidle0' });
    });

    after(async () => {
      if (templateId) {
        const runs = (await api(`/report-designer/runs?templateId=${templateId}`)).data.runs ?? [];
        for (const r of runs) await api(`/report-designer/runs/${r.id}`, { method: 'DELETE' });
        await api(`/report-designer/templates/${templateId}`, { method: 'DELETE' });
      }
      await browser?.close();
    });

    test('the designer opens with its bands, fields and tools', async () => {
      await until(() => page.$('.rd-page'), 'the page');
      const bands = await page.$$eval('.rd-band-tag', (els) => els.map((e) => e.textContent.trim()));
      assert.deepEqual(bands, ['Report header', 'Page header', 'Detail', 'Page footer']);
      const fields = await until(
        () => page.$$eval('.rd-chips li', (els) => els.map((e) => e.textContent.trim())),
        'the field list',
      );
      assert.ok(
        fields.some((f) => /Admission no/.test(f)),
        `fields: ${fields.join(', ')}`,
      );
      assert.ok(
        fields.some((f) => /Page number/.test(f)) &&
          fields.some((f) => /School logo/.test(f)) &&
          fields.some((f) => /Line/.test(f)),
        'the tools are listed',
      );
    });

    test('dropping fields on bands: the value in the detail, a heading in the page header', async () => {
      assert.equal(await dropOn('Admission no', 'Detail', 10, 3), 'ok');
      assert.equal(await dropOn('First name', 'Detail', 120, 3), 'ok');
      assert.equal(await dropOn('Admission no', 'Page header', 10, 4), 'ok');
      assert.equal(await dropOn('First name', 'Page header', 120, 4), 'ok');
      await wait();
      const detail = await bandTexts('Detail');
      const header = await bandTexts('Page header');
      assert.ok(
        detail.some((t) => t.includes('[Admission no]')) && detail.some((t) => t.includes('[First name]')),
        `detail: ${detail.join(' | ')}`,
      );
      assert.ok(
        header.includes('Admission no') && header.includes('First name'),
        `page header: ${header.join(' | ')}`,
      );
    });

    test('grouping adds the group bands, and a group total can be dropped in the footer', async () => {
      await clickText('Report');
      await page.select('select[aria-label="Group by"]', 'class');
      await wait();
      const bands = await page.$$eval('.rd-band-tag', (els) => els.map((e) => e.textContent.trim()));
      assert.deepEqual(bands, [
        'Report header',
        'Page header',
        'Group header',
        'Detail',
        'Group footer',
        'Page footer',
      ]);
      assert.ok(
        (await bandTexts('Group header')).some((t) => t.includes('{{group}}')),
        'the group header gets the group heading',
      );
      await clickText('Fields');
      assert.equal(await dropOn('Admission no', 'Group footer', 120, 3), 'ok');
      await wait();
      assert.ok(
        (await bandTexts('Group footer')).some((t) => /count\(Admission no\).*group/.test(t)),
        'a group total is made in the group footer',
      );
    });

    test('a page number can go in the footer but not in the detail', async () => {
      assert.equal(await dropOn('Page number', 'Detail', 5, 3), 'ok');
      await wait();
      assert.ok(
        /Page numbers can only go in the page header or the page footer/.test(
          await page.evaluate(() => document.body.innerText),
        ),
        'the reason is shown',
      );
      assert.ok(
        !(await bandTexts('Detail')).some((t) => /Page \{\{page\}\}/.test(t)),
        'nothing was added to the detail',
      );
    });

    test('a formula can be added; a mistake in it is explained, and fixing it makes the preview work again', async () => {
      assert.equal(await dropOn('Formula', 'Detail', 300, 3), 'ok');
      await wait();
      assert.ok(
        (await bandTexts('Detail')).some((t) => t.startsWith('ƒ')),
        'the formula shows on the page',
      );
      assert.ok(
        /Formula/.test(await page.$eval('.rd-right h3', (e) => e.textContent)),
        'its settings are open',
      );
      const setFormula = (text) =>
        page.evaluate((t) => {
          const ta = document.querySelector('textarea[aria-label="Formula"]');
          Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, t);
          ta.dispatchEvent(new Event('input', { bubbles: true }));
        }, text);
      const previewState = async () => {
        await clickText('Preview');
        return until(async () => {
          const st = await page.evaluate(() => ({
            pdf: document.querySelector('.rd-preview iframe')?.src ?? '',
            error: document.querySelector('.rd-preview .error')?.innerText ?? '',
          }));
          return st.pdf || st.error ? st : null;
        }, 'the preview result');
      };

      await setFormula("upper(firstName) + ' ' + lastName");
      const good = await previewState();
      assert.ok(good.pdf.startsWith('blob:'), `a correct formula previews (${good.error})`);
      await clickText('Close');

      await setFormula('nope * 2');
      const wrong = await previewState();
      assert.match(
        wrong.error,
        /bands\.detail\.elements\[\d+\].*“nope” is not a field of this data/,
        'the mistake is explained, with where it is',
      );
      await clickText('Close');

      await setFormula('process.exit(1)');
      const attack = await previewState();
      assert.ok(attack.error, 'code is refused, not run');
      await clickText('Close');

      await setFormula('upper(firstName)');
      const fixed = await previewState();
      assert.ok(fixed.pdf.startsWith('blob:'), 'fixing it brings the preview back');
      await clickText('Close');
    });

    test('an item can be selected, edited and dragged, and undo puts it back', async () => {
      const face = await page.evaluateHandle(() =>
        [...document.querySelectorAll('.rd-band')]
          .find((e) => e.querySelector('.rd-band-tag').textContent.trim() === 'Detail')
          .querySelector('.rd-el'),
      );
      const box = await face.asElement().boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await wait();
      const before = Number(await propValue('X'));
      assert.ok(
        /Field/.test(await page.$eval('.rd-right h3', (e) => e.textContent)),
        'the properties panel shows the field',
      );
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 8 });
      await page.mouse.up();
      await wait();
      const moved = Number(await propValue('X'));
      assert.ok(moved > before + 30, `dragging moved it from ${before} to ${moved}`);
      await page.keyboard.down('Control');
      await page.keyboard.press('z');
      await page.keyboard.up('Control');
      await wait();
      assert.equal(Number(await propValue('X')), before, 'undo puts it back');
    });

    test('saving: name, folder and who may run it; the server then holds a design', async () => {
      await page.type('input[aria-label="Report name"]', NAME);
      await clickText('Save');
      await until(() => page.$('.modal form'), 'the save dialog');
      const ok = await page.evaluate(() => {
        const box = [...document.querySelectorAll('.modal label')]
          .find((l) => l.textContent.includes('teacher'))
          ?.querySelector('input');
        if (box) box.click();
        return Boolean(box);
      });
      assert.ok(ok, 'the roles are offered');
      await page.evaluate(() => [...document.querySelectorAll('.modal button[type=submit]')][0].click());
      await until(
        async () => (await page.evaluate(() => document.body.innerText)).includes(`Saved “${NAME}”`),
        'the saved notice',
      );
      const found = (await api('/report-designer/templates')).data.find((t) => t.name === NAME);
      assert.ok(found, 'the design is on the server');
      templateId = found.id;
      assert.equal(found.kind, 'design');
      assert.deepEqual(found.roles, ['teacher']);
      assert.equal(found.config.design.groupBy, 'class');
      assert.ok(found.config.design.bands.detail.elements.length >= 2, 'the detail items were saved');
      assert.ok(found.config.design.bands.groupFooter.elements.length >= 1, 'the group footer was saved');
    });

    test('live preview shows a PDF made by the server', async () => {
      await clickText('Preview');
      const src = await until(
        () => page.$eval('.rd-preview iframe', (f) => f.src).catch(() => null),
        'the preview frame',
      );
      assert.ok(src.startsWith('blob:'), 'the preview is a PDF blob');
      const bytes = await page.evaluate(
        async (u) => new Uint8Array(await (await fetch(u)).arrayBuffer()).slice(0, 5).join(','),
        src,
      );
      assert.equal(bytes, [...Buffer.from('%PDF-')].join(','), 'the preview is a real PDF');
      await clickText('Close');
    });

    test('PDF and Excel are built on the server from the saved design', async () => {
      await clickText('PDF');
      await until(
        async () =>
          (await api(`/report-designer/runs?templateId=${templateId}`)).data.runs.some(
            (r) => r.format === 'pdf' && r.status === 'done',
          ),
        'the PDF run',
      );
      // the PDF opens in a new tab, where the browser can print it
      const tab = await until(
        async () => (await browser.pages()).find((pg) => pg.url().startsWith('blob:')),
        'the PDF in a new tab',
        15000,
      );
      assert.ok(tab, 'a new tab holds the PDF');
      await tab.close();
      // the toolbar is disabled while a report is being built; wait until it is free again
      await until(
        () =>
          page.evaluate(
            () =>
              ![...document.querySelectorAll('button')].some(
                (b) => b.innerText.trim() === 'Excel' && b.disabled,
              ),
          ),
        'the toolbar to be free',
      );
      await clickText('Excel');
      const run = await until(
        async () =>
          (await api(`/report-designer/runs?templateId=${templateId}`)).data.runs.find(
            (r) => r.format === 'xlsx' && r.status === 'done',
          ),
        'the Excel run',
      );
      assert.ok(run.size > 1000, `the Excel file is ${run.size} bytes`);
    });

    test('opening the saved report brings the design back', async () => {
      await page.goto(`${WEB}/report-designer`, { waitUntil: 'networkidle0' });
      await clickText('Open…');
      await until(() => page.$('.rd-open-row'), 'the list of reports');
      const opened = await page.evaluate((n) => {
        const row = [...document.querySelectorAll('.rd-open-row')].find((r) => r.innerText.includes(n));
        const b = row && [...row.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Open');
        if (b) b.click();
        return Boolean(b);
      }, NAME);
      assert.ok(opened, 'the report is in the list');
      await wait(800);
      const bands = await page.$$eval('.rd-band-tag', (els) => els.map((e) => e.textContent.trim()));
      assert.ok(
        bands.includes('Group header') && bands.includes('Group footer'),
        `bands: ${bands.join(', ')}`,
      );
      assert.equal(await page.$eval('input[aria-label="Report name"]', (e) => e.value), NAME);
    });

    test('the screen threw no errors', () => {
      assert.deepEqual(errors, []);
    });
  },
);
