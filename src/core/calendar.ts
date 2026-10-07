import { expand } from './selectors';
import { calendarPeriod, periodDates, monthGrid } from './dates';
import { Occurrence, Task, isActive } from './model';
export type CalendarView = 'day' | 'week' | 'month';
export function calendarDays(view: CalendarView, focus: string, month: string): string[] {
  return view === 'day'
    ? [focus]
    : view === 'week'
      ? periodDates(calendarPeriod(focus, 7).from, 7)
      : monthGrid(month);
}
export function workDays(task: Task): string[] {
  return [...new Set([task.scheduled, ...(task.workDates || [])].filter(Boolean))].sort();
}
/** Work sessions and deadlines are distinct calendar events; recurrence keeps its native keys. */
export function calendarItems(task: Task, from: string, to: string): Occurrence[] {
  if (task.kind === 'subscription') return [];
  if (task.recurrence)
    return expand(task, from, to).map((i) => ({ ...i, calendarRole: 'work' as const }));
  const work = workDays(task);
  const dates = [...new Set([...work, task.due].filter(Boolean))].sort();
  return dates
    .filter((d) => d >= from && d <= to)
    .map((date) => ({
      task,
      key: '',
      date,
      end: task.due || work.at(-1) || date,
      status: task.status,
      minutes: task.minutes,
      recurring: false,
      calendarRole: work.includes(date) ? 'work' : 'deadline',
    }));
}
export function dayLoad(tasks: readonly Task[], date: string, capacity: number) {
  let minutes = 0,
    unestimated = 0;
  for (const task of tasks) {
    if (!isActive(task.status) || task.kind === 'payment' || task.kind === 'subscription') continue;
    const dates = workDays(task);
    const planned = task.recurrence
      ? calendarItems(task, date, date).some((i) => isActive(i.status))
      : dates.includes(date) || (!dates.length && task.due === date);
    if (!planned) continue;
    if (!task.plannedMinutes) unestimated++;
    else {
      const count = task.recurrence ? 1 : Math.max(1, dates.length);
      const index = task.recurrence || !dates.length ? 0 : dates.indexOf(date);
      minutes +=
        Math.floor(task.plannedMinutes / count) + (index < task.plannedMinutes % count ? 1 : 0);
    }
  }
  return {
    date,
    minutes: Math.round(minutes),
    unestimated,
    capacity,
    over: minutes > capacity,
  };
}
