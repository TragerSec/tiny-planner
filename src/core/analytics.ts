import { PeriodDays, Project, Status, Task, STATUSES, isActive } from './model';
import { periodDates, dateKey } from './dates';

export interface Counts {
  open: number;
  done: number;
  failed: number;
}
export interface Activity {
  date: string;
  done: number;
  failed: number;
  minutes: number;
}
export interface ProjectStats {
  project: Project;
  tasks: number;
  finite: Counts;
  series: number;
  minutes: number;
}
export interface Analytics {
  tasks: number;
  finite: Counts;
  workflow: Record<Status, number>;
  series: number;
  history: Counts;
  overdue: number;
  noDate: number;
  inbox: number;
  unsupported: number;
  minutes: number;
  undated: number;
  recordedMinutes: number;
  openMinutes: number;
  unallocatedMinutes: number;
  projects: ProjectStats[];
  projectStatuses: Record<Status, number>;
  activity: Activity[];
  period: Omit<Activity, 'date'>;
}
const counts = (): Counts => ({ open: 0, done: 0, failed: 0 });
// Keep rendering finite even when hand-edited metadata contains enormous numbers.
const sum = (a: number, b: number): number =>
  Math.min(Number.MAX_SAFE_INTEGER, a + (Number.isFinite(b) && b > 0 ? b : 0));
export const isSeries = (task: Task): boolean => !!task.recurrence;
export function loggedMinutes(task: Task): number {
  if (task.kind === 'subscription' || task.kind === 'payment') return 0;
  let minutes = sum(0, task.minutes);
  if (isSeries(task)) {
    const skipped = new Set(task.skipped);
    for (const [key, record] of Object.entries(task.occurrences))
      if (!skipped.has(key)) minutes = sum(minutes, record.minutes || 0);
  }
  return minutes;
}
export function completion(c: Counts): number | null {
  const total = c.open + c.done + c.failed;
  return total ? Math.round((c.done / total) * 100) : null;
}

/** One pass over notes and explicit history. Never expands a recurrence rule.
 * Task progress counts one-off notes; recurring resolutions are separate events.
 * Activity belongs to the scheduled work day; closure dates remain audit metadata.
 */
export function analytics(
  tasks: readonly Task[],
  projects: readonly Project[],
  today: string,
  days: PeriodDays,
  knownProjectPaths: ReadonlySet<string> = new Set(projects.map((p) => p.path)),
): Analytics {
  const result: Analytics = {
    tasks: tasks.filter((t) => t.kind !== 'subscription' && t.kind !== 'payment').length,
    workflow: Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>,
    finite: counts(),
    series: 0,
    history: counts(),
    overdue: 0,
    noDate: 0,
    inbox: 0,
    unsupported: 0,
    minutes: 0,
    undated: 0,
    recordedMinutes: 0,
    openMinutes: 0,
    unallocatedMinutes: 0,
    projects: projects.map((project) => ({
      project,
      tasks: 0,
      finite: counts(),
      series: 0,
      minutes: 0,
    })),
    projectStatuses: Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>,
    activity: periodDates(today, days).map((date) => ({
      date,
      done: 0,
      failed: 0,
      minutes: 0,
    })),
    period: { done: 0, failed: 0, minutes: 0 },
  };
  const byProject = new Map(result.projects.map((p) => [p.project.path, p]));
  const byDay = new Map(result.activity.map((d) => [d.date, d]));
  for (const p of projects) {
    const status = p.status;
    if (Object.prototype.hasOwnProperty.call(result.projectStatuses, status))
      result.projectStatuses[status]++;
  }
  const event = (status: Status, date: string, minutes: number): void => {
    if (status !== 'done' && status !== 'failed') return;
    if (!date) result.undated++;
    const d = byDay.get(date);
    if (!d) return;
    d[status]++;
    d.minutes = sum(d.minutes, minutes);
    result.period[status]++;
    result.period.minutes = sum(result.period.minutes, minutes);
  };
  for (const task of tasks) {
    if (task.kind === 'subscription' || task.kind === 'payment') continue;
    const p = byProject.get(task.project);
    if (p) p.tasks++;
    if (!knownProjectPaths.has(task.project)) result.inbox++;
    if (!task.scheduled && !task.workDates?.length && !task.due) result.noDate++;
    if (task.unsupportedRepeat) result.unsupported++;
    let minutes = isSeries(task) || isActive(task.status) ? 0 : sum(0, task.minutes);
    result.recordedMinutes = sum(result.recordedMinutes, loggedMinutes(task));
    if (isSeries(task)) {
      result.unallocatedMinutes = sum(result.unallocatedMinutes, task.minutes);
      result.series++;
      if (p) p.series++;
      const skipped = new Set(task.skipped);
      for (const [key, record] of Object.entries(task.occurrences)) {
        if (skipped.has(key)) continue;
        result.history[
          record.status === 'done' || record.status === 'failed' ? record.status : 'open'
        ]++;
        if (isActive(record.status))
          result.openMinutes = sum(result.openMinutes, record.minutes || 0);
        else minutes = sum(minutes, record.minutes || 0);
        event(
          record.status,
          dateKey(task.moves[key]) ||
            dateKey(key) ||
            dateKey(record.resolvedOn) ||
            dateKey(record.resolvedAt),
          record.minutes || 0,
        );
      }
    } else {
      if (isActive(task.status)) result.openMinutes = sum(result.openMinutes, task.minutes);
      result.workflow[task.status]++;
      result.finite[task.status === 'done' || task.status === 'failed' ? task.status : 'open']++;
      if (p) p.finite[task.status === 'done' || task.status === 'failed' ? task.status : 'open']++;
      event(
        task.status,
        dateKey(task.scheduled) ||
          dateKey(task.workDates?.[0]) ||
          dateKey(task.due) ||
          dateKey(task.resolvedOn),
        minutes,
      );
      const end = task.due || task.scheduled || task.workDates?.at(-1);
      if (isActive(task.status) && end && end < today) result.overdue++;
    }
    result.minutes = sum(result.minutes, minutes);
    if (p) p.minutes = sum(p.minutes, minutes);
  }
  return result;
}
