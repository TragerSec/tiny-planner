const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require(
    path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '', 'playwright'),
  ));
}
const root = path.join(__dirname, '..');
const theme = require('./browser-theme.cjs');
(async () => {
  await build({
    entryPoints: [path.join(__dirname, 'browser-mock.js')],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    outfile: path.join(root, '.test-build/browser-mock.js'),
  });
  fs.mkdirSync(path.join(root, 'docs/screenshots'), { recursive: true });
  const { createStaticHandler } = require('./static-server.cjs');
  const server = http.createServer(createStaticHandler(root, theme));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  let browser;
  const failures = [];
  let passed = 0;
  const results = [];
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
      const NativeResizeObserver = window.ResizeObserver;
      window.ResizeObserver = class extends NativeResizeObserver {
        constructor(callback) {
          super((entries, observer) => {
            if (window.tpResizeDelay)
              setTimeout(() => callback(entries, observer), window.tpResizeDelay);
            else callback(entries, observer);
          });
        }
      };
      const Original = Date;
      window.Date = class extends Original {
        constructor(...args) {
          if (!args.length) super('2026-10-02T08:00:00Z');
          else super(...args);
        }
        static now() {
          return new Original('2026-10-02T08:00:00Z').valueOf();
        }
      };
    });
    const page = await context.newPage();
    const setViewport = async (viewport) => {
      await page.setViewportSize(viewport);
      await page.waitForFunction(() =>
        [...document.querySelectorAll('.tp-host')].every((host) => {
          const width = host.clientWidth;
          return (
            width > 0 &&
            host.classList.contains('tp-mobile') === width <= 600 &&
            host.classList.contains('tp-narrow') === width <= 1050
          );
        }),
      );
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
    };
    const capture = async (name) => {
      const host = page.locator('.tp-host').first();
      const previous = await host.evaluate((n) => ({
        height: n.style.height,
        scroll: n.scrollTop,
        shellHeight: n.querySelector('.tp-shell').style.height,
        contentOverflow: n.querySelector('.tp-content').style.overflowY,
        sidebarOverflow: n.querySelector('.tp-sidebar').style.overflow,
        sidebarMax: n.querySelector('.tp-sidebar').style.maxHeight,
      }));
      await host.evaluate((n) => {
        n.style.height = 'auto';
        n.querySelector('.tp-shell').style.height = 'auto';
        n.querySelector('.tp-content').style.overflowY = 'visible';
        n.querySelector('.tp-sidebar').style.overflow = 'visible';
        n.querySelector('.tp-sidebar').style.maxHeight = 'none';
        n.scrollTop = 0;
      });
      await page.evaluate(() => window.scrollTo(0, 0));
      try {
        await page.screenshot({ path: path.join(root, 'docs/screenshots', name), fullPage: true });
      } finally {
        await host.evaluate((n, previous) => {
          n.style.height = previous.height;
          n.querySelector('.tp-shell').style.height = previous.shellHeight;
          n.querySelector('.tp-content').style.overflowY = previous.contentOverflow;
          n.querySelector('.tp-sidebar').style.overflow = previous.sidebarOverflow;
          n.querySelector('.tp-sidebar').style.maxHeight = previous.sidebarMax;
          n.scrollTop = previous.scroll;
        }, previous);
      }
    };
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForFunction(() => window.ready);
    const fingerprints = {};
    for (const name of ['main.js', 'styles.css']) {
      const served = await (
        await page.request.get('http://127.0.0.1:' + server.address().port + '/' + name)
      ).body();
      assert.deepEqual(
        served,
        fs.readFileSync(path.join(root, name)),
        'Browser asset mismatch: ' + name,
      );
      fingerprints[name] = require('node:crypto').createHash('sha256').update(served).digest('hex');
    }
    fs.writeFileSync(
      path.join(root, 'docs/browser-assets.json'),
      JSON.stringify(fingerprints, null, 2) + '\n',
    );

    const row = (id) => page.locator(`.tp-main .tp-task[data-path="Planner/Tasks/${id}.md"]`);
    const check = async (name, fn) => {
      try {
        await fn();
        passed++;
        results.push('PASS ' + name);
        console.log('PASS', name);
      } catch (e) {
        failures.push(name + ': ' + e.message);
        console.error('FAIL', name, e.message);
        const cancel = page.locator('.tp-modal .tp-modal-actions button').first();
        if (await cancel.isVisible().catch(() => false)) await cancel.click().catch(() => {});
      }
    };
    await check(
      'navigation has a unique accessible name without a Planner container tooltip',
      async () => {
        const nav = page.getByRole('navigation', { name: 'Tiny Planner', exact: true });
        assert.equal(await nav.count(), 1);
        assert.equal(await nav.getAttribute('aria-label'), null);
        await nav.locator('[data-tab="calendar"]').hover();
        assert.equal(
          await page.locator('.tp-nav [title="Planner"], .tp-nav[title="Planner"]').count(),
          0,
        );
        assert.ok((await page.locator('.tp-sidebar-bottom button').count()) === 3);
      },
    );
    await check(
      'navigation and all three sidebar actions stay visible across tabs and scrolling',
      async () => {
        for (const viewport of [
          { width: 1440, height: 720 },
          { width: 750, height: 480 },
          { width: 390, height: 844 },
          { width: 320, height: 600 },
        ]) {
          await setViewport(viewport);
          for (const tab of [
            'today',
            'inbox',
            'upcoming',
            'calendar',
            'projects',
            'kanban',
            'subscriptions',
            'statistics',
            'manualTab',
          ]) {
            await page.locator(`[data-tab="${tab}"]`).click();
            const navTop = await page
              .locator('.tp-nav')
              .evaluate((n) => n.getBoundingClientRect().top);
            await page.locator('.tp-content').evaluate((n) => {
              n.scrollTop = n.scrollHeight;
            });
            assert.equal(
              await page.locator('.tp-nav').evaluate((n) => n.getBoundingClientRect().top),
              navTop,
            );
            const footer = await page.locator('.tp-sidebar-bottom').evaluate((n) => ({
              top: n.getBoundingClientRect().top,
              bottom: n.getBoundingClientRect().bottom,
            }));
            assert.ok(
              footer.top >= 0 && footer.bottom <= viewport.height + 1,
              `${viewport.width}px ${tab}: sidebar actions clipped`,
            );
            assert.equal(await page.locator('.tp-sidebar-bottom button').count(), 3);
            assert.equal(
              await page.locator(`[data-tab="${tab}"]`).getAttribute('aria-current'),
              'true',
            );
            assert.ok(
              await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
              `${viewport.width}px ${tab}: page overflow`,
            );
          }
          await page.screenshot({
            path: path.join(root, `docs/screenshots/sidebar-scrolled-${viewport.width}.png`),
          });
        }
        await setViewport({ width: 1440, height: 1050 });
        await page.locator('[data-tab="today"]').click();
      },
    );
    await check(
      'recurrence end can be created, edited, cleared and undone with calendar boundaries',
      async () => {
        await page.locator('[data-tab="calendar"]').click();
        await page.getByRole('button', { name: 'Добавить задачу', exact: true }).first().click();
        await page
          .locator('.tp-modal input[type="text"]')
          .first()
          .fill('Driving school cutoff fixture');
        const repeat = page
          .locator('.tp-modal select')
          .filter({ has: page.locator('option[value="FREQ=DAILY"]') });
        await repeat.selectOption('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
        await page.locator('.tp-modal .tp-date').first().fill('02.10.2026');
        assert.equal(await page.locator('.tp-repeat-until').isEnabled(), true);
        await page.locator('.tp-repeat-until').fill('06.10.2026');
        await page
          .locator('.modal')
          .screenshot({ path: path.join(root, 'docs/screenshots/repeat-until-form.png') });
        await page.locator('.tp-modal button[type="submit"]').click();
        await page.waitForFunction(() =>
          window.tp.plugin.repo
            .snapshot()
            .tasks.some((t) => t.title === 'Driving school cutoff fixture'),
        );
        const taskPath = await page.evaluate(
          () =>
            window.tp.plugin.repo
              .snapshot()
              .tasks.find((t) => t.title === 'Driving school cutoff fixture').path,
        );
        const lesson = (date) =>
          page.locator(`[data-day="${date}"] .tp-task[data-path="${taskPath}"]`);
        assert.equal(await lesson('2026-10-02').count(), 1);
        assert.equal(await lesson('2026-10-05').count(), 1);
        assert.equal(await lesson('2026-10-06').count(), 1);
        assert.equal(await lesson('2026-10-07').count(), 0);
        await lesson('2026-10-05').locator('.tp-task-title').click();
        assert.equal(await repeat.inputValue(), 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
        assert.equal(await page.locator('.tp-repeat-until').inputValue(), '06.10.2026');
        await page.locator('.tp-repeat-until').fill('05.10.2026');
        await page.locator('.tp-modal button[type="submit"]').click();
        await page.waitForFunction(
          (taskPath) =>
            !document.querySelector(`[data-day="2026-10-06"] .tp-task[data-path="${taskPath}"]`),
          taskPath,
        );
        await page.locator('button[aria-label="Отменить действие"]').click();
        await page.waitForFunction(
          (taskPath) =>
            !!document.querySelector(`[data-day="2026-10-06"] .tp-task[data-path="${taskPath}"]`),
          taskPath,
        );
        await lesson('2026-10-05').locator('.tp-task-title').click();
        await page.locator('.tp-repeat-until').fill('01.10.2026');
        await page.locator('.tp-modal button[type="submit"]').click();
        await page.waitForFunction(() =>
          window.tp.notices.some((s) => s.includes('раньше даты начала')),
        );
        assert.equal(await page.locator('.tp-modal').count(), 1);
        await page.locator('.tp-repeat-until').fill('');
        await page.locator('.tp-modal button[type="submit"]').click();
        await page.waitForFunction(
          (taskPath) =>
            !!document.querySelector(`[data-day="2026-10-07"] .tp-task[data-path="${taskPath}"]`),
          taskPath,
        );
        await page.locator('button[aria-label="Отменить действие"]').click();
        await page.waitForFunction(
          (taskPath) =>
            !document.querySelector(`[data-day="2026-10-07"] .tp-task[data-path="${taskPath}"]`),
          taskPath,
        );
        await page.evaluate((taskPath) => window.tp.plugin.service.trash(taskPath), taskPath);
        await page.locator('[data-tab="today"]').click();
      },
    );
    await check('Today includes overdue weekly occurrence', async () =>
      assert.equal(
        await page
          .locator('.tp-section')
          .filter({ hasText: 'Просрочено' })
          .locator('[data-path="Planner/Tasks/weekly.md"]')
          .count(),
        1,
      ),
    );
    await check('recurring completion remains on today, with green and strikethrough', async () => {
      await row('shower').locator('.tp-check').click();
      await page.waitForFunction(() =>
        document
          .querySelector('.tp-main [data-path="Planner/Tasks/shower.md"]')
          ?.classList.contains('tp-done'),
      );
      const style = await row('shower')
        .locator('.tp-task-title')
        .evaluate((n) => ({
          color: getComputedStyle(n).color,
          line: getComputedStyle(n).textDecorationLine,
        }));
      assert.equal(style.color, 'rgb(64, 231, 155)');
      assert.ok(style.line.includes('line-through'));
    });
    await check('completed occurrence can reopen', async () => {
      await row('shower').locator('.tp-check').click();
      await page.waitForFunction(() =>
        document
          .querySelector('.tp-main [data-path="Planner/Tasks/shower.md"]')
          ?.classList.contains('tp-todo'),
      );
    });
    await check('failed task is red and can be reopened', async () => {
      assert.ok(
        (await row('museum')
          .locator('.tp-task-title')
          .evaluate((n) => getComputedStyle(n).color)) === 'rgb(255, 101, 130)',
      );
      await row('museum').locator('.tp-fail-button').click();
      await page.waitForFunction(() =>
        document
          .querySelector('.tp-main [data-path="Planner/Tasks/museum.md"]')
          ?.classList.contains('tp-todo'),
      );
      await row('museum').locator('.tp-fail-button').click();
    });
    await check('Enter creates a task and retains quick entry focus', async () => {
      const title = page.locator('.tp-quick input[type="text"]:not(.tp-date):not(.tp-time)');
      await title.fill('Quick regression task');
      await title.press('Enter');
      await page.waitForFunction(
        () =>
          document.querySelector('.tp-quick input[type="text"]:not(.tp-date):not(.tp-time)')
            ?.value === '',
      );
      assert.equal(
        await page
          .locator('.tp-main .tp-task-title')
          .filter({ hasText: 'Quick regression task' })
          .count(),
        1,
      );
      assert.equal(await title.evaluate((n) => n === document.activeElement), true);
    });
    await check('delete button moves task to trash and Undo restores it', async () => {
      await row('copy').locator('.tp-delete-button').click();
      await page
        .locator('.tp-modal button')
        .filter({ hasText: /^Удалить$/ })
        .click();
      await page.waitForFunction(
        () => !document.querySelector('.tp-main [data-path="Planner/Tasks/copy.md"]'),
      );
      await page.getByRole('button', { name: 'Отменить действие', exact: true }).click();
      await page.waitForFunction(
        () => !!document.querySelector('.tp-main [data-path="Planner/Tasks/copy.md"]'),
      );
    });
    await check('task details save manual minutes and preserve occurrence status', async () => {
      await row('shower').locator('.tp-task-title').click();
      await page.locator('.tp-modal [data-field=minutes]:visible').fill('14');
      await page.locator('.tp-modal button[type="submit"]').click();
      await page.waitForFunction(() =>
        document
          .querySelector('.tp-main [data-path="Planner/Tasks/shower.md"] .tp-task-meta')
          ?.textContent.includes('14 мин'),
      );
    });
    await check('subscription past date is never overdue', async () =>
      assert.equal(
        await page.locator('.tp-overdue[data-path="Planner/Tasks/service.md"]').count(),
        0,
      ),
    );
    await capture('today-desktop.png');
    await page.locator('[data-tab="calendar"]').click();
    await check('tomorrow occurrence remains open', async () => {
      const tomorrow = page.locator(
        '[data-day="2026-10-03"] [data-path="Planner/Tasks/shower.md"]',
      );
      assert.equal(await tomorrow.count(), 1);
      assert.equal(await tomorrow.evaluate((n) => n.classList.contains('tp-todo')), true);
    });
    await check('drag task across month navigation and drop on new month', async () => {
      const source = page.locator('[data-day="2026-10-30"] [data-path="Planner/Tasks/next.md"]');
      await source.scrollIntoViewIfNeeded();
      const box = await source.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + 14);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 9, box.y + 14, { steps: 6 });
      const arrow = page.getByRole('button', { name: 'Следующий месяц', exact: true });
      await arrow.scrollIntoViewIfNeeded();
      const a = await arrow.boundingBox();
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2, { steps: 20 });
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.waitForFunction(
        () => document.querySelector('.tp-calendar-toolbar h2')?.textContent.includes('ноябрь'),
        {},
        { timeout: 4000 },
      );
      const target = page.locator('[data-day="2026-11-12"]');
      await target.scrollIntoViewIfNeeded();
      const t = await target.boundingBox();
      await page.mouse.move(t.x + t.width / 2, t.y + 25, { steps: 20 });
      await page.mouse.up();
      await page.waitForFunction(
        () =>
          window.tp.plugin.repo
            .snapshot()
            .tasks.find((t) => t.title === 'Send the launch checklist')?.scheduled === '2026-11-12',
        {},
        { timeout: 4000 },
      );
      assert.equal(
        await page.locator('[data-day="2026-11-12"] [data-path="Planner/Tasks/next.md"]').count(),
        1,
      );
    });
    await check('date dialog reschedules an item to a distant month', async () => {
      await page.getByRole('button', { name: 'Текущий месяц', exact: true }).click();
      await page.locator('[data-day="2026-10-02"] [data-path="Planner/Tasks/english.md"]').hover();
      await page
        .locator('[data-day="2026-10-02"] [data-path="Planner/Tasks/english.md"]')
        .locator('[aria-label="Перенести"]')
        .click();
      await page.locator('.tp-modal input.tp-date').fill('2027-02-06');
      await page
        .locator('.tp-modal button')
        .filter({ hasText: /^Сохранить$/ })
        .click();
      await page.waitForFunction(
        () =>
          window.tp.plugin.repo
            .snapshot()
            .tasks.find((t) => t.title === 'Practice speaking for 20 minutes')?.moves[
            '2026-10-02'
          ] === '2027-02-06',
      );
    });
    await check('two open views contain no duplicate IDs', async () => {
      const ids = await page.evaluate(async () => {
        const view = new window.tp.view.constructor({ app: window.tp.app }, window.tp.plugin);
        await view.onOpen();
        const ids = [...document.querySelectorAll('[id]')].map((n) => n.id);
        await view.onClose();
        view.contentEl.remove();
        return ids;
      });
      assert.equal(new Set(ids).size, ids.length);
    });
    await page.getByRole('button', { name: 'Текущий месяц', exact: true }).click();
    await capture('calendar-desktop.png');
    await page.locator('[data-tab="projects"]').click();
    await check('area/project hierarchy has compact cards and no fixed empty height', async () => {
      assert.equal(await page.locator('.tp-area').count(), 3);
      assert.equal(await page.locator('.tp-project').count(), 3);
      const all = await page
        .locator('.tp-project')
        .evaluateAll((nodes) => nodes.every((n) => getComputedStyle(n).height !== '500px'));
      assert.equal(all, true);
    });
    await capture('projects-desktop.png');
    await page.locator('[data-tab="statistics"]').click();
    await check('navigation uses flat controls with a theme-colored active indicator', async () => {
      await page.mouse.move(0, 0);
      const active = await page.locator('.tp-nav-button[aria-current="true"]').evaluate((n) => ({
        radius: getComputedStyle(n).borderRadius,
        shadow: getComputedStyle(n).boxShadow,
        background: getComputedStyle(n).backgroundColor,
        border: getComputedStyle(n).borderInlineStartWidth,
      }));
      assert.equal(active.radius, '2px');
      assert.equal(active.shadow, 'none');
      assert.equal(active.background, 'rgba(0, 0, 0, 0)');
      assert.equal(active.border, '2px');
      assert.equal(await page.locator('.tp-nav-group').count(), 4);
    });
    await check('task description stores a multiline list without executing HTML', async () => {
      await page.locator('[data-tab="kanban"]').click();
      const card = page.locator('.tp-board-card[data-path="Planner/Tasks/copy.md"]');
      await card.locator('.tp-board-title').click();
      await page
        .locator('.tp-modal textarea')
        .fill('- [ ] Review design\n- [ ] Release\n\n<img src=x onerror="window.untrusted=true">');
      await page.locator('.tp-modal button[type="submit"]').click();
      await page.waitForFunction(() =>
        window.tp.plugin.repo
          .snapshot()
          .tasks.find((t) => t.path.endsWith('/copy.md'))
          .description.includes('Review design'),
      );
      assert.equal(await card.locator('img').count(), 0);
      assert.equal(await page.evaluate(() => window.untrusted), undefined);
    });
    await check('Kanban supports dropdown, native drag and Undo across five columns', async () => {
      assert.equal(await page.locator('.tp-board-column').count(), 5);
      const card = () => page.locator('.tp-board-card[data-path="Planner/Tasks/copy.md"]');
      await card().locator('select').selectOption('backlog');
      await page.waitForFunction(
        () =>
          !!document.querySelector('[data-status="backlog"] [data-path="Planner/Tasks/copy.md"]'),
      );
      await card().locator('select').selectOption('in-progress');
      await page.waitForFunction(
        () =>
          !!document.querySelector(
            '[data-status="in-progress"] [data-path="Planner/Tasks/copy.md"]',
          ),
      );
      await card().dragTo(page.locator('.tp-board-column[data-status="done"] h2'));
      await page.waitForFunction(
        () => !!document.querySelector('[data-status="done"] [data-path="Planner/Tasks/copy.md"]'),
      );
      await page.locator('button[aria-label="Отменить действие"]').click();
      await page.waitForFunction(
        () =>
          !!document.querySelector(
            '[data-status="in-progress"] [data-path="Planner/Tasks/copy.md"]',
          ),
      );
      await card().locator('select').selectOption('todo');
      await page.waitForFunction(
        () => !!document.querySelector('[data-status="todo"] [data-path="Planner/Tasks/copy.md"]'),
      );
      await capture('kanban-desktop.png');
    });
    await check('Kanban status accents follow all five changes and keyboard Undo', async () => {
      const card = page.locator('.tp-board-card[data-path="Planner/Tasks/copy.md"]');
      const colors = new Set();
      for (const status of ['backlog', 'todo', 'in-progress', 'done', 'failed']) {
        await card.locator('select').selectOption(status);
        await page.waitForFunction(
          (status) =>
            document.querySelector('.tp-board-card[data-path="Planner/Tasks/copy.md"]')?.dataset
              .status === status,
          status,
        );
        colors.add(await card.evaluate((n) => getComputedStyle(n).borderInlineStartColor));
        assert.equal(await card.locator('select').inputValue(), status);
      }
      assert.equal(colors.size, 5);
      await page.locator('button[aria-label="Отменить действие"]').focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(
        () =>
          document.querySelector('.tp-board-card[data-path="Planner/Tasks/copy.md"]')?.dataset
            .status === 'done',
      );
      assert.equal(
        await card.evaluate((n) => getComputedStyle(n).borderInlineStartColor),
        'rgb(64, 231, 155)',
      );
      await card.locator('select').selectOption('todo');
    });
    await check(
      'calendar repeat colors are independent and Undo restores the occurrence',
      async () => {
        const title = await page.evaluate(
          () =>
            window.tp.plugin.repo.snapshot().tasks.find((t) => t.path === 'Planner/Tasks/shower.md')
              .title,
        );
        await page.locator('.tp-filters input[type=search]').fill(title);
        await page.locator('[data-tab="calendar"]').click();
        const occurrence = (date) =>
          page.locator(`[data-day="${date}"] [data-path="Planner/Tasks/shower.md"]`);
        const color = (date) =>
          occurrence(date).evaluate((n) => getComputedStyle(n).borderInlineStartColor);
        const original = await color('2026-10-02');
        await occurrence('2026-10-02').locator('.tp-check').click();
        await page.waitForFunction(
          () =>
            document.querySelector('[data-day="2026-10-02"] [data-path="Planner/Tasks/shower.md"]')
              ?.dataset.status === 'done',
        );
        assert.equal(await color('2026-10-02'), 'rgb(64, 231, 155)');
        assert.equal(await color('2026-10-03'), original);
        await occurrence('2026-10-03').hover();
        await occurrence('2026-10-03').locator('.tp-fail-button').click();
        await page.waitForFunction(
          () =>
            document.querySelector('[data-day="2026-10-03"] [data-path="Planner/Tasks/shower.md"]')
              ?.dataset.status === 'failed',
        );
        assert.equal(await color('2026-10-03'), 'rgb(255, 101, 130)');
        assert.equal(await color('2026-10-02'), 'rgb(64, 231, 155)');
        assert.equal(await color('2026-10-04'), original);
        assert.equal(
          await occurrence('2026-10-03').locator('.tp-workflow-label').textContent(),
          'Не выполнено',
        );
        for (const date of ['2026-10-03', '2026-10-02']) {
          await page.locator('button[aria-label="Отменить действие"]').click();
          await page.waitForFunction(
            (date) =>
              document.querySelector(`[data-day="${date}"] [data-path="Planner/Tasks/shower.md"]`)
                ?.dataset.status === 'todo',
            date,
          );
          assert.equal(await color(date), original);
        }
        await page.locator('.tp-filters input[type=search]').fill('');
      },
    );
    await check(
      'five-status palette matches calendar and Kanban in both themes and mobile widths',
      async () => {
        await page.evaluate(() => {
          const repo = window.tp.plugin.repo;
          window.tp.paletteSnapshot = repo.snapshot.bind(repo);
          const snapshot = repo.snapshot();
          const base = snapshot.tasks.find((t) => t.path.endsWith('/copy.md'));
          const labels = ['Отложено', 'К выполнению', 'В работе', 'Выполнено', 'Не выполнено'];
          const tasks = ['backlog', 'todo', 'in-progress', 'done', 'failed'].map((status, i) => ({
            ...base,
            path: `palette/${status}.md`,
            title: labels[i] + ' · Проверка статуса',
            description: 'Краткое описание\n- [ ] Проверить',
            status,
            project: '',
            scheduled: `2026-10-0${i + 2}`,
            due: '',
            resolvedOn: ['done', 'failed'].includes(status) ? '2026-10-02' : '',
            recurrence: '',
            occurrences: {},
            moves: {},
            skipped: [],
          }));
          repo.snapshot = () => ({ ...snapshot, tasks });
          window.tp.view.rebuild();
        });
        try {
          for (const light of [false, true]) {
            await page.evaluate((light) => {
              const theme = light
                ? {
                    '--background-primary': '#ffffff',
                    '--background-secondary': '#f6f7f9',
                    '--background-modifier-border': '#d9dde4',
                    '--background-modifier-hover': '#edf0f4',
                    '--text-normal': '#252933',
                    '--text-muted': '#626a79',
                    '--text-faint': '#747d8d',
                    '--color-green': '#247746',
                    '--color-red': '#b03939',
                    '--color-blue': '#2868b2',
                    '--color-yellow': '#956416',
                  }
                : {};
              document.body.classList.toggle('theme-light', light);
              document.documentElement.removeAttribute('style');
              for (const [key, value] of Object.entries(theme))
                document.documentElement.style.setProperty(key, value);
            }, light);
            for (const width of [1440, 390, 320]) {
              await setViewport({ width, height: 1050 });
              const palette = [];
              for (const tab of ['kanban', 'calendar']) {
                await page.locator(`[data-tab="${tab}"]`).click();
                const selector = tab === 'kanban' ? '.tp-board-card' : '.tp-day .tp-task';
                const data = await page.locator(selector).evaluateAll((nodes) => {
                  const lum = (color) => {
                    const values = color
                      .match(/[\d.]+/g)
                      .slice(0, 3)
                      .map(Number)
                      .map((n) => {
                        const c = n / 255;
                        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
                      });
                    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
                  };
                  const ratio = (a, b) =>
                    (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
                  const bg = getComputedStyle(document.body).backgroundColor;
                  return nodes.map((n) => {
                    const s = getComputedStyle(n),
                      title = n.querySelector('.tp-board-title,.tp-task-title');
                    return {
                      status: n.dataset.status,
                      color: s.borderInlineStartColor,
                      markerContrast: ratio(s.borderInlineStartColor, bg),
                      titleContrast: ratio(getComputedStyle(title).color, bg),
                      label:
                        n.querySelector('select')?.selectedOptions[0]?.textContent ||
                        n.querySelector('.tp-workflow-label')?.textContent,
                      flat: s.backgroundColor === 'rgba(0, 0, 0, 0)',
                    };
                  });
                });
                assert.equal(data.length, 5);
                assert.equal(new Set(data.map((n) => n.color)).size, 5);
                for (const n of data) {
                  assert.ok(
                    n.markerContrast >= 3,
                    `${tab} ${n.status}: marker contrast ${n.markerContrast}`,
                  );
                  assert.ok(
                    n.titleContrast >= 4.5,
                    `${tab} ${n.status}: title contrast ${n.titleContrast}`,
                  );
                  assert.ok(n.label);
                  assert.equal(
                    n.flat,
                    tab === 'kanban',
                    'Only calendar cards receive the subtle reference surface',
                  );
                }
                palette.push(data.map((n) => [n.status, n.color]).sort());
                assert.ok(
                  await page.evaluate(
                    () => document.documentElement.scrollWidth <= window.innerWidth,
                  ),
                );
                const main = page.locator('.tp-main');
                if (tab === 'kanban')
                  assert.ok(await main.evaluate((n) => n.scrollWidth <= n.clientWidth));
                // Narrow calendar deliberately scrolls inside its existing local container.
                if (tab === 'calendar' && width < 600)
                  await page.locator('.tp-day-today').scrollIntoViewIfNeeded();
                await capture(`${tab}-palette-${light ? 'light' : 'dark'}-${width}.png`);
              }
              assert.deepEqual(palette[0], palette[1]);
            }
          }
        } finally {
          await page.evaluate(() => {
            document.body.classList.remove('theme-light');
            window.tp.plugin.repo.snapshot = window.tp.paletteSnapshot;
            document.documentElement.removeAttribute('style');
            window.tp.view.rebuild();
          });
          await setViewport({ width: 1440, height: 1050 });
          await page.locator('[data-tab="kanban"]').click();
        }
      },
    );
    await check('empty calendar keeps current day and status-free empty state', async () => {
      await page.evaluate(() => {
        window.tp.emptyCalendarSnapshot = window.tp.plugin.repo.snapshot.bind(
          window.tp.plugin.repo,
        );
        window.tp.plugin.repo.snapshot = () => ({ tasks: [], projects: [], areas: [] });
        window.tp.view.rebuild();
      });
      await page.locator('[data-tab="calendar"]').click();
      assert.equal(await page.locator('.tp-day').count(), 42);
      assert.equal(await page.locator('.tp-day-today').count(), 1);
      assert.equal(await page.locator('.tp-day .tp-task').count(), 0);
      await capture('calendar-empty.png');
      await page.evaluate(() => {
        window.tp.plugin.repo.snapshot = window.tp.emptyCalendarSnapshot;
        window.tp.view.rebuild();
      });
      await page.locator('[data-tab="kanban"]').click();
    });
    await check('date formats change both date entry and displayed dates', async () => {
      for (const [format, expected] of [
        ['dmy', '02.10.2026'],
        ['mdy', '10/02/2026'],
        ['iso', '2026-10-02'],
      ]) {
        await page.evaluate((format) => {
          window.tp.plugin.settings.dateFormat = format;
          window.tp.view.rebuild();
        }, format);
        await page
          .locator('.tp-board-card[data-path="Planner/Tasks/copy.md"] .tp-board-title')
          .click();
        assert.equal(await page.locator('.tp-modal .tp-date').first().inputValue(), expected);
        await page.locator('.tp-modal textarea').fill('- [ ] Review design\n- [ ] Release');
        await capture('task-description-' + format + '.png');
        await page.locator('.tp-modal button[type="submit"]').click();
        await page.waitForFunction(() => !document.querySelector('.tp-modal'));
        await page.locator('[data-tab="statistics"]').click();
        assert.equal(
          await page.locator('.tp-activity-details tbody th').first().textContent(),
          format === 'dmy' ? '31.10.2026' : format === 'mdy' ? '10/31/2026' : '2026-10-31',
        );
        assert.equal(await page.locator('.tp-header time.tp-header-date').textContent(), expected);
        await page.locator('[data-tab="kanban"]').click();
      }
      await page.evaluate(() => {
        window.tp.plugin.settings.dateFormat = 'dmy';
        window.tp.view.rebuild();
      });
      await page.locator('[data-tab="statistics"]').click();
    });
    await check('project editor and quick capture expose five shared workflow states', async () => {
      await page.locator('[data-tab="projects"]').click();
      await page.locator('.tp-project').first().locator('summary').click();
      await page
        .locator('.tp-project')
        .first()
        .locator('button[aria-label="Редактировать"]')
        .click();
      const status = page.locator('.tp-modal select').nth(1);
      assert.deepEqual(await status.locator('option').evaluateAll((ns) => ns.map((n) => n.value)), [
        'backlog',
        'todo',
        'in-progress',
        'done',
        'failed',
      ]);
      assert.equal(await status.inputValue(), 'in-progress');
      await status.selectOption('failed');
      await capture('project-statuses.png');
      await page.locator('.tp-modal button[type=submit]').click();
      await page.waitForFunction(() => !document.querySelector('.tp-modal'));
      await page.locator('button[aria-label="Отменить действие"]').click();
      const quick = page.locator('.tp-quick select[aria-label="Статус"]');
      assert.deepEqual(await quick.locator('option').evaluateAll((ns) => ns.map((n) => n.value)), [
        'backlog',
        'todo',
        'in-progress',
        'done',
        'failed',
      ]);
    });
    await check(
      'subscription form creates a priced annual expense without task controls',
      async () => {
        await page.locator('[data-tab="subscriptions"]').click();
        await page.locator('[data-expense-mode=subscriptions]').click();
        assert.ok(await page.locator('.tp-quick').isHidden());
        assert.equal(
          await page.locator('.tp-subscription-summary h2').textContent(),
          'Стоимость подписок в месяц',
        );
        await page.getByRole('button', { name: 'Добавить подписку', exact: true }).click();
        await page.locator('.tp-modal input[type=text]').nth(0).fill('QA Annual');
        await page.locator('.tp-modal input[type=number]:visible').fill('120');
        await page.locator('.tp-modal input[type=text]').nth(1).fill('EUR');
        await page.locator('.tp-modal select').nth(0).selectOption('yearly');
        await capture('subscription-form.png');
        await page.locator('.tp-modal button[type=submit]').click();
        await page.waitForFunction(() =>
          document.querySelector('.tp-cost-total')?.textContent.includes('10,00 EUR'),
        );
        assert.equal(await page.locator('.tp-main .tp-check, .tp-main .tp-fail-button').count(), 0);
        await capture('subscriptions-desktop.png');
      },
    );
    await check(
      'subscription cancellation, restoration and Undo change financial commitments only',
      async () => {
        const row = page.locator('.tp-subscription').filter({ hasText: 'QA Annual' });
        await row.locator('.tp-subscription-toggle').click();
        await page.waitForFunction(() => !document.querySelector('.tp-cost-total'));
        await page.locator('.tp-subscription-summary select').selectOption('cancelled');
        assert.equal(await row.count(), 1);
        await row.locator('.tp-subscription-toggle').click();
        await page.waitForFunction(() => !!document.querySelector('.tp-cost-total'));
        await page.locator('button[aria-label="Отменить действие"]').click();
        await page.waitForFunction(() => !document.querySelector('.tp-cost-total'));
        await row.locator('button[aria-label="Удалить"]').click();
        await page.locator('.tp-modal .mod-warning').click();
        await page.waitForFunction(() => !document.querySelector('.tp-modal'));
      },
    );
    await check(
      '100 in-memory Kanban tasks render 12 per column page with no vault writes',
      async () => {
        const count = await page.evaluate(() => window.tp.app.vault.getMarkdownFiles().length);
        await page.evaluate(() => {
          window.tp.periodSnapshot = window.tp.plugin.repo.snapshot.bind(window.tp.plugin.repo);
          const snap = window.tp.periodSnapshot(),
            base = snap.tasks.find((t) => t.path.endsWith('/copy.md'));
          const tasks = Array.from({ length: 100 }, (_, i) => ({
            ...base,
            path: 'synthetic/' + i + '.md',
            title: 'Backlog ' + String(i).padStart(3, '0'),
            status: 'backlog',
            description: '',
            scheduled: '',
            due: '',
            recurrence: '',
            resolvedOn: '',
          }));
          window.tp.plugin.repo.snapshot = () => ({ ...snap, tasks });
        });
        await page.locator('[data-tab="kanban"]').click();
        assert.equal(await page.locator('.tp-board-card').count(), 0);
        await page.locator('[data-board-scope]').selectOption('undated');
        assert.equal(await page.locator('.tp-board-card').count(), 12);
        assert.equal(await page.locator('.tp-board-pager small').textContent(), '1 / 9');
        await page
          .getByRole('button', { name: 'Следующие карточки · Отложено', exact: true })
          .click();
        assert.equal(await page.locator('.tp-board-card').count(), 12);
        assert.equal(await page.locator('.tp-board-pager small').textContent(), '2 / 9');
        assert.equal(
          await page.evaluate(() => window.tp.app.vault.getMarkdownFiles().length),
          count,
        );
        await capture('kanban-100-memory.png');
        await page.evaluate(() => {
          window.tp.plugin.repo.snapshot = window.tp.periodSnapshot;
          window.tp.view.rebuild();
        });
      },
    );
    await check(
      'Kanban period change retains project filters and offers dated creation in the selected column',
      async () => {
        await page.locator('[data-board-scope]').selectOption('week');
        await page.locator('.tp-board-heading button').first().click();
        const status = page
          .locator('.tp-modal select')
          .filter({ has: page.locator('option[value=backlog]') });
        assert.equal(await status.inputValue(), 'backlog');
        assert.equal(await page.locator('.tp-modal .tp-date').first().inputValue(), '02.10.2026');
        await page.getByRole('button', { name: 'Отмена', exact: true }).click();
        for (const scope of ['today', 'month', 'all', 'week']) {
          await page.locator('[data-board-scope]').selectOption(scope);
          assert.equal(await page.locator('.tp-board-column').count(), 5);
        }
        await page.locator('[data-tab="statistics"]').click();
        assert.equal(await page.locator('[data-metric="tasks"] strong').textContent(), '9');
      },
    );
    await check('statistics retain status colors in a monochrome host theme', async () => {
      await page.evaluate(() => {
        const theme = {
          '--background-primary': '#000000',
          '--background-secondary': '#111111',
          '--background-modifier-border': '#333333',
          '--background-modifier-hover': '#222222',
          '--text-normal': '#eeeeee',
          '--text-muted': '#a0a0a0',
          '--text-on-accent': '#111111',
          '--interactive-accent': '#eeeeee',
          '--color-blue': 'initial',
          '--color-yellow': 'initial',
          '--color-green': 'initial',
          '--color-red': 'initial',
        };
        for (const [key, value] of Object.entries(theme))
          document.documentElement.style.setProperty(key, value);
      });
      const colors = await page
        .locator('.tp-workflow-stat > span')
        .evaluateAll((nodes) => nodes.map((n) => getComputedStyle(n, '::before').backgroundColor));
      assert.equal(new Set(colors).size, 5);
      assert.equal(
        await page
          .locator('.tp-workflow-stat[data-status="done"] > span')
          .evaluate((n) => getComputedStyle(n, '::before').backgroundColor),
        'rgb(64, 231, 155)',
      );
      assert.equal(
        await page
          .locator('.tp-workflow-stat[data-status="failed"] > span')
          .evaluate((n) => getComputedStyle(n, '::before').backgroundColor),
        'rgb(255, 101, 130)',
      );
      await capture('statistics-monochrome-host.png');
      await page.evaluate(() => document.documentElement.removeAttribute('style'));
    });
    await check('status legend uses exact counts and matching colors', async () => {
      assert.equal(await page.locator('.tp-workflow-stat').count(), 5);
      const colors = await page
        .locator('.tp-workflow-stat > span')
        .evaluateAll((nodes) => nodes.map((n) => getComputedStyle(n, '::before').backgroundColor));
      assert.equal(new Set(colors).size, 5);
    });
    await check(
      'statistics render exact totals, bounded charts and accessible period controls',
      async () => {
        assert.equal(await page.locator('[data-metric="tasks"] strong').textContent(), '9');
        assert.equal(await page.locator('[data-metric="projects"] strong').textContent(), '3');
        assert.equal(await page.locator('.tp-quick').isVisible(), false);
        assert.equal(await page.locator('.tp-project-stats tbody tr').count(), 3);
        await page.locator('.tp-activity-details summary').click();
        await page.locator('[data-period="7"]').click();
        assert.equal(await page.locator('.tp-activity-details tbody tr').count(), 7);
        await page.locator('[data-period="90"]').click();
        assert.equal(await page.locator('.tp-activity-details tbody tr').count(), 92);
        await page.locator('[data-period="30"]').click();
        await page.locator('.tp-activity-details summary').click();
      },
    );
    await capture('statistics-desktop.png');
    await check('statistics filtered state clears without stale totals', async () => {
      await page.locator('.tp-filters input[type="search"]').fill('No matching records');
      assert.equal(await page.locator('[data-metric="tasks"] strong').textContent(), '0');
      assert.equal(await page.locator('[data-metric="projects"] strong').textContent(), '0');
      assert.ok((await page.locator('.tp-stats-empty').textContent()).includes('Нет подходящих'));
      await page.getByRole('button', { name: 'Сбросить фильтры', exact: true }).click();
    });
    await check('statistics zero-data state has finite metrics and empty charts', async () => {
      await page.evaluate(() => {
        window.tp.savedSnapshot = window.tp.plugin.repo.snapshot.bind(window.tp.plugin.repo);
        window.tp.plugin.repo.snapshot = () => ({ tasks: [], projects: [], areas: [] });
        window.tp.view.rebuild();
      });
      try {
        assert.ok(
          (await page.locator('.tp-stats-empty').textContent()).includes(
            'Нет данных для статистики',
          ),
        );
        assert.equal(await page.locator('[data-metric="progress"] strong').textContent(), '—');
        assert.equal(
          await page.locator('.tp-activity-chart .tp-chart-point:not([data-value="0"])').count(),
          0,
        );
        assert.ok(!/NaN|Infinity/.test(await page.locator('.tp-dashboard').textContent()));
        await capture('statistics-empty.png');
      } finally {
        await page.evaluate(() => {
          window.tp.plugin.repo.snapshot = window.tp.savedSnapshot;
          window.tp.view.rebuild();
        });
      }
    });
    await check(
      '25 project statistics render only the current page, including empty projects',
      async () => {
        await page.evaluate(() => {
          const original = window.tp.plugin.repo.snapshot.bind(window.tp.plugin.repo);
          window.tp.savedSnapshot = original;
          const snap = original();
          const extra = Array.from({ length: 22 }, (_, i) => ({
            path: `Demo/Project-${i}.md`,
            title: `Example project ${String(i).padStart(2, '0')}`,
            area: '',
            status: 'active',
            due: '',
          }));
          window.tp.plugin.repo.snapshot = () => ({
            ...snap,
            projects: [...snap.projects, ...extra],
          });
          window.tp.view.rebuild();
        });
        try {
          assert.equal(await page.locator('[data-metric="projects"] strong').textContent(), '25');
          assert.equal(await page.locator('.tp-project-stats tbody tr').count(), 12);
          await page.locator('[data-page-action="next"]').click();
          assert.equal(await page.locator('.tp-project-stats tbody tr').count(), 12);
          await page.locator('[data-page-action="next"]').click();
          assert.equal(await page.locator('.tp-project-stats tbody tr').count(), 1);
          assert.equal(
            await page
              .locator('[data-page-action="previous"]')
              .evaluate((n) => n === document.activeElement),
            true,
          );
          await capture('statistics-project-pages.png');
        } finally {
          await page.evaluate(() => {
            window.tp.plugin.repo.snapshot = window.tp.savedSnapshot;
            window.tp.view.rebuild();
          });
        }
      },
    );
    await check('statistics adapt to a narrow desktop pane and light theme', async () => {
      await page.locator('.tp-host').evaluate((n) => {
        n.style.width = '750px';
      });
      await page.waitForFunction(() =>
        document.querySelector('.tp-host')?.classList.contains('tp-narrow'),
      );
      assert.equal(
        await page
          .locator('.tp-stats-charts')
          .evaluate((n) => getComputedStyle(n).gridTemplateColumns.split(' ').length),
        1,
      );
      assert.ok(await page.locator('.tp-host').evaluate((n) => n.scrollWidth <= n.clientWidth));
      await page.locator('.tp-host').evaluate((n) => {
        n.style.width = '';
      });
      await page.waitForFunction(
        () => !document.querySelector('.tp-host')?.classList.contains('tp-narrow'),
      );
      await page.evaluate(() => {
        const theme = {
          '--background-primary': '#ffffff',
          '--background-secondary': '#f6f7f9',
          '--background-modifier-border': '#d9dde4',
          '--background-modifier-hover': '#edf0f4',
          '--text-normal': '#252933',
          '--text-muted': '#626a79',
          '--text-faint': '#747d8d',
          '--color-green': '#247746',
          '--color-red': '#b03939',
        };
        for (const [key, value] of Object.entries(theme))
          document.documentElement.style.setProperty(key, value);
      });
      await capture('statistics-light.png');
      await page.evaluate(() => document.documentElement.removeAttribute('style'));
    });
    await setViewport({ width: 390, height: 844 });
    await check('mobile statistics contain wide project tables without page overflow', async () => {
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      );
      assert.ok(await page.locator('.tp-host').evaluate((n) => n.scrollWidth <= n.clientWidth));
      await page.locator('[data-period="7"]').click();
      assert.equal(await page.locator('[data-period="7"]').getAttribute('aria-pressed'), 'true');
    });
    await capture('statistics-mobile.png');
    await check(
      '320px statistics keep readable chart labels and all content inside the pane',
      async () => {
        await setViewport({ width: 320, height: 760 });
        await page.waitForFunction(() =>
          document.querySelector('.tp-host')?.classList.contains('tp-mobile'),
        );
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        );
        // Wait until ResizeObserver has rebuilt the chart for the new pane width.
        await page.waitForFunction(() => {
          const chart = document.querySelector('.tp-fit-chart svg');
          return (
            chart &&
            Math.abs(chart.getBoundingClientRect().width - chart.viewBox.baseVal.width) <= 1
          );
        });
        const size = await page
          .locator('.tp-chart-label')
          .first()
          .evaluate((n) => {
            const scale =
              n.ownerSVGElement.getBoundingClientRect().width /
              n.ownerSVGElement.viewBox.baseVal.width;
            return parseFloat(getComputedStyle(n).fontSize) * scale;
          });
        assert.ok(size >= 9.5, `Rendered chart label is ${size}px`);
        await capture('statistics-small-mobile.png');
      },
    );
    await setViewport({ width: 390, height: 844 });
    await page.locator('[data-tab="today"]').click();
    await check(
      'mobile Today has no horizontal page overflow or hidden delete controls',
      async () => {
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        );
        assert.ok(await row('shower').locator('.tp-delete-button').isVisible());
      },
    );
    await capture('today-mobile.png');
    await page.locator('[data-tab="subscriptions"]').click();
    await check('mobile subscriptions and payment form fit a 320px viewport', async () => {
      await page.locator('[data-expense-mode=subscriptions]').click();
      await setViewport({ width: 320, height: 844 });
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      );
      assert.equal(await page.locator('.tp-main .tp-check').count(), 0);
      await capture('subscriptions-mobile.png');
      await page.getByRole('button', { name: 'Добавить подписку', exact: true }).click();
      assert.ok(await page.locator('.tp-modal input[type=number]:visible').isVisible());
      assert.ok(
        await page.locator('.tp-modal').evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
      );
      const fieldLefts = await page
        .locator('.tp-modal .tp-form-grid > label')
        .evaluateAll((nodes) => nodes.map((n) => Math.round(n.getBoundingClientRect().left)));
      assert.equal(new Set(fieldLefts).size, 1, '320px form fields must stack in one column');
      await capture('subscription-form-mobile.png');
      await page.getByRole('button', { name: 'Отмена', exact: true }).click();
    });
    await page.locator('[data-tab="kanban"]').click();
    await check('320px Kanban remains readable without page overflow', async () => {
      await setViewport({ width: 320, height: 844 });
      await page.waitForFunction(() =>
        document.querySelector('.tp-host').classList.contains('tp-mobile'),
      );
      assert.equal(await page.locator('.tp-board-column').count(), 5);
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      );
      assert.ok(await page.locator('.tp-board-card select').first().isVisible());
      await capture('kanban-mobile.png');
    });
    await check('empty Kanban preserves five columns and actionable add buttons', async () => {
      await page.evaluate(() => {
        window.tp.savedSnapshot = window.tp.plugin.repo.snapshot.bind(window.tp.plugin.repo);
        window.tp.plugin.repo.snapshot = () => ({ tasks: [], projects: [], areas: [] });
        window.tp.view.rebuild();
      });
      assert.equal(await page.locator('.tp-board-column').count(), 5);
      assert.equal(await page.locator('.tp-board-card').count(), 0);
      assert.equal(await page.locator('.tp-board-heading button').count(), 5);
      await capture('kanban-empty.png');
      await page.evaluate(() => {
        window.tp.plugin.repo.snapshot = window.tp.savedSnapshot;
        window.tp.view.rebuild();
      });
    });

    await check(
      'appointment time creation, ordering, editing and priority animation work in dark/light/mobile',
      async () => {
        await setViewport({ width: 1440, height: 1050 });
        await page.locator('[data-tab=today]').click();
        await page.locator('.tp-quick input[type=text]').first().fill('Экзамен');
        await page.locator('[data-quick-options]').click();
        await page.locator('.tp-quick .tp-time').fill('14:00');
        await page.locator('.tp-quick-add').click();
        await page.waitForFunction(() =>
          window.tp.plugin.repo.snapshot().tasks.some((t) => t.title === 'Экзамен'),
        );
        await page.evaluate(async () => {
          const t = window.tp.plugin.repo.snapshot().tasks.find((t) => t.title === 'Экзамен');
          await window.tp.app.fileManager.processFrontMatter(
            window.tp.app.vault.getAbstractFileByPath(t.path),
            (fm) => {
              fm.priority = 'high';
            },
          );
          await window.tp.plugin.repo.load();
          window.tp.view.rebuild();
        });
        const exam = page
          .locator('.tp-main .tp-task')
          .filter({ has: page.locator('.tp-task-title', { hasText: 'Экзамен' }) });
        assert.equal(await exam.locator('.tp-appointment-time').textContent(), '14:00');
        assert.equal(await exam.locator('.tp-priority').textContent(), '!');
        assert.equal(
          await exam.locator('.tp-priority').getAttribute('aria-label'),
          'Высокий приоритет',
        );
        assert.equal(
          await exam.locator('.tp-priority').evaluate((n) => getComputedStyle(n).animationName),
          'tp-priority-pulse',
        );
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(
          await exam.locator('.tp-priority').evaluate((n) => getComputedStyle(n).animationName),
          'none',
        );
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await exam.locator('.tp-task-title').click();
        assert.equal(await page.locator('.tp-modal .tp-time').inputValue(), '14:00');
        await page.locator('.tp-modal .tp-time').fill('09:00');
        await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
        await page.waitForFunction(
          () =>
            window.tp.plugin.repo.snapshot().tasks.find((t) => t.title === 'Экзамен')
              .scheduledTime === '09:00',
        );
        for (const tab of ['today', 'calendar', 'kanban']) {
          await page.locator('[data-tab=' + tab + ']').click();
          assert.ok(
            await page.locator('.tp-appointment-time').filter({ hasText: '09:00' }).count(),
          );
        }
        await page.locator('[data-tab=today]').click();
        const section = exam.locator('xpath=ancestor::section[1]');
        assert.equal(await section.locator('.tp-task-title').first().textContent(), 'Экзамен');
        await capture('appointments-priority-desktop.png');
        await page.evaluate(() => {
          window.tp.previousTheme = document.documentElement.getAttribute('style');
          for (const [k, v] of Object.entries({
            '--background-primary': '#ffffff',
            '--background-secondary': '#f6f7f9',
            '--background-modifier-border': '#d9dde4',
            '--text-normal': '#252933',
            '--text-muted': '#626a79',
            '--color-yellow': '#956416',
          }))
            document.documentElement.style.setProperty(k, v);
        });
        assert.equal(
          await exam.locator('.tp-priority').evaluate((n) => getComputedStyle(n).animationName),
          'tp-priority-pulse',
        );
        await capture('appointments-priority-light.png');
        await page.evaluate(() => {
          if (window.tp.previousTheme === null) document.documentElement.removeAttribute('style');
          else document.documentElement.setAttribute('style', window.tp.previousTheme);
        });

        await setViewport({ width: 320, height: 844 });
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        );
        await capture('appointments-priority-mobile.png');
        await exam.locator('.tp-check').click();
        await page.waitForFunction(
          () =>
            window.tp.plugin.repo.snapshot().tasks.find((t) => t.title === 'Экзамен').status ===
            'done',
        );
        assert.equal(
          await exam.locator('.tp-priority').evaluate((n) => getComputedStyle(n).animationName),
          'none',
        );
      },
    );
    await check(
      'Sunday weekday creation shows Monday preview, localized confirmation and no phantom task',
      async () => {
        const p = await context.newPage();
        try {
          await p.goto('http://127.0.0.1:' + server.address().port);
          await p.waitForFunction(() => window.ready);
          await p.evaluate(() => {
            const Original = Date;
            window.Date = class extends Original {
              constructor(...args) {
                if (!args.length) super('2026-10-04T08:00:00Z');
                else super(...args);
              }
              static now() {
                return new Original('2026-10-04T08:00:00Z').valueOf();
              }
            };
            window.tp.view.rebuild();
          });
          await p.getByRole('button', { name: 'Добавить задачу', exact: true }).first().click();
          await p.locator('.tp-modal input[type=text]').first().fill('Автошкола по будням');
          await p.locator('.tp-modal .tp-date').first().fill('04.10.2026');
          const repeat = p
            .locator('.tp-modal select')
            .filter({ has: p.locator('option[value="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"]') });
          await repeat.selectOption('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
          assert.match(await p.locator('.tp-repeat-preview').textContent(), /05.10.2026/);
          await p.locator('.tp-modal .tp-time').fill('14:00');
          await p.locator('.tp-repeat-until').fill('09.10.2026');
          await p.screenshot({ path: path.join(root, 'docs/screenshots/weekday-sunday-form.png') });
          await p.getByRole('button', { name: 'Сохранить', exact: true }).click();
          await p.waitForFunction(() =>
            window.tp.notices.some((s) => s.includes('Первый повтор: 05.10.2026')),
          );
          assert.equal(
            await p
              .locator('.tp-main .tp-task-title')
              .filter({ hasText: 'Автошкола по будням' })
              .count(),
            0,
          );
          await p.locator('[data-tab=calendar]').click();
          assert.equal(
            await p
              .locator('[data-day="2026-10-05"] .tp-task-title')
              .filter({ hasText: 'Автошкола по будням' })
              .count(),
            1,
          );
          assert.equal(
            await p
              .locator('[data-day="2026-10-10"] .tp-task-title')
              .filter({ hasText: 'Автошкола по будням' })
              .count(),
            0,
          );
          await p.locator('[data-day="2026-10-05"]').scrollIntoViewIfNeeded();
          await p.screenshot({
            path: path.join(root, 'docs/screenshots/weekday-sunday-calendar.png'),
          });
        } finally {
          await p.close();
        }
      },
    );

    await check(
      'calendar popover selects dates, changes year/month, clears cutoff and supports keyboard/Escape on mobile',
      async () => {
        await setViewport({ width: 1440, height: 1050 });
        await page.locator('[data-tab=today]').click();
        await page.getByRole('button', { name: 'Добавить задачу', exact: true }).first().click();
        const controls = page.locator('.tp-modal .tp-date-control');
        await controls.first().locator('.tp-date-picker-button').click();
        const popup = page.locator('.tp-picker-popup:popover-open');
        assert.equal(await popup.count(), 1);
        await popup.locator('[data-picker-control=year]').selectOption('2027');
        await popup.locator('[data-picker-control=month]').selectOption('02');
        await popup.locator('[data-picker-day="2027-02-06"]').click();
        assert.equal(await page.locator('.tp-modal .tp-date').first().inputValue(), '06.02.2027');
        assert.equal(await page.locator('.tp-picker-popup:popover-open').count(), 0);
        await page.locator('.tp-modal .tp-date').first().fill('07102026');
        await page.locator('.tp-modal .tp-time').focus();
        assert.equal(await page.locator('.tp-modal .tp-date').first().inputValue(), '07.10.2026');
        assert.equal(await page.locator('.tp-modal .tp-time').getAttribute('type'), 'text');
        await page.locator('.tp-modal .tp-time').fill('14:00');
        const repeat = page
          .locator('.tp-modal select')
          .filter({ has: page.locator('option[value="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"]') });
        await repeat.selectOption('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
        await controls.nth(1).locator('.tp-date-picker-button').click();
        await page.locator('.tp-picker-popup:popover-open [data-picker-day="2026-10-09"]').click();
        assert.equal(await page.locator('.tp-repeat-until').inputValue(), '09.10.2026');
        await controls.nth(1).locator('.tp-date-picker-button').click();
        await page.getByRole('button', { name: 'Очистить дату', exact: true }).click();
        assert.equal(await page.locator('.tp-repeat-until').inputValue(), '');
        await setViewport({ width: 320, height: 844 });
        await controls.first().locator('.tp-date-picker-button').click();
        const bounds = await page.locator('.tp-picker-popup:popover-open').evaluate((n) => ({
          left: n.getBoundingClientRect().left,
          right: n.getBoundingClientRect().right,
          top: n.getBoundingClientRect().top,
          bottom: n.getBoundingClientRect().bottom,
          overflow: n.scrollWidth - n.clientWidth,
        }));
        assert.ok(
          bounds.left >= 0 &&
            bounds.right <= 320 &&
            bounds.top >= 0 &&
            bounds.bottom <= 844 &&
            bounds.overflow <= 1,
        );
        await page.screenshot({ path: path.join(root, 'docs/screenshots/date-picker-mobile.png') });
        await page.keyboard.press('ArrowRight');
        assert.equal(
          await page.evaluate(() => document.activeElement.dataset.pickerDay),
          '2026-10-08',
        );
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('.tp-modal .tp-date').first().inputValue(), '08.10.2026');
        await controls.first().locator('.tp-date-picker-button').click();
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.tp-picker-popup:popover-open').count(), 0);
        assert.equal(
          await page
            .locator('.tp-modal .tp-date')
            .first()
            .evaluate((n) => n === document.activeElement),
          true,
        );
        assert.equal(
          await page
            .locator(
              '.tp-modal .tp-time-help, .tp-modal .tp-description-help, .tp-modal .tp-manual-help',
            )
            .count(),
          0,
        );
        await page.getByRole('button', { name: 'Отмена', exact: true }).click();
      },
    );
    await check(
      'theme-aware select options and compact priority badges fit monochrome calendar cells',
      async () => {
        await setViewport({ width: 1440, height: 1050 });
        for (const dark of [true, false]) {
          await page.evaluate((dark) => {
            document.body.classList.toggle('theme-dark', dark);
            document.body.classList.toggle('theme-light', !dark);
            const r = document.documentElement;
            r.style.setProperty('--background-primary', dark ? '#000000' : '#ffffff');
            r.style.setProperty('--background-secondary', dark ? '#101010' : '#f6f7f9');
            r.style.setProperty('--text-normal', dark ? '#dddddd' : '#252933');
          }, dark);
          await page.getByRole('button', { name: 'Новый проект', exact: true }).click();
          const options = await page
            .locator('.tp-modal select')
            .first()
            .locator('option')
            .evaluateAll((nodes) =>
              nodes.map((n) => ({
                color: getComputedStyle(n).color,
                background: getComputedStyle(n).backgroundColor,
              })),
            );
          for (const option of options) {
            assert.equal(option.color, dark ? 'rgb(221, 221, 221)' : 'rgb(37, 41, 51)');
            assert.equal(option.background, dark ? 'rgb(16, 16, 16)' : 'rgb(246, 247, 249)');
          }
          await page.screenshot({
            path: path.join(
              root,
              'docs/screenshots/project-select-' + (dark ? 'dark' : 'light') + '.png',
            ),
          });
          await page.getByRole('button', { name: 'Отмена', exact: true }).click();
          await page.locator('[data-tab=calendar]').click();
          for (const width of [1440, 390, 320]) {
            await setViewport({ width, height: 1050 });
            const badge = page.locator('.tp-day .tp-priority').first();
            assert.equal(await badge.textContent(), '!');
            assert.equal(await badge.getAttribute('aria-label'), 'Высокий приоритет');
            const fit = await badge.evaluate((n) => {
              const b = n.getBoundingClientRect(),
                p = n.closest('.tp-task').getBoundingClientRect();
              return { width: b.width, left: b.left - p.left, right: p.right - b.right };
            });
            assert.ok(fit.width <= 18 && fit.left >= 0 && fit.right >= -1);
            if (width === 320) {
              await badge.scrollIntoViewIfNeeded();
              await badge.locator('xpath=ancestor::*[contains(@class, "tp-day")][1]').screenshot({
                path: path.join(
                  root,
                  'docs/screenshots/priority-calendar-compact-' +
                    (dark ? 'dark' : 'light') +
                    '-cell.png',
                ),
              });
              await page.screenshot({
                path: path.join(
                  root,
                  'docs/screenshots/priority-calendar-compact-' +
                    (dark ? 'dark' : 'light') +
                    '.png',
                ),
              });
            }
          }
          await setViewport({ width: 1440, height: 1050 });
        }
        await page.evaluate(() => {
          document.documentElement.removeAttribute('style');
          document.body.classList.remove('theme-dark', 'theme-light');
        });
      },
    );
    await check(
      'guide is the last tab, explains concepts and author, with no tutorial footers in working pages',
      async () => {
        for (const tab of [
          'today',
          'inbox',
          'upcoming',
          'calendar',
          'projects',
          'kanban',
          'subscriptions',
          'statistics',
        ]) {
          await page.locator('[data-tab=' + tab + ']').click();
          assert.equal(await page.locator('.tp-help, .tp-board-help, .tp-tagline').count(), 0);
        }
        assert.equal(await page.locator('[data-tab]').last().getAttribute('data-tab'), 'manualTab');
        await page.locator('[data-tab=manualTab]').click();
        assert.match(await page.locator('.tp-manual').textContent(), /Сфера → проект → задача/);
        assert.match(await page.locator('.tp-manual').textContent(), /Автор: TragerSec/);
        assert.ok(
          (await page.locator('.tp-manual').textContent()).includes(
            'Версия: ' + require(path.join(root, 'manifest.json')).version,
          ),
        );
        assert.equal(await page.locator('.tp-quick').isVisible(), false);
        assert.equal(await page.locator('.tp-filters').isVisible(), false);
        await capture('manual-desktop.png');
        await setViewport({ width: 320, height: 844 });
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        );
        await capture('manual-mobile.png');
        await page.evaluate(() => {
          window.tp.plugin.settings.language = 'en';
          window.tp.view.rebuild();
        });
        assert.equal(await page.locator('[data-tab=manualTab]').textContent(), 'Guide');
        assert.match(await page.locator('.tp-manual').textContent(), /Area → project → task/);
        await page.evaluate(() => {
          window.tp.plugin.settings.language = 'ru';
          window.tp.view.rebuild();
        });
      },
    );

    await check(
      'joined date/time controls and 24-hour clock picker apply, cancel and clear in monochrome desktop/mobile',
      async () => {
        await setViewport({ width: 1440, height: 1050 });
        await page.locator('[data-tab=today]').click();
        await page.getByRole('button', { name: 'Добавить задачу', exact: true }).first().click();
        await page.locator('.tp-modal input[type=text]').first().fill('Clock regression');
        for (const dark of [true, false]) {
          await page.evaluate((dark) => {
            document.body.classList.toggle('theme-dark', dark);
            document.body.classList.toggle('theme-light', !dark);
            for (const [k, v] of Object.entries({
              '--background-primary': dark ? '#000000' : '#ffffff',
              '--background-secondary': dark ? '#101010' : '#f6f7f9',
              '--background-modifier-border': dark ? '#303030' : '#d9dde4',
              '--text-normal': dark ? '#dddddd' : '#252933',
              '--text-muted': dark ? '#999999' : '#626a79',
            }))
              document.documentElement.style.setProperty(k, v);
          }, dark);
          for (const width of [1440, 320]) {
            await setViewport({ width, height: 1050 });
            const controls = await page
              .locator('.tp-modal :is(.tp-date-control,.tp-time-control):visible')
              .evaluateAll((nodes) =>
                nodes.map((n) => {
                  const r = n.getBoundingClientRect();
                  const i = n.querySelector('input').getBoundingClientRect();
                  const b = n.querySelector(':scope > button').getBoundingClientRect();
                  return {
                    height: r.height,
                    left: r.left,
                    right: r.right,
                    inputHeight: i.height,
                    buttonFits:
                      b.left >= r.left &&
                      b.right <= r.right + 1 &&
                      b.top >= r.top &&
                      b.bottom <= r.bottom + 1,
                    background: getComputedStyle(n).backgroundColor,
                  };
                }),
              );
            assert.equal(controls.length, 3);
            assert.equal(await page.locator('.tp-modal .tp-date-control:visible').count(), 2);
            assert.equal(await page.locator('.tp-modal .tp-time-control:visible').count(), 1);
            for (const control of controls) {
              assert.equal(control.height, 36);
              assert.ok(control.buttonFits);
              assert.ok(control.left >= 0 && control.right <= width);
              assert.equal(control.background, dark ? 'rgb(16, 16, 16)' : 'rgb(246, 247, 249)');
            }
            await page.screenshot({
              path: path.join(
                root,
                'docs/screenshots/form-joined-' + (dark ? 'dark' : 'light') + '-' + width + '.png',
              ),
            });
          }
        }
        await page.locator('.tp-modal .tp-time-picker-button').click();
        const clock = page.locator('.tp-clock-popup:popover-open');
        await clock.getByRole('combobox', { name: 'Часы', exact: true }).selectOption('14');
        await clock.getByRole('combobox', { name: 'Минуты', exact: true }).selectOption('35');
        await page.screenshot({
          path: path.join(root, 'docs/screenshots/clock-picker-mobile.png'),
        });
        await clock.getByRole('button', { name: 'Выбрать время', exact: true }).click();
        assert.equal(await page.locator('.tp-modal .tp-time').inputValue(), '14:35');
        assert.equal(await page.locator('.tp-clock-popup select').count(), 0);
        await page.locator('.tp-modal .tp-time-picker-button').click();
        await clock.getByRole('combobox', { name: 'Часы', exact: true }).selectOption('22');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.tp-modal .tp-time').inputValue(), '14:35');
        assert.equal(
          await page.locator('.tp-modal .tp-time').evaluate((n) => n === document.activeElement),
          true,
        );
        await page.locator('.tp-modal .tp-time-picker-button').click();
        await clock.getByRole('button', { name: 'Очистить время', exact: true }).click();
        assert.equal(await page.locator('.tp-modal .tp-time').inputValue(), '');
        await page.locator('.tp-modal .tp-time').fill('930');
        await page.locator('.tp-modal input[type=text]').first().focus();
        assert.equal(await page.locator('.tp-modal .tp-time').inputValue(), '09:30');
        await page.locator('.tp-modal .tp-time').fill('24:00');
        await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
        assert.equal(await page.locator('.tp-modal').count(), 1);
        assert.equal(
          await page.evaluate(() =>
            window.tp.plugin.repo.snapshot().tasks.some((t) => t.title === 'Clock regression'),
          ),
          false,
        );
        await page.locator('.tp-modal .tp-time').fill('14:00');
        await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
        await page.waitForFunction(() =>
          window.tp.plugin.repo
            .snapshot()
            .tasks.some((t) => t.title === 'Clock regression' && t.scheduledTime === '14:00'),
        );
        await page.evaluate(() => {
          document.documentElement.removeAttribute('style');
          document.body.classList.remove('theme-dark', 'theme-light');
        });
      },
    );
    await check(
      'priority follows first title line and guide chapters have dividers, headings and working contents',
      async () => {
        await setViewport({ width: 1440, height: 1050 });
        await page.locator('[data-tab=calendar]').click();
        const badge = page.locator('.tp-day .tp-priority').first();
        assert.equal(await badge.locator('xpath=..').getAttribute('class'), 'tp-task-heading');
        assert.equal(await page.locator('.tp-task-meta .tp-priority').count(), 0);
        const position = await badge.evaluate((n) => {
          const h = n.parentElement.getBoundingClientRect(),
            b = n.getBoundingClientRect(),
            t = n.parentElement.querySelector('.tp-task-title').getBoundingClientRect();
          return {
            offset: b.top - h.top,
            right: h.right - b.right,
            titleRight: t.right,
            badgeLeft: b.left,
          };
        });
        assert.ok(
          position.offset >= 0 &&
            position.offset <= 2 &&
            position.right >= -1 &&
            position.badgeLeft >= position.titleRight,
        );
        await badge.scrollIntoViewIfNeeded();
        await badge
          .locator('xpath=ancestor::*[contains(@class, "tp-day")][1]')
          .screenshot({ path: path.join(root, 'docs/screenshots/priority-title-cell.png') });
        await page.locator('[data-tab=manualTab]').click();
        assert.equal(await page.locator('.tp-manual-divider').count(), 10);
        assert.equal(await page.locator('.tp-manual-heading').count(), 11);
        assert.equal(await page.locator('.tp-manual-link').count(), 11);
        for (const width of [1440, 320]) {
          await setViewport({ width, height: 1050 });
          const headings = await page.locator('.tp-manual-heading').evaluateAll((nodes) =>
            nodes.map((n) => ({
              weight: Number(getComputedStyle(n).fontWeight),
              font: getComputedStyle(n).fontFamily,
              border: parseFloat(getComputedStyle(n).borderInlineStartWidth),
            })),
          );
          assert.ok(
            headings.every((h) => h.weight >= 500 && h.border >= 3 && h.font.includes('monospace')),
          );
          assert.ok(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          );
          await page.locator('.tp-content').evaluate((n) => {
            n.scrollTop = 0;
          });
          await page.screenshot({
            path: path.join(root, 'docs/screenshots/manual-chapters-' + width + '.png'),
          });
        }
        await page.locator('.tp-manual-link').filter({ hasText: 'О плагине' }).click();
        assert.ok(await page.locator('.tp-content').evaluate((n) => n.scrollTop > 200));
        assert.ok(
          await page.locator('.tp-manual-heading').filter({ hasText: 'О плагине' }).isVisible(),
        );
      },
    );
    await check(
      'contents are ordered text links without theme button chrome or a container tooltip',
      async () => {
        const style = await page.addStyleTag({
          content:
            '.tp-host button {background:#111;box-shadow:0 2px 6px #000;font-family:monospace;} .tp-host {font-family:monospace;}',
        });
        try {
          await page.locator('[data-tab=manualTab]').click();
          assert.equal(await page.locator('.tp-manual-contents').getAttribute('aria-label'), null);
          assert.equal(await page.locator('ol.tp-manual-links a').count(), 11);
          for (const width of [1440, 390, 320]) {
            await setViewport({ width, height: 1050 });
            const links = await page.locator('.tp-manual-link').evaluateAll((nodes) =>
              nodes.map((n) => {
                const style = getComputedStyle(n),
                  box = n.getBoundingClientRect();
                return {
                  background: style.backgroundColor,
                  shadow: style.boxShadow,
                  left: box.left,
                  right: box.right,
                  top: box.top,
                  bottom: box.bottom,
                };
              }),
            );
            assert.ok(
              links.every(
                (n) =>
                  n.background === 'rgba(0, 0, 0, 0)' &&
                  n.shadow === 'none' &&
                  n.left >= 0 &&
                  n.right <= width,
              ),
            );
            assert.ok(links.slice(1).every((n, i) => n.top >= links[i].bottom));
            await page.locator('.tp-content').evaluate((n) => {
              n.scrollTop = 0;
            });
            await page.screenshot({
              path: path.join(root, 'docs/screenshots/contents-links-' + width + '.png'),
            });
          }
          await page.locator('.tp-manual-link').filter({ hasText: 'О плагине' }).focus();
          await page.keyboard.press('Enter');
          assert.ok(
            await page
              .locator('.tp-manual-heading')
              .filter({ hasText: 'О плагине' })
              .evaluate((n) => n === document.activeElement),
          );
          assert.ok(await page.locator('.tp-content').evaluate((n) => n.scrollTop > 200));
        } finally {
          await style.evaluate((n) => n.remove());
        }
      },
    );
    await check(
      'no-project label fits quick capture with monospace text in Russian and English',
      async () => {
        const style = await page.addStyleTag({
          content: '.tp-host, .tp-host :is(button,input,select) {font-family:monospace;}',
        });
        try {
          for (const language of ['ru', 'en']) {
            await page.evaluate((language) => {
              window.tp.plugin.settings.language = language;
              window.tp.view.rebuild();
            }, language);
            await page.locator('[data-tab=today]').click();
            await page.locator('[data-quick-options]').click();
            const project = page.locator('.tp-quick select').first();
            await project.selectOption('');
            for (const width of [1440, 750, 390, 320]) {
              await setViewport({ width, height: 844 });
              const geometry = await project.evaluate((n) => {
                const style = getComputedStyle(n),
                  canvas = document.createElement('canvas'),
                  context = canvas.getContext('2d');
                context.font = style.font;
                return {
                  text: n.selectedOptions[0].textContent,
                  textWidth: context.measureText(n.selectedOptions[0].textContent).width,
                  available:
                    n.clientWidth -
                    parseFloat(style.paddingLeft) -
                    parseFloat(style.paddingRight) -
                    24,
                };
              });
              assert.equal(geometry.text, language === 'ru' ? 'Без проекта' : 'No project');
              assert.ok(geometry.textWidth <= geometry.available, JSON.stringify(geometry));
              assert.ok(
                await page.evaluate(
                  () => document.documentElement.scrollWidth <= window.innerWidth,
                ),
              );
              if (language === 'ru' && [1440, 320].includes(width))
                await page.screenshot({
                  path: path.join(root, 'docs/screenshots/quick-project-' + width + '.png'),
                });
            }
            assert.match(
              await project.getAttribute('title'),
              language === 'ru' ? /Входящие/ : /Inbox/,
            );
          }
        } finally {
          await style.evaluate((n) => n.remove());
          await page.evaluate(() => {
            window.tp.plugin.settings.language = 'ru';
            window.tp.view.rebuild();
          });
        }
      },
    );
    await check(
      'subscription summary separates currencies and filter; prices, states and actions fit dark/light panes',
      async () => {
        await page.evaluate(() => {
          window.tp.subscriptionSnapshot = window.tp.plugin.repo.snapshot.bind(
            window.tp.plugin.repo,
          );
          const snap = window.tp.subscriptionSnapshot(),
            base = snap.tasks.find((t) => t.kind !== 'subscription');
          const values = [
            ['HackTheBox', 7, 'EUR', 'monthly', true, '2026-08-01'],
            ['HTB Labs', 18, 'EUR', 'monthly', true, ''],
            ['Mobile Phone', 1000, 'RUR', 'monthly', true, ''],
            ['Cancelled annual service with a long title', 120, 'EUR', 'yearly', false, ''],
            ['Unpriced service', null, 'EUR', 'monthly', true, ''],
          ];
          window.tp.plugin.repo.snapshot = () => ({
            ...snap,
            tasks: values.map(
              ([title, amount, currency, billingPeriod, subscriptionActive, scheduled], i) => ({
                ...base,
                path: 'subscription-fixture/' + i + '.md',
                title,
                amount,
                currency,
                billingPeriod,
                subscriptionActive,
                scheduled,
                kind: 'subscription',
                recurrence: '',
                project: '',
                due: '',
                scheduledTime: '',
              }),
            ),
          });
          window.tp.view.rebuild();
        });
        const style = await page.addStyleTag({
          content: '.tp-host, .tp-host :is(button,input,select) {font-family:monospace;}',
        });
        try {
          await page.locator('[data-tab=subscriptions]').click();
          await page.locator('[data-expense-mode=subscriptions]').click();
          const scope = page.locator('.tp-subscription-summary select');
          await scope.selectOption('all');
          assert.equal(await page.locator('.tp-subscription').count(), 5);
          assert.deepEqual(await page.locator('.tp-cost-total').allTextContents(), [
            '25,00 EUR',
            '1\u00a0000,00 RUR',
          ]);
          for (const dark of [true, false]) {
            await page.evaluate((dark) => {
              for (const [key, value] of Object.entries({
                '--background-primary': dark ? '#000' : '#fff',
                '--background-secondary': dark ? '#111' : '#f6f7f9',
                '--background-modifier-border': dark ? '#303030' : '#d9dde4',
                '--text-normal': dark ? '#ddd' : '#252933',
                '--text-muted': dark ? '#999' : '#626a79',
                '--text-faint': dark ? '#777' : '#626a79',
              }))
                document.documentElement.style.setProperty(key, value);
            }, dark);
            for (const width of [1440, 750, 390, 320]) {
              await setViewport({ width, height: 1050 });
              const layout = await page.evaluate(() => {
                const box = (n) => {
                  const b = n.getBoundingClientRect();
                  return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
                };
                const filter = box(document.querySelector('.tp-subscription-summary select'));
                const totals = [...document.querySelectorAll('.tp-cost-total')].map(box);
                const rows = [...document.querySelectorAll('.tp-subscription')].map((n) => ({
                  row: box(n),
                  price: box(n.querySelector('.tp-subscription-price')),
                  controls: [...n.querySelectorAll('button')].map(box),
                }));
                return {
                  filter,
                  totals,
                  rows,
                  overflow: document.documentElement.scrollWidth > innerWidth,
                };
              });
              assert.equal(layout.overflow, false);
              assert.ok(layout.totals.every((n) => n.top >= layout.filter.bottom));
              assert.ok(
                layout.rows.every(
                  (n) =>
                    n.price.left >= n.row.left &&
                    n.price.right <= n.row.right &&
                    n.controls.every((b) => b.left >= n.row.left && b.right <= n.row.right),
                ),
              );
              await page.locator('.tp-content').evaluate((n) => {
                n.scrollTop = 0;
              });
              await page.screenshot({
                path: path.join(
                  root,
                  'docs/screenshots/subscriptions-cards-' +
                    (dark ? 'dark-' : 'light-') +
                    width +
                    '.png',
                ),
              });
            }
          }
          await scope.selectOption('cancelled');
          assert.equal(await page.locator('.tp-subscription').count(), 1);
          assert.equal(await page.locator('.tp-subscription-toggle').textContent(), 'Возобновить');
          assert.deepEqual(await page.locator('.tp-cost-total').allTextContents(), [
            '25,00 EUR',
            '1\u00a0000,00 RUR',
          ]);
          await scope.selectOption('active');
          assert.equal(await page.locator('.tp-subscription').count(), 4);
        } finally {
          await style.evaluate((n) => n.remove());
          await page.evaluate(() => {
            window.tp.plugin.repo.snapshot = window.tp.subscriptionSnapshot;
            document.documentElement.removeAttribute('style');
            window.tp.view.rebuild();
          });
        }
      },
    );

    await check(
      'calendar closes-first order and billing footer remain readable under hostile button styling',
      async () => {
        const original = await page.evaluate(() => {
          window.tp.refreshSnapshot = window.tp.plugin.repo.snapshot.bind(window.tp.plugin.repo);
          const snap = window.tp.refreshSnapshot();
          const base = snap.tasks.find((t) => t.kind !== 'subscription');
          const make = (title, status, time, extra = {}) => ({
            ...base,
            path: 'Demo/' + title + '.md',
            title,
            status,
            kind: 'task',
            description: '',
            scheduled: '2026-10-02',
            due: '',
            scheduledTime: time,
            recurrence: '',
            seriesEnd: '',
            moves: {},
            occurrences: {},
            skipped: [],
            minutes: status === 'done' ? 25 : 0,
            resolvedOn: status === 'done' ? '2026-10-02' : '',
            priority: 'normal',
            unsupportedRepeat: '',
            ...extra,
          });
          const tasks = [
            make('Open early', 'in-progress', '07:00'),
            make('Done untimed', 'done', ''),
            make('Done late', 'done', '21:00'),
            make('Failed work', 'failed', '10:00'),
            make('YouTube Premium', 'todo', '', {
              kind: 'subscription',
              scheduled: '2026-10-01',
              amount: 14,
              currency: 'USD',
              billingPeriod: 'monthly',
              subscriptionActive: true,
            }),
          ];
          window.tp.plugin.repo.snapshot = () => ({ ...snap, tasks });
          window.tp.view.month = '2026-10-01';
          window.tp.view.rebuild();
          return true;
        });
        assert.equal(original, true);
        const style = await page.addStyleTag({
          content:
            '.tp-shell button { background: #777 !important; box-shadow: 0 0 3px #aaa !important; font-family: monospace; }',
        });
        try {
          for (const light of [false, true]) {
            await page.evaluate((light) => {
              document.documentElement.style.setProperty(
                '--background-primary',
                light ? '#ffffff' : '#000000',
              );
              document.documentElement.style.setProperty(
                '--background-secondary',
                light ? '#f4f4f4' : '#101010',
              );
              document.documentElement.style.setProperty(
                '--text-normal',
                light ? '#252525' : '#dddddd',
              );
              document.documentElement.style.setProperty(
                '--text-muted',
                light ? '#626262' : '#999999',
              );
            }, light);
            for (const width of [1440, 390, 320]) {
              await setViewport({ width, height: 1000 });
              await page.locator('[data-tab=calendar]').click();
              const cell = page.locator('[data-day="2026-10-02"]');
              assert.deepEqual(await cell.locator('.tp-task-title').allTextContents(), [
                'Done late',
                'Done untimed',
                'Failed work',
                'Open early',
              ]);
              assert.equal(
                await page
                  .locator('[data-day="2026-10-01"]')
                  .evaluate((n) => n.lastElementChild.className),
                'tp-calendar-billing',
              );
              assert.match(
                await page.locator('[data-day="2026-11-01"] .tp-calendar-payment').textContent(),
                /YouTube Premium.*14/,
              );
              const titles = await cell.locator('.tp-task-title').evaluateAll((nodes) =>
                nodes.map((n) => ({
                  color: getComputedStyle(n).color,
                  background: getComputedStyle(n).backgroundColor,
                  shadow: getComputedStyle(n).boxShadow,
                  line: getComputedStyle(n).textDecorationLine,
                  font: parseFloat(getComputedStyle(n).fontSize),
                })),
              );
              assert.ok(
                titles.every(
                  (n) => n.background === 'rgba(0, 0, 0, 0)' && n.shadow === 'none' && n.font >= 12,
                ),
              );
              assert.ok(titles[0].line.includes('line-through'));
              assert.notEqual(titles[0].color, titles[3].color);
              assert.equal(
                titles[0].color,
                await cell
                  .locator('.tp-done .tp-check')
                  .first()
                  .evaluate((n) => getComputedStyle(n).color),
              );
              assert.ok(
                await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
              );
              await cell.scrollIntoViewIfNeeded();
              await cell.locator('.tp-task').first().hover();
              assert.equal(
                await cell
                  .locator('.tp-task-actions')
                  .first()
                  .evaluate((n) => getComputedStyle(n).opacity),
                '1',
              );
              await page.locator('[data-tab=kanban]').click();
              await page.locator('[data-board-scope]').selectOption('all');
              const boardTitle = page
                .locator('.tp-board-card[data-status=done] .tp-board-title')
                .first();
              assert.equal(
                await boardTitle.evaluate((n) => getComputedStyle(n).backgroundColor),
                'rgba(0, 0, 0, 0)',
              );
              assert.ok(
                (await boardTitle.evaluate((n) => getComputedStyle(n).textDecorationLine)).includes(
                  'line-through',
                ),
              );
            }
          }
        } finally {
          await style.evaluate((n) => n.remove());
          await page.evaluate(() => {
            window.tp.plugin.repo.snapshot = window.tp.refreshSnapshot;
            document.documentElement.removeAttribute('style');
            window.tp.view.rebuild();
          });
        }
      },
    );
    await check(
      'dashboard shows workflow and daily-time charts with collapsed project and extra figures',
      async () => {
        await setViewport({ width: 1440, height: 1050 });
        await page.locator('[data-tab=statistics]').click();
        assert.equal(await page.locator('.tp-workflow-ring').count(), 1);
        assert.equal(await page.locator('.tp-time-chart').count(), 1);
        assert.equal(await page.locator('.tp-project-details').evaluate((n) => n.open), false);
        assert.ok(
          await page.locator('.tp-stats-disclosure').evaluateAll((ns) => ns.every((n) => !n.open)),
        );
        await page.locator('.tp-project-details summary').click();
        await page.locator('[data-period="7"]').click();
        assert.equal(await page.locator('.tp-project-details').evaluate((n) => n.open), true);
        await page.locator('.tp-project-details summary').click();
        for (const width of [1440, 390, 320]) {
          await setViewport({ width, height: 1050 });
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          const chart = page.locator('.tp-time-chart').first();
          assert.equal(await chart.getAttribute('role'), 'img');
          assert.ok(await chart.getAttribute('aria-label'));
        }
      },
    );
    await check(
      'calendar overdue labels and red accents survive light/dark themes and language switches',
      async () => {
        await setViewport({ width: 1440, height: 1050 });
        await page.evaluate(async () => {
          const { plugin, app } = window.tp;
          const { stringifyYaml } = window.require('obsidian');
          await app.vault.create(
            'Planner/Tasks/late-color.md',
            '---\n' +
              stringifyYaml({
                topSchema: 1,
                type: 'task',
                title: 'Overdue color regression',
                scheduled: '2026-10-01',
                status: 'in-progress',
                project: '[[Planner/Projects/Launch]]',
              }) +
              '---\n',
          );
          await plugin.repo.load();
        });
        for (const language of ['ru', 'en']) {
          await page.evaluate((language) => {
            window.tp.plugin.settings.language = language;
            window.tp.view.rebuild();
          }, language);
          await page.locator('[data-tab=calendar]').click();
          const late = page.locator('.tp-task[data-path="Planner/Tasks/late-color.md"]').first();
          assert.equal(
            await late.locator('.tp-overdue-label').textContent(),
            language === 'ru' ? 'Просрочено' : 'Overdue',
          );
          for (const bg of ['#171a20', '#ffffff']) {
            await page.evaluate(
              (bg) => document.documentElement.style.setProperty('--background-primary', bg),
              bg,
            );
            const style = await late.evaluate((n) => ({
              title: getComputedStyle(n.querySelector('.tp-task-title')).color,
              label: getComputedStyle(n.querySelector('.tp-overdue-label')).color,
              border: getComputedStyle(n).borderInlineStartColor,
            }));
            assert.equal(style.title, 'rgb(255, 101, 130)');
            assert.equal(style.label, style.title);
            assert.equal(style.border, 'rgb(255, 101, 130)');
          }
          await page.evaluate(() =>
            document.documentElement.style.removeProperty('--background-primary'),
          );
          await page.locator('[data-tab=manualTab]').click();
          assert.equal(await page.locator('.tp-manual').getAttribute('lang'), language);
          assert.match(
            await page.locator('.tp-manual').textContent(),
            language === 'ru' ? /Сфера → проект → задача/ : /Area → project → task/,
          );
        }
      },
    );
    await check(
      'rounded progress balances the chart panels and type/priority markers fit every surface',
      async () => {
        await setViewport({ width: 1440, height: 1050 });
        await page.locator('[data-tab=statistics]').click();
        const layout = await page.locator('.tp-dashboard').evaluate((n) => {
          const overview = n.querySelector('.tp-stats-overview').getBoundingClientRect();
          const workflow = n.querySelector('.tp-workflow-panel').getBoundingClientRect(),
            activity = n.querySelector('.tp-activity').getBoundingClientRect(),
            projects = n.querySelector('.tp-project-panel').getBoundingClientRect();
          const style = getComputedStyle(n.querySelector('.tp-workflow-track'));
          return {
            gap: projects.top - overview.bottom,
            workflowGap: overview.top - activity.bottom,
            height: style.height,
            radius: style.borderRadius,
          };
        });
        assert.ok(layout.gap >= 16 && layout.gap <= 20);
        assert.ok(layout.workflowGap >= 16 && layout.workflowGap <= 20);
        assert.equal(layout.height, '6px');
        assert.equal(layout.radius, '999px');
        await page.evaluate(() => {
          const repo = window.tp.plugin.repo;
          window.tp.markerSnapshot = repo.snapshot.bind(repo);
          const snap = repo.snapshot(),
            base = snap.tasks.find((t) => t.kind === 'task');
          repo.snapshot = () => ({
            ...snap,
            tasks: ['meeting', 'payment', 'status'].map((kind) => ({
              ...base,
              path: `markers/${kind}.md`,
              title: 'A long task title with both type and priority markers',
              kind,
              priority: 'high',
              status: 'todo',
              scheduled: '2026-10-02',
              due: '',
              recurrence: '',
              occurrences: {},
              moves: {},
              skipped: [],
            })),
          });
          window.tp.view.rebuild();
        });
        try {
          for (const light of [false, true]) {
            await page.evaluate((light) => {
              document.body.classList.toggle('theme-light', light);
              const colors = light
                ? {
                    '--background-primary': '#fff',
                    '--background-secondary': '#f6f7f9',
                    '--text-normal': '#252933',
                    '--text-muted': '#626a79',
                  }
                : {};
              document.documentElement.removeAttribute('style');
              for (const [key, value] of Object.entries(colors))
                document.documentElement.style.setProperty(key, value);
            }, light);
            for (const width of [1440, 390, 320]) {
              await setViewport({ width, height: 1050 });
              for (const tab of ['today', 'calendar', 'kanban']) {
                await page.locator('[data-tab=' + tab + ']').click();
                const headings = await page
                  .locator('.tp-task-heading:has(.tp-kind-badge)')
                  .evaluateAll((nodes) =>
                    nodes.map((n) => {
                      const kind = n.querySelector('.tp-kind-badge'),
                        priority = n.querySelector('.tp-priority');
                      const title = n.firstElementChild.getBoundingClientRect(),
                        k = kind.getBoundingClientRect(),
                        p = priority.getBoundingClientRect(),
                        h = n.getBoundingClientRect();
                      return {
                        label: kind.getAttribute('aria-label'),
                        priority: priority.textContent,
                        kind: kind.dataset.kind,
                        overlap: title.right > k.left + 1 || k.right > p.left + 1,
                        fits: p.right <= h.right + 1,
                        offset: Math.abs(k.top - title.top),
                        width: k.width,
                      };
                    }),
                  );
                assert.equal(headings.length, 3);
                assert.ok(
                  headings.every(
                    (n) =>
                      n.label &&
                      n.priority === '!' &&
                      !n.overlap &&
                      n.fits &&
                      n.offset <= 3 &&
                      n.width >= 14,
                  ),
                  JSON.stringify({ width, tab, headings }),
                );
              }
            }
          }
        } finally {
          await page.evaluate(() => {
            document.body.classList.remove('theme-light');
            document.documentElement.removeAttribute('style');
            window.tp.plugin.repo.snapshot = window.tp.markerSnapshot;
            delete window.tp.markerSnapshot;
            window.tp.view.rebuild();
          });
        }
      },
    );
    await check(
      'every primary accent follows live theme changes in dark/light views and modals',
      async () => {
        await setViewport({ width: 1440, height: 1050 });
        await page.evaluate(async () => {
          const { plugin } = window.tp;
          plugin.settings.language = 'en';
          plugin.settings.dateFormat = 'ymd';
          await plugin.service.createTask({
            title: 'Accent status marker',
            kind: 'status',
            priority: 'normal',
            scheduled: '2026-10-02',
            due: '',
            project: '',
            recurrence: '',
            minutes: 0,
          });
          await plugin.service.createTask({
            title: 'Accent time fixture',
            kind: 'task',
            status: 'done',
            priority: 'normal',
            scheduled: '2026-10-02',
            due: '',
            project: '',
            recurrence: '',
            minutes: 20,
          });
          window.tp.view.rebuild();
        });
        await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
        const color = (selector, property) =>
          page
            .locator(selector)
            .first()
            .evaluate((n, property) => getComputedStyle(n)[property], property);
        try {
          for (const light of [false, true]) {
            await page.evaluate((light) => {
              document.body.classList.toggle('theme-light', light);
              document.documentElement.removeAttribute('style');
              for (const [key, value] of Object.entries(
                light
                  ? {
                      '--background-primary': '#fff',
                      '--background-secondary': '#f6f7f9',
                      '--text-normal': '#252933',
                      '--text-muted': '#626a79',
                    }
                  : {},
              ))
                document.documentElement.style.setProperty(key, value);
            }, light);
            for (const accent of ['rgb(238, 238, 238)', 'rgb(0, 153, 130)', 'rgb(207, 96, 24)']) {
              const foreground =
                accent === 'rgb(238, 238, 238)' ? 'rgb(17, 17, 17)' : 'rgb(255, 255, 255)';
              await page.evaluate(
                ({ accent, foreground }) => {
                  const root = document.documentElement.style;
                  root.setProperty('--interactive-accent', accent);
                  root.setProperty('--interactive-accent-hover', accent);
                  root.setProperty('--text-on-accent', foreground);
                },
                { accent, foreground },
              );
              await page.mouse.move(0, 0);
              await page.locator('.tp-filters input[type=search]').fill('Accent status marker');
              await page.locator('[data-tab=calendar]').click();
              assert.equal(await color('.tp-header .mod-cta', 'backgroundColor'), accent);
              assert.equal(await color('.tp-header .mod-cta', 'color'), foreground);
              assert.equal(await color('.tp-quick-add', 'backgroundColor'), accent);
              assert.equal(await color('.tp-day-today .tp-day-number', 'backgroundColor'), accent);
              assert.equal(await color('.tp-day-today .tp-day-number', 'color'), foreground);
              assert.equal(
                await color('.tp-nav-button[aria-current=true]', 'borderInlineStartColor'),
                accent,
              );
              assert.equal(
                await color('.tp-nav-button[aria-current=true] .tp-nav-icon', 'color'),
                accent,
              );
              assert.equal(await color('.tp-kind-badge[data-kind=status]', 'color'), accent);
              const inactive = await page
                .locator('.tp-nav-button[aria-current=false]')
                .evaluateAll((nodes) =>
                  nodes.map((n) => ({
                    radius: getComputedStyle(n).borderRadius,
                    bg: getComputedStyle(n).backgroundColor,
                    shadow: getComputedStyle(n).boxShadow,
                  })),
                );
              assert.ok(
                inactive.every(
                  (n) => n.radius === '2px' && n.bg === 'rgba(0, 0, 0, 0)' && n.shadow === 'none',
                ),
              );
              await page.locator('.tp-quick .tp-date').fill('2026-10-02');
              await page.locator('.tp-quick .tp-date-picker-button').click();
              assert.equal(
                await color('.tp-picker-day[aria-pressed=true]', 'backgroundColor'),
                accent,
              );
              assert.equal(await color('.tp-picker-day[aria-pressed=true]', 'color'), foreground);
              await page.keyboard.press('Escape');
              await page.locator('[data-quick-options]').click();
              await page.locator('.tp-quick .tp-time-control > button').click();
              assert.equal(await color('.tp-clock-popup .mod-cta', 'backgroundColor'), accent);
              await page.keyboard.press('Escape');
              await page.locator('.tp-header .mod-cta').click();
              assert.equal(await color('.tp-modal .mod-cta', 'backgroundColor'), accent);
              assert.equal(await color('.tp-modal .mod-cta', 'color'), foreground);
              await page.keyboard.press('Escape');
              await page.locator('.tp-filters input[type=search]').fill('');
              await page.locator('[data-tab=statistics]').click();
              assert.equal(await color('.tp-time-chart path.tp-chart-time', 'stroke'), accent);
              assert.equal(
                await color('.tp-periods [aria-pressed=true]', 'borderTopColor'),
                accent,
              );
            }
          }
        } finally {
          await page.evaluate(() => {
            document.body.classList.remove('theme-light');
            document.documentElement.removeAttribute('style');
            window.tp.view.rebuild();
          });
        }
      },
    );
    await check(
      'work charts fit all periods, retain daily detail and preserve scroll position',
      async () => {
        await setViewport({ width: 1200, height: 900 });
        await page.evaluate(() => {
          window.tp.plugin.settings.language = 'ru';
          window.tp.view.rebuild();
        });
        await page.locator('[data-tab=statistics]').click();
        await page.locator('[data-stats-mode=business]').click();
        for (const days of [7, 30, 90, 365]) {
          await page.locator(`[data-period="${days}"]`).click();
          assert.equal(
            await page.locator('.tp-activity-chart .tp-day-tick').count(),
            days === 90 ? 14 : days === 365 ? 12 : days === 30 ? 31 : 7,
          );
          assert.equal(
            await page.locator('.tp-activity-details tbody tr').count(),
            days === 90 ? 92 : days === 365 ? 365 : days === 30 ? 31 : 7,
          );
          assert.equal(
            await page.locator('.tp-time-chart .tp-day-tick').count(),
            days === 90 ? 14 : days === 365 ? 12 : days === 30 ? 31 : 7,
          );
          const expectedRange =
            days === 7
              ? '28.09.2026 — 04.10.2026'
              : days === 30
                ? '01.10.2026 — 31.10.2026'
                : days === 90
                  ? '01.10.2026 — 31.12.2026'
                  : '01.01.2026 — 31.12.2026';
          assert.equal(
            (await page.locator('.tp-period-range').first().textContent()).trim(),
            expectedRange,
          );
          assert.equal(await page.locator('.tp-daily-scroll').count(), 0);
          assert.ok(
            await page
              .locator('.tp-fit-chart')
              .evaluateAll((ns) => ns.every((n) => n.scrollWidth <= n.clientWidth + 1)),
          );
          assert.ok(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          );
        }
        assert.equal(await page.locator('[data-period="365"]').textContent(), 'Год');
        await page.locator('.tp-content').evaluate((n) => (n.scrollTop = 350));
        const top = await page.locator('.tp-content').evaluate((n) => n.scrollTop);
        assert.ok(top > 200);
        await page.locator('[data-period="30"]').evaluate((n) => n.click());
        assert.equal(await page.locator('.tp-content').evaluate((n) => n.scrollTop), top);
        await capture('all-dates-year.png');
      },
    );
    await check(
      'expense form records one paid note; reopening removes it from financial totals and preserves price',
      async () => {
        await page.locator('[data-tab=subscriptions]').click();
        await page.locator('.tp-filters input[type=search]').fill('QA Expense');
        await page.getByRole('button', { name: 'Добавить расход', exact: true }).click();
        await page.locator('.tp-modal input[type=text]').first().fill('QA Expense');
        await page.getByLabel('Сумма', { exact: true }).fill('42.75');
        await page.getByLabel('Валюта · ISO-код', { exact: true }).fill('EUR');
        assert.equal(
          await page.locator('.tp-modal').getByLabel('Статус', { exact: true }).inputValue(),
          'done',
        );
        await page.locator('.tp-modal button[type=submit]').click();
        await page.waitForFunction(() => !document.querySelector('.tp-modal'));
        assert.ok((await page.locator('.tp-expense-history').textContent()).includes('42,75 EUR'));
        assert.equal(
          await page.evaluate(
            () =>
              window.tp.plugin.repo.snapshot().tasks.filter((t) => t.title === 'QA Expense').length,
          ),
          1,
        );
        await page.locator('[data-tab=statistics]').click();
        await page.locator('[data-stats-mode=finance]').click();
        assert.ok((await page.locator('.tp-finance-metrics').textContent()).includes('42,75 EUR'));
        assert.equal(
          await page.locator('.tp-finance-chart .tp-chart-point:not([data-value="0"])').count(),
          1,
        );
        assert.equal(await page.locator('.tp-expense-history').count(), 0);
        await page.locator('[data-finance-ledger]').click();
        await page
          .locator('.tp-expense-history')
          .getByRole('button', { name: 'Отменить оплату', exact: true })
          .click();
        await page.locator('[data-tab=statistics]').click();
        await page.locator('[data-stats-mode=finance]').click();
        await page.waitForFunction(() =>
          [...document.querySelectorAll('.tp-finance-chart .tp-chart-point')].every(
            (n) => n.getAttribute('data-value') === '0',
          ),
        );
        assert.equal(
          await page.evaluate(
            () =>
              window.tp.plugin.repo.snapshot().tasks.find((t) => t.title === 'QA Expense').amount,
          ),
          42.75,
        );
        await page.locator('[data-stats-mode=business]').click();
        assert.equal(await page.locator('[data-metric=tasks] strong').textContent(), '0');
      },
    );
    await check(
      'subscription charges retain history after cancellation and finance fits mobile',
      async () => {
        await page.locator('[data-tab=subscriptions]').click();
        await page.locator('.tp-filters input[type=search]').fill('QA Ledger');
        await page.getByRole('button', { name: 'Добавить подписку', exact: true }).click();
        await page.locator('.tp-modal input[type=text]').first().fill('QA Ledger');
        await page.locator('.tp-modal input[type=number]').fill('9');
        await page.getByLabel('Валюта · ISO-код', { exact: true }).fill('USD');
        await page.locator('.tp-modal .tp-date').fill('2026-10-02');
        await page.locator('.tp-modal button[type=submit]').click();
        await page.waitForFunction(() => !document.querySelector('.tp-modal'));
        await page.getByRole('button', { name: 'Отметить оплату', exact: true }).click();
        await page.locator('.tp-modal button[type=submit]').click();
        await page.waitForFunction(() => !document.querySelector('.tp-modal'));
        await page.getByRole('button', { name: 'Отменить подписку', exact: true }).click();
        await page.locator('[data-expense-mode=payments]').click();
        assert.ok((await page.locator('.tp-expense-history').textContent()).includes('9,00 USD'));
        await page.locator('[data-tab=statistics]').click();
        await page.locator('[data-stats-mode=finance]').click();
        assert.ok((await page.locator('.tp-finance-metrics').textContent()).includes('9,00 USD'));
        for (const width of [1200, 600, 320]) {
          await setViewport({ width, height: 900 });
          await page.locator('[data-period="365"]').click();
          assert.equal(await page.locator('.tp-finance-chart .tp-day-tick').count(), 12);
          assert.equal(await page.locator('.tp-finance-daily-list > div').count(), 365);
          assert.ok(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          );
          assert.equal(await page.locator('.tp-daily-scroll').count(), 0);
          assert.ok(
            await page
              .locator('.tp-fit-chart')
              .evaluateAll((ns) => ns.every((n) => n.scrollWidth <= n.clientWidth + 1)),
          );
        }
        await capture('finance-mobile.png');
        assert.equal(await page.locator('.tp-expense-history').count(), 0);
        await page.locator('[data-finance-ledger]').click();
        await page
          .locator('.tp-expense-history')
          .getByRole('button', { name: 'Отменить оплату', exact: true })
          .click();
        assert.equal(
          await page.evaluate(
            () =>
              Object.keys(
                window.tp.plugin.repo.snapshot().tasks.find((t) => t.title === 'QA Ledger').charges,
              ).length,
          ),
          0,
        );
        await page.locator('.tp-filters input[type=search]').fill('');
      },
    );
    await check('calendar hides only completed tasks and remembers the toggle', async () => {
      await setViewport({ width: 1200, height: 900 });
      await page.evaluate(async () => {
        await window.tp.plugin.service.createTask({
          title: 'QA Calendar completed',
          scheduled: '2026-10-05',
          due: '',
          project: '',
          kind: 'task',
          recurrence: '',
          minutes: 25,
          priority: 'normal',
          status: 'done',
        });
        await window.tp.plugin.service.createTask({
          title: 'QA Calendar active',
          scheduled: '2026-10-05',
          due: '',
          project: '',
          kind: 'task',
          recurrence: '',
          minutes: 0,
          priority: 'normal',
          status: 'todo',
        });
      });
      await page.locator('[data-tab=calendar]').click();
      await page.locator('.tp-filters input[type=search]').fill('QA Calendar');
      assert.ok(
        (await page.locator('.tp-calendar-grid').textContent()).includes('QA Calendar completed'),
      );
      await page.locator('[data-calendar-hide-done]').click();
      assert.equal(
        (await page.locator('.tp-calendar-grid').textContent()).includes('QA Calendar completed'),
        false,
      );
      assert.ok(
        (await page.locator('.tp-calendar-grid').textContent()).includes('QA Calendar active'),
      );
      await page.locator('[data-tab=today]').click();
      assert.equal(await page.locator('[data-calendar-hide-done]').count(), 0);
      await page.locator('[data-tab=calendar]').click();
      assert.equal(
        await page.locator('[data-calendar-hide-done]').getAttribute('aria-pressed'),
        'true',
      );
      await page.locator('[data-calendar-hide-done]').click();
      assert.ok(
        (await page.locator('.tp-calendar-grid').textContent()).includes('QA Calendar completed'),
      );
      await page.locator('.tp-filters input[type=search]').fill('');
    });
    await check(
      'calendar recurring toggle filters cards in every mode and preserves data and load',
      async () => {
        await page.evaluate(async () => {
          for (const [title, recurrence, status] of [
            ['QA Repeat filter recurring', 'FREQ=DAILY', 'todo'],
            ['QA Repeat filter once', '', 'todo'],
            ['QA Repeat filter done', '', 'done'],
          ])
            await window.tp.plugin.service.createTask({
              title,
              recurrence,
              status,
              scheduled: '2026-10-02',
              due: '',
              project: '',
              kind: 'task',
              plannedMinutes: 45,
              minutes: 0,
              priority: 'normal',
            });
          window.tp.view.calendarFocus = '2026-10-02';
          window.tp.view.month = '2026-10-01';
        });
        const notes = await page.evaluate(() => JSON.stringify(window.tp.plugin.repo.snapshot()));
        await page.locator('[data-tab=calendar]').click();
        await page.locator('.tp-filters input[type=search]').fill('QA Repeat filter');
        await page.locator('[data-calendar-view=day]').click();
        const load = await page.locator('.tp-workload-panel').textContent();
        const toggle = page.locator('[data-calendar-hide-recurring]');
        await toggle.focus();
        await page.keyboard.press('Space');
        assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
        assert.ok(await toggle.evaluate((n) => n === document.activeElement));
        assert.equal(await page.locator('.tp-workload-panel').textContent(), load);
        for (const mode of ['day', 'week', 'month']) {
          await page.locator(`[data-calendar-view=${mode}]`).click();
          assert.equal(
            await page
              .locator('.tp-task-title')
              .filter({ hasText: 'QA Repeat filter recurring' })
              .count(),
            0,
          );
          assert.equal(
            await page
              .locator('.tp-task-title')
              .filter({ hasText: 'QA Repeat filter once' })
              .count(),
            1,
          );
          assert.equal(
            await page
              .locator('.tp-task-title')
              .filter({ hasText: 'QA Repeat filter done' })
              .count(),
            1,
          );
        }
        await page.locator('[data-calendar-hide-done]').click();
        assert.equal(
          await page.locator('.tp-task-title').filter({ hasText: 'QA Repeat filter done' }).count(),
          0,
        );
        await page.locator('[data-tab=today]').click();
        assert.equal(await toggle.count(), 0);
        assert.equal(
          await page
            .locator('.tp-task-title')
            .filter({ hasText: 'QA Repeat filter recurring' })
            .count(),
          1,
        );
        await page.locator('[data-tab=calendar]').click();
        await page.evaluate(() => window.tp.view.rebuild());
        assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
        await toggle.click();
        assert.ok(
          (await page
            .locator('.tp-task-title')
            .filter({ hasText: 'QA Repeat filter recurring' })
            .count()) > 1,
        );
        assert.equal(
          await page.locator('.tp-task-title').filter({ hasText: 'QA Repeat filter done' }).count(),
          0,
        );
        await page.locator('[data-calendar-hide-done]').click();
        assert.equal(
          await page.evaluate(() => JSON.stringify(window.tp.plugin.repo.snapshot())),
          notes,
        );
        await page.locator('.tp-filters input[type=search]').fill('');
      },
    );
    await check(
      'calendar visibility toggles keep stable dimensions across labels, languages, themes and widths',
      async () => {
        for (const language of ['ru', 'en'])
          for (const light of [false, true]) {
            await page.evaluate(
              ({ language, light }) => {
                window.tp.plugin.settings.language = language;
                document.body.classList.toggle('theme-light', light);
                window.tp.view.rebuild();
              },
              { language, light },
            );
            await page.locator('[data-tab=calendar]').click();
            for (const width of [1440, 320]) {
              await setViewport({ width, height: 1000 });
              for (const selector of [
                '[data-calendar-hide-done]',
                '[data-calendar-hide-recurring]',
              ]) {
                const toggle = page.locator(selector);
                const before = await toggle.boundingBox();
                await toggle.click();
                const after = await toggle.boundingBox();
                assert.ok(
                  Math.abs(before.width - after.width) < 1 &&
                    Math.abs(before.height - after.height) < 1,
                );
                assert.ok(
                  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
                );
                await toggle.click();
              }
            }
          }
        await setViewport({ width: 1440, height: 1000 });
        await page.evaluate(() => {
          window.tp.plugin.settings.language = 'ru';
          document.body.classList.remove('theme-light');
          window.tp.view.rebuild();
        });
      },
    );
    await check('late completion retains planned September reporting day', async () => {
      await page.evaluate(async () => {
        await window.tp.plugin.service.createTask({
          title: 'QA Late September',
          scheduled: '2026-09-29',
          due: '',
          project: '',
          kind: 'task',
          recurrence: '',
          minutes: 25,
          priority: 'normal',
          status: 'todo',
        });
        const task = window.tp.plugin.repo
          .snapshot()
          .tasks.find((t) => t.title === 'QA Late September');
        await window.tp.plugin.service.status(
          {
            task,
            key: '2026-09-29',
            date: '2026-09-29',
            end: '2026-09-29',
            status: 'todo',
            minutes: 25,
            recurring: false,
          },
          'done',
        );
      });
      await page.locator('.tp-filters input[type=search]').fill('QA Late September');
      await page.locator('[data-tab=statistics]').click();
      await page.locator('[data-stats-mode=business]').click();
      await page.locator('[data-period="30"]').click();
      assert.equal(
        await page.locator('.tp-activity-chart .tp-chart-point:not([data-value="0"])').count(),
        0,
      );
      await page.locator('[data-period="365"]').click();
      assert.equal(
        await page.locator('.tp-activity-chart .tp-chart-point:not([data-value="0"])').count(),
        1,
      );
      await page.locator('.tp-filters input[type=search]').fill('');
    });
    await check(
      'all twenty quarterly tasks and eighteen daily tasks are visible without disclosure buttons',
      async () => {
        await setViewport({ width: 1440, height: 1000 });
        await page.evaluate(async () => {
          window.tp.plugin.settings.language = 'ru';
          for (let i = 0; i < 20; i++)
            await window.tp.plugin.service.createTask({
              title: `QA Compact Long ${i}`,
              scheduled: '2026-10-01',
              due: '2026-12-31',
              project: '',
              kind: 'task',
              recurrence: '',
              minutes: 0,
              priority: i === 0 ? 'high' : 'normal',
              status: 'todo',
            });
          for (let i = 0; i < 18; i++)
            await window.tp.plugin.service.createTask({
              title: `QA Compact Day ${i}`,
              scheduled: '2026-10-02',
              due: '',
              project: '',
              kind: 'task',
              recurrence: '',
              minutes: 0,
              priority: 'normal',
              status: 'todo',
            });
          window.tp.view.month = '2026-10-01';
          window.tp.view.rebuild();
        });
        await page.locator('.tp-filters input[type=search]').fill('QA Compact');
        await page.locator('[data-tab=calendar]').click();
        assert.equal(
          await page
            .locator(
              '.tp-calendar-week,.tp-calendar-ranges,.tp-range-band,.tp-show-more,[data-range-more]',
            )
            .count(),
          0,
        );
        assert.equal(await page.locator('.tp-calendar-long-task').count(), 0);
        const cell = page.locator('[data-day="2026-10-02"]');
        assert.equal(await cell.locator('.tp-task:not(.tp-calendar-long-task)').count(), 18);
        assert.equal(await cell.locator('.tp-calendar-long-task').count(), 0);
        assert.equal(await cell.locator('.tp-task').count(), 18);
        assert.equal(await page.locator('[data-day="2026-10-01"] .tp-task').count(), 20);
        assert.equal(await page.locator('[data-day="2026-10-03"] .tp-task').count(), 0);
        await cell.locator('.tp-task:not(.tp-calendar-long-task) .tp-check').first().click();
        await page.waitForFunction(
          () => document.querySelectorAll('[data-day="2026-10-02"] .tp-done').length === 1,
        );
        assert.equal(await cell.locator('.tp-task').count(), 18);
        await page.locator('[data-calendar-hide-done]').click();
        assert.equal(await cell.locator('.tp-task').count(), 17);
        await page.locator('[data-calendar-hide-done]').click();
        assert.equal(await cell.locator('.tp-task').count(), 18);
        for (const width of [600, 320]) {
          await setViewport({ width, height: 900 });
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          assert.equal(await page.locator('.tp-calendar-long-task').count(), 0);
          assert.equal(await page.locator('.tp-show-more,[data-range-more]').count(), 0);
        }
      },
    );
    await check(
      'full calendar titles and area/project labels wrap visibly without clipping',
      async () => {
        await setViewport({ width: 1440, height: 1000 });
        await page.evaluate(async () => {
          const area = await window.tp.plugin.service.createNote('area', 'Armenia', {});
          const project = await window.tp.plugin.service.createNote(
            'project',
            'Driving School and Practical Training',
            { area: area.path },
          );
          for (const due of ['', '2026-12-31'])
            await window.tp.plugin.service.createTask({
              title:
                'QA Readable Prepare for the practical driving test and complete every required exercise',
              scheduled: '2026-10-06',
              due,
              project: project.path,
              kind: 'meeting',
              recurrence: '',
              minutes: 0,
              priority: 'high',
              status: 'todo',
            });
        });
        await page.locator('.tp-filters input[type=search]').fill('QA Readable');
        for (const width of [1440, 600, 320]) {
          await setViewport({ width, height: 1000 });
          const cell = page.locator('[data-day="2026-10-06"]');
          assert.equal(await cell.locator('.tp-task').count(), 2);
          const labels = await cell.locator('.tp-task-title,.tp-project-label').evaluateAll((ns) =>
            ns.map((n) => ({
              text: n.textContent,
              whiteSpace: getComputedStyle(n).whiteSpace,
              overflow: getComputedStyle(n).overflow,
              fits: n.scrollHeight <= n.clientHeight + 1 && n.scrollWidth <= n.clientWidth + 1,
            })),
          );
          assert.equal(labels.length, 4);
          assert.ok(
            labels.every((n) => n.whiteSpace === 'normal' && n.overflow === 'visible' && n.fits),
            JSON.stringify(labels),
          );
          assert.ok(
            labels.filter((n) => n.text.includes('Armenia / Driving School and Practical Training'))
              .length === 2,
          );
          assert.equal(await cell.locator('.tp-deadline-label').count(), 1);

          assert.equal(await page.locator('.tp-range-band,.tp-calendar-ranges').count(), 0);
        }
        await setViewport({ width: 1440, height: 1000 });
        await page.locator('.tp-day .tp-task-title').first().click();
        assert.equal(await page.locator('.tp-modal form').count(), 1);
        await page.keyboard.press('Escape');
      },
    );
    await check('dragging a work session preserves the deadline', async () => {
      await setViewport({ width: 1440, height: 1000 });
      await page.locator('.tp-filters input[type=search]').fill('QA Compact Long 0');
      const source = page.locator('.tp-task').first();
      const path = await source.getAttribute('data-path');
      await source.scrollIntoViewIfNeeded();
      const box = await source.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + 12);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 12, box.y + 12, { steps: 6 });
      const target = page.locator('[data-day="2026-10-12"]');
      await target.scrollIntoViewIfNeeded();
      const t = await target.boundingBox();
      await page.mouse.move(t.x + t.width / 2, t.y + 30, { steps: 20 });
      await page.mouse.up();
      await page.waitForFunction(
        (path) =>
          window.tp.plugin.repo.snapshot().tasks.find((t) => t.path === path)?.scheduled ===
          '2026-10-12',
        path,
      );
      assert.equal(
        await page.evaluate(
          (path) => window.tp.plugin.repo.snapshot().tasks.find((t) => t.path === path).due,
          path,
        ),
        '2026-12-31',
      );
      assert.equal(await page.locator('.tp-day > .tp-task:not(.tp-calendar-long-task)').count(), 1);
      assert.equal(await page.locator('.tp-calendar-long-task').count(), 0);
      await page.locator('.tp-filters input[type=search]').fill('');
    });
    await check(
      'day and week views show selected work sessions and exact planned minutes',
      async () => {
        await setViewport({ width: 1440, height: 1000 });
        await page.evaluate(async () => {
          await window.tp.plugin.service.createTask({
            title: 'QA New Planning',
            scheduled: '2026-10-02',
            workDates: ['2026-10-06', '2026-10-07'],
            due: '2026-10-30',
            plannedMinutes: 91,
            project: '',
            kind: 'task',
            recurrence: '',
            minutes: 11,
            priority: 'normal',
            status: 'todo',
          });
          window.tp.view.calendarFocus = '2026-10-02';
          window.tp.view.month = '2026-10-01';
          window.tp.view.calendarView = 'month';
          window.tp.view.rebuild();
        });
        await page.locator('.tp-filters input[type=search]').fill('QA New Planning');
        await page.locator('[data-tab=calendar]').click();
        assert.equal(await page.locator('.tp-day .tp-task').count(), 4);
        assert.equal(await page.locator('[data-day="2026-10-03"] .tp-task').count(), 0);
        await page.locator('[data-calendar-view=week]').click();
        assert.equal(await page.locator('.tp-day').count(), 7);
        await page.locator('[data-calendar-view=day]').click();
        assert.equal(await page.locator('.tp-day').count(), 1);
        assert.equal(await page.locator('.tp-day-load').count(), 0);
        assert.equal(
          await page.locator('.tp-workload-panel').getAttribute('data-planned-minutes'),
          '31',
        );
        assert.match(
          await page.locator('.tp-workload-panel').textContent(),
          /Доступно на день: 8 ч/,
        );
        const agenda = await page.locator('.tp-calendar-day-view').boundingBox();
        assert.ok(agenda.width <= 881);
        const card = await page.locator('.tp-task').boundingBox();
        assert.ok(card.height < 90, 'Day cards should fit a compact row');
        const action = await page.locator('.tp-task-actions').boundingBox();
        const body = await page.locator('.tp-task-body').boundingBox();
        assert.ok(action.x >= body.x + body.width - 1, 'Day actions belong alongside task text');
        await page.locator('.tp-task-title').click();
        assert.equal(await page.locator('[data-field=plannedMinutes]').inputValue(), '91');
        assert.equal(await page.locator('[data-field=minutes]').inputValue(), '11');
        await page.locator('[data-field=plannedMinutes]').fill('120');
        assert.equal(await page.locator('[data-field=workDate], .tp-work-dates').count(), 0);
        await page.locator('.tp-modal form').evaluate((f) => f.requestSubmit());
        await page.waitForFunction(
          () =>
            window.tp.plugin.repo.snapshot().tasks.find((t) => t.title === 'QA New Planning')
              ?.plannedMinutes === 120,
        );
        assert.deepEqual(
          await page.evaluate(
            () =>
              window.tp.plugin.repo.snapshot().tasks.find((t) => t.title === 'QA New Planning')
                .workDates,
          ),
          ['2026-10-06', '2026-10-07'],
        );
        assert.equal(
          await page.locator('.tp-workload-panel').getAttribute('data-planned-minutes'),
          '40',
        );
        for (const width of [600, 320]) {
          await setViewport({ width, height: 900 });
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          assert.ok(
            await page
              .locator('.tp-calendar-day-view')
              .evaluate((n) => n.scrollWidth <= n.clientWidth),
          );
        }
        await setViewport({ width: 1440, height: 1000 });
        await page.locator('[data-calendar-view=month]').click();
      },
    );
    await check(
      'budgets report project and department limits without currency conversion or duplicate paid records',
      async () => {
        await page.evaluate(async () => {
          const a = await window.tp.plugin.service.createNote('area', 'QA Budget Department', {
            monthlyBudget: 1000,
            budgetCurrency: 'USD',
          });
          const p = await window.tp.plugin.service.createNote('project', 'QA Budget Project', {
            area: a.path,
            monthlyBudget: 100,
            budgetCurrency: 'USD',
          });
          window.tp.budgetProject = p.path;
          await window.tp.plugin.service.createTask({
            title: 'QA Budget Paid',
            scheduled: '2026-10-02',
            due: '',
            project: p.path,
            kind: 'payment',
            amount: 30,
            currency: 'USD',
            status: 'done',
            recurrence: '',
            minutes: 0,
            priority: 'normal',
          });
          await window.tp.plugin.service.createTask({
            title: 'QA Budget Future',
            scheduled: '2026-10-10',
            due: '',
            project: p.path,
            kind: 'payment',
            amount: 50,
            currency: 'USD',
            status: 'todo',
            recurrence: '',
            minutes: 0,
            priority: 'normal',
          });
        });
        await page.locator('.tp-filters input[type=search]').fill('QA Budget');
        await page.locator('[data-tab=statistics]').click();
        await page.locator('[data-stats-mode=finance]').click();
        await page.locator('[data-period="30"]').click();
        assert.equal(await page.locator('.tp-budget-card').count(), 2);
        const path = await page.evaluate(() => window.tp.budgetProject);
        assert.match(
          await page.locator(`.tp-budget-card[data-path="${path}"]`).textContent(),
          /70,00 USD/,
        );
        assert.match(
          await page.locator(`.tp-budget-card[data-path="${path}"]`).textContent(),
          /20,00 USD/,
        );
        await page.locator('[data-budget-configure]').selectOption('project:' + path);
        await page.locator('[data-field=monthlyBudget]').fill('200');
        await page.locator('.tp-modal form').evaluate((f) => f.requestSubmit());
        await page.waitForFunction(
          (path) =>
            window.tp.plugin.repo.snapshot().projects.find((p) => p.path === path)
              ?.monthlyBudget === 200,
          path,
        );
        for (const width of [1440, 390, 320]) {
          await setViewport({ width, height: 900 });
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        }
        await setViewport({ width: 1440, height: 1000 });
        await page.locator('.tp-filters input[type=search]').fill('');
      },
    );
    await check(
      'capture options reduce idle controls and retain edited values in both languages',
      async () => {
        await page.locator('[data-tab=today]').click();
        for (const language of ['ru', 'en']) {
          await page.evaluate((language) => {
            window.tp.plugin.settings.language = language;
            window.tp.view.rebuild();
          }, language);
          const toggle = page.locator('[data-quick-options]');
          const options = page.locator('.tp-quick-options');
          assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
          assert.equal(await options.isVisible(), false);
          assert.equal(await page.locator('.tp-quick .tp-date').isVisible(), true);
          assert.ok(
            await page
              .locator('.tp-filters')
              .evaluate((n) => n.nextElementSibling.matches('.tp-quick')),
          );
          await toggle.focus();
          await page.keyboard.press('Enter');
          assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
          const time = page.locator('.tp-quick .tp-time');
          await time.fill('13:25');
          await page
            .locator(
              '.tp-quick select[aria-label="' + (language === 'ru' ? 'Статус' : 'Status') + '"]',
            )
            .selectOption('in-progress');
          const before = await toggle.boundingBox();
          await toggle.click();
          const after = await toggle.boundingBox();
          assert.equal(before.width, after.width);
          assert.equal(before.height, after.height);
          await toggle.click();
          assert.equal(await time.inputValue(), '13:25');
          for (const width of [1440, 750, 390, 320]) {
            await setViewport({ width, height: 1000 });
            assert.ok(
              await page.locator('.tp-quick').evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
            );
            assert.ok(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            );
          }
          await time.fill('');
        }
        await setViewport({ width: 1440, height: 1000 });
        await page.evaluate(() => {
          window.tp.plugin.settings.language = 'ru';
          window.tp.view.rebuild();
        });
      },
    );
    await check(
      'reference calendar uses a square frame, context-first cards and shared mono typography',
      async () => {
        await setViewport({ width: 1440, height: 1000 });
        await page.locator('[data-tab=calendar]').click();
        await page.locator('[data-calendar-view=month]').click();
        const frame = page.locator('.tp-calendar-surface');
        assert.equal(await frame.locator('.tp-calendar-toolbar').count(), 1);
        assert.equal(await frame.locator('.tp-calendar-grid').count(), 1);
        assert.equal(await frame.evaluate((n) => getComputedStyle(n).borderRadius), '0px');
        const card = page.locator('.tp-day .tp-task:has(.tp-task-context)').first();
        assert.ok(
          await card.evaluate((n) => {
            const context = n.querySelector('.tp-task-context').getBoundingClientRect();
            const title = n.querySelector('.tp-task-heading').getBoundingClientRect();
            const style = getComputedStyle(n);
            return (
              context.bottom <= title.top + 1 &&
              style.borderRadius === '0px' &&
              style.borderInlineStartWidth === '2px'
            );
          }),
        );
        const font = await page
          .locator('.tp-shell')
          .evaluate((n) => getComputedStyle(n).fontFamily);
        assert.ok(font.includes('monospace'));
        assert.equal(
          await card.locator('.tp-task-title').evaluate((n) => getComputedStyle(n).fontFamily),
          font,
        );
        for (const width of [1440, 750, 390, 320]) {
          await setViewport({ width, height: 1000 });
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          assert.ok(await frame.evaluate((n) => n.getBoundingClientRect().right <= innerWidth + 1));
        }
        await setViewport({ width: 1440, height: 1000 });
        for (const tab of ['today', 'kanban', 'statistics', 'subscriptions', 'manualTab']) {
          await page.locator('[data-tab=' + tab + ']').click();
          assert.equal(
            await page.locator('.tp-header h1').evaluate((n) => getComputedStyle(n).fontFamily),
            font,
          );
        }
        await page.locator('[data-tab=today]').click();
        await page.locator('.tp-header .mod-cta').click();
        assert.equal(
          await page
            .locator('.tp-modal input')
            .first()
            .evaluate((n) => getComputedStyle(n).fontFamily),
          font,
        );
        await page.keyboard.press('Escape');
        await page.locator('[data-tab=calendar]').click();
      },
    );
    await check(
      'menu collapse is keyboard accessible, preserves drafts and expands space at every width',
      async () => {
        const settings = await page.evaluate(() => JSON.stringify(window.tp.plugin.settings));
        try {
          // Exercise delayed responsive updates, as on a busy CI runner.
          await page.evaluate(() => {
            window.tpResizeDelay = 100;
          });
          for (const language of ['ru', 'en']) {
            await page.evaluate((language) => {
              window.tp.plugin.settings.language = language;
              window.tp.view.rebuild();
            }, language);
            await page.locator('[data-tab=today]').click();
            const title = page.locator('.tp-quick > input[type=text]');
            await title.fill('Sidebar draft');
            for (const width of [1440, 750, 390, 320]) {
              await setViewport({ width, height: 1000 });
              const toggle = page.locator('[data-menu-toggle]');
              const contentBefore = await page.locator('.tp-content').boundingBox();
              const buttonBefore = await toggle.boundingBox();
              await toggle.focus();
              await page.keyboard.press('Enter');
              assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
              assert.equal(
                await toggle.getAttribute('aria-label'),
                language === 'ru' ? 'Развернуть меню' : 'Expand menu',
              );
              assert.equal(await page.locator('.tp-nav').isVisible(), false);
              assert.equal(await page.locator('[data-menu-toggle]').count(), 1);
              assert.equal(await toggle.locator('svg').count(), 1);
              assert.equal(await toggle.locator('xpath=ancestor::aside').count(), 1);
              assert.equal(await title.inputValue(), 'Sidebar draft');
              const contentAfter = await page.locator('.tp-content').boundingBox();
              const buttonAfter = await toggle.boundingBox();
              assert.equal(buttonBefore.width, buttonAfter.width);
              assert.equal(buttonBefore.height, buttonAfter.height);
              assert.ok(
                width > 600
                  ? contentAfter.width > contentBefore.width
                  : contentAfter.height > contentBefore.height,
              );
              assert.ok(await toggle.evaluate((n) => n === document.activeElement));
              assert.ok(
                await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
              );
              await page.evaluate(() => window.tp.view.rebuild());
              assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
              await toggle.click();
            }
            await title.fill('');
            await page.locator('[data-tab=manualTab]').click();
            const toggle = page.locator('[data-menu-toggle]');
            await toggle.click();
            assert.equal(await toggle.isVisible(), true);
            await toggle.click();
          }
        } finally {
          const toggle = page.locator('[data-menu-toggle]');
          if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
          await page.evaluate((settings) => {
            Object.assign(window.tp.plugin.settings, JSON.parse(settings));
            window.tp.view.rebuild();
            window.tpResizeDelay = 0;
          }, settings);
          await setViewport({ width: 1440, height: 1000 });
        }
        await page.locator('[data-tab=calendar]').click();
      },
    );
    await check(
      'muted dark-theme fixture gains brighter statuses, context and grid while light colors stay legible',
      async () => {
        await page.locator('[data-tab=calendar]').click();
        try {
          await page.evaluate(() => {
            document.body.classList.add('theme-dark');
            const style = document.documentElement.style;
            for (const [key, value] of Object.entries({
              '--background-primary': '#161616',
              '--background-secondary': '#1d1d1d',
              '--text-normal': '#bdbdbd',
              '--text-muted': '#626262',
              '--background-modifier-border': '#292929',
              '--interactive-accent': '#569f89',
            }))
              style.setProperty(key, value);
          });
          const colors = await page.locator('.tp-host').evaluate((n) => {
            const rgb = (value) => {
              const canvas = document.createElement('canvas');
              canvas.width = canvas.height = 1;
              const ctx = canvas.getContext('2d');
              ctx.fillStyle = value;
              ctx.fillRect(0, 0, 1, 1);
              return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
            };
            const style = getComputedStyle(n);
            return {
              done: style.getPropertyValue('--tp-status-done').trim(),
              failed: style.getPropertyValue('--tp-status-failed').trim(),
              context: rgb(getComputedStyle(n.querySelector('.tp-task-context')).color),
              muted: rgb(style.getPropertyValue('--text-muted')),
              line: rgb(getComputedStyle(n.querySelector('.tp-calendar-surface')).borderTopColor),
              border: rgb(style.getPropertyValue('--background-modifier-border')),
              accent: getComputedStyle(n.querySelector('.tp-header .mod-cta')).backgroundColor,
            };
          });
          assert.equal(colors.done, '#40e79b');
          assert.equal(colors.failed, '#ff6582');
          assert.ok(colors.context.every((v, i) => v > colors.muted[i]));
          assert.ok(colors.line.every((v, i) => v > colors.border[i]));
          assert.equal(colors.accent, 'rgb(86, 159, 137)');
          await page.evaluate(() => {
            document.body.classList.remove('theme-dark');
            document.body.classList.add('theme-light');
          });
          const light = await page.locator('.tp-host').evaluate((n) => ({
            done: getComputedStyle(n).getPropertyValue('--tp-status-done').trim(),
            failed: getComputedStyle(n).getPropertyValue('--tp-status-failed').trim(),
          }));
          assert.equal(light.done, '#14865b');
          assert.equal(light.failed, '#cf3652');
        } finally {
          await page.evaluate(() => {
            document.documentElement.removeAttribute('style');
            document.body.classList.remove('theme-dark', 'theme-light');
          });
        }
      },
    );

    await check(
      'description document icon has no text/button and the task title opens its form',
      async () => {
        await setViewport({ width: 1200, height: 900 });
        await page.locator('[data-tab=calendar]').click();
        await page.evaluate(async () => {
          const { app } = window.tp,
            { stringifyYaml } = window.require('obsidian');
          await app.vault.create(
            'Appearance-review.md',
            '---\n' +
              stringifyYaml({
                topSchema: 1,
                type: 'task',
                title: 'Task with estimate and description',
                description: 'Example detail',
                scheduled: '2026-10-02',
                plannedMinutes: 180,
                actualMinutes: 45,
                taskType: 'meeting',
                priority: 'high',
              }) +
              '---\n',
          );
          await window.tp.plugin.repo.load();
        });
        for (const language of ['ru', 'en']) {
          await page.evaluate((language) => {
            window.tp.plugin.settings.language = language;
            window.tp.view.rebuild();
          }, language);
          const reviewed = page.locator('.tp-task[data-path="Appearance-review.md"]').first();
          const marker = reviewed.locator('.tp-description-icon');
          if (!(await marker.count())) {
            await page.evaluate(async () => {
              const { app } = window.tp,
                { stringifyYaml } = window.require('obsidian');
              await app.vault.create(
                'Description-review.md',
                '---\n' +
                  stringifyYaml({
                    topSchema: 1,
                    type: 'task',
                    title: 'Description review',
                    description: '<img src=x onerror=alert(1)>',
                    scheduled: '2026-10-02',
                  }) +
                  '---\n',
              );
              await window.tp.plugin.repo.load();
            });
          }
          assert.equal(await marker.locator('xpath=..').getAttribute('class'), 'tp-task-heading');
          assert.equal(
            await reviewed.locator('.tp-planned-minutes').textContent(),
            language === 'ru' ? 'Оценка: 3 ч' : 'Estimate: 3 h',
          );
          assert.equal(await reviewed.locator('.tp-task-heading .tp-kind-badge').count(), 1);
          assert.equal(await reviewed.locator('.tp-task-heading .tp-priority').count(), 1);
          assert.ok(!(await reviewed.textContent()).includes('План, мин'));
          assert.equal(await marker.textContent(), '');
          assert.equal(
            await marker.getAttribute('title'),
            language === 'ru' ? 'Описание' : 'Description',
          );
          assert.equal(
            await marker.getAttribute('aria-label'),
            language === 'ru' ? 'Описание' : 'Description',
          );
          assert.equal(await marker.evaluate((n) => n.tagName), 'SPAN');
          assert.equal(await page.locator('.tp-description-button').count(), 0);
          const size = await marker.locator('svg').boundingBox();
          assert.equal(size.width, 20);
          assert.equal(size.height, 20);
          await marker
            .locator('xpath=ancestor::*[contains(concat(" ", @class, " "), " tp-task ")]')
            .locator('.tp-task-title')
            .focus();
          await page.keyboard.press('Enter');
          assert.ok(await page.locator('.tp-modal textarea.tp-description').isVisible());
          assert.equal(await page.locator('.tp-modal img').count(), 0);
          await page.keyboard.press('Escape');
        }
        await page.evaluate(() => {
          window.tp.plugin.settings.language = 'ru';
          window.tp.view.rebuild();
        });
      },
    );
    await check(
      'line statistics share one time axis per chart and aligned totals at every pane width',
      async () => {
        await page.locator('[data-tab=statistics]').click();
        await page.locator('[data-stats-mode=business]').click();
        for (const language of ['ru', 'en']) {
          await page.evaluate((language) => {
            window.tp.plugin.settings.language = language;
            window.tp.view.rebuild();
          }, language);
          for (const width of [1440, 750, 390, 320]) {
            await setViewport({ width, height: 1000 });
            for (const period of [7, 30, 90, 365]) {
              await page.locator(`[data-period="${period}"]`).click();
              assert.equal(await page.locator('.tp-activity-chart').count(), 1);
              assert.equal(await page.locator('.tp-time-chart').count(), 1);
              assert.equal(await page.locator('.tp-activity-chart path.tp-chart-line').count(), 2);
              assert.equal(await page.locator('.tp-time-chart path.tp-chart-line').count(), 1);
              assert.equal(await page.locator('.tp-activity-totals > div > dt').count(), 3);
              assert.equal(await page.locator('.tp-activity-totals > div > dd').count(), 3);
              const expected = period === 7 ? 7 : period === 30 ? 31 : period === 90 ? 14 : 12;
              assert.equal(
                await page.locator('.tp-activity-chart .tp-chart-point').count(),
                expected * 2,
              );
              assert.equal(await page.locator('.tp-time-chart .tp-chart-point').count(), expected);
              assert.equal(await page.locator('.tp-activity-chart text[transform]').count(), 0);
              assert.ok(
                await page
                  .locator('.tp-fit-chart')
                  .evaluateAll((ns) => ns.every((n) => n.scrollWidth <= n.clientWidth + 1)),
                `containment ${language} ${width} ${period}`,
              );
              assert.ok(
                await page
                  .locator('.tp-activity-total')
                  .evaluateAll((ns) => ns.every((n) => n.scrollWidth <= n.clientWidth + 1)),
                `containment ${language} ${width} ${period}`,
              );
              assert.ok(
                await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
                `document ${language} ${width} ${period}`,
              );
              assert.ok(
                await page
                  .locator('.tp-workflow-panel')
                  .evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
                `workflow ${language} ${width}`,
              );
            }
          }
        }
        await setViewport({ width: 1440, height: 1000 });
        // Let the resize observer rebuild the charts before checking keyboard focus.
        await page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        );
        await page.locator('.tp-activity-chart .tp-chart-point').first().focus();
        assert.ok(
          await page
            .locator('.tp-activity-chart .tp-chart-point')
            .first()
            .evaluate((n) => n === document.activeElement && !!n.getAttribute('aria-label')),
        );
        await page.evaluate(() => {
          window.tp.plugin.settings.language = 'ru';
          window.tp.view.rebuild();
        });
      },
    );
    await check(
      'finance lines cover current calendar periods and expense sections stay coherent in both languages',
      async () => {
        await page.evaluate(async () => {
          for (const [title, amount, currency, paidOn] of [
            ['Finance quality USD', 20.05, 'USD', '2026-10-02'],
            ['Finance quality EUR', 14.5, 'EUR', '2026-10-02'],
            ['Finance quality AMD', 100000, 'AMD', '2026-10-02'],
            ['Finance quality free', 0, 'JPY', '2026-10-02'],
            ['Finance quality old', 500, 'USD', '2025-12-31'],
          ])
            await window.tp.plugin.service.createTask({
              title,
              amount,
              currency,
              paidOn,
              kind: 'payment',
              scheduled: '2026-10-02',
              due: '',
              project: '',
              recurrence: '',
              minutes: 0,
              priority: 'normal',
              status: 'done',
            });
        });
        try {
          await page.locator('[data-tab=statistics]').click();
          await page.locator('.tp-filters input[type=search]').fill('Finance quality');
          const ranges = {
            7: ['2026-09-28', '2026-10-04'],
            30: ['2026-10-01', '2026-10-31'],
            90: ['2026-10-01', '2026-12-31'],
            365: ['2026-01-01', '2026-12-31'],
          };
          for (const language of ['ru', 'en']) {
            await page.evaluate((language) => {
              window.tp.plugin.settings.language = language;
              window.tp.view.rebuild();
            }, language);
            await page.locator('[data-stats-mode=finance]').click();
            for (const width of [1440, 750, 390, 320]) {
              await setViewport({ width, height: 900 });
              for (const period of [7, 30, 90, 365]) {
                await page.locator(`[data-period="${period}"]`).click();
                for (const [currency, expected] of [
                  ['USD', 20.05],
                  ['EUR', 14.5],
                  ['AMD', 100000],
                  ['JPY', 0],
                ]) {
                  const lane = page.locator(`.tp-finance-currency[data-currency="${currency}"]`);
                  assert.equal(await page.locator('.tp-finance-chart').count(), 4);
                  assert.ok(
                    await lane.evaluate(
                      (n) =>
                        Math.abs(n.querySelector('svg').viewBox.baseVal.width - n.clientWidth) <= 1,
                    ),
                    'Each chart must be measured in its final grid column',
                  );

                  assert.equal(
                    await page.locator('.tp-finance-activity [data-finance-currency]').count(),
                    0,
                  );
                  if (currency === 'JPY')
                    assert.ok(
                      !(await page.locator('.tp-finance-activity').textContent()).includes(
                        language === 'ru'
                          ? 'Нет оплаченных расходов за этот период.'
                          : 'No spending recorded in this period.',
                      ),
                    );
                  assert.equal(
                    await lane.locator('.tp-finance-chart path.tp-chart-line').count(),
                    1,
                  );
                  assert.equal(await lane.locator('.tp-finance-chart rect').count(), 0);
                  const points = await lane
                    .locator('.tp-finance-chart .tp-chart-point')
                    .evaluateAll((ns) =>
                      ns.map((n) => ({
                        from: n.dataset.date,
                        to: n.dataset.through,
                        value: Number(n.dataset.value),
                        cy: Number(n.getAttribute('cy')),
                        label: n.getAttribute('aria-label'),
                        tabindex: n.getAttribute('tabindex'),
                      })),
                    );
                  assert.equal(
                    points.length,
                    period === 7 ? 7 : period === 30 ? 31 : period === 90 ? 14 : 12,
                  );
                  assert.equal(points[0].from, ranges[period][0]);
                  assert.equal(points.at(-1).to, ranges[period][1]);
                  assert.ok(
                    Math.abs(points.reduce((sum, n) => sum + n.value, 0) - expected) < 1e-6,
                  );
                  assert.ok(points.every((n) => n.label.includes(currency) && n.tabindex === '0'));
                  if (expected > 0) assert.equal(Math.min(...points.map((n) => n.cy)), 20);
                  assert.ok(
                    await lane
                      .locator('.tp-chart-label:not(.tp-day-tick)')
                      .evaluateAll((ns) => ns.every((n) => n.getBBox().x >= 0)),
                    'Money-axis labels must remain inside their chart',
                  );
                  assert.equal(
                    await page
                      .locator(`.tp-finance-daily-values [data-currency="${currency}"]`)
                      .count(),
                    period === 7 ? 7 : period === 30 ? 31 : period === 90 ? 92 : 365,
                  );

                  assert.equal(
                    await page.locator('.tp-finance-daily-list > div').count(),
                    period === 7 ? 7 : period === 30 ? 31 : period === 90 ? 92 : 365,
                  );
                  assert.ok(
                    await page
                      .locator('.tp-fit-chart')
                      .evaluateAll((ns) => ns.every((n) => n.scrollWidth <= n.clientWidth + 1)),
                  );
                  assert.ok(
                    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
                  );
                }
                await page.locator('.tp-finance-daily summary').click();
                assert.ok(
                  await page
                    .locator('.tp-finance-daily-list > div')
                    .evaluateAll((ns) => ns.every((n) => n.scrollWidth <= n.clientWidth + 1)),
                );
                assert.ok(
                  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
                );
                await page.locator('.tp-finance-daily summary').click();
              }
            }
            await page.locator('[data-stats-mode=business]').click();
            assert.equal(
              await page.locator('[data-period="365"]').getAttribute('aria-pressed'),
              'true',
            );
            assert.ok(
              (await page.locator('.tp-stats-overview').textContent()).includes(
                language === 'ru' ? 'За всё время' : 'All time',
              ),
            );
            await page.locator('[data-stats-mode=finance]').click();
            await page.locator('[data-finance-ledger]').click();
            assert.equal(
              await page.locator('[data-expense-mode=payments]').getAttribute('aria-pressed'),
              'true',
            );
            assert.equal(
              await page.locator('[data-period="365"]').getAttribute('aria-pressed'),
              'true',
            );
            assert.equal(await page.locator('.tp-expense-ledger').count(), 1);
            assert.equal(await page.locator('.tp-subscription-summary').count(), 0);
            for (const width of [1440, 390, 320]) {
              await setViewport({ width, height: 900 });
              assert.ok(
                await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
              );
              assert.ok(
                await page
                  .locator('.tp-expense-ledger > section')
                  .evaluateAll((ns) => ns.every((n) => n.scrollWidth <= n.clientWidth + 1)),
              );
            }
            await page.locator('[data-expense-mode=subscriptions]').focus();
            await page.keyboard.press('Enter');
            assert.equal(await page.locator('.tp-expense-history').count(), 0);
            assert.equal(await page.locator('.tp-finance-plan').count(), 0);
            assert.equal(await page.locator('.tp-periods').count(), 0);
            assert.equal(await page.locator('.tp-subscription-summary').count(), 1);
            await page.locator('[data-expense-mode=payments]').click();
            await page.locator('[data-expenses-analytics]').click();
            assert.equal(
              await page.locator('[data-period="365"]').getAttribute('aria-pressed'),
              'true',
            );
          }
        } finally {
          await setViewport({ width: 1440, height: 1000 });
          await page.evaluate(() => {
            window.tp.plugin.settings.language = 'ru';
            const view = window.tp.view;
            view.query = '';
            view.tab = 'statistics';
            view.statsMode = 'business';
            view.dashboardState.days = view.financeState.days = 30;
            view.rebuild();
          });
        }
      },
    );
    await check(
      'completed task times and transparent Day surfaces stay readable across themes and panes',
      async () => {
        await page.evaluate(async () => {
          const { app, plugin } = window.tp,
            { stringifyYaml } = window.require('obsidian');
          for (const [path, minutes] of [
            ['Compared-review.md', 135],
            ['No-spent-review.md', 0],
          ])
            await app.vault.create(
              path,
              '---\n' +
                stringifyYaml({
                  topSchema: 1,
                  type: 'task',
                  title: path,
                  scheduled: '2026-10-02',
                  completedDate: '2026-10-02',
                  status: 'done',
                  plannedMinutes: 180,
                  actualMinutes: minutes,
                }) +
                '---\n',
            );
          await plugin.repo.load();
          window.tp.view.calendarFocus = '2026-10-02';
          window.tp.view.boardScope = 'all';
        });
        for (const language of ['ru', 'en']) {
          await page.evaluate((language) => {
            window.tp.plugin.settings.language = language;
            window.tp.view.rebuild();
          }, language);
          for (const width of [1440, 390]) {
            await setViewport({ width, height: 1000 });
            for (const tab of ['today', 'calendar', 'kanban']) {
              await page.locator(`[data-tab=${tab}]`).click();
              if (tab === 'calendar') {
                await page.locator('[data-calendar-view=day]').click();
                for (const theme of ['theme-dark', 'theme-light']) {
                  await page.evaluate((theme) => {
                    document.body.classList.remove('theme-dark', 'theme-light');
                    document.body.classList.add(theme);
                    document.documentElement.style.setProperty('--interactive-accent', '#ffffff');
                    document.documentElement.style.setProperty('--text-on-accent', '#000000');
                  }, theme);
                  const surfaces = await page.locator('.tp-calendar-day-view').evaluate((n) => {
                    const date = getComputedStyle(n.querySelector('.tp-day-number'));
                    return {
                      grid: getComputedStyle(n).backgroundColor,
                      day: getComputedStyle(n.querySelector('.tp-day')).backgroundColor,
                      date: date.backgroundColor,
                      shadow: date.boxShadow,
                    };
                  });
                  assert.equal(surfaces.grid, 'rgba(0, 0, 0, 0)');
                  assert.equal(surfaces.day, 'rgba(0, 0, 0, 0)');
                  assert.equal(surfaces.date, 'rgba(0, 0, 0, 0)');
                  assert.equal(surfaces.shadow, 'none');
                }
                await page.evaluate(() => {
                  document.body.classList.remove('theme-dark', 'theme-light');
                  document.documentElement.style.removeProperty('--interactive-accent');
                  document.documentElement.style.removeProperty('--text-on-accent');
                });
                assert.ok(
                  (await page.locator('.tp-calendar-day-view').boundingBox()).width <=
                    Math.min(880, width),
                );
                assert.ok(
                  await page
                    .locator('.tp-calendar-day-view')
                    .evaluate(
                      (n) =>
                        getComputedStyle(n).gridTemplateColumns.trim().split(/\s+/).length === 1,
                    ),
                );
              }
              const card = page
                .locator(
                  '.tp-task[data-path="Compared-review.md"],.tp-board-card[data-path="Compared-review.md"]',
                )
                .first();
              assert.equal(
                await card.locator('.tp-planned-minutes').textContent(),
                language === 'ru' ? 'План: 3 ч' : 'Plan: 3 h',
              );
              assert.equal(
                await card.locator('.tp-actual-minutes').textContent(),
                language === 'ru' ? 'Потрачено: 2 ч 15 мин' : 'Spent: 2 h 15 min',
              );
              assert.equal(
                await page
                  .locator(
                    '.tp-task[data-path="No-spent-review.md"] .tp-actual-minutes,.tp-board-card[data-path="No-spent-review.md"] .tp-actual-minutes',
                  )
                  .count(),
                0,
              );
              assert.ok(
                await card.evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
                `${language} ${width} ${tab}`,
              );
            }
          }
        }
        await page.locator('[data-tab=today]').click();
        await page.locator('.tp-task[data-path="Compared-review.md"] .tp-check').click();
        await page.waitForFunction(
          () =>
            window.tp.plugin.repo.snapshot().tasks.find((t) => t.path === 'Compared-review.md')
              .status === 'todo',
        );
        assert.equal(
          await page
            .locator('.tp-task[data-path="Compared-review.md"] .tp-planned-minutes')
            .textContent(),
          'Estimate: 3 h',
        );
        assert.equal(
          await page.evaluate(
            () =>
              window.tp.plugin.repo.snapshot().tasks.find((t) => t.path === 'Compared-review.md')
                .minutes,
          ),
          135,
        );
        await page.evaluate(() => {
          window.tp.plugin.settings.language = 'ru';
          window.tp.view.rebuild();
        });
        await setViewport({ width: 1440, height: 1000 });
      },
    );

    await check(
      'dates stay visible within headers and period controls across views and narrow panes',
      async () => {
        const before = await page.evaluate(() => JSON.stringify(window.tp.plugin.repo.snapshot()));
        try {
          for (const language of ['ru', 'en']) {
            for (const theme of ['theme-dark', 'theme-light']) {
              await page.evaluate(
                ({ language, theme }) => {
                  document.body.classList.remove('theme-dark', 'theme-light');
                  document.body.classList.add(theme);
                  window.tp.plugin.settings.language = language;
                  window.tp.plugin.settings.dateFormat = 'dmy';
                  window.tp.view.query = '';
                  window.tp.view.rebuild();
                },
                { language, theme },
              );
              for (const width of [1440, 750, 390, 320]) {
                await setViewport({ width, height: 1000 });
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
                  await page.locator(`[data-tab="${tab}"]`).click();
                  if (tab === 'manualTab') {
                    assert.equal(await page.locator('.tp-header-date').count(), 0);
                    continue;
                  }
                  const date = page.locator('.tp-header-date');
                  assert.equal(await date.textContent(), '02.10.2026');
                  assert.equal(await date.getAttribute('datetime'), '2026-10-02');
                  assert.ok(await date.isVisible());
                  assert.equal(await page.locator('.tp-page-heading > p').count(), 0);
                  assert.ok(
                    await page
                      .locator('.tp-header-tools')
                      .evaluate((n) => n.contains(n.querySelector('time'))),
                  );
                  if (tab === 'statistics') {
                    for (const mode of ['business', 'finance']) {
                      await page.locator(`[data-stats-mode="${mode}"]`).click();
                      await page.locator('[data-period="365"]').click();
                      assert.equal(
                        await page.locator('.tp-period-context .tp-period-range').textContent(),
                        '01.01.2026 — 31.12.2026',
                      );
                      assert.ok(
                        await page.locator('.tp-period-context .tp-period-range').isVisible(),
                      );
                      assert.equal(
                        await page
                          .locator(
                            '.tp-main > p.tp-period-range,.tp-finance > p.tp-period-range,.tp-dashboard > p.tp-period-range',
                          )
                          .count(),
                        0,
                      );
                    }
                  }
                  if (tab === 'subscriptions') {
                    await page.locator('[data-expense-mode=payments]').click();
                    await page.locator('[data-period="365"]').click();
                    assert.equal(
                      await page.locator('.tp-period-context .tp-period-range').textContent(),
                      '01.01.2026 — 31.12.2026',
                    );
                    assert.equal(
                      await page
                        .locator('.tp-expense-ledger .tp-dated-heading .tp-period-range')
                        .count(),
                      2,
                    );
                  }
                  if (tab === 'kanban') {
                    await page.locator('[data-board-scope]').selectOption('week');
                    assert.ok(await page.locator('.tp-board-controls .tp-board-range').isVisible());
                  }
                  await page.evaluate(
                    () =>
                      new Promise((resolve) =>
                        requestAnimationFrame(() => requestAnimationFrame(resolve)),
                      ),
                  );
                  assert.ok(
                    await page.locator('.tp-header-date,.tp-period-range').evaluateAll((ns) =>
                      ns.every((n) => {
                        const r = n.getBoundingClientRect(),
                          p = n
                            .closest(
                              '.tp-header-tools,.tp-stats-heading,.tp-board-controls,.tp-workload-heading',
                            )
                            .getBoundingClientRect();
                        return (
                          n.scrollWidth <= n.clientWidth + 1 &&
                          r.left >= p.left - 1 &&
                          r.right <= p.right + 1 &&
                          parseFloat(getComputedStyle(n).fontSize) <= 12
                        );
                      }),
                    ),
                    `${language} ${theme} ${width} ${tab}: date containment`,
                  );
                  assert.ok(
                    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
                  );
                }
              }
            }
          }
          assert.equal(
            await page.evaluate(() => JSON.stringify(window.tp.plugin.repo.snapshot())),
            before,
          );
        } finally {
          await setViewport({ width: 1440, height: 1000 });
          await page.evaluate(() => {
            document.body.classList.remove('theme-light');
            document.body.classList.add('theme-dark');
            const { plugin, view } = window.tp;
            plugin.settings.language = 'ru';
            plugin.settings.dateFormat = 'dmy';
            view.tab = 'statistics';
            view.statsMode = 'business';
            view.dashboardState.days = view.financeState.days = 30;
            view.rebuild();
          });
        }
      },
    );
    await check(
      'Today boards exclude historical closed work with missing dates and timestamp-only repeats',
      async () => {
        await page.evaluate(async () => {
          const { app, plugin } = window.tp;
          const { stringifyYaml } = window.require('obsidian');
          const cases = [
            [
              'Board-scope old completion',
              {
                status: 'done',
                scheduled: '2026-10-02',
                completedDate: '2026-10-01',
                due: '2026-12-31',
              },
            ],
            [
              'Board-scope legacy completion',
              { status: 'done', scheduled: '2026-09-01', due: '2026-12-31' },
            ],
            [
              'Board-scope legacy failure',
              { status: 'failed', scheduled: '2026-09-01', due: '2026-12-31' },
            ],
            [
              'Board-scope completed today',
              {
                status: 'done',
                scheduled: '2026-09-01',
                completedDate: '2026-10-02',
                due: '2026-12-31',
              },
            ],
            ['Board-scope overdue', { status: 'todo', scheduled: '2026-09-01' }],
            [
              'Board-scope old repeat',
              {
                status: 'done',
                scheduled: '2026-09-01',
                recurrence: 'FREQ=DAILY;COUNT=1',
                topMoves: { '2026-09-01': '2026-10-02' },
                topOccurrences: {
                  '2026-09-01': { status: 'done', resolvedAt: '2026-09-02T12:00:00Z' },
                },
              },
            ],
          ];
          for (const [title, fields] of cases)
            await app.vault.create(
              title + '.md',
              '---\n' + stringifyYaml({ topSchema: 1, type: 'task', title, ...fields }) + '---\n',
            );
          await plugin.repo.load();
        });
        const before = await page.evaluate(() => JSON.stringify(window.tp.plugin.repo.snapshot()));
        for (const language of ['ru', 'en']) {
          await page.evaluate((language) => {
            const { plugin, view } = window.tp;
            plugin.settings.language = language;
            view.query = 'Board-scope';
            view.tab = 'kanban';
            view.boardScope = 'today';
            view.rebuild();
          }, language);
          assert.deepEqual((await page.locator('.tp-board-title').allTextContents()).sort(), [
            'Board-scope completed today',
            'Board-scope overdue',
          ]);
          await page.locator('[data-board-scope]').selectOption('all');
          assert.equal(await page.locator('.tp-board-card').count(), 6);
        }
        assert.equal(
          await page.evaluate(() => JSON.stringify(window.tp.plugin.repo.snapshot())),
          before,
        );
        await page.evaluate(() => {
          const { plugin, view } = window.tp;
          plugin.settings.language = 'ru';
          view.query = '';
          view.tab = 'today';
          view.rebuild();
        });
      },
    );
    await check('browser has no uncaught JavaScript errors', async () =>
      assert.deepEqual(errors, []),
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }
  fs.writeFileSync(
    path.join(root, 'docs/ui-test-results.txt'),
    [
      ...results,
      ...failures.map((f) => 'FAIL ' + f),
      `${passed}/${passed + failures.length} passed`,
    ].join('\n') + '\n',
  );
  console.log(`${passed}/${passed + failures.length} passed`);
  if (failures.length) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
