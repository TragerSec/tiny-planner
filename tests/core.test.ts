import { firstRepeatDate, recurrenceEnd, withRecurrenceEnd } from '../src/core/recurrence';
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTask } from '../src/core/normalize';
import { expand, isOverdue, taskItem, todayItems } from '../src/core/selectors';
import { addDays, dateKey, monthGrid, parseDate, timeKey } from '../src/core/dates';
import { makeRule, normalizeRule, repeatDates, validateRule } from '../src/core/recurrence';
const task = (fm: Record<string, unknown> = {}) =>
  normalizeTask('Planner/Tasks/Example.md', {
    title: 'Example',
    status: 'todo',
    scheduled: '2026-10-02',
    ...fm,
  });
const routine = (fm: Record<string, unknown> = {}) => task({ recurrence: 'FREQ=DAILY', ...fm });
test('completed daily occurrence remains green state on today and tomorrow stays open', () => {
  const t = routine({ topOccurrences: { '2026-10-02': { status: 'done', minutes: 12 } } });
  const [today, tomorrow] = expand(t, '2026-10-02', '2026-10-03');
  assert.equal(today?.status, 'done');
  assert.equal(today?.minutes, 12);
  assert.equal(tomorrow?.status, 'todo');
  assert.equal(todayItems([t], '2026-10-02').today[0]?.status, 'done');
});
test('reopened occurrence overrides stale completion arrays', () => {
  const t = routine({
    complete_instances: ['2026-10-02'],
    topOccurrences: { '2026-10-02': { status: 'todo' } },
  });
  assert.equal(expand(t, '2026-10-02', '2026-10-02')[0]?.status, 'todo');
});
test('failed occurrence is resolved while tomorrow remains open', () => {
  const t = routine({ topOccurrences: { '2026-10-02': { status: 'failed' } } });
  assert.equal(expand(t, '2026-10-02', '2026-10-03')[0]?.status, 'failed');
  assert.equal(isOverdue(expand(t, '2026-10-02', '2026-10-02')[0]!, '2026-10-04'), false);
});
test('daily and weekly unresolved occurrences appear overdue in Today', () => {
  const d = routine({
    scheduled: '2026-09-30',
    topOccurrences: { '2026-10-01': { status: 'done' } },
  });
  const w = routine({ scheduled: '2026-09-25', recurrence: 'FREQ=WEEKLY' });
  const items = todayItems([d, w], '2026-10-02');
  assert.deepEqual(
    items.overdue.map((i) => i.date),
    ['2026-09-25', '2026-09-30'],
  );
  assert.equal(items.today.length, 2);
});
test('subscription never enters task calendar or Today', () => {
  const t = task({ taskType: 'subscription', scheduled: '2026-09-01' });
  assert.equal(isOverdue(taskItem(t, '2026-10-02'), '2026-10-02'), false);
  assert.equal(todayItems([t], '2026-10-02').overdue.length, 0);
  assert.equal(expand(t, '2026-09-01', '2026-09-01').length, 0);
});
test('undated subscription remains undated', () => {
  const t = task({ scheduled: null, taskType: 'subscription' });
  assert.equal(t.scheduled, '');
  assert.equal(expand(t, '2026-01-01', '2027-01-01').length, 0);
});
test('a distant deadline remains in date selectors without repeating in Today', () => {
  const t = task({ scheduled: '2024-01-01', due: '2027-12-31' });
  assert.equal(expand(t, '2026-10-01', '2026-10-31').length, 1);
  assert.equal(todayItems([t], '2026-10-02').today.length, 0);
});
test('move of one repeat into another month preserves its original key', () => {
  const t = routine({
    scheduled: '2026-10-30',
    topMoves: { '2026-10-30': '2026-11-04' },
    topOccurrences: { '2026-10-30': { status: 'done' } },
  });
  const items = expand(t, '2026-11-01', '2026-11-05');
  const moved = items.find((i) => i.key === '2026-10-30');
  assert.equal(moved?.date, '2026-11-04');
  assert.equal(moved?.status, 'done');
  assert.equal(expand(t, '2026-10-30', '2026-10-30').length, 0);
});
test('move into earlier month does not create another original instance', () => {
  const t = routine({ scheduled: '2026-10-02', topMoves: { '2026-10-02': '2026-09-30' } });
  assert.equal(expand(t, '2026-09-01', '2026-09-30')[0]?.key, '2026-10-02');
  assert.equal(expand(t, '2026-10-02', '2026-10-02').length, 0);
});
test('deleted repeat occurrence does not suppress tomorrow', () => {
  const t = routine({ topSkipped: ['2026-10-02'] });
  assert.equal(expand(t, '2026-10-02', '2026-10-03').length, 1);
  assert.equal(expand(t, '2026-10-02', '2026-10-03')[0]?.date, '2026-10-03');
});
test('stopped repeat preserves history and removes future generations', () => {
  const t = routine({
    topSeriesEnd: '2026-10-02',
    topOccurrences: { '2026-10-02': { status: 'done' } },
  });
  assert.equal(expand(t, '2026-10-02', '2026-10-10').length, 1);
});
test('stale completedDate cannot override open runtime status', () => {
  assert.equal(task({ completedDate: '2026-10-01', status: 'todo' }).status, 'todo');
});
test('legacy alias and complete_instances import with typed states', () => {
  const t = routine({
    repeat: 'daily',
    recurrence: null,
    complete_instances: ['2026-10-02', '2026-10-02'],
  });
  assert.equal(t.recurrence, 'FREQ=DAILY');
  assert.equal(expand(t, '2026-10-02', '2026-10-02')[0]?.status, 'done');
});
test('weekdays rules and leap days use calendar dates independent of DST', () => {
  assert.deepEqual(
    repeatDates('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', '2026-10-02', '2026-10-02', '2026-10-05'),
    ['2026-10-02', '2026-10-05'],
  );
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2026-03-28', 1), '2026-03-29');
});
test('monthly rule follows RRULE: missing month date is skipped, not clamped', () => {
  assert.deepEqual(repeatDates('FREQ=MONTHLY', '2026-01-31', '2026-01-01', '2026-04-30'), [
    '2026-01-31',
    '2026-03-31',
  ]);
});
test('invalid dates and unsupported repeat rules are explicit', () => {
  assert.equal(dateKey('2026-02-30'), '');
  assert.ok(validateRule('FREQ=DAILY;INTERVAL=0', '2026-10-02'));
  assert.ok(validateRule('nonsense', '2026-10-02'));
  assert.ok(routine({ recurrence: 'bad' }).unsupportedRepeat);
});
test('calendar grid spans preceding and following month without task clipping', () => {
  const grid = monthGrid('2026-10-01');
  assert.equal(grid.length, 42);
  assert.equal(grid[0], '2026-09-28');
  assert.equal(grid[41], '2026-11-08');
});
test('rare recurrence has no five-year search cutoff', () => {
  const t = routine({
    recurrence: 'FREQ=YEARLY;INTERVAL=10',
    topOccurrences: { '2026-10-02': { status: 'done' } },
  });
  assert.equal(taskItem(t, '2027-01-01').date, '2036-10-02');
});

