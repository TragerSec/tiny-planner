import type { PeriodDays } from './model';
const pad = (n: number) => String(n).padStart(2, '0');
export function day(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function dateKey(value: unknown): string {
  if (value instanceof Date) {
    if (!Number.isFinite(value.valueOf())) return '';
    value = value.toISOString();
  }
  const s = String(value ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s ? s : '';
}
export function utc(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}
export function addDays(key: string, amount: number): string {
  const d = utc(key);
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}
export function distance(a: string, b: string): number {
  return Math.round((utc(b).valueOf() - utc(a).valueOf()) / 86400000);
}
export function shiftMonth(key: string, amount: number): string {
  const d = utc(key.slice(0, 7) + '-01');
  d.setUTCMonth(d.getUTCMonth() + amount);
  return d.toISOString().slice(0, 10);
}
export function monthGrid(key: string): string[] {
  const first = key.slice(0, 7) + '-01';
  const start = addDays(first, -((utc(first).getUTCDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
export function pretty(key: string, locale: string): string {
  return key
    ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
        utc(key),
      )
    : '';
}

export type DateFormat = 'dmy' | 'mdy' | 'iso';
export function formatDate(key: string, format: DateFormat = 'dmy'): string {
  if (!dateKey(key)) return '';
  const [y, m, d] = key.split('-');
  return format === 'iso' ? key : format === 'mdy' ? `${m}/${d}/${y}` : `${d}.${m}.${y}`;
}
/** Strict calendar validation; ISO remains accepted for pasting exported dates. */
export function parseDate(text: string, format: DateFormat = 'dmy'): string {
  const value = text.trim();
  if (!value) return '';
  if (/^\d{8}$/.test(value)) {
    const year = format === 'iso' ? value.slice(0, 4) : value.slice(4);
    const month =
      format === 'iso'
        ? value.slice(4, 6)
        : format === 'mdy'
          ? value.slice(0, 2)
          : value.slice(2, 4);
    const date =
      format === 'iso' ? value.slice(6) : format === 'mdy' ? value.slice(2, 4) : value.slice(0, 2);
    return dateKey(`${year}-${month}-${date}`);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return dateKey(value);
  const match = value.match(
    format === 'mdy' ? /^(\d{2})\/(\d{2})\/(\d{4})$/ : /^(\d{2})\.(\d{2})\.(\d{4})$/,
  );
  if (!match || format === 'iso') return '';
  const [, first, second, year] = match;
  return dateKey(
    `${year}-${format === 'mdy' ? first : second}-${format === 'mdy' ? second : first}`,
  );
}

/** Local wall-clock appointment time; independent of RRULE's UTC date keys. */
export function timeKey(value: unknown): string {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  const text = /^\d{3,4}$/.test(raw) ? `${raw.slice(0, -2)}:${raw.slice(-2)}` : raw;
  const match = text.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  return match ? `${match[1]!.padStart(2, '0')}:${match[2]}` : '';
}

/** Calendar periods in the caller's local date. Weeks start on Monday. */
export function calendarPeriod(today: string, period: PeriodDays): { from: string; to: string } {
  if (period === 7) {
    const from = addDays(today, -((utc(today).getUTCDay() + 6) % 7));
    return { from, to: addDays(from, 6) };
  }
  const year = today.slice(0, 4);
  const month = Number(today.slice(5, 7));
  const from =
    period === 365
      ? `${year}-01-01`
      : period === 90
        ? `${year}-${pad(Math.floor((month - 1) / 3) * 3 + 1)}-01`
        : `${year}-${pad(month)}-01`;
  return { from, to: addDays(shiftMonth(from, period === 365 ? 12 : period === 90 ? 3 : 1), -1) };
}
export function periodDates(today: string, period: PeriodDays): string[] {
  const { from, to } = calendarPeriod(today, period);
  return Array.from({ length: distance(from, to) + 1 }, (_, i) => addDays(from, i));
}
