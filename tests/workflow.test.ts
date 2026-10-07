import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTask, normalizeProject } from '../src/core/normalize';
import { normalizeStatus, STATUSES } from '../src/core/model';
import { formatDate, parseDate } from '../src/core/dates';
import { analytics } from '../src/core/analytics';
import { boardItems, boardWindow } from '../src/core/board';
import { monthlyCosts } from '../src/core/subscriptions';
import { expand, isOverdue, taskItem, todayItems } from '../src/core/selectors';

test('workflow imports old open and all five statuses without rewriting notes', () => {
  assert.equal(normalizeStatus('open'), 'todo');
  assert.equal(normalizeStatus('to do'), 'todo');
  assert.equal(normalizeStatus('in progress'), 'in-progress');
  for (const s of STATUSES) assert.equal(normalizeStatus(s), s);
});
test('all unfinished statuses remain overdue and present on Today', () => {
  for (const status of ['backlog', 'todo', 'in-progress']) {
    const task = normalizeTask('t.md', { status, scheduled: '2026-10-01' });
    assert.equal(isOverdue(taskItem(task, '2026-10-03'), '2026-10-03'), true);
    assert.equal(todayItems([task], '2026-10-03').overdue.length, 1);
  }
});
test('recurring in-progress record stays pending and is never fabricated as completion', () => {
  const task = normalizeTask('t.md', {
    recurrence: 'FREQ=DAILY',
    scheduled: '2026-10-01',
    topOccurrences: { '2026-10-01': { status: 'in-progress', minutes: 5 } },
  });
  assert.equal(taskItem(task, '2026-10-03').status, 'in-progress');
  assert.equal(expand(task, '2026-10-01', '2026-10-01')[0]?.status, 'in-progress');
  const data = analytics([task], [], '2026-10-03', 7);
  assert.equal(data.history.open, 1);
  assert.equal(data.undated, 0);
  assert.equal(data.period.done, 0);
});
test('five workflow counts aggregate unfinished work consistently', () => {
  const tasks = STATUSES.map((status) =>
    normalizeTask(`${status}.md`, { status, scheduled: '2026-10-01' }),
  );
  const data = analytics(tasks, [], '2026-10-03', 7);
  assert.deepEqual(data.workflow, { backlog: 1, todo: 1, 'in-progress': 1, done: 1, failed: 1 });
  assert.deepEqual(data.finite, { open: 3, done: 1, failed: 1 });
  assert.equal(data.overdue, 3);
});
test('date formats preserve day/month order and reject impossible dates', () => {
  for (const [format, text] of [
    ['dmy', '03.10.2026'],
    ['mdy', '10/03/2026'],
    ['iso', '2026-10-03'],
  ] as const) {
    assert.equal(formatDate('2026-10-03', format), text);
    assert.equal(parseDate(text, format), '2026-10-03');
    assert.equal(parseDate('2026-10-03', format), '2026-10-03');
  }
  assert.equal(parseDate('31.02.2026', 'dmy'), '');
  assert.equal(parseDate('02/29/2025', 'mdy'), '');
  assert.equal(parseDate('29.02.2024', 'dmy'), '2024-02-29');
  assert.equal(parseDate('03.10.2026<script>', 'dmy'), '');
  assert.equal(parseDate('03.10.2026', 'iso'), '');
});

