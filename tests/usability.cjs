const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { chromium } = require('playwright');
const { createStaticHandler } = require('./static-server.cjs');
const root = path.resolve(__dirname, '..');
(async () => {
  await build({
    entryPoints: [path.join(__dirname, 'browser-mock.js')],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    outfile: path.join(root, '.test-build/browser-mock.js'),
  });
  const server = http.createServer(createStaticHandler(root, require('./browser-theme.cjs')));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.TP_CHROMIUM_EXECUTABLE,
      args: process.env.TP_CHROMIUM_ARGS
        ? JSON.parse(process.env.TP_CHROMIUM_ARGS)
        : ['--no-sandbox'],
    });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      timezoneId: 'Asia/Yerevan',
      hasTouch: true,
    });
    const page = await context.newPage(),
      errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const openTask = () => page.locator('.tp-header-tools > button.mod-cta').click();
    for (const mode of ['dark', 'light'])
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto('http://127.0.0.1:' + server.address().port);
        await page.waitForFunction(() => window.ready);
        await page.evaluate((mode) => {
          document.body.className = 'theme-' + mode;
          if (mode === 'light')
            for (const [key, value] of Object.entries({
              '--background-primary': '#ffffff',
              '--background-secondary': '#f6f6f6',
              '--text-normal': '#222222',
              '--text-muted': '#666666',
              '--background-modifier-border': '#dddddd',
              '--text-faint': '#777777',
            }))
              document.documentElement.style.setProperty(key, value);
        }, mode);
        await openTask();
        assert.equal(await page.locator('.tp-modal .tp-form-section[open]').count(), 0);
        assert.equal(await page.locator('.tp-modal textarea').first().isVisible(), false);
        await page.locator('.tp-modal form > .tp-field input').fill('Contact usability fixture');
        await page
          .locator('.tp-modal select')
          .filter({ has: page.locator('option[value=contact]') })
          .selectOption('contact');
        assert.equal(
          await page
            .locator('.tp-modal .tp-select-trigger')
            .filter({ hasText: 'Связаться' })
            .count(),
          1,
        );
        await page.screenshot({
          path: path.join(root, `.test-build/usability-default-${mode}-${width}.png`),
        });
        await page.locator('[data-section=planning] > summary').click();
        await page.locator('[data-field=plannedMinutes]').fill('91');
        await page.locator('.tp-work-dates .tp-date').fill('2026-12-20');
        await page.locator('.tp-work-date-add').click();
        assert.equal(await page.locator('.tp-work-date-list .tp-filter-chip').count(), 1);
        await page.locator('[data-section=description] > summary').click();
        await page.locator('.tp-modal textarea').first().fill('A message or a phone call.');
        await page.locator('.tp-modal textarea.tp-result').fill('Agreed on the next steps.');
        await page.locator('.tp-modal .tp-modal-actions button').first().click();
        await openTask();
        assert.equal(
          await page.locator('.tp-modal textarea').first().inputValue(),
          'A message or a phone call.',
        );
        assert.equal(
          await page.locator('.tp-modal textarea.tp-result').inputValue(),
          'Agreed on the next steps.',
        );
        assert.equal(await page.locator('.tp-work-date-list .tp-filter-chip').count(), 1);
        assert.ok(await page.locator('.tp-draft-banner').isVisible());
        assert.ok(await page.locator('[data-field=plannedMinutes]').isVisible());
        await page.locator('[data-section=repeat] > summary').click();
        await page
          .locator('.tp-modal select')
          .filter({ has: page.locator('option[value=builder]') })
          .selectOption('builder');
        await page.locator('[data-field=repeatInterval]').fill('2');
        await page.locator('.tp-repeat-days input[value=MO]').check();
        await page.locator('.tp-repeat-days input[value=TH]').check();
        await page.locator('[data-field=repeatCount]').fill('4');
        assert.ok(await page.locator('.tp-repeat-preview').isVisible());
        assert.equal(await page.locator('.tp-work-dates').isVisible(), false);
        assert.ok(
          await page.locator('.tp-modal').evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
        );
        await page.locator('.tp-modal button[type=submit]').click();
        await page.waitForFunction(() => !document.querySelector('.tp-modal'));
        const task = await page.evaluate(() =>
          window.tp.plugin.repo
            .snapshot()
            .tasks.find((t) => t.title === 'Contact usability fixture'),
        );
        assert.equal(task.kind, 'contact');
        assert.match(task.recurrence, /FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,TH;COUNT=4/);
        assert.deepEqual(task.workDates, []);
        const search = page.locator('.tp-filters input');
        await search.fill('No matches fixture');
        assert.ok(await page.locator('.tp-filter-chips').isVisible());
        assert.match(await page.locator('.tp-empty').textContent(), /Ничего не найдено/);
        await page.locator('.tp-filter-chips button').click();
        assert.equal(await search.inputValue(), '');
        await page.locator('[data-tab=calendar]').click();
        await page.locator('[data-calendar-view=week]').click();
        const notes = await page.evaluate(() =>
          [...window.tp.app.vault.files].map(([key, value]) => [key, value.text]),
        );
        await page.evaluate(async () => {
          const old = window.tp.view,
            next = new old.constructor({ app: window.tp.app }, window.tp.plugin);
          await old.onClose();
          old.contentEl.remove();
          await next.onOpen();
          window.tp.view = next;
        });
        assert.equal(
          await page.locator('[data-calendar-view=week]').getAttribute('aria-pressed'),
          'true',
        );
        assert.deepEqual(
          await page.evaluate(() =>
            [...window.tp.app.vault.files].map(([key, value]) => [key, value.text]),
          ),
          notes,
        );
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        console.log(
          `PASS progressive forms, Contact, drafts, work dates, repeat builder, filter chips and view restoration ${mode}-${width}`,
        );
      }
    assert.deepEqual(errors, []);
    await context.close();
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
