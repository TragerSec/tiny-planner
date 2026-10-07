import { calendarPeriod, periodDates } from '../src/core/dates';
import test from 'node:test';
import assert from 'node:assert/strict';
import { analytics, completion, loggedMinutes } from '../src/core/analytics';
import { normalizeTask, normalizeProject } from '../src/core/normalize';
import { FM } from '../src/core/model';

const today = '2026-10-03';
const task = (fm: FM = {}) => normalizeTask('Tasks/example.md', { title: 'Example', ...fm });
const project = (path = 'Projects/example.md', fm: FM = {}) =>
  normalizeProject(path, { title: 'Example', ...fm });
test('analytics empty state has exact zeros and a bounded local calendar', () => {
  const a = analytics([], [], today, 30);
  assert.equal(a.tasks, 0);
  assert.equal(a.minutes, 0);
  assert.equal(completion(a.finite), null);
  assert.equal(a.activity.length, 31);
  assert.equal(a.activity[0]?.date, '2026-10-01');
  assert.equal(a.activity.at(-1)?.date, '2026-10-31');
  assert.deepEqual(a.period, { done: 0, failed: 0, minutes: 0 });
});
test('failed tasks stay in the denominator; subscriptions are entirely excluded', () => {
  const p = project();
  const tasks = [
    task({ status: 'done', project: p.path, actualMinutes: 12, completedDate: today }),
    task({ status: 'failed', project: p.path, failedDate: today }),
    task({ scheduled: '2026-10-01', project: p.path }),
    task({ taskType: 'subscription', scheduled: '2026-09-01' }),
  ];
  const a = analytics(tasks, [p], today, 7);
  assert.deepEqual(a.finite, { open: 1, done: 1, failed: 1 });
  assert.equal(completion(a.finite), 33);
  assert.equal(a.overdue, 1);
  assert.equal(a.inbox, 0);
  assert.equal(a.projects[0]?.tasks, 3);
  assert.equal(completion(a.projects[0]!.finite), 33);
  assert.deepEqual(a.period, { done: 1, failed: 1, minutes: 12 });
});
test('recurring history uses moved work days, preserves stopped history and excludes skips', () => {
  const t = task({
    recurrence: 'FREQ=DAILY',
    scheduled: '2000-01-01',
    status: 'done',
    actualMinutes: 5,
    topSeriesEnd: '2001-01-01',
    topMoves: { '2000-01-01': '2026-10-02', '2000-01-02': '2030-01-01' },
    topSkipped: ['2000-01-04'],
    topOccurrences: {
      '2000-01-01': { status: 'done', resolvedOn: '2026-10-02', minutes: 10 },
      '2000-01-02': { status: 'failed', resolvedOn: today, minutes: 7 },
      '2000-01-03': { status: 'done', minutes: 3 },
      '2000-01-04': { status: 'done', resolvedOn: today, minutes: 99 },
      '2000-01-05': { status: 'todo', resolvedOn: today, minutes: 4 },
    },
  });
  const a = analytics([t], [], today, 7);
  assert.equal(a.series, 1);
  assert.equal(completion(a.finite), null);
  assert.deepEqual(a.history, { open: 1, done: 2, failed: 1 });
  assert.deepEqual(a.period, { done: 1, failed: 0, minutes: 10 });
  assert.equal(a.minutes, 20);
  assert.equal(a.recordedMinutes, 29);
  assert.equal(a.openMinutes, 4);
  assert.equal(a.unallocatedMinutes, 5);
  assert.equal(a.recordedMinutes, loggedMinutes(t));
  assert.equal(a.undated, 0);
  assert.equal(a.activity.find((d) => d.date === '2026-10-02')?.done, 1);
});
test('scheduled legacy completions use their planned day; reopened records stay open', () => {
  const a = analytics(
    [
      task({ status: 'done', scheduled: today, actualMinutes: 8 }),
      task({ completedDate: today, actualMinutes: 5 }),
      task({
        recurrence: 'FREQ=DAILY',
        scheduled: today,
        topOccurrences: {
          [today]: { status: 'todo', resolvedOn: today, minutes: 4 },
        },
      }),
    ],
    [],
    today,
    7,
  );
  assert.equal(a.undated, 0);
  assert.equal(a.minutes, 8);
  assert.equal(a.recordedMinutes, 17);
  assert.equal(a.openMinutes, 9);
  assert.deepEqual(a.period, { done: 1, failed: 0, minutes: 8 });
});
test('period uses planned occurrence days ahead of later closure and UTC timestamps', () => {
  const t = task({
    recurrence: 'FREQ=DAILY',
    scheduled: '2026-09-01',
    topOccurrences: {
      '2026-09-01': { status: 'done', resolvedOn: '2026-09-27', minutes: 1 },
      '2026-09-02': {
        status: 'done',
        resolvedOn: today,
        resolvedAt: '2026-10-02T22:00:00Z',
        minutes: 2,
      },
      '2026-09-03': { status: 'done', resolvedAt: '2026-09-26T23:00:00Z', minutes: 4 },
      '2026-10-01': { status: 'done', resolvedOn: '2026-10-04', minutes: 8 },
    },
  });
  const a = analytics([t], [], today, 7);
  assert.deepEqual(a.period, { done: 1, failed: 0, minutes: 8 });
  assert.equal(a.activity.find((d) => d.date === today)?.minutes, 0);
  assert.equal(analytics([t], [], today, 30).period.done, 1);
});
test('long multi-day ranges are counted once; invalid rules remain separate unsupported series', () => {
  const a = analytics(
    [
      task({ scheduled: '2020-01-01', due: '2030-01-01' }),
      task({
        recurrence: 'FREQ=SECONDLY',
        scheduled: '2020-01-01',
        status: 'done',
        completedDate: today,
      }),
    ],
    [],
    today,
    90,
  );
  assert.equal(a.finite.open, 1);
  assert.equal(a.finite.done, 0);
  assert.equal(a.overdue, 0);
  assert.equal(a.series, 1);
  assert.equal(a.unsupported, 1);
  assert.equal(a.period.done, 0);
});
test('project identity uses paths; empty/archived projects stay visible; known filtered paths are not Inbox', () => {
  const p1 = project('Projects/A.md');
  const p2 = project('Projects/B.md', { status: 'archived' });
  const a = analytics(
    [
      task({ project: p1.path, status: 'done' }),
      task({ project: p2.path }),
      task({ project: 'Missing.md' }),
    ],
    [p1, p2],
    today,
    7,
  );
  assert.equal(a.projects[0]?.finite.done, 1);
  assert.equal(a.projects[1]?.finite.open, 1);
  assert.equal(a.projectStatuses.done, 1);
  assert.equal(a.inbox, 1);
  const filtered = analytics(
    [task({ project: p2.path })],
    [p1],
    today,
    7,
    new Set([p1.path, p2.path]),
  );
  assert.equal(filtered.inbox, 0);
});
test('analytics never reads recurrence moves or generates history, even with a century-old anchor', () => {
  const t = task({ recurrence: 'FREQ=DAILY', scheduled: '1900-01-01' });
  Object.defineProperty(t, 'moves', {
    get() {
      throw new Error('Unbounded recurrence query');
    },
  });
  const a = analytics([t], [], today, 90);
  assert.equal(a.activity.length, 92);
  assert.equal(a.history.done, 0);
  assert.equal(a.series, 1);
});
test('enormous hand-written minute values cannot produce Infinity or NaN in totals', () => {
  const a = analytics(
    [
      task({ status: 'done', actualMinutes: 1e308 }),
      task({ status: 'done', actualMinutes: 1e308 }),
    ],
    [],
    today,
    7,
  );
  assert.equal(a.minutes, Number.MAX_SAFE_INTEGER);
  assert.ok(Number.isFinite(a.minutes));
});
test('resolution dates follow the current status instead of stale opposite-status metadata', () => {
  const a = analytics(
    [
      task({ status: 'failed', completedDate: '2025-01-01', failedDate: today }),
      task({ status: 'done', failedDate: today }),
      task({ status: 'todo', completedDate: today, failedDate: today }),
    ],
    [],
    today,
    7,
  );
  assert.deepEqual(a.period, { done: 0, failed: 1, minutes: 0 });
  assert.equal(a.undated, 1);
});

