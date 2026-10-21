const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { chromium } = require('playwright');
const { createStaticHandler } = require('./static-server.cjs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.test-build/mobile');
const theme = require('./browser-theme.cjs');
(async () => {
  fs.mkdirSync(output, { recursive: true });
  await build({
    entryPoints: [path.join(__dirname, 'browser-mock.js')],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    outfile: path.join(root, '.test-build/browser-mock.js'),
  });
  const server = http.createServer(createStaticHandler(root, theme));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
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
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      timezoneId: 'Asia/Yerevan',
    });
    await context.addInitScript(() => {
      const NativeDate = Date;
      window.Date = class extends NativeDate {
        constructor(...args) {
          super(...(args.length ? args : ['2026-10-02T08:00:00Z']));
        }
        static now() {
          return new NativeDate('2026-10-02T08:00:00Z').valueOf();
        }
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForFunction(() => window.ready);
    await page.evaluate(async () => {
      const area = await window.tp.plugin.service.createNote('area', 'Mobile area', {});
      const project = await window.tp.plugin.service.createNote(
        'project',
        'Mobile project with context',
        { area: area.path },
      );
      for (let i = 0; i < 6; i++)
        await window.tp.plugin.service.createTask({
          title:
            'Mobile QA ' +
            [
              'Review notes',
              'Write report',
              'Send invoice',
              'Team meeting',
              'Prepare demo',
              'Back up vault and verify every archive, including the extremely long task title that must fit a uniform card',
            ][i],
          priority: i === 0 ? 'high' : i === 1 ? 'low' : 'normal',
          scheduled: '2026-10-02',
          scheduledTime: i === 3 ? '14:30' : '',
          due: i === 0 ? '2026-10-05' : '',
          description: i === 3 ? 'Meeting details' : '',
          project: project.path,
          recurrence: '',
          kind: i === 3 ? 'meeting' : 'task',
          minutes: 0,
          plannedMinutes: 25,
        });
      await window.tp.plugin.service.createTask({
        title: 'Mobile QA Overdue meeting',
        scheduled: '2026-09-29',
        due: '2026-09-30',
        project: project.path,
        kind: 'meeting',
        description: 'Overdue card alignment',
        priority: 'normal',
        minutes: 0,
        recurrence: '',
        status: 'todo',
      });
      await window.tp.plugin.service.saveSubscription({
        title: 'Mobile QA subscription',
        description: 'Original',
        project: '',
        amount: 12,
        currency: 'USD',
        billingPeriod: 'monthly',
        scheduled: '2026-10-02',
        active: true,
      });
      window.tp.view.month = '2026-10-01';
      window.tp.view.calendarFocus = '2026-10-02';
      window.tp.view.query = 'Mobile QA';
      window.tp.view.tab = 'calendar';
      window.tp.view.rebuild();
    });
    for (const width of [320, 390, 520, 840, 1050, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForFunction(
        (width) =>
          document.querySelector('.tp-host').classList.contains('tp-agenda') === width <= 1100,
        width,
      );
      for (const scale of [85, 100, 115])
        for (const mode of ['dark', 'light']) {
          await page.evaluate(
            ({ scale, mode }) => {
              document.body.className = 'theme-' + mode;
              window.tp.plugin.settings.uiScalePercent = scale;
              window.tp.view.tab = 'calendar';
              window.tp.view.calendarView = 'month';
              window.tp.view.rebuild();
            },
            { scale, mode },
          );
          const cell = page.locator('[data-day="2026-10-02"]');
          const measured = await cell.evaluate((node) => {
            const rect = node.getBoundingClientRect();
            const tasks = [...node.querySelectorAll('.tp-task')];
            return {
              width: rect.width,
              height: rect.height,
              cards: tasks.map((n) => n.getBoundingClientRect().height),
              overflow: tasks.some((n) => n.scrollWidth > n.clientWidth + 1),
              titleWidths: tasks.map(
                (n) => n.querySelector('.tp-task-title').getBoundingClientRect().width,
              ),
              navHeight: document.querySelector('.tp-sidebar').getBoundingClientRect().height,
              geometry: tasks.every((n) => {
                const heading = n.querySelector('.tp-task-heading').getBoundingClientRect();
                const menu = n.querySelector('.tp-card-menu-toggle').getBoundingClientRect();
                return (
                  heading.right <= menu.left + 1 &&
                  [...n.querySelectorAll('.tp-task-heading > span')].every((badge) => {
                    const r = badge.getBoundingClientRect();
                    const svg = badge.querySelector('svg')?.getBoundingClientRect();
                    return (
                      Math.abs(r.width - 14) < 1 &&
                      Math.abs(r.height - 14) < 1 &&
                      (!svg || Math.abs(svg.width - 14) < 1)
                    );
                  })
                );
              }),
            };
          });
          assert.equal(measured.cards.length, 6);
          const timedTitle = cell.locator('.tp-task-title[data-scheduled-time="14:30"]');
          assert.equal(await timedTitle.count(), 1);
          assert.equal(await timedTitle.isVisible(), true);
          assert.equal(await timedTitle.evaluate((node) => getComputedStyle(node, '::before').content.includes('14:30')), true);
          assert.equal(await cell.locator('.tp-task-meta .tp-appointment-time').count(), 0);
          assert.ok(
            Math.max(...measured.cards) - Math.min(...measured.cards) < 1,
            'Closed card heights must match',
          );
          assert.ok(measured.geometry, JSON.stringify({ width, scale, mode, measured }));
          assert.equal(await cell.locator('.tp-task-meta').first().isVisible(), false);
          const mark = page.locator('[data-day="2026-10-03"] .tp-calendar-continuation');
          assert.equal(await mark.count(), 1);
          const markHeight = (await mark.boundingBox()).height;
          assert.ok(
            Math.abs(markHeight - measured.cards[0]) < 1,
            'Continuation height must match work cards',
          );
          assert.equal(await mark.locator('.tp-check,[role=checkbox]').count(), 0);
          const continuationIndent = await mark.evaluate(
            (n) =>
              n.querySelector('.tp-continuation-title').getBoundingClientRect().left -
              n.getBoundingClientRect().left,
          );
          const taskIndent = await cell
            .locator('.tp-task')
            .first()
            .evaluate(
              (n) =>
                n.querySelector('.tp-task-title').getBoundingClientRect().left -
                n.getBoundingClientRect().left,
            );
          assert.ok(
            Math.abs(continuationIndent - taskIndent) < 1,
            JSON.stringify({ width, scale, mode, continuationIndent, taskIndent }),
          );

          assert.ok(
            await cell.evaluate((n) => n.scrollHeight <= n.clientHeight + 1),
            'Days must never be scroll containers',
          );
          assert.ok(!measured.overflow, JSON.stringify({ width, scale, mode, measured }));
          assert.ok(
            measured.titleWidths.every((w) => w >= (width <= 1100 ? 100 : 35)),
            JSON.stringify({ width, scale, mode, measured }),
          );
          assert.ok(
            measured.cards.every((h) => h < (width <= 1100 ? 95 : 110)),
            JSON.stringify({ width, scale, mode, measured }),
          );
          assert.ok(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          );
          assert.equal(
            await page.locator('.tp-host').evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
            true,
          );
          assert.ok(
            await page.locator('.tp-nav').evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
          );
          assert.equal(
            await cell
              .locator('.tp-high-priority .tp-priority')
              .evaluate((n) => getComputedStyle(n).color),
            'rgb(255, 75, 85)',
          );
          assert.equal(
            await cell
              .locator('.tp-low-priority .tp-priority')
              .evaluate((n) => getComputedStyle(n).color),
            'rgb(255, 255, 255)',
          );
          assert.ok(
            await page.locator('.tp-calendar-controls').evaluate((root) => {
              const groups = [...root.children];
              const within = (n) => {
                const r = n.getBoundingClientRect(),
                  p = root.getBoundingClientRect();
                return r.left >= p.left - 1 && r.right <= p.right + 1;
              };
              return groups.every((g) => {
                const buttons = [...g.querySelectorAll('button')];
                const boxes = buttons.map((b) => b.getBoundingClientRect());
                return (
                  buttons.every(within) &&
                  Math.max(...boxes.map((r) => r.height)) -
                    Math.min(...boxes.map((r) => r.height)) <
                    1 &&
                  Math.max(...boxes.map((r) => r.width)) - Math.min(...boxes.map((r) => r.width)) <
                    1
                );
              });
            }),
            'Toolbar groups must have equal button sizes and stay inside the pane',
          );
          results.push({ width, scale, mode, ...measured });
        }
      assert.ok(
        await page
          .locator('.tp-calendar-views button')
          .evaluateAll((ns) => ns.every((n) => getComputedStyle(n).borderLeftWidth === '0px')),
      );
      await page.locator('[data-calendar-hide-done]').tap();
      assert.equal(
        await page
          .locator('[data-calendar-hide-done]')
          .evaluate((n) => getComputedStyle(n).borderLeftWidth),
        '0px',
      );
      await page.locator('[data-calendar-hide-done]').tap();
      for (const view of ['day', 'week', 'month']) {
        await page.locator(`[data-calendar-view=${view}]`).click();
        assert.equal(await page.locator('[data-day="2026-10-02"] .tp-task').count(), 6);
        const baseIndent = await page
          .locator('[data-day="2026-10-02"] .tp-task')
          .first()
          .evaluate(
            (n) =>
              n.querySelector('.tp-task-title').getBoundingClientRect().left -
              n.getBoundingClientRect().left,
          );
        await page.evaluate(() => {
          window.tp.view.calendarFocus = '2026-10-03';
          window.tp.view.rebuild();
        });
        const ghostIndent = await page
          .locator('[data-day="2026-10-03"] .tp-calendar-continuation')
          .evaluate(
            (n) =>
              n.querySelector('.tp-continuation-title').getBoundingClientRect().left -
              n.getBoundingClientRect().left,
          );
        assert.ok(
          Math.abs(baseIndent - ghostIndent) < 1,
          JSON.stringify({ width, view, baseIndent, ghostIndent }),
        );
        await page.evaluate(() => {
          window.tp.view.calendarFocus = '2026-10-02';
          window.tp.view.rebuild();
        });
      }
      for (const status of ['done', 'failed', 'in-progress', 'backlog', 'todo']) {
        await page.evaluate(async (status) => {
          const task = window.tp.plugin.repo
            .snapshot()
            .tasks.find((t) => t.title === 'Mobile QA Review notes');
          await window.tp.plugin.service.status(
            {
              task,
              key: '',
              date: task.scheduled,
              end: task.due,
              status: task.status,
              minutes: 0,
              recurring: false,
            },
            status,
          );
        }, status);
        const mark = page.locator('[data-day="2026-10-03"] .tp-calendar-continuation');
        assert.equal(await mark.getAttribute('data-status'), status);
        const look = await mark.evaluate((n) => ({
          color: getComputedStyle(n).color,
          expected: getComputedStyle(n)
            .getPropertyValue('--tp-status-' + n.dataset.status)
            .trim(),
          line: getComputedStyle(n.querySelector('.tp-continuation-title')).textDecorationLine,
        }));
        assert.ok(look.expected, JSON.stringify(look));
        assert.equal(
          look.color,
          await page
            .locator('[data-day="2026-10-02"] .tp-task[data-status="' + status + '"] .tp-check')
            .first()
            .evaluate((n) => getComputedStyle(n).color),
        );
        assert.equal(look.line.includes('line-through'), status === 'done' || status === 'failed');
      }
      await page.locator('[data-calendar-appearance=detailed]').tap();
      assert.ok(
        await page.locator('.tp-calendar-grid .tp-task').evaluateAll((cards) =>
          cards.every((card) => {
            const body = card.querySelector('.tp-task-body').getBoundingClientRect();
            const heading = card.querySelector('.tp-task-heading').getBoundingClientRect();
            const meta = card.querySelector('.tp-task-meta').getBoundingClientRect();
            const actions = card.querySelector('.tp-task-actions').getBoundingClientRect();
            const buttons = [...card.querySelectorAll('.tp-task-actions button')].map((b) =>
              b.getBoundingClientRect(),
            );
            return (
              Math.abs(body.left - meta.left) < 1 &&
              Math.abs(body.left - actions.left) < 1 &&
              meta.top >= heading.bottom - 1 &&
              actions.top >= meta.bottom - 1 &&
              buttons.every(
                (b) =>
                  b.left >= actions.left - 1 &&
                  b.right <= actions.right + 1 &&
                  b.top >= actions.top - 1 &&
                  b.bottom <= actions.bottom + 1,
              ) &&
              Math.max(...buttons.map((b) => b.width)) - Math.min(...buttons.map((b) => b.width)) <
                1
            );
          }),
        ),
        'Detailed title, context and equally spaced actions must align without overlap',
      );

      await page.screenshot({ path: path.join(output, `appearance-detailed-${width}.png`) });
      assert.ok(
        await page
          .locator('.tp-card-menu')
          .evaluateAll((ns) => ns.length > 0 && ns.every((n) => n.open)),
      );
      assert.equal(
        await page.locator('[data-day="2026-10-02"] .tp-task-meta').first().isVisible(),
        true,
      );
      await page.locator('[data-day="2026-09-29"] .tp-task').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `appearance-overdue-${width}.png`) });
      await page.locator('.tp-header h1').tap();
      assert.ok(await page.locator('.tp-card-menu').evaluateAll((ns) => ns.every((n) => n.open)));
      assert.ok(await page.locator('.tp-host').evaluate((n) => n.scrollWidth <= n.clientWidth + 1));
      await page.locator('[data-calendar-appearance=minimal]').tap();
      assert.equal(await page.locator('.tp-card-menu[open]').count(), 0);
      const cards = page.locator('[data-day="2026-10-02"] .tp-task');
      const distance = await cards.evaluateAll(
        (ns) => ns[1].getBoundingClientRect().top - ns[0].getBoundingClientRect().bottom,
      );
      assert.ok(distance >= 6.9, 'Calendar cards need visible spacing');
      const cell = page.locator('[data-day="2026-10-02"]');
      await cell.scrollIntoViewIfNeeded();
      const summary = cell.locator('.tp-card-menu-toggle').first();
      await summary.tap();
      assert.equal(
        (await cell.locator('.tp-card-menu').first().getAttribute('open')) !== null,
        true,
      );
      const actions = cell.locator('.tp-card-menu[open] .tp-task-actions');
      assert.equal(await actions.isVisible(), true);
      assert.equal(await cell.locator('.tp-card-menu[open] .tp-task-meta').isVisible(), true);
      await page.screenshot({ path: path.join(output, `details-${width}.png`) });
      const actionBox = await actions.boundingBox();
      assert.ok(
        await actions.evaluate((n) =>
          [...n.querySelectorAll('button')].every((b) => {
            const r = b.getBoundingClientRect(),
              p = n.getBoundingClientRect();
            return r.bottom <= p.bottom + 1 && r.right <= p.right + 1 && r.left >= p.left - 1;
          }),
        ),
        'Open actions must fit their disclosure without overlap',
      );
      assert.ok(actionBox.x >= 0 && actionBox.x + actionBox.width <= width + 1);
      // Touch users must be able to dismiss and reopen the action disclosure.
      await page.locator('.tp-header h1').tap();
      assert.equal(await cell.locator('.tp-card-menu[open]').count(), 0);
      await summary.tap();
      await summary.press('Escape');
      assert.equal(await cell.locator('.tp-card-menu[open]').count(), 0);
      assert.ok(await summary.evaluate((n) => n === document.activeElement));
      await page.screenshot({ path: path.join(output, `calendar-${width}.png`) });
      for (const tab of [
        'today',
        'upcoming',
        'projects',
        'kanban',
        'statistics',
        'subscriptions',
      ]) {
        await page.locator(`[data-tab=${tab}]`).click();
        assert.ok(
          await page
            .locator('.tp-host')
            .evaluate((root) =>
              [...root.querySelectorAll('select')].every(
                (n) =>
                  n.dataset.tpSelection === 'true' &&
                  n.parentElement.querySelector('.tp-select-trigger'),
              ),
            ),
          `${tab}: all choice fields must share the themed component`,
        );
        assert.ok(
          await page.locator('.tp-host').evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
          `${width}: ${tab}`,
        );
      }
      await page.locator('[data-tab=calendar]').click();
    }
    // Only the main page may scroll, including with the pointer over a crowded calendar.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('[data-tab=calendar]').click();
    const wheelCell = page.locator('[data-day="2026-10-02"]');
    await wheelCell.scrollIntoViewIfNeeded();
    await wheelCell.hover();
    const beforeWheel = await page.locator('.tp-host').evaluate((n) => n.scrollTop);
    await page.mouse.wheel(0, 300);
    await page.waitForFunction(
      (before) => document.querySelector('.tp-host').scrollTop > before + 20,
      beforeWheel,
    );
    const afterWheel = await page.locator('.tp-host').evaluate((n) => n.scrollTop);
    await page.mouse.wheel(0, -200);
    await page.waitForFunction(
      (before) => document.querySelector('.tp-host').scrollTop < before - 20,
      afterWheel,
    );
    const nested = await page.locator('.tp-host').evaluate((root) =>
      [...root.querySelectorAll('*')]
        .filter((n) => {
          const style = getComputedStyle(n);
          return (
            /auto|scroll/.test(style.overflowX + ' ' + style.overflowY) &&
            (n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1)
          );
        })
        .map((n) => n.className),
    );
    assert.deepEqual(nested, [], 'Planner components must never own scrolling');
    assert.equal(
      await page
        .locator('.tp-low-priority .tp-priority')
        .first()
        .evaluate((n) => getComputedStyle(n).backgroundColor),
      'rgba(0, 0, 0, 0)',
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-tab=subscriptions]').click();
    await page.getByRole('button', { name: 'Подписки', exact: true }).click();
    await page.locator('.tp-subscription-edit').tap();
    const billing = page
      .locator('.tp-modal .tp-select-control')
      .filter({ has: page.locator('option[value=yearly]') });
    const unchanged = await page.locator('.tp-modal form').evaluate((form) =>
      [
        ...form.querySelectorAll(
          'input:not(.tp-select-search), textarea, .tp-select-trigger, .tp-modal-actions',
        ),
      ].map((n) => {
        const r = n.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }),
    );
    await billing.locator('.tp-select-trigger').tap();
    assert.deepEqual(
      await page.locator('.tp-modal form').evaluate((form) =>
        [
          ...form.querySelectorAll(
            'input:not(.tp-select-search), textarea, .tp-select-trigger, .tp-modal-actions',
          ),
        ].map((n) => {
          const r = n.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        }),
      ),
      unchanged,
      'A choice popup must not move any form fields',
    );
    const panelBox = await billing.locator('.tp-select-panel').boundingBox();
    assert.ok(
      panelBox.x >= 0 &&
        panelBox.y >= 0 &&
        panelBox.x + panelBox.width <= 390 &&
        panelBox.y + panelBox.height <= 844,
    );

    assert.equal(await billing.locator('[role=option]').count(), 2);
    await page
      .locator('.modal')
      .screenshot({ path: path.join(output, 'subscription-selector.png') });
    await billing.locator('[role=option]').filter({ hasText: 'год' }).tap();
    assert.equal(await billing.locator('select').inputValue(), 'yearly');
    await page.locator('.tp-modal .tp-date-picker-button').tap();
    const picker = page.locator('.tp-picker-popup:popover-open');
    const years = picker
      .locator('.tp-select-control')
      .filter({ has: page.locator('select[data-picker-control=year]') });
    const calendarBox = await picker.boundingBox();
    await years.locator('.tp-select-trigger').tap();
    assert.deepEqual(
      await picker.boundingBox(),
      calendarBox,
      'A nested year popup must not move or resize the calendar',
    );
    await page.setViewportSize({ width: 390, height: 240 });
    await page.waitForFunction(
      () => {
        const panel = document.querySelector('.tp-select-panel:popover-open');
        if (!panel) return false;
        const r = panel.getBoundingClientRect();
        return r.y >= 0 && r.bottom <= 240 && panel.querySelectorAll('[role=option]').length < 5;
      },
      null,
      { timeout: 4000 },
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await years.locator('.tp-select-search').fill('2050');
    const choiceBox = await picker.boundingBox();
    assert.ok(choiceBox.y >= 0 && choiceBox.y + choiceBox.height <= 844);
    await years.getByRole('option').filter({ hasText: '2050' }).tap();
    assert.equal(await picker.locator('select[data-picker-control=year]').inputValue(), '2050');
    await picker.press('Escape');

    assert.equal(await page.locator('.tp-modal h2').textContent(), 'Редактировать подписку');
    const form = page.locator('.tp-modal form');
    await form.locator('input[type=text]').first().fill('Mobile QA edited');
    await form.locator('input[type=number]').fill('24');
    await page.getByRole('button', { name: 'Сохранить', exact: true }).tap();
    await page.waitForFunction(() =>
      window.tp.plugin.repo
        .snapshot()
        .tasks.some((t) => t.title === 'Mobile QA edited' && t.amount === 24),
    );
    for (const language of ['ru', 'en']) {
      await page.evaluate((language) => {
        window.tp.plugin.settings.language = language;
        window.tp.view.rebuild();
      }, language);
      await page.locator('[data-tab=manualTab]').click();
      const legend = page.locator('.tp-manual-legend');
      assert.equal(await legend.locator('.tp-manual-swatch').count(), 5);
      assert.equal(await legend.locator('svg[data-icon="calendar-clock"]').count(), 1);
      assert.equal(await legend.locator('svg[data-icon="flag"]').count(), 1);
      assert.ok(await page.locator('.tp-host').evaluate((n) => n.scrollWidth <= n.clientWidth + 1));
      await legend.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(output, `legend-${language}.png`),
        animations: 'disabled',
      });
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
    console.log(
      `PASS ${results.length} phone/tablet/desktop × scale × theme layouts, touch menu, keyboard Escape, subscription edit`,
    );
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
