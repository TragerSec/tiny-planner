import { day } from '../core/dates';

export type PlannerTab =
  | 'today'
  | 'inbox'
  | 'upcoming'
  | 'calendar'
  | 'projects'
  | 'subscriptions'
  | 'statistics'
  | 'kanban'
  | 'manualTab';
export interface PlannerState extends Record<string, unknown> {
  tab: PlannerTab;
  calendarView: 'day' | 'week' | 'month';
  calendarDetailed: boolean;
  calendarOverview: boolean;
  hideCalendarDone: boolean;
  hideCalendarFailed: boolean;
  hideCalendarRecurring: boolean;
  sidebarCollapsed: boolean;
  query: string;
  area: string;
  project: string;
  boardScope: 'today' | 'week' | 'month' | 'all' | 'undated';
  expenseMode: 'payments' | 'subscriptions';
  statsMode: 'business' | 'finance';
}
export interface FormDraft {
  baseline: string;
  values: Record<string, string>;
  dateFormat: 'dmy' | 'mdy' | 'iso';
  savedOn: string;
}
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
/** Persist preferences, but open calendar dates relative to today on a fresh launch. */
export function plannerState(value: unknown): PlannerState {
  const raw = object(value);
  const choice = <T extends string>(key: string, choices: readonly T[], fallback: T): T =>
    choices.includes(raw[key] as T) ? (raw[key] as T) : fallback;
  const text = (key: string) => (typeof raw[key] === 'string' ? raw[key].slice(0, 1000) : '');
  return {
    tab: choice(
      'tab',
      [
        'today',
        'inbox',
        'upcoming',
        'calendar',
        'projects',
        'subscriptions',
        'statistics',
        'kanban',
        'manualTab',
      ],
      'today',
    ),
    calendarView: choice('calendarView', ['day', 'week', 'month'], 'month'),
    calendarDetailed: raw.calendarDetailed === true,
    calendarOverview: raw.calendarOverview === true,
    hideCalendarDone: raw.hideCalendarDone === true,
    hideCalendarFailed: raw.hideCalendarFailed === true,
    hideCalendarRecurring: raw.hideCalendarRecurring === true,
    sidebarCollapsed: raw.sidebarCollapsed === true,
    query: text('query'),
    area: text('area'),
    project: text('project'),
    boardScope: choice('boardScope', ['today', 'week', 'month', 'all', 'undated'], 'week'),
    expenseMode: choice('expenseMode', ['payments', 'subscriptions'], 'payments'),
    statsMode: choice('statsMode', ['business', 'finance'], 'business'),
  };
}
export function formDrafts(value: unknown): Record<string, FormDraft> {
  const result: Record<string, FormDraft> = {};
  for (const [key, entry] of Object.entries(object(value)).slice(-20)) {
    const raw = object(entry);
    if (
      !key.startsWith('form:') ||
      key.length > 2048 ||
      typeof raw.baseline !== 'string' ||
      raw.baseline.length > 200000
    )
      continue;
    const values: Record<string, string> = {};
    for (const [name, field] of Object.entries(object(raw.values)).slice(0, 40))
      if (
        /^[a-zA-Z][a-zA-Z0-9]*$/.test(name) &&
        typeof field === 'string' &&
        field.length <= 100000
      )
        values[name] = field;
    result[key] = {
      baseline: raw.baseline,
      values,
      dateFormat: raw.dateFormat === 'mdy' || raw.dateFormat === 'iso' ? raw.dateFormat : 'dmy',
      savedOn: typeof raw.savedOn === 'string' ? raw.savedOn : day(),
    };
  }
  return result;
}
