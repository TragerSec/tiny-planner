import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeRule, validateRule, repeatDates } from '../src/core/recurrence';
const { createStaticHandler } = require('../tests/static-server.cjs');
test('browser test server rejects traversal and unknown/missing files', () => {
  const root = mkdtempSync(join(process.cwd(), '.test-build', 'server-'));
  try {
    writeFileSync(join(root, 'main.js'), 'allowed asset');
    for (const url of [
      '/../secret.txt',
      '/../../../LOCAL_SECRET.txt',
      '/%2e%2e/secret.txt',
      '/package-lock.json',
      '/styles.css',
    ]) {
      const res = { statusCode: 200, setHeader() {}, end() {} };
      assert.doesNotThrow(() => createStaticHandler(root, '')({ url, method: 'GET' }, res));
      assert.equal(res.statusCode, 404, url);
    }
    let body: unknown;
    const res = {
      statusCode: 200,
      setHeader() {},
      end(b: unknown) {
        body = b;
      },
    };
    createStaticHandler(root, '')({ url: '/main.js?cache=1', method: 'GET' }, res);
    assert.equal(String(body), 'allowed asset');
    createStaticHandler(root, '')({ url: '/main.js', method: 'POST' }, res);
    assert.equal(res.statusCode, 405);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('recurrence input cannot select inherited properties or sub-day frequencies', () => {
  for (const value of ['constructor', '__proto__', 'toString'])
    assert.equal(normalizeRule(value), value);
  for (const rule of [
    'FREQ=SECONDLY',
    'FREQ=DAILY;FREQ=SECONDLY',
    'FREQ=DAILY;BYMINUTE=0,1',
    'FREQ=YEARLY;BYDAY=99MO',
  ])
    assert.ok(validateRule(rule, '2026-10-02'));
});
test('out-of-range recurrence anchors and malformed UNTIL dates are rejected', () => {
  assert.ok(validateRule('FREQ=DAILY', '0001-01-01'));
  assert.ok(validateRule('FREQ=DAILY;UNTIL=20260230T000000Z', '2026-01-01'));
  assert.ok(validateRule('FREQ=WEEKLY;BYDAY=2MO', '2026-01-01'));
});

test('TP-SEC-001: impossible dates and empty-candidate queries terminate in an isolated process', () => {
  const { spawnSync } = require('node:child_process');
  const script = `
    const assert = require('node:assert/strict');
    const {makeRule,validateRule,normalizeTask,expand,taskItem} = require('./.test-build/recurrence-probe.cjs');
    const bad = 'FREQ=DAILY;BYMONTH=2;BYMONTHDAY=30';
    assert.ok(validateRule(bad,'2026-10-03'));
    const task = normalizeTask('bad.md',{recurrence:bad,scheduled:'2026-10-03'});
    assert.deepEqual(expand(task,'2026-10-03','2026-10-03'),[]);
    assert.equal(taskItem(task,'2026-10-03').key,'');
    // This passes validation but cannot yield a second date in a daily set.
    const empty = 'FREQ=DAILY;BYDAY=MO;BYSETPOS=2';
    assert.equal(validateRule(empty,'2026-10-03'),'');
    assert.deepEqual(makeRule(empty,'2026-10-03').between(new Date('2026-10-03'),new Date('2026-10-03'),true),[]);
    assert.throws(() => makeRule(empty,'2026-10-03').after(new Date('2026-10-03'),true), {name:'RecurrenceLimitError'});
    const guarded = normalizeTask('guarded.md',{recurrence:empty,scheduled:'2026-10-03'});
    const item = taskItem(guarded,'2026-10-03');
    assert.equal(item.recurring,true); assert.equal(item.key,''); assert.ok(guarded.unsupportedRepeat);
    console.log('bounded');
  `;
  const child = spawnSync(process.execPath, ['-e', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 1500,
    maxBuffer: 8192,
  });
  assert.equal(child.error, undefined, child.stderr);
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /bounded/);
});

test('guard preserves monthly positions, leap dates and COUNT origin', () => {
  assert.deepEqual(
    repeatDates(
      'FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29;COUNT=2',
      '2020-01-01',
      '2021-01-01',
      '2030-01-01',
    ),
    ['2024-02-29'],
  );
  assert.deepEqual(
    repeatDates(
      'FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1',
      '2026-01-01',
      '2026-02-01',
      '2026-03-31',
    ),
    ['2026-02-27', '2026-03-31'],
  );
  assert.deepEqual(
    repeatDates('FREQ=DAILY;BYDAY=MO;COUNT=3', '2026-01-01', '2026-01-13', '2026-03-01'),
    ['2026-01-19'],
  );
});

test('vendored runtime is byte-identical to the verified upstream package apart from the reviewed iterator', () => {
  const fs = require('node:fs'),
    path = require('node:path');
  const walk = (dir: string): string[] =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((f: any) =>
        f.isDirectory() ? walk(path.join(dir, f.name)) : [path.join(dir, f.name)],
      );
  for (const file of walk('vendor/rrule')) {
    const rel = path.relative('vendor/rrule', file).replaceAll('\\', '/');
    if (!/\.(js|d\.ts)$/.test(rel) || rel === 'iter/index.js') continue;
    assert.deepEqual(
      fs.readFileSync(file),
      fs.readFileSync(path.join('node_modules/rrule/dist/esm', rel)),
      rel,
    );
  }
  const iterator = fs.readFileSync('vendor/rrule/iter/index.js', 'utf8');
  const additions = [
    '    var plannerIterations = 0;\n',
    "        if (++plannerIterations > 20000) {\n            var error = new Error('Recurrence exceeds the safe calculation budget; simplify the rule or shorten its history.');\n            error.name = 'RecurrenceLimitError';\n            throw error;\n        }\n",
    '        // Stop at the query boundary even when filters produce no candidates.\n        var periodStart = fromOrdinal(ii.yearordinal + start);\n        if ((until && periodStart > until) || (iterResult.maxDate && periodStart > iterResult.maxDate)) return emitResult(iterResult);\n',
  ];
  let upstream = iterator;
  for (const patch of additions) {
    assert.ok(upstream.includes(patch));
    upstream = upstream.replace(patch, '');
  }
  assert.equal(upstream, fs.readFileSync('node_modules/rrule/dist/esm/iter/index.js', 'utf8'));
});
