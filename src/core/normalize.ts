import {
  Area,
  FM,
  Kind,
  Project,
  Task,
  Resolution,
  link,
  normalizeStatus,
  safeMinutes,
  strings,
  title,
} from './model';
import { dateKey, timeKey } from './dates';
import { normalizeRule, validateRule } from './recurrence';
export function safeAmount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1e12
    ? value
    : null;
}
export function safeCurrency(value: unknown): string {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value) ? value : 'USD';
}
export function normalizeTask(path: string, fm: FM): Task {
  const paymentCancelled =
    String(fm.taskType ?? fm.kind).toLowerCase() === 'payment' &&
    /^(cancelled|canceled|archived|archive)$/i.test(String(fm.status));
  const status = paymentCancelled ? 'failed' : normalizeStatus(fm.status);
  const kind = String(fm.taskType ?? fm.kind ?? 'task').toLowerCase() as Kind;
  const recurrence = normalizeRule(fm.recurrence ?? fm.repeat);
  const scheduled =
    dateKey(fm.scheduled) || (recurrence && kind !== 'subscription' ? dateKey(fm.dateCreated) : '');
  const occurrences: Record<string, Resolution> = {};
  for (const k of strings(fm.complete_instances ?? fm.completeInstances)) {
    const d = dateKey(k);
    if (d) occurrences[d] = { status: 'done' };
  }
  if (fm.topOccurrences && typeof fm.topOccurrences === 'object') {
    for (const [k, v] of Object.entries(fm.topOccurrences))
      if (dateKey(k) === k && v && typeof v === 'object' && !Array.isArray(v)) {
        const r = v as Record<string, unknown>;
        occurrences[k] = {
          status: normalizeStatus(r.status),
          minutes: safeMinutes(r.minutes),
          resolvedAt: r.resolvedAt ? String(r.resolvedAt) : undefined,
          resolvedOn: dateKey(r.resolvedOn),
          ...(Object.prototype.hasOwnProperty.call(r, 'amount')
            ? { amount: safeAmount(r.amount), currency: safeCurrency(r.currency) }
            : {}),
        };
      }
  }
  const moves: Record<string, string> = {};
  if (fm.topMoves && typeof fm.topMoves === 'object')
    for (const [k, v] of Object.entries(fm.topMoves))
      if (dateKey(k) === k && dateKey(v)) moves[k] = dateKey(v);
  const charges: NonNullable<Task['charges']> = {};
  if (fm.topCharges && typeof fm.topCharges === 'object' && !Array.isArray(fm.topCharges)) {
    for (const [key, raw] of Object.entries(fm.topCharges)) {
      if (dateKey(key) !== key || !raw || typeof raw !== 'object') continue;
      const r = raw as FM,
        amount = safeAmount(r.amount),
        paidOn = dateKey(r.paidOn);
      if (amount !== null && paidOn)
        charges[key] = { amount, currency: safeCurrency(r.currency), paidOn };
    }
  }
  const payment =
    fm.topPayment && typeof fm.topPayment === 'object' ? (fm.topPayment as FM) : undefined;
  const kinds: Kind[] = ['task', 'meeting', 'payment', 'status', 'subscription'];
  return {
    path,
    title: title(fm, path),
    description: typeof fm.description === 'string' ? fm.description : '',
    status,
    kind: kinds.includes(kind) ? kind : 'task',
    project: link(fm.project ?? fm.projects),
    scheduled,
    scheduledTime: timeKey(fm.scheduledTime),
    workDates: [...new Set(strings(fm.workDates).map(dateKey).filter(Boolean))].sort(),
    plannedMinutes: safeMinutes(fm.plannedMinutes),
    due: dateKey(fm.due),
    recurrence,
    seriesEnd: dateKey(fm.topSeriesEnd),
    occurrences,
    moves,
    skipped: strings(fm.topSkipped).map(dateKey).filter(Boolean),
    minutes: safeMinutes(fm.actualMinutes ?? fm.topMinutes),
    resolvedOn:
      status === 'done'
        ? dateKey(fm.completedDate)
        : status === 'failed'
          ? dateKey(fm.failedDate)
          : '',
    priority: fm.priority === 'high' ? 'high' : 'normal',
    unsupportedRepeat:
      kind !== 'subscription' && recurrence ? validateRule(recurrence, scheduled) : '',
    amount: safeAmount(fm.amount),
    currency: safeCurrency(fm.currency),
    charges,
    ...(payment
      ? {
          payment: { amount: safeAmount(payment.amount), currency: safeCurrency(payment.currency) },
        }
      : {}),
    billingPeriod:
      fm.billingPeriod === 'yearly' || (!fm.billingPeriod && /FREQ=YEARLY/.test(recurrence))
        ? 'yearly'
        : 'monthly',
    subscriptionActive:
      typeof fm.subscriptionActive === 'boolean'
        ? fm.subscriptionActive
        : status !== 'done' && status !== 'failed',
  };
}
export function normalizeProject(path: string, fm: FM): Project {
  return {
    path,
    title: title(fm, path),
    area: link(fm.area),
    status: normalizeStatus(fm.status ?? 'backlog'),
    due: dateKey(fm.due),
    monthlyBudget: safeAmount(fm.monthlyBudget),
    budgetCurrency: safeCurrency(fm.budgetCurrency),
  };
}
export function normalizeArea(path: string, fm: FM): Area {
  return {
    path,
    title: title(fm, path),
    monthlyBudget: safeAmount(fm.monthlyBudget),
    budgetCurrency: safeCurrency(fm.budgetCurrency),
  };
}
