export const STATUSES = ['backlog', 'todo', 'in-progress', 'done', 'failed'] as const;
export type Status = (typeof STATUSES)[number];
export function isActive(status: Status): boolean {
  return status !== 'done' && status !== 'failed';
}
export type Kind = 'task' | 'meeting' | 'payment' | 'status' | 'subscription';
export type FM = Record<string, unknown>;
export interface Charge {
  amount: number;
  currency: string;
  paidOn: string;
}
// Stable period control keys, not rolling day counts.
export type PeriodDays = 7 | 30 | 90 | 365;
export interface Resolution {
  amount?: number | null;
  currency?: string;
  status: Status;
  minutes?: number;
  resolvedAt?: string;
  resolvedOn?: string;
}
export interface Task {
  path: string;
  title: string;
  description: string;
  status: Status;
  kind: Kind;
  project: string;
  scheduled: string;
  scheduledTime?: string;
  workDates?: string[];
  plannedMinutes?: number;
  due: string;
  recurrence: string;
  seriesEnd: string;
  occurrences: Record<string, Resolution>;
  moves: Record<string, string>;
  skipped: string[];
  minutes: number;
  resolvedOn: string;
  priority: 'normal' | 'high';
  unsupportedRepeat: string;
  amount: number | null;
  currency: string;
  billingPeriod: 'monthly' | 'yearly';
  subscriptionActive: boolean;
  payment?: { amount: number | null; currency: string };
  charges?: Record<string, Charge>;
}
export interface BudgetScope {
  monthlyBudget?: number | null;
  budgetCurrency?: string;
}
export interface Project extends BudgetScope {
  path: string;
  title: string;
  area: string;
  status: Status;
  due: string;
}
export interface Area extends BudgetScope {
  path: string;
  title: string;
}
export interface Occurrence {
  task: Task;
  key: string;
  date: string;
  end: string;
  status: Status;
  minutes: number;
  recurring: boolean;
  calendarRole?: 'work' | 'deadline';
}
export interface Snapshot {
  tasks: Task[];
  projects: Project[];
  areas: Area[];
}
export const SCHEMA = 1;
export const TERMINAL = new Set<Status>(['done', 'failed']);
export function normalizeStatus(value: unknown): Status {
  const s = String(value ?? 'todo')
    .trim()
    .toLowerCase()
    .replace(/[ _]+/g, '-');
  if (['done', 'completed', 'complete', 'cancelled', 'canceled'].includes(s)) return 'done';
  if (['failed', 'failure'].includes(s)) return 'failed';
  if (['archived', 'archive'].includes(s)) return 'done';
  if (['backlog', 'paused', 'on-hold'].includes(s)) return 'backlog';
  if (s === 'active') return 'in-progress';
  if (['in-progress', 'inprogress'].includes(s)) return 'in-progress';
  return 'todo'; // Includes legacy open and "to do".
}
export function strings(value: unknown): string[] {
  if (value == null) return [];
  const entries: unknown[] = Array.isArray(value) ? value as unknown[] : [value];
  return entries.map((v) =>
    typeof v === 'object' && v !== null && 'path' in v ? String(v.path) : String(v),
  );
}
export function link(value: unknown): string {
  return (
    strings(value)[0]
      ?.replace(/^\[\[/, '')
      .replace(/\]\]$/, '')
      .split('|')[0]
      ?.split('#')[0]
      ?.trim() ?? ''
  );
}
export function title(fm: FM, path: string): string {
  return String(fm.title || path.split('/').pop()?.replace(/\.md$/i, '') || 'Untitled');
}
export function safeMinutes(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}
