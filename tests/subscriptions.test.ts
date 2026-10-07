import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTask } from '../src/core/normalize';
import { paymentOn, nextPaymentDate, monthlyCosts } from '../src/core/subscriptions';
import { FM } from '../src/core/model';
const subscription = (fm: FM = {}) =>
  normalizeTask('Planner/Tasks/YouTube.md', {
    taskType: 'subscription',
    scheduled: '2026-10-01',
    amount: 14,
    currency: 'USD',
    ...fm,
  });
test('monthly forecast starts at the anchor and repeats next month without changing costs', () => {
  const t = subscription();
  assert.equal(paymentOn(t, '2026-09-01'), false);
  assert.equal(paymentOn(t, '2026-10-01'), true);
  assert.equal(paymentOn(t, '2026-11-01'), true);
  assert.equal(paymentOn(t, '2026-11-02'), false);
  assert.equal(nextPaymentDate(t, '2026-10-05'), '2026-11-01');
  assert.equal(nextPaymentDate(t, '2026-11-01'), '2026-11-01');
  assert.equal(nextPaymentDate(t, '1900-01-01'), '2026-10-01');
  assert.equal(nextPaymentDate(t, '2099-12-02'), '2100-01-01');
  assert.equal(monthlyCosts([t]).get('USD'), 14);
});
test('month end clamps to February and returns to the original day in March', () => {
  const t = subscription({ scheduled: '2024-01-31' });
  assert.equal(paymentOn(t, '2024-02-29'), true);
  assert.equal(paymentOn(t, '2025-02-28'), true);
  assert.equal(paymentOn(t, '2025-03-31'), true);
  assert.equal(paymentOn(t, '2025-03-28'), false);
  assert.equal(nextPaymentDate(t, '2025-02-01'), '2025-02-28');
});
test('annual forecast uses full amount and preserves leap-day anchor', () => {
  const t = subscription({ scheduled: '2024-02-29', billingPeriod: 'yearly', amount: 120 });
  assert.equal(paymentOn(t, '2025-02-28'), true);
  assert.equal(paymentOn(t, '2025-03-29'), false);
  assert.equal(paymentOn(t, '2028-02-29'), true);
  assert.equal(nextPaymentDate(t, '2025-03-01'), '2026-02-28');
  assert.equal(t.amount, 120);
  assert.equal(monthlyCosts([t]).get('USD'), 10);
});
test('cancelled, undated, invalid dates and ordinary tasks produce no billing events', () => {
  for (const t of [
    subscription({ subscriptionActive: false }),
    subscription({ scheduled: null }),
    subscription({ taskType: 'task' }),
  ]) {
    assert.equal(paymentOn(t, '2026-10-01'), false);
    assert.equal(nextPaymentDate(t, '2026-10-05'), '');
  }
  assert.equal(paymentOn(subscription(), '2026-13-01'), false);
  assert.equal(nextPaymentDate(subscription(), 'invalid'), '');
  assert.equal(paymentOn(subscription({ amount: null }), '2026-11-01'), true);
  assert.equal(paymentOn(subscription({ amount: 0 }), '2026-11-01'), true);
});

test('legacy subscription recurrence cannot infer a missing payment date from note creation', () => {
  const t = subscription({
    scheduled: null,
    dateCreated: '2026-10-01T12:00:00Z',
    recurrence: 'FREQ=MONTHLY',
  });
  assert.equal(t.scheduled, '');
  assert.equal(nextPaymentDate(t, '2026-10-05'), '');
  assert.equal(paymentOn(t, '2026-11-01'), false);
});
