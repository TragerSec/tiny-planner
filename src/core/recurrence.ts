import { RRule } from '../../vendor/rrule';
import { addDays, dateKey, distance, utc } from './dates';
export function normalizeRule(raw: unknown): string {
  const s = String(raw ?? '').trim();
  const aliases: Record<string, string> = {
    daily: 'FREQ=DAILY',
    weekly: 'FREQ=WEEKLY',
    monthly: 'FREQ=MONTHLY',
    yearly: 'FREQ=YEARLY',
    weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
  };
  return Object.prototype.hasOwnProperty.call(aliases, s.toLowerCase())
    ? aliases[s.toLowerCase()]!
    : s.replace(/^RRULE:/i, '');
}
/** Calendar-day boundary used by the form; preserve existing UNTIL times on unchanged saves. */
export function recurrenceEnd(raw: string): string {
  const value = normalizeRule(raw)
    .split(';')
    .find((part) => part.startsWith('UNTIL='))
    ?.slice(6);
  const match = value?.match(/^(\d{4})(\d{2})(\d{2})(?:T\d{6}Z?)?$/);
  return match ? dateKey(`${match[1]}-${match[2]}-${match[3]}`) : '';
}
export function withRecurrenceEnd(raw: string, end: string): string {
  const rule = normalizeRule(raw);
  if (end && dateKey(end) !== end) throw new Error('Invalid recurrence end date.');
  if (end === recurrenceEnd(rule)) return rule;
  const fields = rule.split(';').filter((part) => !part.startsWith('UNTIL='));
  if (end) fields.push(`UNTIL=${end.replaceAll('-', '')}T235959Z`);
  return fields.join(';');
}
export function makeRule(rule: string, anchor: string): RRule {
  if (!anchor || dateKey(anchor) !== anchor)
    throw new Error('A recurring task needs a start date.');
  if (Number(anchor.slice(0, 4)) < 1900)
    throw new Error('Recurring tasks must start in 1900 or later.');
  if (rule.length > 1024) throw new Error('Recurrence rule is too long.');
  const fields = new Map<string, string>();
  const allowed = new Set([
    'FREQ',
    'INTERVAL',
    'COUNT',
    'UNTIL',
    'BYMONTH',
    'BYMONTHDAY',
    'BYDAY',
    'BYYEARDAY',
    'BYWEEKNO',
    'BYSETPOS',
    'WKST',
    'BYHOUR',
    'BYMINUTE',
    'BYSECOND',
  ]);
  for (const part of rule.split(';')) {
    const [key, value, extra] = part.split('=');
    if (!key || !value || extra !== undefined || !allowed.has(key) || fields.has(key))
      throw new Error('Invalid or duplicate recurrence field.');
    fields.set(key, value);
  }
  for (const key of ['INTERVAL', 'COUNT']) {
    const value = fields.get(key);
    if (
      value &&
      (!/^\d+$/.test(value) ||
        !Number.isSafeInteger(Number(value)) ||
        Number(value) < 1 ||
        Number(value) > 100000)
    )
      throw new Error(`${key} must be a positive integer no greater than 100000.`);
  }
  for (const key of ['BYHOUR', 'BYMINUTE', 'BYSECOND'])
    if (fields.has(key) && fields.get(key) !== '0')
      throw new Error(
        'RRULE supports one occurrence per calendar day; set appointment time in the time field.',
      );
  const bounds: Record<string, number> = {
    BYMONTH: 12,
    BYMONTHDAY: 31,
    BYYEARDAY: 366,
    BYWEEKNO: 53,
    BYSETPOS: 366,
  };
  for (const [key, limit] of Object.entries(bounds)) {
    const value = fields.get(key);
    if (
      value &&
      value
        .split(',')
        .some(
          (v) =>
            !/^-?\d+$/.test(v) ||
            Number(v) === 0 ||
            Math.abs(Number(v)) > limit ||
            (key === 'BYMONTH' && Number(v) < 1),
        )
    )
      throw new Error(`Invalid ${key} value.`);
  }
  if (fields.has('BYMONTH') && fields.has('BYMONTHDAY')) {
    const months = fields.get('BYMONTH')!.split(',').map(Number);
    const days = fields.get('BYMONTHDAY')!.split(',').map(Number);
    const maxDays = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (!months.some((m) => days.some((d) => Math.abs(d) <= maxDays[m]!)))
      throw new Error('Month/day constraints cannot produce a calendar date.');
  }
  const weekdays = fields.get('BYDAY');
  if (
    weekdays &&
    weekdays
      .split(',')
      .some(
        (v) =>
          !/^([+-]?[1-9]\d?)?(MO|TU|WE|TH|FR|SA|SU)$/.test(v) || Math.abs(parseInt(v) || 0) > 53,
      )
  )
    throw new Error('Invalid BYDAY value.');
  const options = RRule.parseString(rule);
  if (
    options.freq === undefined ||
    ![RRule.DAILY, RRule.WEEKLY, RRule.MONTHLY, RRule.YEARLY].includes(options.freq)
  )
    throw new Error('Use a daily, weekly, monthly or yearly rule.');
  if (options.interval !== undefined && options.interval < 1)
    throw new Error('Recurrence interval must be positive.');
  if (
    weekdays &&
    /[\d]/.test(weekdays) &&
    (options.freq === RRule.DAILY || options.freq === RRule.WEEKLY || fields.has('BYWEEKNO'))
  )
    throw new Error('Ordinal weekdays require a monthly/yearly rule without BYWEEKNO.');
  const until = fields.get('UNTIL');
  if (until) {
    const match = until.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/);
    if (
      !match ||
      !dateKey(`${match[1]}-${match[2]}-${match[3]}`) ||
      Number(match[4] || 0) > 23 ||
      Number(match[5] || 0) > 59 ||
      Number(match[6] || 0) > 59
    )
      throw new Error('Invalid recurrence end date.');
    if (`${match[1]}-${match[2]}-${match[3]}` < anchor)
      throw new Error('Recurrence end date must not precede the start date.');
  }
  return new RRule({ ...options, dtstart: utc(anchor) }, true);
}
// Jump by whole anchored periods for queries; COUNT must retain its original origin.
export function queryRule(rule: string, anchor: string, from: string): RRule {
  const original = makeRule(rule, anchor);
  const options = original.origOptions;
  if (
    !options.count &&
    (options.freq === RRule.DAILY || options.freq === RRule.WEEKLY) &&
    from > anchor
  ) {
    const period = (options.interval || 1) * (options.freq === RRule.DAILY ? 1 : 7);
    const periods = Math.max(0, Math.floor(distance(anchor, from) / period) - 1);
    if (periods)
      return new RRule({ ...options, dtstart: utc(addDays(anchor, periods * period)) }, true);
  }
  return original;
}
export function validateRule(rule: string, anchor: string): string {
  if (!rule) return '';
  try {
    makeRule(rule, anchor);
    return '';
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
export function repeatDates(rule: string, anchor: string, from: string, to: string): string[] {
  const queried = queryRule(rule, anchor, from);
  const options = queried.origOptions;
  // Simple day/week rules have evenly spaced UTC dates. Complex BY* rules still
  // use rrule, preserving its calendar semantics and the original COUNT origin.
  if (
    (options.freq === RRule.DAILY || options.freq === RRule.WEEKLY) &&
    rule.split(';').every((field) => /^(FREQ|INTERVAL|COUNT|UNTIL)=/.test(field))
  ) {
    const step = (options.interval || 1) * (options.freq === RRule.DAILY ? 1 : 7) * 86400000;
    const origin = utc(anchor).valueOf();
    const first = Math.max(0, Math.ceil((utc(from).valueOf() - origin) / step));
    const end = Math.min(utc(to).valueOf(), options.until?.valueOf() ?? Infinity);
    const result: string[] = [];
    for (let i = first; (!options.count || i < options.count) && origin + i * step <= end; i++) {
      if (result.length >= 20000) {
        const e = new Error('Recurrence exceeds the safe calculation budget; shorten its history.');
        e.name = 'RecurrenceLimitError';
        throw e;
      }
      result.push(new Date(origin + i * step).toISOString().slice(0, 10));
    }
    return result;
  }
  return queried.between(utc(from), utc(to), true).map((d) => d.toISOString().slice(0, 10));
}

/** First real RRULE date, rather than assuming DTSTART satisfies BYDAY/BYMONTHDAY. */
export function firstRepeatDate(rule: string, anchor: string): string {
  return makeRule(rule, anchor).after(utc(anchor), true)?.toISOString().slice(0, 10) || '';
}