test('projects share all five states and preserve legacy terminal/paused meaning', () => {
  for (const status of STATUSES) assert.equal(normalizeProject('p.md', { status }).status, status);
  for (const [old, status] of [
    ['active', 'in-progress'],
    ['paused', 'backlog'],
    ['on-hold', 'backlog'],
    ['completed', 'done'],
    ['archived', 'done'],
  ])
    assert.equal(normalizeProject('p.md', { status: old }).status, status);
});
test('subscriptions cannot affect work counts, recurrence, activity or project progress', () => {
  const p = normalizeProject('p.md', {});
  const t = normalizeTask('s.md', {
    taskType: 'subscription',
    project: 'p.md',
    status: 'done',
    actualMinutes: 99,
    completedDate: '2026-10-03',
    recurrence: 'FREQ=DAILY;BYMONTH=2;BYMONTHDAY=30',
    scheduled: '2026-10-01',
    topOccurrences: { '2026-10-01': { status: 'done', minutes: 88, resolvedOn: '2026-10-03' } },
  });
  const data = analytics([t], [p], '2026-10-03', 7);
  assert.equal(data.tasks, 0);
  assert.equal(data.minutes, 0);
  assert.equal(data.period.done, 0);
  assert.equal(data.projects[0]?.tasks, 0);
  assert.deepEqual(expand(t, '2026-10-01', '2026-10-03'), []);
  assert.equal(todayItems([t], '2026-10-03').today.length, 0);
  assert.deepEqual(boardItems([t], '2026-10-03', 'all'), []);
});
test('subscription forecast separates currencies and missing/annual/cancelled costs', () => {
  const tasks = [
    normalizeTask('a.md', { taskType: 'subscription', amount: 10, currency: 'EUR' }),
    normalizeTask('b.md', {
      taskType: 'subscription',
      amount: 120,
      currency: 'EUR',
      billingPeriod: 'yearly',
    }),
    normalizeTask('c.md', { taskType: 'subscription', amount: 5, currency: 'USD' }),
    normalizeTask('d.md', {
      taskType: 'subscription',
      amount: 999,
      currency: 'EUR',
      subscriptionActive: false,
    }),
    normalizeTask('e.md', { taskType: 'subscription', currency: 'EUR' }),
    normalizeTask('f.md', { amount: 999, currency: 'EUR' }),
  ];
  assert.deepEqual(
    [...monthlyCosts(tasks)],
    [
      ['EUR', 20],
      ['USD', 5],
    ],
  );
  assert.equal(tasks[4]?.amount, null);
  assert.equal(normalizeTask('x.md', { taskType: 'subscription', amount: Infinity }).amount, null);
  assert.equal(normalizeTask('x.md', { taskType: 'subscription', amount: 0 }).amount, 0);
});
test('Kanban period boundaries include overdue work, actual completions and explicit undated view', () => {
  const today = '2026-10-03';
  assert.deepEqual(boardWindow('week', today), ['2026-09-28', '2026-10-04']);
  assert.deepEqual(boardWindow('month', today), ['2026-10-01', '2026-10-31']);
  const tasks = [
    normalizeTask('overdue.md', { scheduled: '2026-09-01' }),
    normalizeTask('today.md', { scheduled: today }),
    normalizeTask('sunday.md', { scheduled: '2026-10-04' }),
    normalizeTask('month.md', { scheduled: '2026-10-20' }),
    normalizeTask('future.md', { scheduled: '2027-01-01' }),
    normalizeTask('undated.md', { status: 'backlog' }),
    normalizeTask('done.md', { status: 'done', scheduled: '2025-01-01', completedDate: today }),
    normalizeTask('old-done.md', {
      status: 'done',
      scheduled: '2025-01-01',
      completedDate: '2026-09-01',
    }),
  ];
  const paths = (scope: any) =>
    boardItems(tasks, today, scope)
      .map((i) => i.task.path)
      .sort();
  assert.deepEqual(paths('today'), ['done.md', 'overdue.md', 'today.md']);
  assert.deepEqual(paths('week'), ['done.md', 'overdue.md', 'sunday.md', 'today.md']);
  assert.equal(paths('month').length, 5);
  assert.deepEqual(paths('undated'), ['undated.md']);
  assert.equal(paths('all').length, 8);
});

test('Kanban closed tasks without resolution dates do not span through a future deadline', () => {
  const today = '2026-10-03';
  for (const status of ['done', 'failed']) {
    const task = normalizeTask(`${status}.md`, {
      status,
      scheduled: '2026-09-01',
      workDates: ['2026-10-10'],
      due: '2026-12-31',
    });
    for (const scope of ['today', 'week', 'month'] as const)
      assert.equal(boardItems([task], today, scope).length, 0, `${status}: ${scope}`);
    assert.equal(boardItems([task], today, 'all').length, 1);
    assert.equal(boardItems([task], '2026-09-01', 'today').length, 1);
    assert.equal(boardItems([{ ...task, status: 'todo' }], today, 'today').length, 1);
  }
});

test('Kanban closed tasks use actual resolution dates before any planned dates', () => {
  const today = '2026-10-03';
  for (const status of ['done', 'failed']) {
    const resolved = status === 'done' ? 'completedDate' : 'failedDate';
    const old = normalizeTask(`old-${status}.md`, {
      status,
      scheduled: today,
      due: '2026-12-31',
      [resolved]: '2026-09-01',
    });
    const current = normalizeTask(`current-${status}.md`, {
      status,
      scheduled: '2026-09-01',
      due: '2026-12-31',
      [resolved]: today,
    });
    assert.deepEqual(
      boardItems([old, current], today, 'today').map((i) => i.task.path),
      [current.path],
    );
    assert.equal(boardItems([old, current], today, 'all').length, 2);
  }
});

test('Kanban timestamp-only repeat resolutions override moved display dates', () => {
  const task = normalizeTask('repeat.md', {
    status: 'done',
    recurrence: 'FREQ=DAILY;COUNT=1',
    scheduled: '2026-09-01',
    topMoves: { '2026-09-01': '2026-10-03' },
    topOccurrences: {
      '2026-09-01': { status: 'done', resolvedAt: '2026-09-02T12:00:00Z' },
    },
  });
  assert.equal(boardItems([task], '2026-10-03', 'today').length, 0);
  assert.equal(boardItems([task], '2026-10-03', 'month').length, 0);
  assert.equal(boardItems([task], '2026-10-03', 'all')[0]?.key, '2026-09-01');
});
