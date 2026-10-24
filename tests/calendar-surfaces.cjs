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
      viewport: { width: 1440, height: 1050 },
      timezoneId: 'Asia/Yerevan',
    });
    await context.addInitScript(() => {
      const Original = Date;
      window.Date = class extends Original {
        constructor(...args) {
          if (!args.length) super('2026-11-01T08:00:00Z');
          else super(...args);
        }
        static now() {
          return new Original('2026-11-01T08:00:00Z').valueOf();
        }
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let checks = 0;
    for (const theme of ['black', 'light'])
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1050 });
        await page.goto('http://127.0.0.1:' + server.address().port);
        await page.waitForFunction(() => window.ready);
        await page.evaluate(async (theme) => {
          document.body.className = 'theme-' + (theme === 'black' ? 'dark' : 'light');
          const values =
            theme === 'black'
              ? {
                  '--background-primary': '#000000',
                  '--background-secondary': '#0a0a0a',
                  '--text-normal': '#dddddd',
                  '--text-muted': '#777777',
                  '--interactive-accent': '#4dc6ba',
                }
              : {
                  '--background-primary': '#ffffff',
                  '--background-secondary': '#f5f5f5',
                  '--text-normal': '#222222',
                  '--text-muted': '#666666',
                  '--interactive-accent': '#268f85',
                };
          for (const [key, value] of Object.entries(values))
            document.documentElement.style.setProperty(key, value);
          const { plugin, view, app } = window.tp;
          for (const file of app.vault.getMarkdownFiles()) {
            app.vault.files.delete(file.path);
            app.vault.emit('delete', file);
          }
          await plugin.repo.load();
          const base = {
            scheduled: '2026-10-29',
            due: '2026-11-04',
            project: '',
            kind: 'task',
            recurrence: '',
            minutes: 0,
            priority: 'high',
          };
          await plugin.service.createTask({
            ...base,
            title: 'Review Active Directory Playbook',
            status: 'done',
          });
          await plugin.service.createTask({
            ...base,
            title: 'Open work',
            status: 'todo',
            priority: 'normal',
          });
          await plugin.service.createTask({
            ...base,
            title: 'Weekend task',
            scheduled: '2026-11-07',
            due: '',
            status: 'todo',
            priority: 'normal',
          });
          view.tab = 'calendar';
          view.month = '2026-11-01';
          view.calendarFocus = '2026-11-01';
          view.calendarView = 'month';
          view.calendarDetailed = false;
          view.rebuild();
        }, theme);
        for (const detailed of [false, true]) {
          await page.evaluate((detailed) => {
            window.tp.view.calendarDetailed = detailed;
            window.tp.view.rebuild();
          }, detailed);
          const cells = await page.locator('.tp-day').evaluateAll((nodes) =>
            nodes.map((n) => ({
              date: n.dataset.day,
              weekend: n.classList.contains('tp-day-weekend'),
              current: n.classList.contains('tp-current-week'),
              outside: n.classList.contains('tp-outside'),
              empty: n.classList.contains('tp-day-empty'),
              background: getComputedStyle(n).backgroundColor,
              shadow: getComputedStyle(n).boxShadow,
              today: n.classList.contains('tp-day-today'),
              marker: getComputedStyle(n.querySelector('.tp-day-number')).textDecorationLine,
              dateColor: getComputedStyle(n.querySelector('.tp-day-number')).color,
            })),
          );
          const plain = cells.filter((n) => !n.current && !n.weekend),
            weekends = cells.filter((n) => !n.current && n.weekend),
            current = cells.filter((n) => n.current);
          assert.equal(current.length, 7);
          assert.ok(
            await page
              .locator('.tp-day :is(.tp-task-compact, .tp-calendar-continuation)')
              .evaluateAll((cards) =>
                cards.every((card) => {
                  const parent = card.parentElement;
                  const style = getComputedStyle(parent);
                  const available =
                    parent.clientWidth -
                    parseFloat(style.paddingLeft) -
                    parseFloat(style.paddingRight);
                  return Math.abs(card.getBoundingClientRect().width - available) < 1;
                }),
              ),
            'Ordinary and lane cards fill their day container',
          );
          assert.ok(
            weekends.some((n) => n.outside) &&
              weekends.some((n) => !n.empty) &&
              weekends.some((n) => n.empty),
          );
          assert.equal(new Set(weekends.map((n) => n.background)).size, 1, JSON.stringify(cells));
          assert.equal(new Set(plain.map((n) => n.background)).size, 1, JSON.stringify(cells));
          assert.equal(weekends[0].background, plain[0].background);
          assert.notEqual(weekends[0].dateColor, plain[0].dateColor);
          assert.equal(
            new Set(cells.filter((n) => n.weekend && !n.today).map((n) => n.dateColor)).size,
            1,
          );
          const headers = await page
            .locator('.tp-weekday')
            .evaluateAll((nodes) =>
              nodes.map((n) => ({
                background: getComputedStyle(n).backgroundColor,
                color: getComputedStyle(n).color,
              })),
            );
          assert.equal(headers.length, 7);
          assert.equal(new Set(headers.map((n) => n.background)).size, 1);
          assert.equal(headers[5].color, headers[6].color);
          assert.notEqual(headers[0].color, headers[5].color);
          for (const weekend of [false, true]) {
            const marked = current.filter((n) => n.weekend === weekend);
            assert.equal(new Set(marked.map((n) => n.background)).size, 1);
            assert.equal(
              marked[0].background,
              weekend ? weekends[0].background : plain[0].background,
            );
            assert.ok(marked.every((n) => n.shadow === 'none'));
            assert.ok(marked.every((n) => n.today || n.marker.includes('underline')));
          }
          assert.ok(cells.filter((n) => !n.current).every((n) => n.marker === 'none'));
          assert.equal(
            current.find((n) => n.weekend).background,
            current.find((n) => !n.weekend).background,
          );
          const continuation = page.locator(
            '[data-day="2026-11-01"] .tp-calendar-continuation.tp-done',
          );
          const muted = await page.locator('.tp-host').evaluate((n) => {
            const p = document.createElement('span');
            p.style.color = 'var(--text-muted)';
            n.append(p);
            const color = getComputedStyle(p).color;
            p.remove();
            return color;
          });
          for (const state of ['rest', 'hover', 'focus']) {
            if (state === 'rest') await page.mouse.move(0, 0);
            if (state === 'hover') await continuation.hover();
            if (state === 'focus') await continuation.focus();
            assert.equal(
              await continuation
                .locator('.tp-continuation-title')
                .evaluate((n) => getComputedStyle(n).color),
              muted,
              `${theme} ${width} ${detailed} ${state}`,
            );
            assert.ok(
              (
                await continuation
                  .locator('.tp-continuation-title')
                  .evaluate((n) => getComputedStyle(n).textDecorationLine)
              ).includes('line-through'),
            );
            assert.equal(
              await continuation
                .locator('.tp-priority')
                .evaluate((n) => getComputedStyle(n).opacity),
              '0.55',
            );
          }
          if (!detailed) {
            await page.mouse.move(0, 0);
            await page.locator('.tp-calendar-navigation h2').focus();
            await page.screenshot({
              path: path.join(root, `.test-build/calendar-surfaces-${theme}-${width}.png`),
            });
          }
          checks++;
        }
        await page.evaluate(async () => {
          await window.tp.plugin.service.createTask({
            title: 'Daily estimated work',
            scheduled: '2026-10-01',
            due: '',
            project: '',
            kind: 'task',
            recurrence: 'FREQ=DAILY',
            minutes: 0,
            plannedMinutes: 240,
            priority: 'normal',
          });
          window.tp.view.rebuild();
        });
        const meters = await page
          .locator('.tp-day-heading > .tp-day-load-bar')
          .evaluateAll((nodes) =>
            nodes.map((n) => ({
              date: n.closest('.tp-day').dataset.day,
              fill: n.style.getPropertyValue('--tp-load-fill'),
              value: n.getAttribute('aria-valuenow'),
              height: n.getBoundingClientRect().height,
              width: n.getBoundingClientRect().width,
            })),
          );
        assert.equal(meters.length, await page.locator('.tp-day').count());
        assert.ok(
          meters.every(
            (m) => m.fill === '50%' && m.value === '240' && m.height === 2 && m.width > 0,
          ),
          JSON.stringify(meters),
        );
        assert.ok(
          meters.some((m) => m.date < '2026-11-01') && meters.some((m) => m.date > '2026-11-07'),
        );
        await page.evaluate(async () => {
          await window.tp.plugin.service.createTask({
            title: 'Overloaded future day',
            scheduled: '2026-11-14',
            due: '',
            project: '',
            kind: 'task',
            recurrence: '',
            minutes: 0,
            plannedMinutes: 600,
            priority: 'normal',
          });
          window.tp.view.rebuild();
        });
        const overload = page.locator('[data-day="2026-11-14"] .tp-day-load-bar');
        assert.equal(
          await overload.evaluate((n) => n.style.getPropertyValue('--tp-load-fill')),
          '100%',
        );
        assert.ok((await overload.getAttribute('class')).includes('tp-load-over'));
        await page.screenshot({
          path: path.join(root, `.test-build/calendar-surfaces-${theme}-${width}.png`),
        });
        checks++;
        for (const view of ['week', 'day']) {
          await page.evaluate((view) => {
            window.tp.view.calendarView = view;
            window.tp.view.rebuild();
          }, view);
          const weekend = page.locator('.tp-day.tp-day-weekend');
          assert.ok((await weekend.count()) > 0);
          assert.equal(await page.locator('.tp-current-week').count(), 0);
          const mark = weekend.locator('.tp-calendar-continuation.tp-done').first();
          assert.ok(await mark.isVisible());
          checks++;
        }
        assert.equal(
          await page.locator('.tp-host').evaluate((n) => n.scrollWidth > n.clientWidth + 1),
          false,
        );
      }
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${checks} calendar cases: daily load bars on every week, text-only weekends without fill, date-only week marker, muted continuations`,
    );
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