test('closed totals exclude reopened one-offs and repeats but retain manual entries', () => {
  const closed = task({ status: 'done', actualMinutes: 25, completedDate: today });
  const repeat = task({
    recurrence: 'FREQ=DAILY',
    scheduled: today,
    topOccurrences: { [today]: { status: 'done', minutes: 15, resolvedOn: today } },
  });
  assert.equal(analytics([closed, repeat], [], today, 7).minutes, 40);
  closed.status = 'in-progress';
  repeat.occurrences[today]!.status = 'in-progress';
  const a = analytics([closed, repeat], [], today, 7);
  assert.equal(a.minutes, 0);
  assert.equal(a.recordedMinutes, 40);
  assert.equal(a.openMinutes, 40);
  assert.deepEqual(a.period, { done: 0, failed: 0, minutes: 0 });
  assert.ok(a.activity.every((d) => d.minutes === 0));
});

test('calendar periods use complete current boundaries across weeks, quarters, leap years and year changes', () => {
  const cases = [
    ['2026-10-06', 7, '2026-10-05', '2026-10-11', 7],
    ['2026-10-06', 30, '2026-10-01', '2026-10-31', 31],
    ['2026-10-06', 90, '2026-10-01', '2026-12-31', 92],
    ['2026-10-06', 365, '2026-01-01', '2026-12-31', 365],
    ['2025-01-01', 7, '2024-12-30', '2025-01-05', 7],
    ['2024-02-15', 30, '2024-02-01', '2024-02-29', 29],
    ['2100-02-15', 30, '2100-02-01', '2100-02-28', 28],
    ['2024-03-31', 90, '2024-01-01', '2024-03-31', 91],
    ['2024-04-01', 90, '2024-04-01', '2024-06-30', 91],
    ['2024-07-15', 90, '2024-07-01', '2024-09-30', 92],
    ['2024-02-15', 365, '2024-01-01', '2024-12-31', 366],
  ] as const;
  for (const [date, period, from, to, length] of cases) {
    assert.deepEqual(calendarPeriod(date, period), { from, to });
    const dates = periodDates(date, period);
    assert.equal(dates.length, length);
    assert.equal(dates[0], from);
    assert.equal(dates.at(-1), to);
    const data = analytics([], [], date, period);
    assert.deepEqual(
      data.activity.map((d) => d.date),
      dates,
    );
  }
});

