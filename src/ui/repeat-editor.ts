import { Words } from './i18n';
import { el, field, input, select } from './dom';
import { makeRule } from '../core/recurrence';

const DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
export interface RepeatSchedule {
  frequency: string;
  interval: number;
  days: string[];
  count: string;
}
/** Only a losslessly editable subset is offered in the visual editor. */
export function simpleSchedule(rule: string): RepeatSchedule | undefined {
  const pairs = rule.split(';').map((part) => part.split('='));
  if (
    pairs.some((pair) => pair.length !== 2 || !pair[0] || !pair[1]) ||
    new Set(pairs.map((p) => p[0])).size !== pairs.length
  )
    return;
  const fields = new Map(pairs as [string, string][]);
  if (
    [...fields.keys()].some((key) => !['FREQ', 'INTERVAL', 'BYDAY', 'COUNT', 'UNTIL'].includes(key))
  )
    return;
  const frequency = fields.get('FREQ') || 'WEEKLY';
  const days = fields.get('BYDAY')?.split(',') || [];
  if (
    !['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(frequency) ||
    (days.length && (frequency !== 'WEEKLY' || days.some((d) => !DAYS.includes(d))))
  )
    return;
  const interval = Number(fields.get('INTERVAL') || 1);
  const count = fields.get('COUNT') || '';
  if (
    !Number.isInteger(interval) ||
    interval < 1 ||
    interval > 100000 ||
    (count && (!/^\d+$/.test(count) || Number(count) < 1 || Number(count) > 100000))
  )
    return;
  return { frequency, interval, days, count };
}
export function scheduleRule(schedule: RepeatSchedule, original = ''): string {
  if (!Number.isInteger(schedule.interval) || schedule.interval < 1 || schedule.interval > 100000)
    throw new Error('INTERVAL must be a positive integer no greater than 100000.');
  const parts = [`FREQ=${schedule.frequency}`];
  if (schedule.interval !== 1) parts.push(`INTERVAL=${schedule.interval}`);
  if (schedule.frequency === 'WEEKLY' && schedule.days.length)
    parts.push(`BYDAY=${DAYS.filter((d) => schedule.days.includes(d)).join(',')}`);
  if (schedule.count) parts.push(`COUNT=${schedule.count}`);
  const until = original.split(';').find((part) => part.startsWith('UNTIL='));
  if (until) parts.push(until);
  const result = parts.join(';');
  // Preserve field order and exact UNTIL on an unchanged edit.
  return [...result.split(';')].sort().join(';') === [...original.split(';')].sort().join(';')
    ? original
    : result;
}
export function repeatEditor(parent: HTMLElement, rule: string, w: Words, changed: () => void) {
  const initial = simpleSchedule(rule) || { frequency: 'WEEKLY', interval: 1, days: [], count: '' };
  const box = el(parent, 'div', 'tp-repeat-editor');
  const grid = el(box, 'div', 'tp-form-grid');
  const interval = input(field(grid, w.repeatEvery), 'number', String(initial.interval));
  interval.dataset.field = 'repeatInterval';
  interval.min = '1';
  interval.max = '100000';
  interval.step = '1';
  const frequency = select(
    field(grid, w.repeatFrequency),
    [
      ['DAILY', w.daily],
      ['WEEKLY', w.weekly],
      ['MONTHLY', w.monthly],
      ['YEARLY', w.yearly],
    ],
    initial.frequency,
  );
  frequency.dataset.field = 'repeatFrequency';
  const weekdays = el(box, 'fieldset', 'tp-repeat-days');
  el(weekdays, 'legend', '', w.repeatDays);
  const daysState = input(box, 'hidden', JSON.stringify(initial.days));
  const checks = DAYS.map((code, index) => {
    const label = el(weekdays, 'label');
    const check = input(label, 'checkbox');
    check.value = code;
    check.checked = initial.days.includes(code);
    el(label, 'span', '', w.repeatDayLabels.split(',')[index]);
    return check;
  });
  const count = input(field(box, w.repeatCount), 'number', initial.count);
  count.dataset.field = 'repeatCount';
  count.min = '1';
  count.max = '100000';
  count.step = '1';
  const update = () => {
    weekdays.hidden = frequency.value !== 'WEEKLY';
    daysState.value = JSON.stringify(
      checks.filter((check) => check.checked).map((check) => check.value),
    );
    changed();
  };
  box.addEventListener('change', update);
  // Number inputs refresh the preview immediately without running on every title keystroke.
  interval.addEventListener('input', changed);
  count.addEventListener('input', changed);
  weekdays.hidden = frequency.value !== 'WEEKLY';
  return {
    box,
    controls: {
      repeatInterval: interval,
      repeatFrequency: frequency,
      repeatCount: count,
      repeatDays: daysState,
    },
    refresh: () => {
      let days: unknown;
      try {
        days = JSON.parse(daysState.value);
      } catch {
        days = [];
      }
      for (const check of checks) check.checked = Array.isArray(days) && days.includes(check.value);
      weekdays.hidden = frequency.value !== 'WEEKLY';
    },
    value: () =>
      scheduleRule(
        {
          frequency: frequency.value,
          interval: Number(interval.value),
          days: checks.filter((c) => c.checked).map((c) => c.value),
          count: count.value,
        },
        rule,
      ),
  };
}
/** One guarded traversal; never repeatedly rescan a sparse series. */
export function repeatPreview(rule: string, anchor: string): string[] {
  return makeRule(rule, anchor)
    .all((_date, index) => index < 5)
    .map((date) => date.toISOString().slice(0, 10));
}
