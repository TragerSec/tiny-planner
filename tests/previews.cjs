const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { chromium } = require('playwright');
const { createStaticHandler } = require('./static-server.cjs');
const theme = require('./browser-theme.cjs');
const root = path.resolve(__dirname, '..');
(async () => {
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
  const images = [];
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.TP_CHROMIUM_EXECUTABLE,
      args: process.env.TP_CHROMIUM_ARGS
        ? JSON.parse(process.env.TP_CHROMIUM_ARGS)
        : ['--no-sandbox'],
    });
    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
      deviceScaleFactor: 2,
      timezoneId: 'Asia/Yerevan',
    });
    await context.addInitScript(() => {
      const Original = Date;
      window.Date = class extends Original {
        constructor(...args) {
          if (!args.length) super('2026-10-05T08:00:00Z');
          else super(...args);
        }
        static now() {
          return new Original('2026-10-05T08:00:00Z').valueOf();
        }
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForFunction(() => window.ready);
    await page.evaluate(async () => {
      const { plugin, app } = window.tp,
        { stringifyYaml } = window.require('obsidian');
      for (const file of app.vault.getMarkdownFiles()) {
        app.vault.files.delete(file.path);
        app.vault.emit('delete', file);
      }
      const put = async (file, data) =>
        app.vault.create(
          file,
          '---\n' + stringifyYaml({ topSchema: 1, ...data }) + '---\n\n# ' + data.title + '\n',
        );
      await put('Planner/Areas/Work.md', { type: 'area', title: 'Work' });
      await put('Planner/Areas/Personal.md', { type: 'area', title: 'Personal' });
      await put('Planner/Projects/Launch.md', {
        type: 'project',
        title: 'Website launch',
        area: '[[Planner/Areas/Work]]',
        status: 'in-progress',
        due: '2026-10-09',
      });
      await put('Planner/Projects/Learning.md', {
        type: 'project',
        title: 'English practice',
        area: '[[Planner/Areas/Personal]]',
        status: 'in-progress',
      });
      await put('Planner/Projects/Home.md', {
        type: 'project',
        title: 'Home projects',
        area: '[[Planner/Areas/Personal]]',
        status: 'todo',
      });
      const rows = [
        [
          'Outline',
          'Draft the project outline',
          '2026-10-05',
          '',
          'backlog',
          'Launch',
          '',
          'normal',
          0,
          '',
        ],
        [
          'Checklist',
          'Review the launch checklist',
          '2026-10-05',
          '09:00',
          'in-progress',
          'Launch',
          '',
          'high',
          20,
          '',
        ],
        [
          'Exam',
          'English speaking exam',
          '2026-10-05',
          '14:00',
          'todo',
          'Learning',
          '',
          'high',
          0,
          '',
        ],
        [
          'Practice',
          'Practice speaking for 20 minutes',
          '2026-10-05',
          '18:00',
          'todo',
          'Learning',
          'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20261030T235959Z',
          'normal',
          0,
          '',
        ],
        [
          'Backup',
          'Back up the vault',
          '2026-10-05',
          '',
          'done',
          'Home',
          '',
          'normal',
          8,
          '2026-10-05',
        ],
        [
          'Call',
          'Call the repair studio',
          '2026-10-04',
          '',
          'failed',
          'Home',
          '',
          'normal',
          0,
          '2026-10-05',
        ],
        ['Weekend', 'An idea for the weekend', '', '', 'backlog', '', '', 'normal', 0, ''],
        [
          'Application',
          'Send the application',
          '2026-10-07',
          '10:00',
          'todo',
          'Launch',
          '',
          'normal',
          0,
          '',
        ],
        [
          'Reading',
          'Read a chapter',
          '2026-10-03',
          '',
          'done',
          'Learning',
          '',
          'normal',
          25,
          '2026-10-03',
        ],
        [
          'Notes',
          'Organize reference notes',
          '2026-10-02',
          '',
          'done',
          'Launch',
          '',
          'normal',
          15,
          '2026-10-02',
        ],
        [
          'Invoice',
          'Pay the workspace invoice',
          '2026-10-05',
          '15:00',
          'todo',
          'Launch',
          '',
          'high',
          0,
          '',
        ],
      ];
      for (const [
        file,
        title,
        scheduled,
        scheduledTime,
        status,
        project,
        recurrence,
        priority,
        actualMinutes,
        resolved,
      ] of rows)
        await put('Planner/Tasks/' + file + '.md', {
          type: 'task',
          taskType:
            file === 'Exam'
              ? 'meeting'
              : file === 'Invoice'
                ? 'payment'
                : file === 'Checklist'
                  ? 'status'
                  : 'task',
          title,
          scheduled,
          scheduledTime,
          status,
          project: project ? `[[Planner/Projects/${project}]]` : '',
          recurrence: recurrence || null,
          priority,
          ...(file === 'Invoice' ? { amount: 120, currency: 'USD' } : {}),
          actualMinutes,
          ...(resolved ? { [status === 'failed' ? 'failedDate' : 'completedDate']: resolved } : {}),
        });
      await put('Planner/Tasks/Software licence.md', {
        type: 'task',
        taskType: 'payment',
        title: 'Software licence',
        status: 'done',
        scheduled: '2026-10-01',
        completedDate: '2026-10-02',
        amount: 89,
        currency: 'USD',
        project: '[[Planner/Projects/Launch]]',
      });
      await put('Planner/Tasks/Workshop.md', {
        type: 'task',
        taskType: 'payment',
        title: 'Language workshop',
        status: 'done',
        scheduled: '2026-10-03',
        completedDate: '2026-10-03',
        amount: 35,
        currency: 'EUR',
        project: '[[Planner/Projects/Learning]]',
      });
      for (const [title, amount, currency, billingPeriod] of [
        ['Learning library', 10, 'EUR', 'monthly'],
        ['Cloud storage', 36, 'EUR', 'yearly'],
        ['YouTube Premium', 14, 'USD', 'monthly'],
      ])
        await put('Planner/Tasks/' + title + '.md', {
          type: 'task',
          taskType: 'subscription',
          title,
          amount,
          currency,
          billingPeriod,
          subscriptionActive: true,
          project:
            title === 'Learning library'
              ? '[[Planner/Projects/Learning]]'
              : '[[Planner/Projects/Launch]]',
          ...(title === 'Cloud storage'
            ? {
                topCharges: { '2026-10-01': { amount: 36, currency: 'EUR', paidOn: '2026-10-04' } },
              }
            : {}),
          scheduled: '2026-10-01',
        });
      await plugin.repo.load();
      plugin.settings.language = 'en';
      window.tp.view.rebuild();
    });
    const folder = path.join(root, 'docs/images');
    fs.mkdirSync(folder, { recursive: true });
    for (const [tab, name] of [
      ['today', 'today'],
      ['calendar', 'calendar'],
      ['kanban', 'boards'],
      ['statistics', 'statistics'],
      ['subscriptions', 'subscriptions'],
      ['manualTab', 'guide'],
    ]) {
      await page.locator('[data-tab=' + tab + ']').click();
      if (tab === 'subscriptions') await page.locator('[data-expense-mode=subscriptions]').click();
      if (tab === 'kanban') await page.locator('[data-board-scope]').selectOption('today');
      await page.evaluate(async () => {
        document.activeElement?.blur();
        const content = document.querySelector('.tp-content');
        content.style.overflowAnchor = 'none';
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        content.scrollTop = 0;
        window.scrollTo(0, 0);
      });
      assert.ok(
        await page.locator('.tp-header').evaluate((n) => n.getBoundingClientRect().top >= 20),
      );
      await page.mouse.move(0, 0);
      await page.screenshot({
        path: path.join(folder, name + '.png'),
        scale: 'css',
        animations: 'disabled',
      });
      images.push({ file: name + '.png', width: 1200, height: 800 });
    }
    await page.evaluate(() => {
      window.tp.plugin.settings.language = 'ru';
      window.tp.view.rebuild();
    });
    for (const tab of ['statistics', 'calendar']) {
      await page.locator('[data-tab=' + tab + ']').click();
      await page.locator('.tp-content').evaluate((n) => (n.scrollTop = 0));
      const expanded =
        tab === 'statistics'
          ? await page.addStyleTag({
              content:
                '.tp-host{height:auto!important;overflow:visible!important}.tp-shell{height:auto!important}.tp-content{overflow:visible!important}.tp-sidebar{max-height:none!important}',
            })
          : null;
      await page.mouse.move(0, 0);
      await page.screenshot({
        fullPage: tab === 'statistics',
        path: path.join(folder, tab + '-ru.png'),
        scale: 'css',
        animations: 'disabled',
      });
      const bytes = fs.readFileSync(path.join(folder, tab + '-ru.png'));
      images.push({
        file: tab + '-ru.png',
        width: bytes.readUInt32BE(16),
        height: bytes.readUInt32BE(20),
      });
      if (expanded) await expanded.evaluate((n) => n.remove());
    }
    await page.locator('[data-tab=statistics]').click();
    await page.locator('[data-stats-mode=finance]').click();
    await page.locator('[data-period="7"]').click();
    const expandedFinance = await page.addStyleTag({
      content:
        '.tp-host{height:auto!important;overflow:visible!important}.tp-shell{height:auto!important}.tp-content{overflow:visible!important}.tp-sidebar{max-height:none!important}',
    });
    await page.locator('.tp-content').evaluate((n) => (n.scrollTop = 0));
    await page.mouse.move(0, 0);
    await page.screenshot({
      fullPage: true,
      path: path.join(folder, 'finance-ru.png'),
      scale: 'css',
      animations: 'disabled',
    });
    const financeBytes = fs.readFileSync(path.join(folder, 'finance-ru.png'));
    images.push({
      file: 'finance-ru.png',
      width: financeBytes.readUInt32BE(16),
      height: financeBytes.readUInt32BE(20),
    });
    await expandedFinance.evaluate((n) => n.remove());
    await page.locator('[data-stats-mode=business]').click();
    await page.evaluate(() => {
      window.tp.plugin.settings.language = 'en';
      window.tp.view.rebuild();
    });
    await page.setViewportSize({ width: 450, height: 800 });
    await page.locator('[data-tab=today]').click();
    await page.locator('.tp-content').evaluate((n) => {
      n.scrollTop = 0;
    });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: path.join(folder, 'mobile.png'),
      scale: 'device',
      animations: 'disabled',
    });
    images.push({ file: 'mobile.png', width: 900, height: 1600 });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(async () => {
      window.tp.plugin.settings.language = 'ru';
      const { plugin, app } = window.tp;
      const { stringifyYaml } = window.require('obsidian');
      for (const f of app.vault.getMarkdownFiles()) {
        app.vault.files.delete(f.path);
        app.vault.emit('delete', f);
      }
      const put = (path, data) =>
        app.vault.create(path, '---\n' + stringifyYaml({ topSchema: 1, ...data }) + '---\n');
      await put('Planner/Areas/Work.md', {
        type: 'area',
        title: 'Работа',
        monthlyBudget: 500,
        budgetCurrency: 'USD',
      });
      await put('Planner/Projects/Playbooks.md', {
        type: 'project',
        title: 'Плейбуки',
        monthlyBudget: 250,
        budgetCurrency: 'USD',
        area: '[[Planner/Areas/Work]]',
        status: 'in-progress',
      });
      for (let i = 0; i < 3; i++)
        await put(`Planner/Tasks/Long${i}.md`, {
          type: 'task',
          title:
            [
              'Плейбуки: Web, AD, AI, Clouds, Mobile, Network, Linux, Windows',
              'Обновить внутреннюю документацию',
              'Подготовить материалы для команды',
            ][i % 3] + (i >= 3 ? ` · ${i + 1}` : ''),
          project: '[[Planner/Projects/Playbooks]]',
          scheduled: '2026-10-01',
          due: '2026-10-30',
          workDates: ['2026-10-05', '2026-10-06', '2026-10-08'],
          plannedMinutes: 120,
          status: i === 0 ? 'in-progress' : 'todo',
          priority: i === 0 ? 'high' : 'normal',
        });
      await put('Planner/Tasks/Meeting.md', {
        type: 'task',
        title: 'Обсудить планы команды',
        plannedMinutes: 45,
        taskType: 'meeting',
        scheduled: '2026-10-05',
        scheduledTime: '10:00',
        status: 'todo',
        project: '[[Planner/Projects/Playbooks]]',
      });
      await put('Planner/Tasks/Payment.md', {
        type: 'task',
        title: 'Оплатить интернет',
        project: '[[Planner/Projects/Playbooks]]',
        taskType: 'payment',
        amount: 30,
        currency: 'USD',
        scheduled: '2026-10-08',
        status: 'todo',
      });
      await put('Planner/Tasks/PaidTools.md', {
        type: 'task',
        taskType: 'payment',
        title: 'Оплачены инструменты команды',
        project: '[[Planner/Projects/Playbooks]]',
        scheduled: '2026-10-05',
        status: 'done',
        amount: 70,
        currency: 'USD',
        completedDate: '2026-10-05',
        topPayment: { amount: 70, currency: 'USD', paidOn: '2026-10-05' },
      });
      await put('Planner/Areas/Armenia.md', { type: 'area', title: 'Armenia' });
      await put('Planner/Projects/Driving.md', {
        type: 'project',
        title: 'Driving School and Practical Training',
        area: '[[Planner/Areas/Armenia]]',
        status: 'todo',
      });
      await put('Planner/Tasks/Driving.md', {
        type: 'task',
        title: 'Prepare for the practical driving test',
        plannedMinutes: 60,
        project: '[[Planner/Projects/Driving]]',
        scheduled: '2026-10-06',
        status: 'todo',
        priority: 'high',
      });
      await put('Planner/Tasks/Home.md', {
        type: 'task',
        title: 'Купить продукты',
        plannedMinutes: 30,
        scheduled: '2026-10-06',
        status: 'todo',
      });
      await plugin.repo.load();
      window.tp.view.month = '2026-10-01';
      window.tp.view.rebuild();
    });
    await page.locator('[data-tab=calendar]').click();
    await page.locator('.tp-content').evaluate((n) => (n.scrollTop = 0));
    const fullCalendar = await page.addStyleTag({
      content:
        '.tp-host{height:auto!important;overflow:visible!important}.tp-shell{height:auto!important}.tp-content{overflow:visible!important}.tp-sidebar{max-height:none!important}',
    });
    await page.mouse.move(0, 0);
    await page.screenshot({
      fullPage: true,
      path: path.join(folder, 'calendar-ranges-ru.png'),
      scale: 'css',
      animations: 'disabled',
    });
    const rangeBytes = fs.readFileSync(path.join(folder, 'calendar-ranges-ru.png'));
    images.push({
      file: 'calendar-ranges-ru.png',
      width: rangeBytes.readUInt32BE(16),
      height: rangeBytes.readUInt32BE(20),
    });
    await fullCalendar.evaluate((n) => n.remove());
    const capture = async (file) => {
      await page.locator('.tp-content').evaluate((n) => (n.scrollTop = 0));
      await page.mouse.move(0, 0);
      await page.screenshot({
        path: path.join(folder, file),
        scale: 'css',
        animations: 'disabled',
        fullPage: true,
      });
      const bytes = fs.readFileSync(path.join(folder, file));
      images.push({ file, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });
    };
    await page.evaluate(() => {
      window.tp.view.calendarFocus = '2026-10-06';
      window.tp.view.rebuild();
    });
    await page.locator('[data-calendar-view=week]').click();
    await capture('calendar-week-ru.png');
    await page.locator('[data-calendar-view=day]').click();
    await capture('calendar-day-ru.png');
    await page.evaluate(() => {
      window.tp.view.statsMode = 'finance';
      window.tp.view.financeState.days = 30;
      window.tp.view.financeState.currency = 'USD';
      window.tp.view.rebuild();
    });
    await page.locator('[data-tab=statistics]').click();
    const fullBudget = await page.addStyleTag({
      content:
        '.tp-host{height:auto!important;overflow:visible!important}.tp-shell{height:auto!important}.tp-content{overflow:visible!important}.tp-sidebar{max-height:none!important}',
    });
    await capture('budgets-ru.png');
    await fullBudget.evaluate((n) => n.remove());

    await page.locator('[data-tab=calendar]').click();
    await page.locator('[data-calendar-view=month]').click();
    await page.evaluate(() => {
      document.body.classList.add('theme-dark');
      const root = document.documentElement.style;
      for (const [key, value] of Object.entries({
        '--background-primary': '#161616',
        '--background-secondary': '#1d1d1d',
        '--text-normal': '#bdbdbd',
        '--text-muted': '#626262',
        '--background-modifier-border': '#292929',
        '--interactive-accent': '#569f89',
      }))
        root.setProperty(key, value);
    });
    await capture('bright-calendar-dark.png');
    await page.locator('[data-menu-toggle]').click();
    await capture('menu-collapsed-dark.png');

    await page.locator('[data-menu-toggle]').click();
    await page.evaluate(async () => {
      const { app, plugin } = window.tp,
        { stringifyYaml } = window.require('obsidian');
      const counts = [1, 3, 2, 4, 3, 5];
      for (let day = 1; day <= counts.length; day++) {
        for (let i = 0; i < counts[day - 1]; i++) {
          await app.vault.create(
            `Review-${day}-${i}.md`,
            '---\n' +
              stringifyYaml({
                topSchema: 1,
                type: 'task',
                title: `Example work ${day}-${i}`,
                status: 'done',
                scheduled: `2026-10-${String(day).padStart(2, '0')}`,
                completedDate: '2026-10-06',
                actualMinutes: 15 + i * 10,
                plannedMinutes: 60,
              }) +
              '---\n',
          );
        }
      }
      for (const [code, amounts] of [
        ['USD', [12, 28, 8]],
        ['AMD', [35000, 62000, 19000]],
      ]) {
        for (let i = 0; i < amounts.length; i++) {
          await app.vault.create(
            `Review-payment-${code}-${i}.md`,
            '---\n' +
              stringifyYaml({
                topSchema: 1,
                type: 'task',
                title: `Example ${code} expense ${i + 1}`,
                taskType: 'payment',
                status: 'done',
                scheduled: `2026-10-0${i + 1}`,
                completedDate: `2026-10-0${i + 1}`,
                amount: amounts[i],
                currency: code,
                topPayment: { amount: amounts[i], currency: code },
              }) +
              '---\n',
          );
        }
      }
      await app.vault.create(
        'Review-failed.md',
        '---\n' +
          stringifyYaml({
            topSchema: 1,
            type: 'task',
            title: 'Example deferred work',
            status: 'failed',
            scheduled: '2026-10-03',
            failedDate: '2026-10-06',
            actualMinutes: 20,
          }) +
          '---\n',
      );
      await plugin.repo.load();
      window.tp.view.statsMode = 'business';
      window.tp.view.dashboardState.days = 30;
      window.tp.view.rebuild();
    });
    await page.locator('[data-tab=statistics]').click();
    const expandedReview = await page.addStyleTag({
      content:
        '.tp-host{height:auto!important;overflow:visible!important}.tp-shell{height:auto!important}.tp-content{overflow:visible!important}.tp-sidebar{max-height:none!important}',
    });
    await capture('line-statistics-dark.png');
    await page.locator('[data-stats-mode=finance]').click();
    assert.equal(await page.locator('.tp-finance-currency').count(), 2);
    await capture('line-finance-dark.png');
    await page.setViewportSize({ width: 390, height: 900 });
    await capture('line-finance-mobile.png');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('[data-finance-ledger]').click();
    await capture('payments-dark.png');
    await expandedReview.evaluate((n) => n.remove());

    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(root, 'docs/preview-results.json'),
      JSON.stringify(
        {
          source: 'Browser harness with fictional notes and emulated Obsidian API',
          pluginVersion: require('../manifest.json').version,
          images,
        },
        null,
        2,
      ) + '\n',
    );
    console.log('Captured ' + images.length + ' clean preview images.');
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