test('late closure of September work stays in September; moved repeats and date-free work retain distinct rules', () => {
  const late = task({
    scheduled: '2026-09-29',
    status: 'done',
    completedDate: '2026-10-06',
    actualMinutes: 25,
  });
  assert.equal(analytics([late], [], '2026-10-06', 30).period.done, 0);
  const september = analytics([late], [], '2026-09-30', 30);
  assert.equal(september.activity.find((d) => d.date === '2026-09-29')?.minutes, 25);
  assert.equal(september.period.done, 1);
  const repeat = task({
    recurrence: 'FREQ=DAILY',
    scheduled: '2026-09-29',
    topMoves: { '2026-09-29': '2026-10-01' },
    topOccurrences: { '2026-09-29': { status: 'done', resolvedOn: '2026-10-06', minutes: 10 } },
  });
  assert.equal(
    analytics([repeat], [], '2026-10-06', 30).activity.find((d) => d.date === '2026-10-01')?.done,
    1,
  );
  const undated = task({ status: 'done', completedDate: '2026-10-06', actualMinutes: 5 });
  assert.equal(
    analytics([undated], [], '2026-10-06', 30).activity.find((d) => d.date === '2026-10-06')
      ?.minutes,
    5,
  );
  late.status = 'todo';
  assert.equal(analytics([late], [], '2026-09-30', 30).period.done, 0);
});