test('future recurring occurrence resolved today stays in Today history', () => {
  const t = routine({
    topOccurrences: { '2026-10-05': { status: 'done', resolvedOn: '2026-10-02' } },
  });
  assert.ok(todayItems([t], '2026-10-02').today.some((i) => i.key === '2026-10-05'));
});
test('project representative selects an overdue occurrence before next repeat', () => {
  const t = routine({ scheduled: '2026-09-25', recurrence: 'FREQ=WEEKLY' });
  assert.equal(taskItem(t, '2026-10-03').date, '2026-09-25');
});
test('project representative selects an upcoming move before native next repeat', () => {
  const t = routine({ recurrence: 'FREQ=MONTHLY', topMoves: { '2026-10-02': '2026-10-10' } });
  assert.equal(taskItem(t, '2026-10-03').date, '2026-10-10');
});
test('invalid Date and inherited recurrence names cannot become metadata', () => {
  assert.equal(dateKey(new Date('invalid')), '');
  assert.equal(normalizeRule('constructor'), 'constructor');
  assert.equal(normalizeRule('__proto__'), '__proto__');
});
test('recurrence metadata keys must be exact calendar dates', () => {
  const t = routine({
    topOccurrences: { '2026-10-02<script>': { status: 'done' } },
    topMoves: { '2026-10-02bad': '2026-10-04' },
  });
  assert.deepEqual(Object.keys(t.occurrences), []);
  assert.deepEqual(Object.keys(t.moves), []);
});
test('unsafe duplicate frequencies, counts and sub-day expansions rejected', () => {
  for (const rule of [
    'FREQ=DAILY;FREQ=SECONDLY',
    'FREQ=DAILY;COUNT=-1',
    'FREQ=DAILY;COUNT=NaN',
    'FREQ=DAILY;BYHOUR=0,1',
    'FREQ=DAILY;BYMONTH=99',
    'FREQ=DAILY;INTERVAL=1.5',
  ])
    assert.ok(validateRule(rule, '2026-10-02'), rule);
});
test('far-future queries preserve interval/weekday/COUNT semantics', () => {
  assert.deepEqual(repeatDates('FREQ=DAILY;INTERVAL=3', '1900-01-01', '2026-10-01', '2026-10-10'), [
    '2026-10-03',
    '2026-10-06',
    '2026-10-09',
  ]);
  assert.deepEqual(
    repeatDates('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR', '2026-09-02', '2026-10-01', '2026-10-14'),
    ['2026-10-02', '2026-10-12'],
  );
  assert.deepEqual(repeatDates('FREQ=DAILY;COUNT=2', '2026-01-01', '2026-10-01', '2026-10-10'), []);
});
test('finite COUNT and UNTIL series stop creating tasks', () => {
  assert.equal(
    expand(routine({ recurrence: 'FREQ=DAILY;COUNT=2' }), '2026-10-02', '2027-10-02').length,
    2,
  );
  assert.equal(
    expand(routine({ recurrence: 'FREQ=DAILY;UNTIL=20261003T000000Z' }), '2026-10-02', '2026-10-08')
      .length,
    2,
  );
});
test('overdue task resolved today remains visible for reopening', () => {
  const t = task({ scheduled: '2026-09-30', status: 'done', completedDate: '2026-10-02' });
  const items = todayItems([t], '2026-10-02');
  assert.equal(items.overdue.length, 0);
  assert.equal(items.today.length, 1);
  assert.equal(items.today[0]?.status, 'done');
});
test('overdue recurring day resolved today stays visible alongside current day', () => {
  const t = routine({
    scheduled: '2026-10-01',
    topOccurrences: { '2026-10-01': { status: 'failed', resolvedOn: '2026-10-02' } },
  });
  const items = todayItems([t], '2026-10-02');
  assert.equal(items.overdue.length, 0);
  assert.equal(items.today.length, 2);
});
test('changing repeat anchor keeps explicitly recorded previous history', () => {
  const t = routine({
    scheduled: '2026-10-10',
    topOccurrences: { '2026-10-02': { status: 'done' } },
  });
  assert.equal(expand(t, '2026-10-01', '2026-10-09')[0]?.status, 'done');
});
test('project and inbox task rows retain completed current recurrence', () => {
  const t = routine({ topOccurrences: { '2026-10-02': { status: 'done' } } });
  assert.equal(taskItem(t, '2026-10-02').status, 'done');
  assert.equal(taskItem(t, '2026-10-02').date, '2026-10-02');
});

