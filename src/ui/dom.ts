import {
  DateFormat,
  formatDate,
  parseDate,
  timeKey,
  day,
  addDays,
  monthGrid,
  shiftMonth,
  utc,
  dateKey,
} from '../core/dates';
import { setIcon } from 'obsidian';
import { words } from './i18n';
export function el<K extends keyof HTMLElementTagNameMap>(
  parent: HTMLElement,
  tag: K,
  cls = '',
  text = '',
): HTMLElementTagNameMap[K] {
  return parent.createEl(tag, { cls, text });
}
/** Keep contextual dates within their heading instead of separate content rows. */
export function datedHeading(
  parent: HTMLElement,
  title: string,
  range: string,
  cls = '',
  titleClass = '',
): HTMLElement {
  const heading = el(parent, 'div', 'tp-stats-heading tp-dated-heading' + (cls ? ' ' + cls : ''));
  el(heading, 'h2', titleClass, title);
  el(heading, 'span', 'tp-muted tp-period-range', range);
  return heading;
}
export function button(
  parent: HTMLElement,
  text: string,
  action: () => void,
  cls = '',
): HTMLButtonElement {
  const b = el(parent, 'button', cls, text);
  b.type = 'button';
  b.addEventListener('click', action);
  return b;
}
export function iconButton(
  parent: HTMLElement,
  icon: string,
  label: string,
  action: () => void,
  cls = '',
): HTMLButtonElement {
  const b = button(parent, '', action, cls);
  b.classList.add('tp-icon-button');
  setIcon(b, icon);
  b.title = label;
  b.setAttribute('aria-label', label);
  return b;
}
export function input(
  parent: HTMLElement,
  type: string,
  value = '',
  placeholder = '',
): HTMLInputElement {
  const i = el(parent, 'input');
  i.type = type;
  i.value = value;
  i.placeholder = placeholder;
  return i;
}
export function field(parent: HTMLElement, label: string): HTMLElement {
  const l = el(parent, 'label', 'tp-field');
  el(l, 'span', '', label);
  return l;
}
export function select(
  parent: HTMLElement,
  options: [string, string][],
  value: string,
): HTMLSelectElement {
  const s = el(parent, 'select');
  for (const [v, t] of options) {
    const o = el(s, 'option', '', t);
    o.value = v;
  }
  s.value = value;
  return s;
}

/** Text entry guarantees the chosen order regardless of OS/browser locale. */
export function dateInput(
  parent: HTMLElement,
  value: string,
  format: DateFormat = 'dmy',
  language: string = 'ru',
): HTMLInputElement {
  const wrapper = el(parent, 'div', 'tp-date-control');
  const i = input(wrapper, 'text', formatDate(value, format) || value);
  i.classList.add('tp-date');
  i.dataset.dateFormat = format;
  i.placeholder = format === 'iso' ? 'YYYY-MM-DD' : format === 'mdy' ? 'MM/DD/YYYY' : 'DD.MM.YYYY';
  i.setAttribute('aria-label', i.placeholder);
  i.autocomplete = 'off';
  i.inputMode = 'numeric';
  i.maxLength = 10;
  i.addEventListener('input', () => i.setCustomValidity(''));
  i.addEventListener('blur', () => {
    const key = parseDate(i.value, format);
    if (key) i.value = formatDate(key, format);
  });
  attachCalendar(wrapper, i, language);
  return i;
}
export function readDate(i: HTMLInputElement): string {
  const result = parseDate(i.value, i.dataset.dateFormat as DateFormat);
  if (i.value.trim() && !result) {
    i.setCustomValidity(i.placeholder);
    i.reportValidity();
    throw new Error(`Invalid date. ${i.placeholder}`);
  }
  return result;
}
export function writeDate(i: HTMLInputElement, key: string): void {
  i.value = formatDate(key, i.dataset.dateFormat as DateFormat);
  i.setCustomValidity('');
  i.dispatchEvent(new i.ownerDocument.defaultView!.Event('change', { bubbles: true }));
}

export function timeInput(
  parent: HTMLElement,
  value: string,
  label: string,
  language = 'ru',
): HTMLInputElement {
  const wrapper = el(parent, 'div', 'tp-time-control');
  const i = input(wrapper, 'text', value, language === 'ru' ? 'ЧЧ:ММ' : 'HH:mm');
  i.inputMode = 'numeric';
  i.classList.add('tp-time');
  i.setAttribute('aria-label', label);
  i.autocomplete = 'off';
  i.maxLength = 5;
  i.addEventListener('input', () => i.setCustomValidity(''));
  i.addEventListener('blur', () => {
    const key = timeKey(i.value);
    if (key) i.value = key;
  });
  attachClock(wrapper, i, language);
  return i;
}
export function readTime(i: HTMLInputElement): string {
  const key = timeKey(i.value);
  if (i.value.trim() && !key)
    throw new Error('Invalid appointment time. Use HH:mm from 00:00 to 23:59.');
  return key;
}

