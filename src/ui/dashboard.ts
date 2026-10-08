import { Analytics, completion } from '../core/analytics';
import { PeriodDays, Project, STATUSES } from '../core/model';
import { DateFormat, formatDate } from '../core/dates';
import { button, el } from './dom';
import { Words } from './i18n';

export interface DashboardState {
  days: PeriodDays;
  page: number;
  details: boolean;
  projectDetails?: boolean;
  extraDetails?: boolean;
}
const PAGE_SIZE = 12;
export function svgNode<K extends keyof SVGElementTagNameMap>(
  parent: HTMLElement | SVGElement,
  tag: K,
  attrs: Record<string, string | number> = {},
  text = '',
): SVGElementTagNameMap[K] {
  const n = parent.createSvg(tag, { attr: attrs });
  if (text) n.textContent = text;
  return n;
}

export function dashboard(
  parent: HTMLElement,
  data: Analytics,
  state: DashboardState,
  w: Words,
  locale: string,
  filtered: boolean,
  refresh: () => void,
  editProject: (project: Project) => void,
  projectLabel: (project: Project) => string,
  dateFormat: DateFormat = 'dmy',
): void {
  const formatter = new Intl.NumberFormat(locale);
  const n = (value: number) => formatter.format(value);
  const time = (minutes: number) =>
    `${n(Math.floor(minutes / 60))} ${w.hourUnit} ${n(minutes % 60)} ${w.minuteUnit}`;
  const finiteTotal = data.finite.open + data.finite.done + data.finite.failed;
  const root = el(parent, 'div', 'tp-dashboard');
  periodHeading(
    root,
    w.periodSummary,
    `${formatDate(data.activity[0]!.date, dateFormat)} — ${formatDate(data.activity.at(-1)!.date, dateFormat)}`,
    state,
    w,
    refresh,
    parent,
  );
  if (!data.tasks && !data.projects.length) {
    const empty = el(root, 'div', 'tp-stats-empty');
    el(empty, 'h2', '', filtered ? w.statsFilteredEmpty : w.statsEmpty);
    el(empty, 'p', 'tp-muted', filtered ? w.statsFilteredHelp : w.statsEmptyHelp);
  }
  const metrics = el(root, 'div', 'tp-metrics');
  const metric = (key: string, label: string, value: string, hint: string) => {
    const card = el(metrics, 'section', 'tp-metric');
    card.dataset.metric = key;
    el(card, 'h2', 'tp-muted', label);
    el(card, 'strong', 'tp-metric-value', value);
    if (hint) el(card, 'span', 'tp-muted', hint);
  };
  metric(
    'tasks',
    w.taskNotes,
    n(data.tasks),
    `${w.oneOff}: ${n(finiteTotal)} · ${w.seriesCount}: ${n(data.series)}`,
  );
  const rate = completion(data.finite);
  metric(
    'progress',
    w.taskProgress,
    rate === null ? '—' : `${n(rate)}%`,
    `${n(data.finite.done)} / ${n(finiteTotal)} · ${w.oneOff.toLocaleLowerCase()}`,
  );
  metric('time', w.timeTotal, time(data.minutes), '');
  metric(
    'projects',
    w.projectTotal,
    n(data.projects.length),
    `${w.active}: ${n(data.projectStatuses.todo + data.projectStatuses['in-progress'])}`,
  );

  const charts = el(root, 'div', 'tp-stats-charts');
  const statusPanel = el(charts, 'section', 'tp-stats-panel tp-workflow-panel');
  el(statusPanel, 'h2', '', w.taskStatuses);
  const ring = svgNode(statusPanel, 'svg', {
    viewBox: '0 0 220 180',
    class: 'tp-workflow-ring',
    role: 'img',
    'aria-label': STATUSES.map((s) => `${w[s]}: ${n(data.workflow[s])}`).join(', '),
  });
  svgNode(ring, 'circle', {
    cx: 110,
    cy: 90,
    r: 64,
    fill: 'none',
    'stroke-width': 18,
    class: 'tp-ring-track',
  });
  let offset = 0;
  const circumference = 2 * Math.PI * 64;
  for (const status of STATUSES) {
    const share = finiteTotal ? data.workflow[status] / finiteTotal : 0;
    if (!share) continue;
    const segment = svgNode(ring, 'circle', {
      cx: 110,
      cy: 90,
      r: 64,
      fill: 'none',
      'stroke-width': 18,
      stroke: `var(--tp-status-${status})`,
      'stroke-dasharray': `${share * circumference} ${circumference}`,
      'stroke-dashoffset': -offset * circumference,
      transform: 'rotate(-90 110 90)',
    });
    svgNode(segment, 'title', {}, `${w[status]}: ${n(data.workflow[status])}`);
    offset += share;
  }
  svgNode(
    ring,
    'text',
    { x: 110, y: 94, 'text-anchor': 'middle', class: 'tp-ring-value' },
    rate === null ? '—' : `${n(rate)}%`,
  );
  svgNode(
    ring,
    'text',
    { x: 110, y: 115, 'text-anchor': 'middle', class: 'tp-chart-label' },
    w.done,
  );
  const stack = el(statusPanel, 'div', 'tp-status-chart');
  stack.setAttribute('role', 'img');
  stack.setAttribute(
    'aria-label',
    STATUSES.map((s) => `${w[s]}: ${n(data.workflow[s])}`).join(', '),
  );
  for (const status of STATUSES) {
    const row = el(stack, 'div', 'tp-workflow-stat');
    row.dataset.status = status;
    el(row, 'span', '', w[status]);
    el(row, 'strong', '', n(data.workflow[status]));
    const track = el(row, 'div', 'tp-workflow-track');
    track.setAttribute('aria-hidden', 'true');
    el(track, 'span').style.width =
      `${finiteTotal ? (data.workflow[status] / finiteTotal) * 100 : 0}%`;
  }
  const number = (list: HTMLElement, label: string, value: number, cls = '') => {
    const group = el(list, 'div', cls);
    el(group, 'dt', '', label);
    el(group, 'dd', '', n(value));
  };

  const activity = el(charts, 'section', 'tp-stats-panel tp-activity');
  const head = el(activity, 'div', 'tp-stats-heading');
  el(head, 'h2', '', w.activity);
  const totals = el(activity, 'dl', 'tp-activity-totals');
  for (const status of ['done', 'failed'] as const) {
    const item = el(totals, 'div', 'tp-activity-total tp-total-' + status);
    el(item, 'dt', '', w[status]);
    el(item, 'dd', '', n(data.period[status]));
  }
  const duration = el(totals, 'div', 'tp-activity-total tp-total-time');
  el(duration, 'dt', '', w.timePeriod);
  el(duration, 'dd', '', time(data.period.minutes));
  const buckets = periodBuckets(
    data.activity.map((d) => d.date),
    state.days,
  );
  const points = buckets.map((bucket) => {
    const days = data.activity.slice(bucket.start, bucket.end);
    return {
      ...bucket,
      done: days.reduce((n, d) => n + d.done, 0),
      failed: days.reduce((n, d) => n + d.failed, 0),
      minutes: days.reduce((n, d) => n + d.minutes, 0),
    };
  });
  fitChart(
    activity,
    points.map((d) => ({
      ...d,
      values: [d.done, d.failed],
      title: `${formatDate(d.from, dateFormat)} — ${formatDate(d.to, dateFormat)} · ${w.done}: ${n(d.done)} · ${w.failed}: ${n(d.failed)}`,
    })),
    ['tp-chart-done', 'tp-chart-failed'],
    'tp-activity-chart',
    w.activity,
    dateFormat,
    locale,
    'line',
  );
  if (!data.period.done && !data.period.failed)
    el(activity, 'p', 'tp-muted tp-chart-empty', w.activityEmpty);
  el(activity, 'h2', 'tp-time-chart-heading', w.timeActivity);
  fitChart(
    activity,
    points.map((d) => ({
      ...d,
      values: [d.minutes],
      title: `${formatDate(d.from, dateFormat)} — ${formatDate(d.to, dateFormat)} · ${time(d.minutes)}`,
    })),
    ['tp-chart-time'],
    'tp-time-chart',
    w.timeActivity,
    dateFormat,
    locale,
    'line',
  );
  const details = el(activity, 'details', 'tp-activity-details');
  details.open = state.details;
  details.addEventListener('toggle', () => {
    if (details.isConnected) state.details = details.open;
  });
  el(details, 'summary', '', w.numericDetails);
  // At most 366 rows, regardless of the number of notes or historical records.
  const scroll = el(details, 'div', 'tp-stats-table-wrap');
  const table = el(scroll, 'table', 'tp-stats-table');
  el(table, 'caption', 'tp-visually-hidden', w.numericDetails);
  const th = el(el(table, 'thead'), 'tr');
  for (const label of [w.date, w.done, w.failed, w.minutes]) el(th, 'th', '', label).scope = 'col';
  const tbody = el(table, 'tbody');
  for (const d of [...data.activity].reverse()) {
    const row = el(tbody, 'tr');
    el(row, 'th', '', formatDate(d.date, dateFormat)).scope = 'row';
    for (const value of [d.done, d.failed, d.minutes]) el(row, 'td', '', n(value));
  }

  const overall = el(root, 'section', 'tp-stats-overview');
  const overallHead = el(overall, 'div', 'tp-stats-heading');
  el(overallHead, 'h2', '', w.overallSummary);
  el(overallHead, 'span', 'tp-muted', w.allTime);
  overall.append(metrics, statusPanel);
  charts.after(overall);
  const projectPanel = el(root, 'section', 'tp-stats-panel tp-project-panel');
  const projectHead = el(projectPanel, 'div', 'tp-stats-heading');
  el(projectHead, 'h2', '', w.projectProgress);
  el(projectHead, 'span', 'tp-muted', w.allTime);
  el(projectHead, 'span', 'tp-muted', `${w.projectTotal}: ${n(data.projects.length)}`);
  if (!data.projects.length) el(projectPanel, 'p', 'tp-muted', w.projectEmpty);
  else {
    const pages = Math.ceil(data.projects.length / PAGE_SIZE);
    state.page = Math.max(0, Math.min(state.page, pages - 1));
    const overview = el(projectPanel, 'div', 'tp-project-overview');
    overview.setAttribute('role', 'list');
    for (const p of data.projects.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE)) {
      const row = el(overview, 'div', 'tp-project-chart-row');
      row.setAttribute('role', 'listitem');
      const name = button(
        row,
        projectLabel(p.project),
        () => editProject(p.project),
        'tp-text-button',
      );
      name.title = projectLabel(p.project);
      const total = p.finite.open + p.finite.done + p.finite.failed;
      el(
        row,
        'span',
        'tp-project-completed',
        `${n(p.finite.done)} / ${n(total)} ${w.projectCounts}`,
      );
      el(row, 'strong', '', total ? `${completion(p.finite)}%` : '—');
      const track = el(row, 'div', 'tp-project-chart-track');
      track.setAttribute('aria-hidden', 'true');
      el(track, 'span', 'tp-chart-done').style.width = `${completion(p.finite) || 0}%`;
    }
    const projectDetails = el(projectPanel, 'details', 'tp-project-details');
    projectDetails.open = !!state.projectDetails;
    projectDetails.addEventListener('toggle', () => {
      if (projectDetails.isConnected) state.projectDetails = projectDetails.open;
    });
    el(projectDetails, 'summary', '', w.projectDetails);
    const wrap = el(projectDetails, 'div', 'tp-stats-table-wrap');
    const table = el(wrap, 'table', 'tp-stats-table tp-project-stats');
    el(table, 'caption', 'tp-visually-hidden', w.projectProgress);
    const row = el(el(table, 'thead'), 'tr');
    for (const label of [w.project, w.taskNotes, w.taskProgress, w.seriesCount, w.minutes])
      el(row, 'th', '', label).scope = 'col';
    const body = el(table, 'tbody');
    for (const p of data.projects.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE)) {
      const tr = el(body, 'tr');
      tr.dataset.project = p.project.path;
      const name = el(tr, 'th');
      name.scope = 'row';
      const projectButton = button(
        name,
        projectLabel(p.project),
        () => editProject(p.project),
        'tp-text-button',
      );
      projectButton.title = p.project.path;
      el(name, 'small', 'tp-muted', w[p.project.status]);
      el(tr, 'td', '', n(p.tasks));
      const progress = el(tr, 'td');
      const total = p.finite.done + p.finite.open + p.finite.failed;
      const rate = completion(p.finite);
      el(progress, 'span', '', rate === null ? '—' : `${n(rate)}%`);
      el(
        progress,
        'small',
        'tp-muted',
        `${n(p.finite.done)} / ${n(total)} · ${w.failed}: ${n(p.finite.failed)}`,
      );
      el(tr, 'td', '', n(p.series));
      el(tr, 'td', '', n(p.minutes));
    }
    if (pages > 1) {
      const pager = el(projectPanel, 'div', 'tp-stats-pager');
      const navigate = (delta: number, direction: string) => {
        state.page += delta;
        refresh();
        const same = parent.querySelector<HTMLButtonElement>(`[data-page-action="${direction}"]`);
        const target = same?.disabled
          ? parent.querySelector<HTMLButtonElement>('.tp-stats-pager button:not(:disabled)')
          : same;
        target?.focus({ preventScroll: true });
      };
      const prev = button(pager, '←', () => navigate(-1, 'previous'));
      prev.disabled = state.page === 0;
      prev.dataset.pageAction = 'previous';
      prev.setAttribute('aria-label', w.previousPage);
      el(pager, 'span', 'tp-muted', `${w.page} ${n(state.page + 1)} / ${n(pages)}`);
      const next = button(pager, '→', () => navigate(1, 'next'));
      next.disabled = state.page === pages - 1;
      next.dataset.pageAction = 'next';
      next.setAttribute('aria-label', w.nextPage);
    }
  }
  const extraDetails = el(root, 'details', 'tp-stats-disclosure');
  extraDetails.open = !!state.extraDetails;
  extraDetails.addEventListener('toggle', () => {
    if (extraDetails.isConnected) state.extraDetails = extraDetails.open;
  });
  el(extraDetails, 'summary', '', w.statsDetails);
  const extra = el(extraDetails, 'dl', 'tp-stats-extra tp-stats-numbers');
  for (const [label, value] of [
    [w.overdueOneOff, data.overdue],
    [w.seriesCount, data.series],
    [w.recurringDone, data.history.done],
    [w.recurringFailed, data.history.failed],
    [w.savedTime, data.recordedMinutes],
    [w.openTime + ' · ' + w.minuteUnit, data.openMinutes],
    [w.unallocatedTime + ' · ' + w.minuteUnit, data.unallocatedMinutes],
    [w.inboxCount, data.inbox],
    [w.noDateCount, data.noDate],
    [w.undatedCount, data.undated],
    ...(['backlog', 'todo', 'in-progress', 'done', 'failed'] as const).map(
      (s) =>
        [w[s] + ' · ' + w.projectTotal.toLocaleLowerCase(), data.projectStatuses[s]] as [
          string,
          number,
        ],
    ),
  ] as [string, number][])
    number(extra, label, value);
}