test('bounded Today returns the same first rows and exact total counts as full history', () => {
  const tasks = Array.from({ length: 12 }, (_, i) =>
    routine({
      title: `Task ${i}`,
      scheduled: '2024-10-01',
      topMoves: { '2024-10-01': '2026-10-01' },
      topOccurrences: { '2026-10-04': { status: 'done', resolvedOn: '2026-10-02' } },
    }),
  );
  const full = todayItems(tasks, '2026-10-02');
  for (const limit of [0, 1, 8, 60, 500]) {
    const paged = todayItems(tasks, '2026-10-02', { overdue: limit, today: limit });
    assert.deepEqual(paged.overdue, full.overdue.slice(0, limit));
    assert.deepEqual(paged.today, full.today.slice(0, limit));
    assert.equal(paged.counts.overdue, full.overdue.length);
    assert.equal(paged.counts.today, full.today.length);
  }
});
test('fast day/week generation matches rrule across interval, COUNT, UNTIL and leap dates', () => {
  for (const freq of ['DAILY', 'WEEKLY'])
    for (const interval of [1, 2, 3, 10])
      for (const suffix of [
        '',
        ';COUNT=2',
        ';COUNT=1000',
        ';UNTIL=20280229T120000Z',
        ';COUNT=1000;UNTIL=20280229',
      ])
        for (const anchor of ['2024-02-29', '2026-10-02'])
          for (const from of ['2023-01-01', '2026-10-03', '2028-01-01']) {
            const rule = `FREQ=${freq};INTERVAL=${interval}${suffix}`;
            const expected = makeRule(rule, anchor)
              .between(new Date(from + 'T00:00:00Z'), new Date('2028-03-05T00:00:00Z'), true)
              .map((d) => d.toISOString().slice(0, 10));
            assert.deepEqual(
              repeatDates(rule, anchor, from, '2028-03-05'),
              expected,
              rule + ' ' + anchor + ' ' + from,
            );
          }
});
test('lazy representative matches full history with moved, skipped and edited series', () => {
  for (const recurrence of ['FREQ=DAILY', 'FREQ=WEEKLY', 'FREQ=MONTHLY', 'FREQ=DAILY;COUNT=4']) {
    const t = routine({
      recurrence,
      scheduled: '2026-09-01',
      topMoves: { '2026-09-01': '2026-09-20', '2026-09-02': '2026-08-30' },
      topSkipped: ['2026-09-03'],
      topSeriesEnd: '2026-09-25',
      topOccurrences: { '2026-08-20': { status: 'todo' }, '2026-09-01': { status: 'done' } },
    });
    const first = expand(t, '2026-08-20', '2026-10-02').find((o) => isOverdue(o, '2026-10-02'));
    // Representatives additionally include explicit moves/history before the anchor.
    assert.equal(taskItem(t, '2026-10-02').date, '2026-08-20');
    assert.ok(first);
  }
});

