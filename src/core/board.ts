import { Task, Occurrence, isActive } from './model';
import { addDays, utc, shiftMonth, dateKey } from './dates';
import { sortItems, taskItem } from './selectors';
export type BoardScope = 'today' | 'week' | 'month' | 'all' | 'undated';
export function boardWindow(scope: BoardScope, today: string): [string, string] {
  if (scope === 'week') {
    const start = addDays(today, -((utc(today).getUTCDay() + 6) % 7));
    return [start, addDays(start, 6)];
  }
  if (scope === 'month') {
    const start = today.slice(0, 7) + '-01';
    return [start, addDays(shiftMonth(start, 1), -1)];
  }
  return [today, today];
}
/** One representative per note, no subscription or unbounded recurrence expansion. */
export function boardItems(tasks: readonly Task[], today: string, scope: BoardScope): Occurrence[] {
  const [from, to] = boardWindow(scope, today);
  const items: Occurrence[] = [];
  for (const task of tasks) {
    if (task.kind === 'subscription') continue;
    const item = taskItem(task, today);
    const active = isActive(item.status);
    const record = item.recurring ? task.occurrences[item.key] : undefined;
    const resolved = item.recurring
      ? dateKey(record?.resolvedOn || record?.resolvedAt)
      : task.resolvedOn;
    // Closed work belongs to one day, even when older notes have no resolution date.
    const date = active ? item.date : resolved || item.date;
    const end = active ? item.end : date;
    if (
      scope === 'all' ||
      (scope === 'undated'
        ? !task.scheduled && !task.workDates?.length && !task.due
        : !!date && ((date <= to && end >= from) || (active && end < from)))
    )
      items.push(item);
  }
  return sortItems(items);
}