export function periodHeading(
  parent: HTMLElement,
  title: string,
  range: string,
  state: { days: PeriodDays },
  w: Words,
  refresh: () => void,
  focusRoot: HTMLElement,
): HTMLElement {
  const heading = el(parent, 'div', 'tp-stats-heading tp-period-heading');
  el(heading, 'h2', '', title);
  const context = el(heading, 'div', 'tp-period-context');
  periodChooser(context, state, w, refresh, focusRoot);
  el(context, 'span', 'tp-muted tp-period-range', range);
  return heading;
}
export function periodChooser(
  parent: HTMLElement,
  state: { days: PeriodDays },
  w: Words,
  refresh: () => void,
  focusRoot: HTMLElement,
): void {
  const periods = el(parent, 'div', 'tp-periods');
  periods.setAttribute('role', 'group');
  periods.setAttribute('aria-label', w.period);
  for (const days of [7, 30, 90, 365] as const) {
    const b = button(
      periods,
      w[days === 7 ? 'days7' : days === 30 ? 'days30' : days === 90 ? 'days90' : 'days365'],
      () => {
        state.days = days;
        refresh();
        focusRoot
          .querySelector<HTMLButtonElement>(`[data-period="${days}"]`)
          ?.focus({ preventScroll: true });
      },
    );
    b.title = w.currentPeriod + ' · ' + b.textContent;
    b.dataset.period = String(days);
    b.setAttribute('aria-pressed', String(state.days === days));
  }
}
export interface PeriodBucket {
  start: number;
  end: number;
  from: string;
  to: string;
}
/** Daily for short periods, weekly for quarters, calendar months for years. No days are omitted. */
export function periodBuckets(dates: readonly string[], days: PeriodDays): PeriodBucket[] {
  const buckets: PeriodBucket[] = [];
  for (let start = 0; start < dates.length;) {
    let end = start + 1;
    if (days === 90) end = Math.min(start + 7, dates.length);
    else if (days === 365)
      while (end < dates.length && dates[end]!.slice(0, 7) === dates[start]!.slice(0, 7)) end++;
    buckets.push({ start, end, from: dates[start]!, to: dates[end - 1]! });
    start = end;
  }
  return buckets;
}
interface ChartPoint extends PeriodBucket {
  values: number[];
  title: string;
}
/** Lines retain every bucket on one axis with sparse labels; bar charts wrap on small panes. */
export function fitChart(
  parent: HTMLElement,
  points: ChartPoint[],
  colors: string[],
  cls: string,
  label: string,
  dateFormat: DateFormat,
  locale: string,
  mode: 'bar' | 'line' = 'bar',
): void {
  if (!points.length) return;
  const frame = el(parent, 'div', 'tp-fit-chart');
  const padding = parent.ownerDocument.defaultView?.getComputedStyle(parent);
  const width = Math.max(
    160,
    (parent.clientWidth || 640) -
      (parseFloat(padding?.paddingLeft || '') || 0) -
      (parseFloat(padding?.paddingRight || '') || 0),
  );
  const columns = Math.max(3, Math.floor((width - 60) / 26));
  const rows = mode === 'line' ? 1 : Math.max(1, Math.ceil(points.length / columns));
  const perRow = Math.ceil(points.length / rows);
  const maximum = Math.max(
    1,
    ...points.map((p) =>
      mode === 'line' ? Math.max(0, ...p.values) : p.values.reduce((a, b) => a + b, 0),
    ),
  );
  const max = cls === 'tp-activity-chart' ? Math.max(4, Math.ceil(maximum / 4) * 4) : maximum;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, notation: 'compact' });
  for (let offset = 0; offset < points.length; offset += perRow) {
    const part = points.slice(offset, offset + perRow);
    const chart = svgNode(frame, 'svg', {
      viewBox: `0 0 ${width} 230`,
      width: '100%',
      height: 230,
      class: cls,
      role: 'img',
      'aria-label': label,
    });
    svgNode(
      chart,
      'title',
      {},
      `${label} · ${formatDate(part[0]!.from, dateFormat)} — ${formatDate(part.at(-1)!.to, dateFormat)}`,
    );
    const left =
        cls === 'tp-finance-chart'
          ? Math.max(
              48,
              ...[0, max / 2, max].map((value) => number.format(value).length * 7.5 + 12),
            )
          : 48,
      bottom = 170,
      plot = mode === 'line' ? 150 : 140,
      step = (width - left - 12) / part.length;
    for (const value of [0, max / 2, max]) {
      const y = bottom - (value / max) * plot;
      svgNode(chart, 'line', { x1: left, x2: width - 12, y1: y, y2: y, class: 'tp-chart-grid' });
      svgNode(
        chart,
        'text',
        { x: left - 6, y: y + 4, 'text-anchor': 'end', class: 'tp-chart-label' },
        number.format(value),
      );
    }
    const xAt = (index: number) =>
      mode === 'line'
        ? left +
          18 +
          (part.length > 1
            ? ((width - left - 48) * index) / (part.length - 1)
            : (width - left - 48) / 2)
        : left + (index + 0.5) * step;
    if (mode === 'line') {
      colors.forEach((color, series) => {
        const path = part
          .map(
            (p, i) =>
              `${i ? 'L' : 'M'} ${xAt(i)} ${bottom - ((p.values[series] || 0) / max) * plot}`,
          )
          .join(' ');
        svgNode(chart, 'path', { d: path, class: `tp-chart-line ${color}`, 'aria-hidden': 'true' });
      });
    }
    part.forEach((p, i) => {
      let y = bottom;
      p.values.forEach((value, index) => {
        if (mode === 'line') {
          const point = svgNode(chart, 'circle', {
            cx: xAt(i),
            cy: bottom - (value / max) * plot,
            r: value ? 3 : 2,
            class: `tp-chart-point ${colors[index]}`,
            'data-value': value,
            'data-series': index,
            'data-date': p.from,
            'data-through': p.to,
            tabindex: 0,
            role: 'img',
            'aria-label': p.title,
          });
          svgNode(point, 'title', {}, p.title);
        } else {
          if (!value) return;
          const height = (value / max) * plot;
          y -= height;
          const bar = svgNode(chart, 'rect', {
            x: left + (i + 0.15) * step,
            y,
            width: step * 0.7,
            height,
            rx: 2,
            class: colors[index]!,
          });
          svgNode(bar, 'title', {}, p.title);
        }
      });
      const x = xAt(i);
      const monthly = p.from.slice(0, 7) === p.to.slice(0, 7) && p.end - p.start > 7;
      const text = monthly
        ? new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(
            new Date(p.from + 'T00:00:00Z'),
          )
        : dateFormat === 'iso'
          ? p.from.slice(5)
          : dateFormat === 'mdy'
            ? p.from.slice(5, 7) + '/' + p.from.slice(8)
            : p.from.slice(8) + '.' + p.from.slice(5, 7);
      const tick = svgNode(
        chart,
        'text',
        {
          x,
          y: bottom + 18,
          class: 'tp-chart-label tp-day-tick',
          'text-anchor': mode === 'line' ? 'middle' : 'start',
          ...(mode === 'bar' ? { transform: `rotate(45 ${x} ${bottom + 18})` } : {}),
          'data-date': p.from,
          'data-through': p.to,
        },
        mode === 'bar' ||
          i === 0 ||
          i === part.length - 1 ||
          (i %
            Math.max(1, Math.ceil(part.length / Math.max(2, Math.floor((width - left) / 62)))) ===
            0 &&
            (cls !== 'tp-finance-chart' ||
              ((part.length - 1 - i) * (width - left - 48)) / Math.max(1, part.length - 1) >= 44))
          ? text
          : '',
      );
      svgNode(
        tick,
        'title',
        {},
        `${formatDate(p.from, dateFormat)} — ${formatDate(p.to, dateFormat)}`,
      );
    });
  }
}