/** The popover owns its dismissal; no document listeners survive detached forms. */
function attachCalendar(wrapper: HTMLElement, input: HTMLInputElement, language: string): void {
  const w = words(language);
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  const popup = el(wrapper, 'div', 'tp-picker-popup');
  popup.setAttribute('popover', 'auto');
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-label', w.chooseDate);
  popup.hidden = true;
  let month = day().slice(0, 7) + '-01';
  let focusDay = '';
  const close = (restore = true) => {
    if (popup.hidePopover) {
      try {
        popup.hidePopover();
      } catch {
        /* Detached/fallback popover. */
      }
    }
    popup.hidden = true;
    popup.dataset.open = 'false';
    trigger.setAttribute('aria-expanded', 'false');
    if (restore) input.focus();
  };
  const choose = (key: string) => {
    writeDate(input, key);
    close();
  };
  const render = (focusControl = '') => {
    popup.replaceChildren();
    const header = el(popup, 'div', 'tp-picker-header');
    const previous = iconButton(header, 'chevron-left', w.previous, () => {
      month = shiftMonth(month, -1);
      render('previous');
    });
    previous.dataset.pickerControl = 'previous';
    const monthSelect = select(
      header,
      Array.from({ length: 12 }, (_, n) => [
        String(n + 1).padStart(2, '0'),
        new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
          utc(`2026-${String(n + 1).padStart(2, '0')}-01`),
        ),
      ]),
      month.slice(5, 7),
    );
    monthSelect.setAttribute('aria-label', w.pickerMonth);
    monthSelect.dataset.pickerControl = 'month';
    const year = Number(month.slice(0, 4));
    const years = [...new Set([...Array.from({ length: 201 }, (_, n) => 1900 + n), year])].sort(
      (a, b) => a - b,
    );
    const yearSelect = select(
      header,
      years.map((n) => [String(n).padStart(4, '0'), String(n)]),
      month.slice(0, 4),
    );
    yearSelect.setAttribute('aria-label', w.pickerYear);
    yearSelect.dataset.pickerControl = 'year';
    monthSelect.addEventListener('change', () => {
      month = `${month.slice(0, 4)}-${monthSelect.value}-01`;
      render('month');
    });
    yearSelect.addEventListener('change', () => {
      month = `${yearSelect.value}-${month.slice(5, 7)}-01`;
      render('year');
    });
    const next = iconButton(header, 'chevron-right', w.next, () => {
      month = shiftMonth(month, 1);
      render('next');
    });
    next.dataset.pickerControl = 'next';
    previous.disabled = !dateKey(shiftMonth(month, -1));
    next.disabled = !dateKey(shiftMonth(month, 1));
    const weekdays = el(popup, 'div', 'tp-picker-weekdays');
    for (let n = 0; n < 7; n++)
      el(
        weekdays,
        'span',
        '',
        new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
          utc(addDays('2026-10-05', n)),
        ),
      );
    const days = el(popup, 'div', 'tp-picker-days');
    const selected = parseDate(input.value, input.dataset.dateFormat as DateFormat);
    const candidate = focusDay || selected || day();
    const tabbable = candidate.slice(0, 7) === month.slice(0, 7) ? candidate : month;
    for (const key of monthGrid(month)) {
      const b = button(days, String(Number(key.slice(8))), () => choose(key), 'tp-picker-day');
      b.dataset.pickerDay = key;
      b.setAttribute('aria-label', formatDate(key, input.dataset.dateFormat as DateFormat));
      b.setAttribute('aria-pressed', String(key === selected));
      if (key === day()) b.setAttribute('aria-current', 'date');
      b.classList.toggle('tp-picker-outside', key.slice(0, 7) !== month.slice(0, 7));
      b.tabIndex = key === tabbable ? 0 : -1;
      b.addEventListener('keydown', (e) => {
        const delta: Record<string, number> = {
          ArrowLeft: -1,
          ArrowRight: 1,
          ArrowUp: -7,
          ArrowDown: 7,
        };
        if (delta[e.key] !== undefined) {
          e.preventDefault();
          focusDay = addDays(key, delta[e.key]!);
          if (focusDay.slice(0, 7) !== month.slice(0, 7)) month = focusDay.slice(0, 7) + '-01';
          render('day');
        }
      });
    }
    const actions = el(popup, 'div', 'tp-picker-actions');
    button(actions, w.today, () => choose(day()));
    button(actions, w.clearDate, () => choose(''));
    if (focusControl)
      popup
        .querySelector<HTMLElement>(
          focusControl === 'day'
            ? `[data-picker-day="${focusDay}"]`
            : `[data-picker-control="${focusControl}"]`,
        )
        ?.focus();
  };
  const trigger = iconButton(
    wrapper,
    'calendar',
    w.chooseDate,
    () => {
      if (popup.dataset.open === 'true') {
        close();
        return;
      }
      const selected = parseDate(input.value, input.dataset.dateFormat as DateFormat);
      month = (selected || day()).slice(0, 7) + '-01';
      focusDay = '';
      render();
      popup.hidden = false;
      popup.dataset.open = 'true';
      if (popup.showPopover) popup.showPopover();
      trigger.setAttribute('aria-expanded', 'true');
      const box = trigger.getBoundingClientRect();
      const viewport = wrapper.ownerDocument.defaultView!;
      const width = popup.getBoundingClientRect().width || 280;
      const height = popup.getBoundingClientRect().height || 290;
      popup.style.left = `${Math.max(8, Math.min(box.right - width, viewport.innerWidth - width - 8))}px`;
      popup.style.top = `${Math.max(8, Math.min(box.bottom + 6, viewport.innerHeight - height - 8))}px`;
      popup.querySelector<HTMLElement>('.tp-picker-day[tabindex="0"]')?.focus();
    },
    'tp-date-picker-button',
  );
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  popup.addEventListener('toggle', (e) => {
    if (e.newState === 'closed') {
      popup.dataset.open = 'false';
      trigger.setAttribute('aria-expanded', 'false');
    }
  });
  popup.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  });
}

