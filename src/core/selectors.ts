import { Occurrence, Task, TERMINAL, isActive } from './model';
import { utc, dateKey } from './dates';
import { queryRule, repeatDates, recurrenceEnd } from './recurrence';
export function expand(task: Task, from: string, to: string): Occurrence[] {
  if (task.kind === 'subscription' || task.unsupportedRepeat) return [];
  try {
    if (!task.recurrence) {
      const date = task.scheduled || task.workDates?.[0] || task.due;
      const end = task.due && task.due >= date ? task.due : date;
      if (!date || date > to || end < from) return [];
      return [
        { task, key: '', date, end, status: task.status, minutes: task.minutes, recurring: false },
      ];
    }
    const keys = new Set(repeatDates(task.recurrence, task.scheduled, from, to));
    for (const k of Object.keys(task.moves))
      if (task.moves[k]! >= from && task.moves[k]! <= to) keys.add(k);
    // Preserve explicit history even if a rule or series end was changed later.
    for (const k of Object.keys(task.occurrences)) {
      const date = task.moves[k] || k;
      if (date >= from && date <= to) keys.add(k);
    }
    const until = recurrenceEnd(task.recurrence);
    const skipped = new Set(task.skipped);
    const output: Occurrence[] = [];
    for (const k of keys) {
      const date = task.moves[k] || k;
      const record = task.occurrences[k];
      if (
        skipped.has(k) ||
        (until && k > until && isActive(record?.status ?? task.status)) ||
        date < from ||
        date > to ||
        (k < task.scheduled && !record) ||
        (task.seriesEnd && k > task.seriesEnd && !record) ||
        (!isActive(task.status) && !record)
      )
        continue;
      output.push({
        task,
        key: k,
        date,
        end: date,
        status: record?.status ?? task.status,
        minutes: record?.minutes ?? 0,
        recurring: true,
      });
    }
    return output.sort((a, b) => a.date.localeCompare(b.date));
  } catch (e) {
    if (!(e instanceof Error) || e.name !== 'RecurrenceLimitError') throw e;
    task.unsupportedRepeat = e.message;
    return [];
  }
}
export function isOverdue(item: Occurrence, today: string): boolean {
  return (
    isActive(item.status) && item.task.kind !== 'subscription' && !!item.end && item.end < today
  );
}
function compareItems(a: Occurrence, b: Occurrence, withinDay = false): number {
  return (
    (withinDay ? 0 : a.date.localeCompare(b.date)) ||
    (a.task.scheduledTime || '24:00').localeCompare(b.task.scheduledTime || '24:00') ||
    Number(TERMINAL.has(a.status)) - Number(TERMINAL.has(b.status)) ||
    Number(b.task.priority === 'high') - Number(a.task.priority === 'high') ||
    a.task.title.localeCompare(b.task.title)
  );
}
export function sortItems(items: Occurrence[], withinDay = false): Occurrence[] {
  return items.sort((a, b) => compareItems(a, b, withinDay));
}
export function todayItems(
  tasks: Task[],
  today: string,
  limits?: { overdue: number; today: number },
): { overdue: Occurrence[]; today: Occurrence[]; counts: { overdue: number; today: number } } {
  const result = {
    overdue: [] as Occurrence[],
    today: [] as Occurrence[],
    counts: { overdue: 0, today: 0 },
  };
  const add = (group: 'overdue' | 'today', item: Occurrence) => {
    result.counts[group]++;
    const items = result[group];
    if (!limits) {
      items.push(item);
      return;
    }
    const limit = Math.max(0, limits[group]);
    if (
      !limit ||
      (items.length >= limit &&
        compareItems(item, items[items.length - 1]!, group === 'today') >= 0)
    )
      return;
    let low = 0,
      high = items.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (compareItems(items[mid]!, item, group === 'today') <= 0) low = mid + 1;
      else high = mid;
    }
    items.splice(low, 0, item);
    if (items.length > limit) items.pop();
  };
  for (const task of tasks) {
    if (task.kind === 'subscription') continue;
    if (!task.recurrence) {
      const work = new Set([task.scheduled, ...(task.workDates || [])].filter(Boolean));
      const item = taskItem(task, today);
      if (isOverdue(item, today)) add('overdue', item);
      else if (
        work.has(today) ||
        task.due === today ||
        (!isActive(task.status) && task.resolvedOn === today)
      )
        add('today', work.has(today) ? { ...item, date: today } : item);
      continue;
    }
    let from =
      task.scheduled && task.scheduled < today
        ? task.scheduled
        : task.due && task.due < today
          ? task.due
          : today;
    if (task.recurrence && !task.unsupportedRepeat) {
      for (const date of Object.values(task.moves)) if (date < from) from = date;
      for (const key of Object.keys(task.occurrences)) {
        const date = task.moves[key] || key;
        if (date < from) from = date;
      }
    }
    const entries = expand(task, from, today);
    if (task.recurrence && !task.unsupportedRepeat) {
      const existing = new Set(entries.map((item) => item.key));
      for (const [key, record] of Object.entries(task.occurrences)) {
        if (
          isActive(record.status) ||
          existing.has(key) ||
          task.skipped.includes(key) ||
          dateKey(record.resolvedOn || record.resolvedAt) !== today
        )
          continue;
        const date = task.moves[key] || key;
        entries.push({
          task,
          key,
          date,
          end: date,
          status: record.status,
          minutes: record.minutes || 0,
          recurring: true,
        });
      }
    }
    if (!task.recurrence && !entries.length && !isActive(task.status) && task.resolvedOn === today)
      entries.push(taskItem(task, today));
    for (const item of entries) {
      if (isOverdue(item, today)) add('overdue', item);
      else if (
        (item.date <= today && item.end >= today) ||
        (!isActive(item.status) &&
          (item.recurring
            ? dateKey(
                task.occurrences[item.key]?.resolvedOn || task.occurrences[item.key]?.resolvedAt,
              )
            : task.resolvedOn) === today)
      )
        add('today', item);
    }
  }
  return {
    overdue: sortItems(result.overdue),
    today: sortItems(result.today, true),
    counts: result.counts,
  };
}
export function taskItem(task: Task, today: string): Occurrence {
  if (task.kind === 'subscription')
    return {
      task,
      key: '',
      date: task.scheduled,
      end: task.scheduled,
      status: task.status,
      minutes: 0,
      recurring: false,
    };
  if (task.recurrence && task.unsupportedRepeat)
    return { task, key: '', date: '', end: '', status: task.status, minutes: 0, recurring: true };
  try {
    if (task.recurrence && !task.unsupportedRepeat) {
      // Stop at the first unresolved native date instead of expanding years of history.
      let overdue: Occurrence | undefined;
      if (isActive(task.status) && task.scheduled < today) {
        const skipped = new Set(task.skipped);
        queryRule(task.recurrence, task.scheduled, task.scheduled).between(
          utc(task.scheduled),
          utc(today),
          true,
          (date) => {
            const key = date.toISOString().slice(0, 10);
            if (task.seriesEnd && key > task.seriesEnd) return false;
            if (key >= today) return false;
            if (
              !task.moves[key] &&
              !skipped.has(key) &&
              isActive(task.occurrences[key]?.status ?? task.status)
            ) {
              overdue = {
                task,
                key,
                date: key,
                end: key,
                status: task.occurrences[key]?.status ?? task.status,
                minutes: task.occurrences[key]?.minutes ?? 0,
                recurring: true,
              };
              return false;
            }
            return true;
          },
        );
      }
      const until = recurrenceEnd(task.recurrence);
      // Explicit moves/history may precede both the anchor and the first native date.
      for (const key of new Set([...Object.keys(task.moves), ...Object.keys(task.occurrences)])) {
        const date = task.moves[key] || key;
        const record = task.occurrences[key];
        if (
          date >= today ||
          (until && key > until) ||
          task.skipped.includes(key) ||
          !isActive(record?.status ?? task.status) ||
          (!isActive(task.status) && !record) ||
          (key < task.scheduled && !record) ||
          (task.seriesEnd && key > task.seriesEnd && !record)
        )
          continue;
        if (!overdue || date < overdue.date)
          overdue = {
            task,
            key,
            date,
            end: date,
            status: task.occurrences[key]?.status ?? task.status,
            minutes: record?.minutes ?? 0,
            recurring: true,
          };
      }
      if (overdue) return overdue;
      const current =
        expand(task, today, today).find((o) => o.key === today) || expand(task, today, today)[0];
      if (current) return current;
      if (isActive(task.status)) {
        const moved = Object.entries(task.moves)
          .filter(
            ([key, date]) =>
              date >= today &&
              (!until || key <= until) &&
              !task.skipped.includes(key) &&
              isActive(task.occurrences[key]?.status ?? task.status) &&
              (key >= task.scheduled || !!task.occurrences[key]) &&
              (!task.seriesEnd || key <= task.seriesEnd || !!task.occurrences[key]),
          )
          .map(([key, date]): Occurrence => ({
            task,
            key,
            date,
            end: date,
            status: task.occurrences[key]?.status ?? task.status,
            minutes: task.occurrences[key]?.minutes ?? 0,
            recurring: true,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
        const rule = queryRule(task.recurrence, task.scheduled, today);
        let next = rule.after(utc(today), true);
        let inspected = 0;
        while (next) {
          if (++inspected > 256) {
            const e = new Error(
              'Too many resolved future repeats; simplify the series or shorten its history.',
            );
            e.name = 'RecurrenceLimitError';
            throw e;
          }
          const key = next.toISOString().slice(0, 10);
          if (task.seriesEnd && key > task.seriesEnd) break;
          if (
            !task.moves[key] &&
            !task.skipped.includes(key) &&
            isActive(task.occurrences[key]?.status ?? task.status)
          ) {
            const date = key;
            const candidate: Occurrence = {
              task,
              key,
              date,
              end: date,
              status: task.occurrences[key]?.status ?? task.status,
              minutes: task.occurrences[key]?.minutes ?? 0,
              recurring: true,
            };
            return moved[0] && moved[0].date < date ? moved[0] : candidate;
          }
          next = rule.after(next, false);
        }
        if (moved[0]) return moved[0];
      }
      const last = expand(task, task.scheduled < today ? task.scheduled : today, today).at(-1);
      if (last) return last;
      return {
        task,
        key: '',
        date: '',
        end: '',
        status: task.status,
        minutes: task.minutes,
        recurring: true,
      };
    }
    const date = task.scheduled || task.workDates?.[0] || task.due;
    return {
      task,
      key: '',
      date,
      end: task.due || [date, ...(task.workDates || [])].sort().at(-1) || date,
      status: task.status,
      minutes: task.minutes,
      recurring: false,
    };
  } catch (e) {
    if (!(e instanceof Error) || e.name !== 'RecurrenceLimitError') throw e;
    task.unsupportedRepeat = e.message;
    return { task, key: '', date: '', end: '', status: task.status, minutes: 0, recurring: true };
  }
}
