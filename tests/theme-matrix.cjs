const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { chromium } = require('playwright');
const { createStaticHandler } = require('./static-server.cjs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'docs/screenshots/theme-matrix');
const load = (env) => (process.env[env] ? fs.readFileSync(process.env[env], 'utf8') : '');
const obsidian = load('TP_OBSIDIAN_CSS');
const minimal = load('TP_MINIMAL_CSS');
const fallback =
  require('./browser-theme.cjs') +
  `
body.theme-light { --background-primary:#fff; --background-secondary:#f6f6f6;
--text-normal:#222; --text-muted:#666; --text-faint:#777; --background-modifier-border:#ddd; }
button:not(.clickable-icon) { background:var(--background-secondary); box-shadow:0 1px 3px #0003; }
button:hover { background:var(--background-modifier-hover); box-shadow:0 2px 4px #0004; }
button:focus-visible { box-shadow:0 0 0 3px var(--background-modifier-border); }
`;
(async () => {
  fs.mkdirSync(output, { recursive: true });
  await build({
    entryPoints: [path.join(__dirname, 'browser-mock.js')],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    outfile: path.join(root, '.test-build/browser-mock.js'),
  });
  const servers = [],
    results = [];
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
      timezoneId: 'Asia/Yerevan',
      viewport: { width: 1440, height: 1000 },
    });
    await context.addInitScript(() => {
      const NativeDate = Date;
      window.Date = class extends NativeDate {
        constructor(...args) {
          if (!args.length) super('2026-10-02T08:00:00Z');
          else super(...args);
        }
        static now() {
          return new NativeDate('2026-10-02T08:00:00Z').valueOf();
        }
      };
    });
    for (const skin of ['default', 'minimal']) {
      const theme =
        (obsidian || fallback) +
        (skin === 'minimal' ? minimal : '') +
        '\nhtml,body{margin:0;} .tp-host{height:100vh;}';
      const server = http.createServer(createStaticHandler(root, theme));
      await new Promise((r) => server.listen(0, '127.0.0.1', r));
      servers.push(server);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto('http://127.0.0.1:' + server.address().port);
      await page.waitForFunction(() => window.ready);
      await page.evaluate(async () => {
        await window.tp.plugin.service.createTask({
          title: 'Readable long task with type, priority and description / Полное название задачи',
          description: '<img src=x onerror=window.untrusted=true>\nKeep this note body.',
          kind: 'meeting',
          priority: 'high',
          status: 'todo',
          scheduled: '2026-10-02',
          due: '2026-10-06',
          plannedMinutes: 91,
          minutes: 0,
          project: '',
          recurrence: '',
        });
        await window.tp.plugin.repo.load();
      });
      for (const mode of ['dark', 'light'])
        for (const width of [1440, 840, 520, 390]) {
          const label = `${skin}-${mode}-${width}`;
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate((mode) => {
            document.body.className = 'theme-' + mode + ' mod-linux';
            window.tp.plugin.settings.uiScalePercent = 100;
            window.tp.view.tab = 'today';
            window.tp.view.query = '';
            window.tp.view.rebuild();
          }, mode);
          await page.evaluate(
            () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
          );
          const circle = page
            .locator('.tp-task[data-path="Planner/Tasks/shower.md"] button.tp-check')
            .first();
          const inspect = async () =>
            circle.evaluate((n) => {
              const s = getComputedStyle(n);
              return {
                background: s.backgroundColor,
                image: s.backgroundImage,
                shadow: s.boxShadow,
                border: s.borderTopWidth,
              };
            });
          const expected = {
            background: 'rgba(0, 0, 0, 0)',
            image: 'none',
            shadow: 'none',
            border: '0px',
          };
          assert.deepEqual(await inspect(), expected, label + ' idle');
          await circle.hover();
          assert.deepEqual(await inspect(), expected, label + ' hover');
          const hostile = await page.addStyleTag({
            content:
              '.tp-shell button { background:#777 !important; border:2px solid #777 !important; box-shadow:0 0 3px #aaa !important; }',
          });
          assert.deepEqual(await inspect(), expected, label + ' important theme skin');
          await hostile.evaluate((n) => n.remove());
          await page.keyboard.press('Tab');
          await circle.focus();
          assert.deepEqual(await inspect(), expected, label + ' focus');
          assert.ok(
            await circle.evaluate(
              (n) =>
                parseFloat(getComputedStyle(n).outlineWidth) > 0 &&
                getComputedStyle(n).outlineStyle !== 'none',
            ),
            label + ' keyboard outline',
          );
          await page.mouse.down();
          assert.deepEqual(await inspect(), expected, label + ' active');
          await page.mouse.move(0, 0);
          await page.mouse.up();
          const before = await page.evaluate(() =>
            window.tp.app.vault.read(
              window.tp.app.vault.getAbstractFileByPath('Planner/Tasks/shower.md'),
            ),
          );
          await circle.focus();
          await page.keyboard.press('Enter');
          await page.waitForFunction(
            () =>
              window.tp.plugin.repo
                .snapshot()
                .tasks.find((t) => t.path === 'Planner/Tasks/shower.md').occurrences['2026-10-02']
                ?.status === 'done',
          );
          await page.evaluate(() => window.tp.plugin.service.undo());
          assert.equal(
            await page.evaluate(() =>
              window.tp.app.vault.read(
                window.tp.app.vault.getAbstractFileByPath('Planner/Tasks/shower.md'),
              ),
            ),
            before,
            label + ' undo',
          );
          const footer = page.locator('.tp-sidebar-bottom > button');
          assert.deepEqual(
            await footer.evaluateAll((ns) =>
              ns.map((n) => {
                const s = getComputedStyle(n);
                return [s.backgroundColor, s.backgroundImage, s.boxShadow, s.borderTopWidth];
              }),
            ),
            Array.from({ length: 3 }, () => ['rgba(0, 0, 0, 0)', 'none', 'none', '0px']),
            label + ' footer',
          );
          if (width > 600) {
            const positions = await page.evaluate(() => {
              const q = (s) => document.querySelector(s),
                x = (n) => n.getBoundingClientRect().left;
              const textX = (n) => x(n) + parseFloat(getComputedStyle(n).paddingLeft);
              return [
                x(q('.tp-brand')),
                textX(q('.tp-nav-heading')),
                x(q('.tp-nav-icon')),
                textX(q('.tp-sidebar-bottom > button')),
              ];
            });
            assert.ok(
              Math.max(...positions) - Math.min(...positions) <= 2,
              label + ' alignment ' + positions,
            );
          }
          await page.screenshot({ path: path.join(output, label + '-today.png') });
          await page.locator('.tp-quick input[type=text]').first().fill('Unsaved draft');
          await page.locator('[data-menu-toggle]').focus();
          await page.keyboard.press('Enter');
          assert.ok(
            await page
              .locator('.tp-sidebar')
              .evaluate((n) => n.hidden && getComputedStyle(n).display === 'none'),
            label + ' collapsed',
          );
          assert.ok(
            await page.locator('[data-menu-toggle]').evaluate((n) => n === document.activeElement),
            label + ' toggle focus',
          );
          assert.ok(
            await page.locator('.tp-content').evaluate((n) => n.getBoundingClientRect().left < 25),
            label + ' full width',
          );
          await page.keyboard.press('Enter');
          assert.equal(
            await page.locator('.tp-quick input[type=text]').first().inputValue(),
            'Unsaved draft',
          );
          await page.locator('.tp-quick input[type=text]').first().fill('');
          for (const tab of [
            'inbox',
            'today',
            'upcoming',
            'calendar',
            'projects',
            'kanban',
            'subscriptions',
            'statistics',
            'manualTab',
          ]) {
            await page.locator(`[data-tab=${tab}]`).click();
            if (tab === 'calendar')
              for (const view of ['day', 'week', 'month']) {
                await page.locator(`[data-calendar-view=${view}]`).click();
                assert.ok(
                  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
                  label + ' calendar ' + view + ' overflow',
                );
                assert.ok(
                  await page
                    .locator('.tp-calendar-surface,.tp-calendar-grid,.tp-calendar-toolbar')
                    .evaluateAll((ns) => ns.every((n) => n.scrollWidth <= n.clientWidth + 1)),
                  label + ' calendar ' + view + ' internal clipping',
                );
                const titles = await page.locator('.tp-task-title').evaluateAll((ns) =>
                  ns.map((n) => ({
                    text: n.textContent,
                    width: n.clientWidth,
                    scroll: n.scrollWidth,
                    font: getComputedStyle(n).fontSize,
                    heading: n.parentElement.clientWidth,
                  })),
                );
                assert.ok(
                  titles.every((n) => n.scroll <= n.width + 1),
                  label +
                    ' full names ' +
                    view +
                    ': ' +
                    JSON.stringify(titles.filter((n) => n.scroll > n.width + 1)),
                );
              }
            assert.ok(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
              label + ' ' + tab + ' overflow',
            );
            if (tab === 'manualTab') {
              await page.locator('[data-menu-toggle]').focus();
              await page.keyboard.press('Enter');
              assert.ok(
                await page.locator('[data-menu-toggle]').isVisible(),
                label + ' Guide toggle',
              );
              await page.keyboard.press('Enter');
            } else {
              await page.locator('.tp-filters-toggle').click();
              assert.ok(
                await page.locator('.tp-filter-panel').isVisible(),
                label + ' filters open',
              );
              await page.locator('.tp-filters-toggle').click();
              assert.equal(
                await page.locator('.tp-filter-panel').isVisible(),
                false,
                label + ' filters close',
              );
            }
          }
          for (const scale of [85, 115]) {
            await page.evaluate((scale) => {
              window.tp.plugin.settings.uiScalePercent = scale;
              window.tp.view.tab = 'calendar';
              window.tp.view.rebuild();
            }, scale);
            await page.locator('[data-calendar-view=month]').click();
            assert.ok(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
              label + ' scale ' + scale,
            );
          }
          await page.screenshot({ path: path.join(output, label + '-calendar.png') });
          assert.deepEqual(errors, [], label + ' JS errors');
          assert.equal(
            await page.evaluate(() => window.untrusted),
            undefined,
            label + ' literal description',
          );
          results.push('PASS ' + label);
          console.log(results.at(-1));
        }
      await page.close();
    }
    fs.writeFileSync(
      path.join(root, 'docs/theme-matrix-current.txt'),
      results.join('\n') +
        `\n${results.length}/16 passed\nCSS: ${obsidian ? 'actual Obsidian' : 'fixture'}, ${minimal ? 'actual Minimal' : 'fixture'}\n`,
    );
    console.log(`${results.length}/16 passed`);
  } finally {
    if (browser) await browser.close();
    for (const s of servers) await new Promise((r) => s.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
