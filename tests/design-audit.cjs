// Broad visual audit: real Chromium with the local Obsidian API harness.
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
    entryPoints: ['tests/browser-mock.js'],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    outfile: '.test-build/browser-mock.js',
  });
  await build({
    stdin: {
      contents: "export * from './src/ui/modals'; export {taskItem} from './src/core/selectors';",
      resolveDir: root,
    },
    bundle: true,
    platform: 'browser',
    format: 'iife',
    globalName: 'tpAudit',
    external: ['obsidian'],
    outfile: '.test-build/design-bridge.js',
  });
  const theme =
    require('./browser-theme.cjs') +
    `
    .setting-item{display:flex;align-items:center;gap:16px;padding:16px 0;border-bottom:1px solid var(--background-modifier-border)}
    .setting-item-info{flex:1;min-width:0}.setting-item-description{font-size:12px;color:var(--text-muted);margin-top:5px}
    .setting-item-control{display:flex;gap:8px;align-items:center;flex-shrink:0}
    .audit-settings{padding:24px;width:min(700px,100%);margin:auto}
    @media(max-width:600px){.setting-item{flex-wrap:wrap}.setting-item-control{width:100%}}
  `;
  const server = http.createServer(createStaticHandler(root, theme));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  let browser;
  const results = [],
    errors = [];
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.TP_CHROMIUM_EXECUTABLE,
      args: process.env.TP_CHROMIUM_ARGS
        ? JSON.parse(process.env.TP_CHROMIUM_ARGS)
        : ['--no-sandbox'],
    });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      timezoneId: 'UTC',
    });
    page.on('pageerror', (e) => errors.push(e.message));
    const inspect = async (name, selector) => {
      const metrics = await page.locator(selector).evaluate((node) => {
        const r = node.getBoundingClientRect();
        const controls = [...node.querySelectorAll('button,input,textarea,[role=combobox]')].filter(
          (n) =>
            n.getClientRects().length &&
            !n.closest('[hidden]') &&
            n.getAttribute('aria-hidden') !== 'true',
        );
        return {
          horizontalOverflow: node.scrollWidth > node.clientWidth + 1,
          viewportOverflow: r.left < -1 || r.right > innerWidth + 1,
          unnamed: controls
            .filter(
              (n) =>
                !(
                  n.getAttribute('aria-label') ||
                  n.getAttribute('aria-labelledby') ||
                  n.textContent ||
                  n.title ||
                  [...(n.labels || [])].map((l) => l.textContent).join('')
                ).trim(),
            )
            .map((n) => n.outerHTML.slice(0, 240)),
          clippedButtons: controls
            .filter(
              (n) =>
                n.tagName === 'BUTTON' &&
                !n.matches('.tp-task-title,.tp-board-title,.tp-select-trigger,.tp-nav-button') &&
                n.scrollWidth > n.clientWidth + 2,
            )
            .map((n) => n.outerHTML.slice(0, 200)),
        };
      });
      results.push({ name, ...metrics });
      assert.equal(metrics.horizontalOverflow, false, name + ': horizontal overflow');
      assert.equal(metrics.viewportOverflow, false, name + ': viewport overflow');
      assert.deepEqual(metrics.clippedButtons, [], name + ': clipped buttons');
    };
    for (const language of ['ru', 'en'])
      for (const theme of ['dark', 'light'])
        for (const width of [320, 1440]) {
          const name = `${language}-${theme}-${width}`;
          await page.setViewportSize({ width, height: 1000 });
          await page.goto('http://127.0.0.1:' + server.address().port);
          await page.waitForFunction(() => window.ready);
          await page.addScriptTag({ path: '.test-build/design-bridge.js' });
          await page.evaluate(
            ({ language, theme }) => {
              document.body.className = 'theme-' + theme;
              if (theme === 'light')
                for (const [k, v] of Object.entries({
                  '--background-primary': '#fff',
                  '--background-secondary': '#f6f6f6',
                  '--text-normal': '#222',
                  '--text-muted': '#666',
                  '--text-faint': '#777',
                  '--background-modifier-border': '#ddd',
                  '--background-modifier-hover': '#eee',
                }))
                  document.documentElement.style.setProperty(k, v);
              window.tp.plugin.settings.language = language;
              window.tp.plugin.settings.uiScalePercent = 115;
              window.tp.view.rebuild();
            },
            { language, theme },
          );
          for (const tab of [
            'today',
            'calendar',
            'inbox',
            'upcoming',
            'projects',
            'subscriptions',
            'statistics',
            'kanban',
            'manualTab',
          ]) {
            await page.evaluate((tab) => {
              window.tp.view.tab = tab;
              window.tp.view.rebuild();
            }, tab);
            await page.evaluate(
              () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
            );
            await inspect(`${name}-${tab}`, '.tp-host');
            if (width === 320)
              await page.screenshot({ path: `.test-build/audit-${name}-${tab}.png` });
          }
          for (const form of [
            'task',
            'task-filled',
            'payment',
            'area',
            'project',
            'subscription',
            'charge',
            'move',
            'jump',
            'delete',
            'delete-project',
            'import',
          ]) {
            await page.evaluate((form) => {
              const { plugin } = window.tp,
                s = plugin.repo.snapshot(),
                a = window.tpAudit;
              const task = s.tasks.find((t) => t.kind === 'task'),
                subscription = s.tasks.find((t) => t.kind === 'subscription');
              const item = a.taskItem(task, '2026-10-23');
              const forms = {
                task: () => new a.TaskModal(plugin),
                'task-filled': () =>
                  new a.TaskModal(plugin, undefined, {
                    title: 'Long title '.repeat(30),
                    description: 'Description paragraph. '.repeat(80),
                    result: 'Recorded result. '.repeat(80),
                  }),
                payment: () => new a.TaskModal(plugin, undefined, { kind: 'payment' }),
                area: () => new a.EntityModal(plugin, 'area'),
                project: () => new a.EntityModal(plugin, 'project', s.projects[0]),
                subscription: () => new a.SubscriptionModal(plugin, subscription),
                charge: () => new a.ChargeModal(plugin, subscription),
                move: () => new a.MoveModal(plugin, item),
                jump: () => new a.CalendarJumpModal(plugin, '2026-10-23', () => {}),
                delete: () => new a.DeleteModal(plugin, item),
                'delete-project': () => new a.DeleteEntityModal(plugin, 'project', s.projects[0]),
                import: () => new a.ImportModal(plugin),
              };
              window.auditModal = forms[form]();
              window.auditModal.open();
              for (const d of document.querySelectorAll('.tp-modal details')) d.open = true;
            }, form);
            await inspect(`${name}-${form}`, '.tp-modal');
            if (form === 'task-filled') {
              const result = page.locator('.tp-result');
              await result.scrollIntoViewIfNeeded();
              const overlap = await result.evaluate((node) => {
                const r = node.getBoundingClientRect(),
                  f = document.querySelector('.tp-modal-actions').getBoundingClientRect();
                return (
                  Math.max(r.top, f.top) < Math.min(r.bottom, f.bottom) &&
                  Math.max(r.left, f.left) < Math.min(r.right, f.right)
                );
              });
              assert.equal(overlap, false, name + ': result hidden behind footer');
              await page.screenshot({ path: `.test-build/audit-${name}-result.png` });
              await page.locator('.tp-modal-actions').scrollIntoViewIfNeeded();
            }
            if (language === 'ru' || ['task', 'project', 'subscription', 'import'].includes(form))
              await page.screenshot({ path: `.test-build/audit-${name}-${form}.png` });
            await page.evaluate(() => window.auditModal.close());
          }
          await page.evaluate(() => {
            window.tp.view.contentEl.hidden = true;
            const settings = window.tp.plugin.settingTabs[0];
            settings.display();
            settings.containerEl.classList.add('audit-settings');
            document.body.append(settings.containerEl);
          });
          await inspect(name + '-settings', '.tp-settings');
          assert.equal(await page.locator('.tp-settings input:not([type=search])').count(), 2);
          await page.screenshot({ path: `.test-build/audit-${name}-settings.png` });
        }
    fs.writeFileSync('.test-build/design-audit.json', JSON.stringify({ results, errors }, null, 2));
    assert.deepEqual(errors, []);
    const unnamed = results.filter((r) => r.unnamed.length);
    assert.deepEqual(unnamed, [], 'All visible controls must have accessible names');
    console.log(
      `PASS ${results.length} design scenes: pages, twelve forms and settings; RU/EN, light/dark, 320/1440px, 115% scale; result/footer overlap, clipping, accessible names`,
    );
  } finally {
    await browser?.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
