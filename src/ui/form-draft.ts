import { el, button } from './dom';
import { parseDate, formatDate } from '../core/dates';
import { setSelectValue } from './selection';
import type { Task } from '../core/model';
import type TinyPlanner from '../main';
import type { Words } from './i18n';
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
/** Explicit fields only: picker internals and search widgets never enter the draft. */
export function keepFormDraft(
  plugin: TinyPlanner,
  form: HTMLFormElement,
  key: string,
  baseline: string,
  controls: Record<string, Control>,
  w: Words,
  refreshed: () => void = () => undefined,
) {
  const values = () =>
    Object.fromEntries(Object.entries(controls).map(([name, control]) => [name, control.value]));
  const pristine = JSON.stringify(values());
  const saved = plugin.settings.formDrafts?.[key];
  const banner = el(form, 'div', 'tp-draft-banner');
  banner.hidden = true;
  form.prepend(banner);
  let finished = false;
  let pendingReview = !!saved && saved.baseline !== baseline;
  const clear = () => {
    if (plugin.settings.formDrafts) delete plugin.settings.formDrafts[key];
    plugin.scheduleSettings();
  };
  const capture = () => {
    if (finished) return;
    const current = values();
    if (JSON.stringify(current) === pristine) {
      if (!pendingReview) clear();
      return;
    }
    const entries = Object.entries(plugin.settings.formDrafts || {})
      .filter(([name]) => name !== key)
      .slice(-19);
    plugin.settings.formDrafts = Object.fromEntries([
      ...entries,
      [
        key,
        {
          baseline,
          values: current,
          dateFormat: plugin.settings.dateFormat,
          savedOn: new Date().toISOString(),
        },
      ],
    ]);
    plugin.scheduleSettings();
  };
  const restore = () => {
    if (!saved) return;
    pendingReview = false;
    for (const [name, value] of Object.entries(saved.values)) {
      const control = controls[name];
      if (!control) continue;
      const restored =
        control.classList.contains('tp-date') && saved.dateFormat !== plugin.settings.dateFormat
          ? formatDate(parseDate(value, saved.dateFormat), plugin.settings.dateFormat) || value
          : value;
      if (control.tagName === 'SELECT') {
        const select = control as HTMLSelectElement;
        if (![...select.options].some((option) => option.value === restored)) continue;
        setSelectValue(select, restored);
      } else control.value = restored;
    }
    refreshed();
    banner.replaceChildren();
    el(banner, 'span', '', w.draftRestored);
    button(
      banner,
      w.discardDraft,
      () => {
        finished = true;
        clear();
        banner.hidden = true;
        // Restore the initial form rather than leaving discarded values behind.
        const initial: Record<string, string> = JSON.parse(pristine) as Record<string, string>;
        for (const [name, value] of Object.entries(initial)) {
          const control = controls[name]!;
          if (control.tagName === 'SELECT') setSelectValue(control as HTMLSelectElement, value);
          else control.value = value;
        }
        refreshed();
        finished = false;
      },
      'tp-text-button',
    );
    banner.hidden = false;
  };
  if (saved) {
    if (saved.baseline === baseline) restore();
    else {
      banner.hidden = false;
      el(banner, 'span', '', w.draftChanged);
      button(banner, w.restoreDraft, restore, 'tp-text-button');
      button(
        banner,
        w.discardDraft,
        () => {
          clear();
          banner.hidden = true;
        },
        'tp-text-button',
      );
    }
  }
  form.addEventListener('input', capture);
  form.addEventListener('change', capture);
  return {
    capture,
    commit: () => {
      finished = true;
      clear();
    },
  };
}

/** A draft must not duplicate the whole recurrence or financial ledger. */
export function taskDraftBaseline(task: Task, occurrence = ''): string {
  return JSON.stringify({
    path: task.path,
    title: task.title,
    description: task.description,
    result: task.result || '',
    kind: task.kind,
    status: task.status,
    project: task.project,
    scheduled: task.scheduled,
    scheduledTime: task.scheduledTime,
    due: task.due,
    recurrence: task.recurrence,
    seriesEnd: task.seriesEnd,
    priority: task.priority,
    workDates: task.workDates,
    plannedMinutes: task.plannedMinutes,
    minutes: task.minutes,
    amount: task.amount,
    currency: task.currency,
    billingPeriod: task.billingPeriod,
    subscriptionActive: task.subscriptionActive,
    resolvedOn: task.resolvedOn,
    occurrence: task.occurrences[occurrence],
  });
}
