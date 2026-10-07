import { Task, Occurrence, PeriodDays, isActive } from './model';
import { calendarPeriod, periodDates, dateKey } from './dates';
import { expand } from './selectors';
import { subscriptionPayments } from './subscriptions';
export interface Expense {
  task: Task;
  key: string;
  date: string;
  amount: number | null;
  currency: string;
  paid: boolean;
  item?: Occurrence;
}
export const expenseValue = (item: Occurrence): { amount: number | null; currency: string } => {
  const record = item.recurring ? item.task.occurrences[item.key] : item.task.payment;
  return item.status === 'done' && record && 'amount' in record
    ? { amount: record.amount ?? null, currency: record.currency || item.task.currency }
    : { amount: item.task.amount, currency: item.task.currency };
};
/** Explicit actual payments only. Reopening and skipping remove an occurrence from actual totals. */
export function actualExpenses(tasks: readonly Task[]): Expense[] {
  const result: Expense[] = [];
  for (const task of tasks) {
    if (task.kind === 'subscription') {
      for (const [key, r] of Object.entries(task.charges || {}))
        result.push({
          task,
          key,
          date: r.paidOn,
          amount: r.amount,
          currency: r.currency,
          paid: true,
        });
    } else if (task.kind === 'payment') {
      if (task.recurrence) {
        for (const [key, r] of Object.entries(task.occurrences)) {
          if (r.status !== 'done' || task.skipped.includes(key)) continue;
          const item: Occurrence = {
            task,
            key,
            date: task.moves[key] || key,
            end: task.moves[key] || key,
            status: r.status,
            minutes: r.minutes || 0,
            recurring: true,
          };
          result.push({
            task,
            key,
            date: dateKey(r.resolvedOn) || dateKey(r.resolvedAt),
            ...expenseValue(item),
            paid: true,
            item,
          });
        }
      } else if (task.status === 'done') {
        const item: Occurrence = {
          task,
          key: '',
          date: task.scheduled || task.due,
          end: task.due || task.scheduled,
          status: task.status,
          minutes: task.minutes,
          recurring: false,
        };
        result.push({
          task,
          key: '',
          date: task.resolvedOn,
          ...expenseValue(item),
          paid: true,
          item,
        });
      }
    }
  }
  return result.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      a.task.path.localeCompare(b.task.path) ||
      a.key.localeCompare(b.key),
  );
}
/** Finite forecast window; subscription charges are removed by their original billing key. */
export function plannedExpenses(tasks: readonly Task[], from: string, to: string): Expense[] {
  const result: Expense[] = [];
  for (const task of tasks) {
    if (task.kind === 'subscription') {
      for (const date of subscriptionPayments(task, from, to))
        result.push({
          task,
          key: date,
          date,
          amount: task.amount,
          currency: task.currency,
          paid: false,
        });
    } else if (task.kind === 'payment') {
      for (const item of expand(task, from, to))
        if (isActive(item.status) && item.date >= from && item.date <= to)
          result.push({
            task,
            key: item.key,
            date: item.date,
            ...expenseValue(item),
            paid: false,
            item,
          });
    }
  }
  return result.sort(
    (a, b) => a.date.localeCompare(b.date) || a.task.path.localeCompare(b.task.path),
  );
}
export function expenseTotals(entries: readonly Expense[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const e of entries)
    if (e.amount !== null) {
      // Six decimal places retain small-denomination currencies without binary sum noise.
      result.set(
        e.currency,
        Math.min(
          Number.MAX_SAFE_INTEGER,
          Math.round(((result.get(e.currency) || 0) + e.amount) * 1e6) / 1e6,
        ),
      );
    }
  return result;
}
export function financialAnalytics(tasks: readonly Task[], today: string, days: PeriodDays) {
  const { from, to } = calendarPeriod(today, days);
  const all = actualExpenses(tasks),
    actual = all.filter((e) => e.date >= from && e.date <= to);
  const planned = plannedExpenses(tasks, from, to);
  const missing = all.filter((e) => !e.date || e.amount === null);
  const entriesByDay = new Map<string, Expense[]>();
  for (const entry of actual) {
    const entries = entriesByDay.get(entry.date) || [];
    entries.push(entry);
    entriesByDay.set(entry.date, entries);
  }
  const currencies = [...new Set([...actual, ...planned].map((e) => e.currency))].sort();
  return {
    from,
    to,
    actual,
    planned,
    missing,
    currencies,
    actualTotals: expenseTotals(actual),
    plannedTotals: expenseTotals(planned),
    activity: periodDates(today, days).map((date) => {
      return { date, totals: expenseTotals(entriesByDay.get(date) || []) };
    }),
  };
}
