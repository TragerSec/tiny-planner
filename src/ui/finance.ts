import { Expense, financialAnalytics, expenseTotals } from '../core/expenses';
import { Task, PeriodDays } from '../core/model';
import { DateFormat, formatDate } from '../core/dates';
import { el, select, button, datedHeading } from './dom';
import { Words } from './i18n';
import { fitChart, periodBuckets, periodHeading } from './dashboard';
export interface FinanceState {
  days: PeriodDays;
  currency: string;
  limit: number;
}
export function money(amount: number, currency: string, locale: string): string {
  return (
    new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(
      amount,
    ) +
    ' ' +
    currency
  );
}
export function financeDashboard(
  parent: HTMLElement,
  tasks: Task[],
  today: string,
  state: FinanceState,
  w: Words,
  locale: string,
  dateFormat: DateFormat,
  refresh: () => void,
  projectLabel: (t: Task) => string,
  openExpenses: () => void,
): void {
  const data = financialAnalytics(tasks, today, state.days);
  const root = el(parent, 'div', 'tp-finance');
  const range = `${formatDate(data.from, dateFormat)} — ${formatDate(data.to, dateFormat)}`;
  const head = periodHeading(root, w.periodSummary, range, state, w, refresh, parent);
  const manage = button(head, w.subscriptions, openExpenses, 'tp-text-button');
  manage.dataset.financeLedger = 'true';
  financeOverview(root, data, w, locale, dateFormat);
  if (data.missing.length)
    el(root, 'p', 'tp-warning', `${w.financeMissing}: ${data.missing.length}`);
  const undated = tasks.filter(
    (t) =>
      t.kind === 'payment' &&
      !t.scheduled &&
      !t.due &&
      t.status !== 'done' &&
      t.status !== 'failed',
  ).length;
  if (undated) el(root, 'p', 'tp-muted', `${w.undatedPayments}: ${undated}`);
  const unknown = data.planned.filter((e) => e.amount === null).length;
  if (unknown) el(root, 'p', 'tp-muted', `${w.unpricedPayments}: ${unknown}`);
  if (!data.currencies.includes(state.currency)) state.currency = data.currencies[0] || 'USD';
  const panel = el(root, 'section', 'tp-stats-panel tp-finance-activity');
  const chartHead = el(panel, 'div', 'tp-stats-heading');
  el(chartHead, 'h2', '', w.dailySpending);
  const charts = el(panel, 'div', 'tp-finance-series');
  const buckets = periodBuckets(
    data.activity.map((d) => d.date),
    state.days,
  );
  // Attach every panel before measuring: grid columns change as siblings are added.
  const seriesPanels = data.currencies.map((code) => {
    const series = el(charts, 'section', 'tp-finance-currency');
    series.dataset.currency = code;
    const heading = el(series, 'div', 'tp-finance-currency-heading');
    el(heading, 'h3', '', code);
    el(heading, 'strong', '', money(data.actualTotals.get(code) || 0, code, locale));
    return { code, series };
  });
  for (const { code, series } of seriesPanels) {
    const points = buckets.map((bucket) => {
      const amount = data.activity
        .slice(bucket.start, bucket.end)
        .reduce((sum, d) => sum + (d.totals.get(code) || 0), 0);
      return {
        ...bucket,
        values: [amount],
        title: `${formatDate(bucket.from, dateFormat)} — ${formatDate(bucket.to, dateFormat)} · ${money(amount, code, locale)}`,
      };
    });
    fitChart(
      series,
      points,
      ['tp-chart-time'],
      'tp-finance-chart',
      w.dailySpending + ' · ' + code,
      dateFormat,
      locale,
      'line',
    );
    if (!data.actual.some((e) => e.currency === code)) el(series, 'p', 'tp-muted', w.financeEmpty);
  }
  if (!data.currencies.length) el(panel, 'p', 'tp-muted', w.financeEmpty);
  if (data.currencies.length) {
    const daily = el(panel, 'details', 'tp-finance-daily tp-activity-details');
    el(daily, 'summary', '', w.numericDetails);
    const dailyList = el(daily, 'div', 'tp-finance-daily-list');
    for (const d of [...data.activity].reverse()) {
      const row = el(dailyList, 'div', 'tp-expense-record');
      el(row, 'span', '', formatDate(d.date, dateFormat));
      const amounts = el(row, 'div', 'tp-finance-daily-values');
      for (const code of data.currencies) {
        const value = el(amounts, 'strong', '', money(d.totals.get(code) || 0, code, locale));
        value.dataset.currency = code;
      }
    }
  }
  const allocation = el(root, 'section', 'tp-stats-panel');
  const allocationHead = datedHeading(allocation, w.byProjectCosts, range);
  const currency = select(
    allocationHead,
    (data.currencies.length ? data.currencies : ['USD']).map((c) => [c, c]),
    state.currency,
  );
  currency.setAttribute('aria-label', w.chooseCurrency);
  currency.dataset.financeCurrency = 'true';
  currency.addEventListener('change', () => {
    state.currency = currency.value;
    refresh();
    parent.querySelector<HTMLElement>('[data-finance-currency]')?.focus({ preventScroll: true });
  });
  const groups = new Map<string, Expense[]>();
  for (const e of data.actual) {
    const label = projectLabel(e.task);
    const entries = groups.get(label) || [];
    entries.push(e);
    groups.set(label, entries);
  }
  const costs = [...groups]
    .map(([label, entries]) => ({ label, amount: expenseTotals(entries).get(state.currency) || 0 }))
    .filter((g) => g.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  for (const g of costs.slice(0, state.limit)) {
    const row = el(allocation, 'div', 'tp-cost-allocation');
    el(row, 'span', '', g.label);
    el(row, 'strong', '', money(g.amount, state.currency, locale));
    const track = el(row, 'div', 'tp-project-chart-track');
    el(track, 'span').style.width =
      `${(g.amount / (data.actualTotals.get(state.currency) || 1)) * 100}%`;
  }
  if (costs.length > state.limit)
    button(allocation, w.showMore, () => {
      state.limit += 40;
      refresh();
    });
}
export function expenseHistory(
  parent: HTMLElement,
  entries: Expense[],
  w: Words,
  locale: string,
  dateFormat: DateFormat,
  projectLabel: (t: Task) => string,
  edit: (e: Expense) => void,
  undo: (e: Expense) => void,
  limit: number,
  more: () => void,
  range?: string,
): void {
  const section = el(parent, 'section', 'tp-expense-history tp-stats-panel');
  if (range) datedHeading(section, w.expenseHistory, range);
  else el(section, 'h2', '', w.expenseHistory);
  if (!entries.length) el(section, 'p', 'tp-muted', w.financeEmpty);
  for (const e of entries.slice(0, limit)) {
    const row = el(section, 'div', 'tp-expense-record');
    row.dataset.path = e.task.path;
    row.dataset.key = e.key;
    button(row, e.task.title, () => edit(e), 'tp-text-button');
    el(
      row,
      'span',
      'tp-muted',
      `${e.date ? formatDate(e.date, dateFormat) : w.noDate} · ${projectLabel(e.task)}`,
    );
    el(row, 'strong', '', e.amount === null ? w.unpriced : money(e.amount, e.currency, locale));
    button(row, w.removeCharge, () => undo(e), 'tp-text-button');
  }
  if (entries.length > limit) button(section, w.showMore, more);
}

export function financeOverview(
  parent: HTMLElement,
  data: ReturnType<typeof financialAnalytics>,
  w: Words,
  locale: string,
  dateFormat: DateFormat,
): void {
  const metrics = el(parent, 'div', 'tp-finance-metrics');
  const metric = (label: string, totals: Map<string, number>, range: string) => {
    const card = el(metrics, 'section', 'tp-metric');
    datedHeading(card, label, range, 'tp-metric-heading', 'tp-muted');
    if (!totals.size) el(card, 'strong', 'tp-metric-value', '—');
    for (const [currency, amount] of totals)
      el(card, 'strong', 'tp-finance-total', money(amount, currency, locale));
  };
  metric(
    w.actualCost,
    data.actualTotals,
    `${formatDate(data.from, dateFormat)} — ${formatDate(data.to, dateFormat)}`,
  );
  metric(
    w.plannedCost,
    data.plannedTotals,
    `${formatDate(data.from, dateFormat)} — ${formatDate(data.to, dateFormat)}`,
  );
}
