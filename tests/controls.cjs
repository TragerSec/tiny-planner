const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { chromium } = require('playwright');
const { createStaticHandler } = require('./static-server.cjs');
const root = path.resolve(__dirname, '..');
const snapshots = {};
const crypto = require('node:crypto');
async function snapshot(page, name) {
  if (!process.env.TP_AUDIT_SNAPSHOT) return;
  await page.addStyleTag({
    content:
      '*,*::before,*::after {animation:none!important;transition:none!important;caret-color:transparent!important}',
  });
  const state = await page.locator('.tp-host, .tp-modal').evaluateAll(async (roots) => {
    const properties = [
      'display',
      'visibility',
      'position',
      'top',
      'right',
      'bottom',
      'left',
      'width',
      'height',
      'min-width',
      'min-height',
      'max-width',
      'max-height',
      'margin',
      'padding',
      'gap',
      'grid-template-columns',
      'grid-template-rows',
      'align-items',
      'align-self',
      'justify-content',
      'flex',
      'overflow-x',
      'overflow-y',
      'color',
      'background-color',
      'background-image',
      'border',
      'border-radius',
      'box-shadow',
      'outline',
      'font-family',
      'font-size',
      'font-weight',
      'line-height',
      'letter-spacing',
      'white-space',
      'text-overflow',
      'text-decoration',
      'opacity',
      'transform',
      'z-index',
    ];
    const state = roots
      .flatMap((root) => [root, ...root.querySelectorAll('*')])
      .map((node) => {
        const style = getComputedStyle(node),
          r = node.getBoundingClientRect();
        return [
          node.tagName,
          node.className?.baseVal ?? node.className,
          [r.x, r.y, r.width, r.height],
          properties.map((key) => style.getPropertyValue(key)),
        ];
      });
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(JSON.stringify(state)),
    );
    return [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, '0')).join('');
  });
  snapshots[name] = {
    computed: state,
    pixels: crypto
      .createHash('sha256')
      .update(await page.screenshot())
      .digest('hex'),
  };
}
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
    });
    await context.addInitScript(() => {
      const Original = Date;
      window.Date = class extends Original {
        constructor(...args) {
          if (!args.length) super('2026-10-23T08:00:00Z');
          else super(...args);
        }
        static now() {
          return new Original('2026-10-23T08:00:00Z').valueOf();
        }
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let checked = 0;
    for (const mode of ['dark', 'light'])
      for (const width of [1440, 900, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto('http://127.0.0.1:' + server.address().port);
        await page.waitForFunction(() => window.ready);
        await page.evaluate(async (mode) => {
          document.body.className = 'theme-' + mode;
          if (mode === 'light')
            for (const [name, value] of Object.entries({
              '--background-primary': '#ffffff',
              '--background-secondary': '#f6f6f6',
              '--text-normal': '#222222',
              '--text-muted': '#666666',
              '--background-modifier-border': '#dddddd',
              '--background-modifier-hover': '#eeeeee',
            }))
              document.documentElement.style.setProperty(name, value);
          const { plugin } = window.tp;
          const titles = [
            'Ardshinbank',
            'Raiffeisen',
            'Work',
            'Read',
            'Review the detailed launch plan',
            'Document the final investigation findings',
          ];
          for (const [index, title] of titles.entries())
            await plugin.service.createTask({
              title,
              description: index === 2 ? 'A brief' : '',
              scheduled: '2026-10-23',
              scheduledTime: index === 4 ? '09:00' : '',
              due: '',
              project: '',
              kind: index === 2 ? 'meeting' : 'task',
              priority: index === 2 ? 'high' : 'normal',
              minutes: 0,
              recurrence: '',
            });
          for (const [index, title] of [
            'Range',
            'Follow-up',
            'Review the investigation and record the outcome',
          ].entries())
            await plugin.service.createTask({
              title,
              scheduled: '2026-10-22',
              scheduledTime: index === 2 ? '09:00' : '',
              due: '2026-10-24',
              project: '',
              kind: index === 1 ? 'contact' : 'task',
              priority: index === 1 ? 'high' : 'normal',
              minutes: 0,
              recurrence: '',
            });
        }, mode);
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
          await page.locator(`[data-tab="${tab}"]`).evaluate((node) => node.click());
          if (tab === 'projects') {
            await page
              .locator('.tp-project')
              .evaluateAll((cards) => cards.forEach((card) => (card.open = true)));
            await page.waitForTimeout(40);
            const icons = await page
              .locator('.tp-project-tools > .tp-icon-button, .tp-section-heading > .tp-icon-button')
              .evaluateAll((buttons) =>
                buttons.map((button) => {
                  const b = button.getBoundingClientRect(),
                    s = button.querySelector('svg').getBoundingClientRect();
                  return {
                    width: b.width,
                    height: b.height,
                    iconWidth: s.width,
                    iconHeight: s.height,
                  };
                }),
              );
            assert.ok(icons.length > 0);
            assert.ok(
              icons.every((i) => i.width === i.height && i.iconWidth === 16 && i.iconHeight === 16),
            );
          }
          if (tab === 'calendar') {
            assert.equal(await page.locator('.tp-current-week').count(), 7);
            const metrics = await page
              .locator('[data-day="2026-10-23"] :is(.tp-task,.tp-calendar-continuation)')
              .evaluateAll((cards) =>
                cards.map((card) => {
                  const title = card.querySelector('.tp-task-title,.tp-continuation-title');
                  // The line box also includes generated appointment-time text.
                  const lineHeight = parseFloat(getComputedStyle(title).lineHeight);
                  const lines = Math.round(title.getBoundingClientRect().height / lineHeight);
                  const parent = card.parentElement;
                  const parentStyle = getComputedStyle(parent);
                  return {
                    title: title.textContent,
                    continuation: card.classList.contains('tp-calendar-continuation'),
                    lines,
                    height: card.getBoundingClientRect().height,
                    width: card.getBoundingClientRect().width,
                    availableWidth:
                      parent.clientWidth -
                      parseFloat(parentStyle.paddingLeft) -
                      parseFloat(parentStyle.paddingRight),
                    clipped: title.scrollWidth > title.clientWidth + 1,
                  };
                }),
              );
            assert.ok(metrics.length >= 9);
            assert.equal(metrics.filter((m) => m.continuation).length, 3);
            assert.ok(metrics.every((m) => !m.clipped));
            assert.ok(
              metrics.every((m) => Math.abs(m.width - m.availableWidth) < 1),
              JSON.stringify(metrics),
            );
            const byLines = new Map();
            for (const metric of metrics) {
              if (byLines.has(metric.lines))
                assert.ok(
                  Math.abs(byLines.get(metric.lines) - metric.height) < 0.7,
                  JSON.stringify(metrics),
                );
              else byLines.set(metric.lines, metric.height);
            }
            assert.ok(byLines.has(1), JSON.stringify(metrics));
            if (width === 1440)
              assert.ok(
                [...byLines.keys()].some((n) => n > 1),
                JSON.stringify(metrics),
              );
            console.log(`CARD HEIGHTS ${mode}-${width}: ${JSON.stringify([...byLines])}`);
          }
          const overflow = await page
            .locator('.tp-host')
            .evaluate((node) => node.scrollWidth > node.clientWidth + 1);
          assert.equal(overflow, false, `${tab}-${mode}-${width} overflow`);
          if (width === 1440 || (width === 390 && ['projects', 'calendar'].includes(tab)))
            await page.screenshot({
              path: path.join(root, `.test-build/controls-${tab}-${mode}-${width}.png`),
            });
          await snapshot(page, `${tab}-${mode}-${width}`);
          checked++;
        }
        await page.locator('[data-tab="today"]').evaluate((node) => node.click());
        await page.locator('.tp-header-tools > button.mod-cta').click();
        await page.locator('[data-section=description] > summary').click();
        await page
          .locator('.tp-modal textarea.tp-description')
          .fill('Input: review the system and record the findings.');
        await page
          .locator('.tp-modal textarea.tp-result')
          .fill('Completed: the findings are documented and shared.');
        assert.ok(await page.locator('.tp-modal textarea.tp-result').isVisible());
        await page.screenshot({
          path: path.join(root, `.test-build/controls-form-${mode}-${width}.png`),
        });
        await snapshot(page, `form-${mode}-${width}`);
        await page.keyboard.press('Escape');
      }
    if (process.env.TP_AUDIT_SNAPSHOT)
      fs.writeFileSync(process.env.TP_AUDIT_SNAPSHOT, JSON.stringify(snapshots, null, 2));
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${checked} page/theme/width combinations, equal card heights by visible line count, current week and result form`,
    );
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