test('Today includes an unresolved repeat moved before its series anchor', () => {
  const t = routine({ scheduled: '2026-10-02', topMoves: { '2026-10-02': '2026-09-30' } });
  const result = todayItems([t], '2026-10-03');
  assert.equal(result.overdue[0]?.date, '2026-09-30');
  assert.equal(taskItem(t, '2026-10-03').date, result.overdue[0]?.date);
});

test('planned recurrence end is inclusive and preserves explicit completed history', () => {
  const t = routine({
    recurrence: 'FREQ=DAILY;UNTIL=20261003T235959Z',
    topOccurrences: {
      '2026-10-04': { status: 'todo' },
      '2026-10-05': { status: 'done', minutes: 12 },
    },
    topMoves: { '2026-10-04': '2026-10-06' },
  });
  assert.deepEqual(
    expand(t, '2026-10-02', '2026-10-08').map((i) => i.key),
    ['2026-10-02', '2026-10-03', '2026-10-05'],
  );
  assert.notEqual(taskItem(t, '2026-10-06').key, '2026-10-04');
  assert.equal(t.occurrences['2026-10-04']?.status, 'todo');
  assert.equal(
    todayItems([t], '2026-10-06').overdue.some((i) => i.key === '2026-10-04'),
    false,
  );
});

