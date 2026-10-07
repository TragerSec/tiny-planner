import { Area, Project, Task } from './model';
import { actualExpenses, plannedExpenses } from './expenses';
import { addDays, dateKey, distance } from './dates';
/** Monthly limits are prorated by actual month length for partial calendar periods. */
export function periodBudget(monthly: number, from: string, to: string): number {
  if (!from || !to || dateKey(from) !== from || dateKey(to) !== to || to < from) return 0;
  let amount = 0;
  for (let start = from; start <= to;) {
    const monthStart = start.slice(0, 7) + '-01';
    const y = Number(start.slice(0, 4)),
      m = Number(start.slice(5, 7));
    const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
    const end = to < next ? to : addDays(next, -1);
    amount += (monthly * (distance(start, end) + 1)) / distance(monthStart, next);
    start = next;
  }
  return Math.round(amount * 1e6) / 1e6;
}
export function budgetReport(
  tasks: readonly Task[],
  projects: readonly Project[],
  areas: readonly Area[],
  from: string,
  to: string,
) {
  const actual = actualExpenses(tasks).filter((e) => e.date >= from && e.date <= to);
  const planned = plannedExpenses(tasks, from, to);
  const projectAreas = new Map(projects.map((p) => [p.path, p.area]));
  return [
    ...projects.map((p) => ({ ...p, scope: 'project' as const })),
    ...areas.map((a) => ({ ...a, scope: 'area' as const })),
  ]
    .filter((s) => s.monthlyBudget !== null && s.monthlyBudget !== undefined)
    .map((scope) => {
      const currency = scope.budgetCurrency || 'USD';
      const matches = (path: string) =>
        scope.scope === 'project' ? path === scope.path : projectAreas.get(path) === scope.path;
      const paid = actual.filter((e) => matches(e.task.project));
      const pending = planned.filter((e) => matches(e.task.project));
      const spent = paid
        .filter((e) => e.currency === currency)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      const forecast = pending
        .filter((e) => e.currency === currency)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      const limit = periodBudget(scope.monthlyBudget!, from, to);
      return {
        scope,
        currency,
        limit,
        spent,
        forecast,
        remaining: limit - spent,
        committed: limit - spent - forecast,
        other: [
          ...new Set(
            [...paid, ...pending].filter((e) => e.currency !== currency).map((e) => e.currency),
          ),
        ],
        unpriced: [...paid, ...pending].filter((e) => e.amount === null).length,
      };
    });
}
