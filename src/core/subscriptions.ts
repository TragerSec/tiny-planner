import { Task } from './model';
import { dateKey, shiftMonth, utc } from './dates';

/** A payment forecast anchored to scheduled, separate from task RRULE/history.
 * Missing month days clamp to month end without changing the original anchor.
 */
function billingDate(task: Task, month: string): string {
  const anchor = task.scheduled;
  if (task.kind !== 'subscription' || !task.subscriptionActive || !dateKey(anchor)) return '';
  if (task.billingPeriod === 'yearly' && month.slice(5, 7) !== anchor.slice(5, 7)) return '';
  const last = utc(shiftMonth(month, 1));
  last.setUTCDate(0);
  const date =
    month.slice(0, 7) +
    '-' +
    String(Math.min(Number(anchor.slice(8)), last.getUTCDate())).padStart(2, '0');
  return date >= anchor ? date : '';
}
export function paymentOn(task: Task, date: string): boolean {
  return !!dateKey(date) && billingDate(task, date) === date && !task.charges?.[date];
}
/** Enumerate billing months, rather than testing every calendar day. */
export function subscriptionPayments(task: Task, from: string, to: string): string[] {
  if (!dateKey(from) || !dateKey(to) || from > to) return [];
  const result: string[] = [];
  let month = from.slice(0, 7) + '-01';
  const last = to.slice(0, 7) + '-01';
  // Financial views cover at most one year (13 month buckets).
  for (let count = 0; month <= last && count < 13; count++, month = shiftMonth(month, 1)) {
    const date = billingDate(task, month);
    if (date && date >= from && date <= to && !task.charges?.[date]) result.push(date);
  }
  return result;
}
export function nextPaymentDate(task: Task, from: string): string {
  if (!dateKey(from)) return '';
  const start = task.scheduled > from ? task.scheduled : from;
  // At most one annual billing cycle; never expand a historical series.
  for (let offset = 0; offset <= 12; offset++) {
    const date = billingDate(task, shiftMonth(start, offset));
    if (date && date >= from && !task.charges?.[date]) return date;
  }
  return '';
}
/** Estimated commitments, never transaction totals or currency conversions. */
export function monthlyCosts(tasks: readonly Task[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const t of tasks) {
    if (t.kind !== 'subscription' || !t.subscriptionActive || t.amount === null) continue;
    const amount = t.billingPeriod === 'yearly' ? t.amount / 12 : t.amount;
    totals.set(
      t.currency,
      Math.min(Number.MAX_SAFE_INTEGER, (totals.get(t.currency) || 0) + amount),
    );
  }
  return new Map([...totals].sort(([a], [b]) => a.localeCompare(b)));
}