test('recurrence end helpers round-trip custom rules and reject impossible boundaries', () => {
  const custom = 'FREQ=MONTHLY;COUNT=4;BYDAY=MO;BYSETPOS=1;UNTIL=20261201T120000Z';
  assert.equal(recurrenceEnd(custom), '2026-12-01');
  assert.equal(withRecurrenceEnd(custom, '2026-12-01'), custom);
  assert.equal(withRecurrenceEnd(custom, ''), 'FREQ=MONTHLY;COUNT=4;BYDAY=MO;BYSETPOS=1');
  assert.equal(withRecurrenceEnd('daily', '2026-10-03'), 'FREQ=DAILY;UNTIL=20261003T235959Z');
  assert.throws(() => withRecurrenceEnd('FREQ=DAILY', '2026-02-30'), /end date/);
  assert.equal(recurrenceEnd('FREQ=DAILY;UNTIL=20260230'), '');
});

test('appointment times normalize without changing calendar recurrence identity', () => {
  assert.equal(task({ scheduledTime: '9:05' }).scheduledTime, '09:05');
  for (const value of ['24:00', '12:60', 1400, 'bad'])
    assert.equal(task({ scheduledTime: value }).scheduledTime, '');
  const repeated = routine({ scheduledTime: '14:00' });
  assert.deepEqual(
    expand(repeated, '2026-10-02', '2026-10-03').map((i) => [i.key, i.task.scheduledTime]),
    [
      ['2026-10-02', '14:00'],
      ['2026-10-03', '14:00'],
    ],
  );
});
test('all repeat presets find their first real date, including Sunday weekdays', () => {
  for (const rule of ['FREQ=DAILY', 'FREQ=WEEKLY', 'FREQ=MONTHLY', 'FREQ=YEARLY'])
    assert.equal(firstRepeatDate(rule, '2026-10-04'), '2026-10-04');
  const weekdays = 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
  assert.equal(firstRepeatDate(weekdays, '2026-10-04'), '2026-10-05');
  assert.equal(firstRepeatDate(weekdays + ';UNTIL=20261004T235959Z', '2026-10-04'), '');
  assert.deepEqual(repeatDates(weekdays + ';COUNT=2', '2026-10-04', '2026-10-04', '2026-10-11'), [
    '2026-10-05',
    '2026-10-06',
  ]);
});
test('today sorts all statuses by appointment time then untimed tasks with bounded equivalence', () => {
  const tasks = [
    task({ title: 'Untimed', priority: 'high' }),
    task({ title: 'Afternoon', scheduledTime: '14:00' }),
    task({ title: 'Morning closed', scheduledTime: '09:00', status: 'done' }),
    task({ title: 'Midnight', scheduledTime: '00:00' }),
    task({ title: 'Late', scheduledTime: '23:59' }),
  ];
  const result = todayItems(tasks, '2026-10-02');
  assert.deepEqual(
    result.today.map((i) => i.task.title),
    ['Midnight', 'Morning closed', 'Afternoon', 'Late', 'Untimed'],
  );
  assert.deepEqual(
    todayItems(tasks, '2026-10-02', { today: 3, overdue: 3 }).today.map((i) => i.task.title),
    result.today.slice(0, 3).map((i) => i.task.title),
  );
});

test('compact eight-digit dates follow selected order and retain strict calendar validation', () => {
  assert.equal(parseDate('07102026', 'dmy'), '2026-10-07');
  assert.equal(parseDate('10072026', 'mdy'), '2026-10-07');
  assert.equal(parseDate('20261007', 'iso'), '2026-10-07');
  assert.equal(parseDate('31022026', 'dmy'), '');
  assert.equal(parseDate('20260230', 'iso'), '');
});

test('compact typed appointment time normalizes only valid 24-hour values', () => {
  assert.equal(timeKey('930'), '09:30');
  assert.equal(timeKey('0035'), '00:35');
  assert.equal(timeKey('2359'), '23:59');
  assert.equal(timeKey('2400'), '');
  assert.equal(timeKey('1260'), '');
  assert.equal(timeKey('90000'), '');
});