/** A theme-owned 24-hour picker avoids OS-dependent AM/PM and native input styling. */
function attachClock(wrapper: HTMLElement, input: HTMLInputElement, language: string): void {
  const w = words(language);
  const popup = el(wrapper, 'div', 'tp-picker-popup tp-clock-popup');
  popup.setAttribute('popover', 'auto');
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-label', w.chooseTime);
  popup.hidden = true;
  const close = (restore = true) => {
    if (popup.hidePopover) {
      try {
        popup.hidePopover();
      } catch {
        /* Detached/fallback popover. */
      }
    }
    popup.replaceChildren();
    popup.hidden = true;
    popup.dataset.open = 'false';
    trigger.setAttribute('aria-expanded', 'false');
    if (restore) input.focus();
  };
  const apply = (value: string) => {
    input.value = value;
    input.setCustomValidity('');
    input.dispatchEvent(new input.ownerDocument.defaultView!.Event('change', { bubbles: true }));
    close();
  };
  const trigger = iconButton(
    wrapper,
    'clock',
    w.chooseTime,
    () => {
      if (popup.dataset.open === 'true') {
        close();
        return;
      }
      const value = timeKey(input.value) || '09:00';
      const grid = el(popup, 'div', 'tp-clock-grid');
      const hours = select(
        field(grid, w.clockHours),
        Array.from({ length: 24 }, (_, n) => [
          String(n).padStart(2, '0'),
          String(n).padStart(2, '0'),
        ]),
        '09',
      );
      hours.setAttribute('aria-label', w.clockHours);
      const minutes = select(
        field(grid, w.clockMinutes),
        Array.from({ length: 60 }, (_, n) => [
          String(n).padStart(2, '0'),
          String(n).padStart(2, '0'),
        ]),
        '00',
      );
      minutes.setAttribute('aria-label', w.clockMinutes);
      const actions = el(popup, 'div', 'tp-picker-actions');
      button(actions, w.clearTime, () => apply(''));
      button(actions, w.applyTime, () => apply(`${hours.value}:${minutes.value}`), 'mod-cta');
      hours.value = value.slice(0, 2);
      minutes.value = value.slice(3, 5);
      popup.hidden = false;
      popup.dataset.open = 'true';
      if (popup.showPopover) popup.showPopover();
      trigger.setAttribute('aria-expanded', 'true');
      const box = trigger.getBoundingClientRect();
      const viewport = wrapper.ownerDocument.defaultView!;
      const size = popup.getBoundingClientRect();
      const width = size.width || 260,
        height = size.height || 170;
      popup.style.left = `${Math.max(8, Math.min(box.right - width, viewport.innerWidth - width - 8))}px`;
      popup.style.top = `${Math.max(8, Math.min(box.bottom + 6, viewport.innerHeight - height - 8))}px`;
      hours.focus();
    },
    'tp-time-picker-button',
  );
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  popup.addEventListener('toggle', (e) => {
    if (e.newState === 'closed') {
      popup.replaceChildren();
      popup.dataset.open = 'false';
      trigger.setAttribute('aria-expanded', 'false');
    }
  });
  popup.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  });
}

/** Reserve both intrinsic label widths, including translated text and host font metrics. */
export function stabilizeButton(
  target: HTMLButtonElement,
  labels: readonly [string, string],
): void {
  const text = target.textContent || '';
  target.textContent = '';
  target.classList.add('tp-stable-button');
  target.dataset.labelA = labels[0];
  target.dataset.labelB = labels[1];
  el(target, 'span', 'tp-button-label', text);
}
