import { dateKey, parseDate, formatDate, DateFormat } from '../core/dates';
import { button, dateInput, el, field, input } from './dom';
import { Words } from './i18n';
export function workDaysEditor(
  parent: HTMLElement,
  initial: string[],
  date: HTMLInputElement,
  due: HTMLInputElement,
  planned: HTMLInputElement,
  repeat: HTMLSelectElement,
  w: Words,
  format: DateFormat,
  language: string,
) {
  const box = el(parent, 'div', 'tp-work-dates');
  const state = input(box, 'hidden', JSON.stringify(initial));
  state.dataset.field = 'workDates';
  const read = (): string[] => {
    let raw: unknown;
    try {
      raw = JSON.parse(state.value || '[]');
    } catch {
      return [];
    }
    return Array.isArray(raw)
      ? [
          ...new Set(
            raw.filter(
              (item): item is string => typeof item === 'string' && dateKey(item) === item,
            ),
          ),
        ].sort()
      : [];
  };
  const entry = el(box, 'div', 'tp-work-date-entry');
  const pick = dateInput(field(entry, w.workDates), '', format, language);
  const list = el(box, 'div', 'tp-work-date-list');
  const distribution = el(box, 'p', 'tp-muted tp-work-distribution');
  const error = el(box, 'p', 'tp-field-error');
  error.setAttribute('role', 'status');
  error.hidden = true;
  const refresh = () => {
    box.hidden = !!repeat.value;
    pick.disabled = !!repeat.value;
    list.replaceChildren();
    const dates = read();
    for (const value of dates) {
      const chip = button(
        list,
        formatDate(value, format),
        () => {
          state.value = JSON.stringify(read().filter((d) => d !== value));
          refresh();
          state.dispatchEvent(
            new state.ownerDocument.defaultView!.Event('change', { bubbles: true }),
          );
        },
        'tp-filter-chip',
      );
      el(chip, 'span', '', '×').setAttribute('aria-hidden', 'true');
      chip.setAttribute('aria-label', `${w.remove}: ${formatDate(value, format)}`);
    }
    const primary = parseDate(date.value, format);
    const days = [...new Set([primary, ...dates].filter(Boolean))].sort();
    const minutes = Math.max(0, Math.round(Number(planned.value) || 0));
    distribution.hidden = !minutes || !days.length;
    distribution.textContent =
      `${w.workDistribution}: ` +
      days
        .map(
          (d, i) =>
            `${formatDate(d, format)} · ${Math.floor(minutes / days.length) + (i < minutes % days.length ? 1 : 0)} ${w.minuteUnit}`,
        )
        .join('; ');
    error.hidden = true;
  };
  const add = button(
    entry,
    '+',
    () => {
      const value = parseDate(pick.value, format);
      const end = parseDate(due.value, format);
      const dates = read();
      if (
        !value ||
        dates.includes(value) ||
        value === parseDate(date.value, format) ||
        (end && value > end) ||
        dates.length >= 1000
      ) {
        error.textContent = w.invalidWorkDate;
        error.hidden = false;
        return;
      }
      state.value = JSON.stringify([...dates, value].sort());
      pick.value = '';
      refresh();
      state.dispatchEvent(new state.ownerDocument.defaultView!.Event('change', { bubbles: true }));
    },
    'tp-work-date-add',
  );
  add.setAttribute('aria-label', w.addWorkDate);
  add.title = w.addWorkDate;
  for (const control of [date, due, planned, repeat, state])
    control.addEventListener('change', refresh);
  planned.addEventListener('input', refresh);
  refresh();
  return { box, state, value: read, refresh };
}
