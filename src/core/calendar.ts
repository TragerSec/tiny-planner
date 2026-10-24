import { expand } from './selectors';
import { calendarPeriod, periodDates, monthGrid } from './dates';
import { Occurrence, Task, isActive } from './model';
export type CalendarView = 'day' | 'week' | 'month';
export interface CalendarWeekLanes {
  dates: readonly string[];
  lanes: Map<string, number>;
  count: number;
}
/** Greedy interval partitioning: reuse a lane only after its inclusive end.
 * Each week is packed independently; no dates outside the viewport are expanded. */
export function calendarLanes(
  tasks: readonly Task[],
  dates: readonly string[],
): CalendarWeekLanes[] {
  const weeks: CalendarWeekLanes[] = [];
  for (let offset = 0; offset < dates.length; offset += 7) {
    const visible = dates.slice(offset, offset + 7);
    const from = visible[0]!,
      to = visible.at(-1)!;
    const intervals = tasks
      .filter(
        (t) =>
          !t.recurrence &&
          t.kind !== 'subscription' &&
          t.scheduled &&
          t.due > t.scheduled &&
          t.scheduled <= to &&
          t.due >= from,
      )
      .map((t) => ({
        path: t.path,
        from: t.scheduled < from ? from : t.scheduled,
        to: t.due > to ? to : t.due,
      }))
      .sort(
        (a, b) =>
          a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.path.localeCompare(b.path),
      );
    const ends: string[] = [];
    const lanes = new Map<string, number>();
    let cursor = 0;
    for (const date of visible) {
      const free = ends
        .map((end, lane) => ({ end, lane }))
        .filter((entry) => entry.end < date)
        .map((entry) => entry.lane)
        .reverse();
      while (cursor < intervals.length && intervals[cursor]!.from === date) {
        const interval = intervals[cursor++]!;
        const lane = free.pop() ?? ends.length;
        ends[lane] = interval.to;
        lanes.set(interval.path, lane);
      }
    }
    weeks.push({ dates: visible, lanes, count: ends.length });
  }
  return weeks;
}
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
    if (task.kind === 'payment' || task.kind === 'subscription') continue;
    if (task.recurrence) {
      const active = calendarItems(task, date, date).filter((i) => isActive(i.status)).length;
      if (!task.plannedMinutes) unestimated += active;
      else minutes += task.plannedMinutes * active;
      continue;
    }
    if (!isActive(task.status)) continue;
    const dates = workDays(task);
    const planned = dates.includes(date) || (!dates.length && task.due === date);
    if (!planned) continue;
    if (!task.plannedMinutes) unestimated++;
    else {
      const count = Math.max(1, dates.length);
      const index = !dates.length ? 0 : dates.indexOf(date);
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

/** Batch the visible range: expand each recurring series once, not once per day. */
export function dayLoads(
  tasks: readonly Task[],
  dates: readonly string[],
  capacity: number,
): Map<string, ReturnType<typeof dayLoad>> {
  const ordered = [...new Set(dates)].sort();
  const loads = new Map(
    ordered.map((date) => [date, { date, minutes: 0, unestimated: 0, capacity, over: false }]),
  );
  if (!ordered.length) return loads;
  const add = (date: string, estimate: number | undefined) => {
    const load = loads.get(date);
    if (!load) return;
    if (!estimate) load.unestimated++;
    else load.minutes += estimate;
  };
  for (const task of tasks) {
    if (task.kind === 'payment' || task.kind === 'subscription') continue;
    if (task.recurrence) {
      for (const item of calendarItems(task, ordered[0]!, ordered.at(-1)!))
        if (isActive(item.status)) add(item.date, task.plannedMinutes);
      continue;
    }
    if (!isActive(task.status)) continue;
    const work = workDays(task);
    const selected = work.length ? work : task.due ? [task.due] : [];
    for (const [index, date] of selected.entries()) {
      const load = loads.get(date);
      if (!load) continue;
      if (!task.plannedMinutes) load.unestimated++;
      else
        load.minutes +=
          Math.floor(task.plannedMinutes / selected.length) +
          (index < task.plannedMinutes % selected.length ? 1 : 0);
    }
  }
  for (const load of loads.values()) {
    load.minutes = Math.round(load.minutes);
    load.over = load.minutes > capacity;
  }
  return loads;
}

/** Presentation only: bounded by visible dates, never work or completion occurrences. */
export function calendarContinuations(task: Task, visibleDates: readonly string[]): string[] {
  if (
    task.recurrence ||
    task.kind === 'subscription' ||
    !task.scheduled ||
    !task.due ||
    task.scheduled >= task.due
  )
    return [];
  const work = new Set(workDays(task));
  return visibleDates.filter((date) => date > task.scheduled && date < task.due && !work.has(date));
}
