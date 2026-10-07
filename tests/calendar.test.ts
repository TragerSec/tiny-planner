import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarItems, dayLoad } from '../src/core/calendar';
import { analytics } from '../src/core/analytics';
import { boardItems } from '../src/core/board';
import { normalizeTask } from '../src/core/normalize';
import { todayItems, taskItem } from '../src/core/selectors';
test('twenty quarterly tasks create forty boundary events and no intervening duplicates', () => {
  const tasks = Array.from({ length: 20 }, (_, i) =>
    normalizeTask(`T${i}.md`, { scheduled: '2026-10-01', due: '2026-12-31' }),
  );
  const events = tasks.flatMap((t) => calendarItems(t, '2026-10-01', '2026-12-31'));
  assert.equal(events.length, 40);
  assert.equal(events.filter((i) => i.date === '2026-10-01').length, 20);
  assert.equal(events.filter((i) => i.date === '2026-12-31').length, 20);
  assert.equal(events.filter((i) => i.date === '2026-11-15').length, 0);
});
test('Today displays an extra work day while tasks without deadline wait through their last work day', () => {
  const task = normalizeTask('T.md', {
    scheduled: '2026-10-01',
    workDates: ['2026-10-05', '2026-10-06'],
  });
  assert.equal(todayItems([task], '2026-10-05').today[0]?.date, '2026-10-05');
  assert.equal(todayItems([task], '2026-10-05').overdue.length, 0);
  assert.equal(todayItems([task], '2026-10-07').overdue.length, 1);
});
test('work dates without a primary date remain dated in cards and business reports', () => {
  const task = normalizeTask('T.md', {
    workDates: ['2026-10-05', '2026-10-06'],
    status: 'done',
    actualMinutes: 10,
    completedDate: '2026-10-20',
  });
  assert.equal(taskItem(task, '2026-10-05').date, '2026-10-05');
  assert.equal(boardItems([task], '2026-10-05', 'undated').length, 0);
  const report = analytics([task], [], '2026-10-05', 7);
  assert.equal(report.noDate, 0);
  assert.equal(report.activity[0]?.minutes, 10);
});
test('zero capacity detects overload and payments or closed work never inflate planned minutes', () => {
  const task = normalizeTask('T.md', { scheduled: '2026-10-05', plannedMinutes: 30 });
  assert.equal(dayLoad([task], '2026-10-05', 0).over, true);
  const paid = normalizeTask('P.md', {
    scheduled: '2026-10-05',
    taskType: 'payment',
    plannedMinutes: 900,
  });
  const done = normalizeTask('D.md', {
    scheduled: '2026-10-05',
    status: 'done',
    plannedMinutes: 900,
  });
  const unknown = normalizeTask('U.md', { scheduled: '2026-10-05' });
  const load = dayLoad([task, paid, done, unknown], '2026-10-05', 480);
  assert.equal(load.minutes, 30);
  assert.equal(load.unestimated, 1);
});

test('work days and deadline do not fill the intervening ninety days', async () => {
  const { calendarItems, dayLoad } = await import('../src/core/calendar');
  const task = normalizeTask('a.md', {
    scheduled: '2026-10-01',
    workDates: ['2026-10-05', '2026-10-06'],
    due: '2026-12-31',
    plannedMinutes: 91,
  });
  const events = calendarItems(task, '2026-10-01', '2026-12-31');
  assert.deepEqual(
    events.map((i) => [i.date, i.calendarRole]),
    [
      ['2026-10-01', 'work'],
      ['2026-10-05', 'work'],
      ['2026-10-06', 'work'],
      ['2026-12-31', 'deadline'],
    ],
  );
  assert.equal(
    ['2026-10-01', '2026-10-05', '2026-10-06'].reduce(
      (n, d) => n + dayLoad([task], d, 480).minutes,
      0,
    ),
    91,
  );
  assert.equal(dayLoad([task], '2026-12-31', 480).minutes, 0);
});
test('a work day identical to deadline stays one event and recurrence keeps moved keys', async () => {
  const { calendarItems, dayLoad, calendarDays } = await import('../src/core/calendar');
  const one = normalizeTask('a.md', {
    scheduled: '2026-10-02',
    due: '2026-10-02',
    workDates: ['2026-10-02'],
    plannedMinutes: 60,
  });
  assert.equal(calendarItems(one, '2026-10-01', '2026-10-31').length, 1);
  assert.equal(dayLoad([one], '2026-10-02', 30).over, true);
  const repeat = normalizeTask('r.md', {
    scheduled: '2026-10-01',
    recurrence: 'FREQ=DAILY;COUNT=2',
    plannedMinutes: 15,
    topMoves: { '2026-10-02': '2026-10-05' },
  });
  assert.equal(calendarItems(repeat, '2026-10-05', '2026-10-05')[0]!.key, '2026-10-02');
  assert.equal(dayLoad([repeat], '2026-10-05', 480).minutes, 15);
  assert.equal(calendarDays('day', '2026-10-02', '2026-10-01').length, 1);
  assert.deepEqual(calendarDays('week', '2026-10-02', '2026-10-01'), [
    '2026-09-28',
    '2026-09-29',
    '2026-09-30',
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
  ]);
});
