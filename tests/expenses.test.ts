import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTask } from '../src/core/normalize';
import {
  actualExpenses,
  plannedExpenses,
  expenseTotals,
  financialAnalytics,
} from '../src/core/expenses';
import { analytics } from '../src/core/analytics';
import { FM } from '../src/core/model';
const today = '2026-10-05';
const task = (fm: FM = {}) =>
  normalizeTask('Tasks/expense.md', {
    taskType: 'payment',
    amount: 100,
    currency: 'USD',
    scheduled: today,
    ...fm,
  });
test('financial totals count paid only and never treat failed or legacy cancelled payments as spending', () => {
  const tasks = ['todo', 'in-progress', 'failed', 'cancelled', 'archived', 'done'].map((status) =>
    task({ status, completedDate: today }),
  );
  assert.equal(actualExpenses(tasks).length, 1);
  assert.equal(expenseTotals(actualExpenses(tasks)).get('USD'), 100);
});
test('actual payment date differs from scheduled date; unknown dates and prices are not guessed', () => {
  const result = financialAnalytics(
    [
      task({ status: 'done', completedDate: '2026-10-04' }),
      task({ status: 'done' }),
      task({ status: 'done', amount: null, completedDate: today }),
    ],
    today,
    7,
  );
  assert.equal(result.actual.length, 1);
  assert.equal(result.actualTotals.size, 0);
  assert.equal(result.missing.length, 2);
  assert.equal(result.activity.length, 7);
  assert.equal(
    result.activity.find((d) => d.date === '2026-10-04'),
    undefined,
  );
});
test('monetary snapshots, currencies and zero differ from unpriced values', () => {
  const entries = actualExpenses([
    task({ status: 'done', amount: 1000, topPayment: { amount: 0, currency: 'EUR' } }),
    task({ status: 'done', amount: null }),
    task({ status: 'done', amount: 0.1 }),
    task({ status: 'done', amount: 0.2 }),
  ]);
  const totals = expenseTotals(entries);
  assert.equal(totals.get('USD'), 0.3);
  assert.equal(totals.get('EUR'), 0);
  assert.equal(entries[1]?.amount, null);
});
test('recurring financial history survives moves, stops and repricing and ignores skipped/reopened repeats', () => {
  const t = task({
    recurrence: 'FREQ=DAILY',
    scheduled: '2025-01-01',
    amount: 200,
    currency: 'EUR',
    topSeriesEnd: '2025-01-05',
    topMoves: { '2025-01-01': '2026-12-01' },
    topSkipped: ['2025-01-03'],
    topOccurrences: {
      '2025-01-01': { status: 'done', amount: 10, currency: 'USD', resolvedOn: today },
      '2025-01-02': { status: 'todo', amount: 12, currency: 'USD', resolvedOn: today },
      '2025-01-03': { status: 'done', amount: 99, currency: 'USD', resolvedOn: today },
      '2025-01-04': { status: 'failed', amount: 99, currency: 'USD', resolvedOn: today },
    },
  });
  assert.equal(actualExpenses([t]).length, 1);
  assert.equal(financialAnalytics([t], today, 30).actualTotals.get('USD'), 10);
});
test('subscription forecast uses full billing amounts and removes only the recorded billing key', () => {
  const t = task({
    taskType: 'subscription',
    scheduled: '2026-01-31',
    amount: 12,
    subscriptionActive: true,
    topCharges: { '2026-09-30': { amount: 9, currency: 'EUR', paidOn: today } },
  });
  const plan = plannedExpenses([t], '2026-09-01', '2026-11-30');
  assert.deepEqual(
    plan.map((e) => e.date),
    ['2026-10-31', '2026-11-30'],
  );
  assert.equal(actualExpenses([t])[0]?.amount, 9);
  const cancelled = { ...t, subscriptionActive: false, amount: 50 };
  assert.equal(plannedExpenses([cancelled], '2026-09-01', '2026-11-30').length, 0);
  assert.equal(actualExpenses([cancelled])[0]?.currency, 'EUR');
});
test('year preserves all days including leap day; planned expenses do not inflate actual totals', () => {
  const t = task({ scheduled: '2024-03-02', amount: 20 });
  const data = financialAnalytics([t], '2024-03-01', 365);
  assert.equal(data.activity.length, 366);
  assert.equal(data.activity.find((d) => d.date === '2024-02-29')?.date, '2024-02-29');
  assert.equal(data.actualTotals.size, 0);
  assert.equal(data.plannedTotals.get('USD'), 20);
  assert.equal(analytics([t], [], '2024-03-01', 365).tasks, 0);
});
test('work analytics excludes financial records even when they contain old minutes', () => {
  const tasks = [
    task({ status: 'done', actualMinutes: 99, completedDate: today }),
    task({ taskType: 'subscription', status: 'done', actualMinutes: 30 }),
    task({ taskType: 'meeting', status: 'done', actualMinutes: 10, completedDate: today }),
  ];
  const a = analytics(tasks, [], today, 30);
  assert.equal(a.tasks, 1);
  assert.equal(a.minutes, 10);
  assert.equal(a.period.done, 1);
});
test('malformed charge metadata is ignored without creating guessed expenses', () => {
  const t = task({
    taskType: 'subscription',
    topCharges: {
      bad: { amount: 10, currency: 'USD', paidOn: today },
      '2026-10-01': { amount: -5, paidOn: today },
      '2026-10-02': null,
      '2026-10-03': { amount: 10, paidOn: 'bad' },
    },
  });
  assert.equal(actualExpenses([t]).length, 0);
});

test('payment start dates outside the forecast window are not counted through an overlapping task range', () => {
  const t = task({ scheduled: '2026-10-01', due: '2026-10-20' });
  assert.equal(plannedExpenses([t], '2026-10-05', '2026-11-03').length, 0);
  assert.equal(plannedExpenses([t], '2026-10-01', '2026-10-20').length, 1);
});

test('financial history and pending plans both use the full current calendar month and exclude adjacent periods', () => {
  const records = [
    task({ status: 'done', completedDate: '2026-09-30', amount: 99 }),
    task({ status: 'done', completedDate: '2026-10-01', amount: 10 }),
    task({ status: 'done', completedDate: '2026-10-06', amount: 20 }),
    task({ status: 'todo', scheduled: '2026-10-01', amount: 30 }),
    task({ status: 'todo', scheduled: '2026-10-31', amount: 40 }),
    task({ status: 'todo', scheduled: '2026-11-01', amount: 99 }),
  ];
  const data = financialAnalytics(records, '2026-10-06', 30);
  assert.equal(data.from, '2026-10-01');
  assert.equal(data.to, '2026-10-31');
  assert.equal(data.actualTotals.get('USD'), 30);
  assert.equal(data.plannedTotals.get('USD'), 70);
  assert.deepEqual(
    data.planned.map((e) => e.date),
    ['2026-10-01', '2026-10-31'],
  );
});
