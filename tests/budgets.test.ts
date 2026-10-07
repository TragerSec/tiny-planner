import test from 'node:test';
import assert from 'node:assert/strict';
import { periodBudget, budgetReport } from '../src/core/budgets';
import { normalizeTask, normalizeProject, normalizeArea } from '../src/core/normalize';
test('budget periods use full months and prorate leap/cross-month weeks', () => {
  assert.equal(periodBudget(100, '2026-10-01', '2026-10-31'), 100);
  assert.equal(periodBudget(100, '2026-10-01', '2026-12-31'), 300);
  assert.equal(periodBudget(100, '2024-01-01', '2024-12-31'), 1200);
  assert.equal(periodBudget(290, '2024-02-01', '2024-02-07'), 70);
  assert.equal(
    periodBudget(310, '2026-10-29', '2026-11-04'),
    Math.round((30 + (310 * 4) / 30) * 1e6) / 1e6,
  );
});
test('area budgets include linked projects once, keep currencies separate and reflect reopening', () => {
  const area = normalizeArea('area.md', { monthlyBudget: 1000, budgetCurrency: 'USD' });
  const project = normalizeProject('project.md', {
    area: '[[area.md]]',
    monthlyBudget: 100,
    budgetCurrency: 'USD',
  });
  const paid = normalizeTask('paid.md', {
    taskType: 'payment',
    project: '[[project.md]]',
    status: 'done',
    completedDate: '2026-10-02',
    amount: 30,
    currency: 'USD',
  });
  const pending = normalizeTask('pending.md', {
    taskType: 'payment',
    project: '[[project.md]]',
    scheduled: '2026-10-10',
    amount: 50,
    currency: 'USD',
  });
  const other = normalizeTask('eur.md', {
    taskType: 'payment',
    project: '[[project.md]]',
    scheduled: '2026-10-10',
    amount: 12,
    currency: 'EUR',
  });
  let reports = budgetReport([paid, pending, other], [project], [area], '2026-10-01', '2026-10-31');
  assert.equal(reports[0]!.remaining, 70);
  assert.equal(reports[0]!.committed, 20);
  assert.equal(reports[1]!.spent, 30);
  assert.deepEqual(reports[0]!.other, ['EUR']);
  paid.status = 'todo';
  reports = budgetReport([paid, pending], [project], [area], '2026-10-01', '2026-10-31');
  assert.equal(reports[0]!.spent, 0);
});
test('zero budgets remain configured while empty budgets are absent', () => {
  const project = normalizeProject('p.md', { monthlyBudget: 0 });
  const empty = normalizeProject('e.md', {});
  assert.equal(budgetReport([], [project, empty], [], '2026-10-01', '2026-10-31').length, 1);
});
