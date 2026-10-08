import { App, normalizePath, stringifyYaml, TFile, TFolder } from 'obsidian';
import {
  FM,
  Kind,
  Occurrence,
  SCHEMA,
  Status,
  Task,
  STATUSES,
  isActive,
  normalizeStatus,
} from '../core/model';
import { addDays, dateKey, day, distance, timeKey } from '../core/dates';
import { validateRule, firstRepeatDate } from '../core/recurrence';
import { Repository, frontmatter } from './repository';
import { normalizeTask, safeAmount } from '../core/normalize';
export interface TaskDraft {
  title: string;
  description?: string;
  status?: Status;
  project: string;
  scheduled: string;
  scheduledTime?: string;
  workDates?: string[];
  plannedMinutes?: number;
  due: string;
  recurrence: string;
  kind: Kind;
  minutes: number;
  priority: 'normal' | 'high';
  amount?: number | null;
  currency?: string;
  paidOn?: string;
}
export interface SubscriptionDraft {
  title: string;
  description: string;
  project: string;
  amount: number | null;
  currency: string;
  billingPeriod: 'monthly' | 'yearly';
  scheduled: string;
  active: boolean;
}
type Undo =
  { path: string; before: FM; after: FM; keys: string[] } | { path: string; content: string };
export class TaskService {
  private queues = new Map<string, Promise<unknown>>();
  private undoStack: Undo[] = [];
  private undoQueue: Promise<void> = Promise.resolve();
  constructor(
    readonly app: App,
    readonly repo: Repository,
    readonly folder: () => string,
  ) {}
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  file(path: string): TFile {
    const f = this.app.vault.getAbstractFileByPath(path);
    if (!(f instanceof TFile)) throw new Error(`Note not found: ${path}`);
    return f;
  }
  async ensureFolder(path: string): Promise<void> {
    let cursor = '';
    for (const part of normalizePath(path).split('/').filter(Boolean)) {
      cursor = cursor ? cursor + '/' + part : part;
      const current = this.app.vault.getAbstractFileByPath(cursor);
      if (current && !(current instanceof TFolder))
        throw new Error(`A file blocks the planner folder: ${cursor}`);
      if (!current)
        try {
          await this.app.vault.createFolder(cursor);
        } catch (error) {
          if (!(this.app.vault.getAbstractFileByPath(cursor) instanceof TFolder)) throw error;
        }
    }
  }
  private remember(entry: Undo): void {
    this.undoStack.push(entry);
    if (this.undoStack.length > 50) this.undoStack.shift();
  }
  private serial<T>(path: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(path) || Promise.resolve();
    const next = previous.catch(() => undefined).then(fn);
    this.queues.set(path, next);
    void next
      .finally(() => {
        if (this.queues.get(path) === next) this.queues.delete(path);
      })
      .catch(() => undefined);
    return next;
  }
  async patch(path: string, change: (fm: FM) => void, remember = true): Promise<void> {
    return this.serial(path, async () => {
      const file = this.file(path);
      let undo: Undo | undefined;
      await this.app.fileManager.processFrontMatter(file, (raw) => {
        const fm: FM = raw as FM;
        if (Number(fm.topSchema) > SCHEMA) throw new Error('Cannot edit a future planner schema.');
        if (
          Number(fm.topSchema) !== SCHEMA ||
          !['task', 'project', 'area'].includes(String(fm.type))
        )
          throw new Error('This note is no longer a supported planner note.');
        const before = structuredClone(fm);
        change(fm);
        if (
          fm.type === 'project' &&
          fm.status !== before.status &&
          !STATUSES.includes(fm.status as Status)
        )
          throw new Error('Invalid project status.');
        fm.topSchema = SCHEMA;
        const after = structuredClone(fm);
        const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
          (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]),
        );
        undo = { path, before, after, keys };
      });
      if (remember && undo && 'keys' in undo && undo.keys.length) this.remember(undo);
      await this.repo.refresh(file);
    });
  }
  private patchTask(path: string, change: (fm: FM) => void): Promise<void> {
    return this.patch(path, (fm) => {
      if (fm.type !== 'task') throw new Error('This note is no longer a task.');
      change(fm);
    });
  }
  async createNote(
    type: 'task' | 'project' | 'area',
    title: string,
    fm: FM,
    body = '',
  ): Promise<TFile> {
    if (type === 'project') fm = { ...fm, status: normalizeStatus(fm.status ?? 'backlog') };
    const name = title.trim();
    if (!name) throw new Error('A title is required.');
    const root = normalizePath(this.folder());
    if (
      !root ||
      root.startsWith('/') ||
      /[\x00-\x1f:*?"<>|]/.test(root) ||
      root.split('/').includes('..') ||
      root.split('/').some((x) => x.startsWith('.'))
    )
      throw new Error('Choose a normal folder inside your vault.');
    const directory = `${root}/${type === 'task' ? 'Tasks' : type === 'project' ? 'Projects' : 'Areas'}`;
    await this.ensureFolder(directory);
    let slug =
      name
        .replace(/[\\/:*?"<>|#^[\]\x00-\x1f]/g, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 80)
        .replace(/[. ]+$/, '')
        .trim() || type;
    while (new TextEncoder().encode(slug).length > 160)
      slug = Array.from(slug).slice(0, -1).join('');
    const path = `${directory}/${slug}--${crypto.randomUUID()}.md`;
    const file = await this.app.vault.create(
      path,
      `---\n${stringifyYaml({ ...fm, type, title: name, topSchema: SCHEMA })}---\n\n${body || '# ' + name + '\n'}`,
    );
    await this.repo.refresh(file);
    return file;
  }
  validate(draft: TaskDraft): void {
    if (draft.status !== undefined && !STATUSES.includes(draft.status))
      throw new Error('Invalid status.');
    if (
      draft.description !== undefined &&
      (typeof draft.description !== 'string' || draft.description.length > 100000)
    )
      throw new Error('Description must be at most 100000 characters.');
    if (!draft.title.trim()) throw new Error('A title is required.');
    if (
      draft.scheduledTime !== undefined &&
      draft.scheduledTime !== '' &&
      timeKey(draft.scheduledTime) !== draft.scheduledTime
    )
      throw new Error('Invalid appointment time. Use HH:mm from 00:00 to 23:59.');
    if (
      (draft.scheduled && dateKey(draft.scheduled) !== draft.scheduled) ||
      (draft.due && dateKey(draft.due) !== draft.due)
    )
      throw new Error('Invalid date.');
    if (draft.scheduled && draft.due && draft.due < draft.scheduled)
      throw new Error('End date must not precede the start date.');
    if (
      draft.plannedMinutes !== undefined &&
      (!Number.isFinite(draft.plannedMinutes) ||
        draft.plannedMinutes < 0 ||
        draft.plannedMinutes > 10000000)
    )
      throw new Error('Invalid planned minutes.');
    if (
      draft.workDates !== undefined &&
      (!Array.isArray(draft.workDates) ||
        draft.workDates.length > 1000 ||
        draft.workDates.some((d) => !d || dateKey(d) !== d || (!!draft.due && d > draft.due)))
    )
      throw new Error('Invalid work dates.');
    if (draft.recurrence && draft.workDates?.length)
      throw new Error('Work dates cannot be combined with a repeat rule.');
    if (!Number.isFinite(draft.minutes) || draft.minutes < 0)
      throw new Error('Minutes must be zero or greater.');
    if (draft.amount !== undefined && draft.amount !== null && safeAmount(draft.amount) === null)
      throw new Error('Invalid payment amount.');
    if (draft.currency !== undefined && !/^[A-Z]{3}$/.test(draft.currency))
      throw new Error('Use a three-letter currency code.');
    if (draft.paidOn && (dateKey(draft.paidOn) !== draft.paidOn || draft.paidOn > day()))
      throw new Error('Payment date must be today or earlier.');
    if (draft.recurrence) {
      const error = validateRule(draft.recurrence, draft.scheduled);
      if (error) throw new Error(error);
    }
  }
  async createTask(draft: TaskDraft): Promise<TFile> {
    this.validate(draft);
    const first = draft.recurrence ? firstRepeatDate(draft.recurrence, draft.scheduled) : '';
    if (draft.recurrence && !first)
      throw new Error('The repeat rule has no occurrence within its dates.');
    return this.createNote('task', draft.title, {
      status: draft.recurrence ? 'todo' : (draft.status ?? 'todo'),
      description: draft.description ?? '',
      ...(!draft.recurrence && draft.status === 'done'
        ? { completedDate: draft.kind === 'payment' ? draft.paidOn || day() : day() }
        : !draft.recurrence && draft.status === 'failed'
          ? { failedDate: day() }
          : {}),
      ...(draft.recurrence && ((draft.status && draft.status !== 'todo') || draft.minutes > 0)
        ? {
            topOccurrences: {
              [first]: {
                status: draft.status ?? 'todo',
                minutes: Math.round(draft.minutes),
                ...(isActive(draft.status ?? 'todo')
                  ? {}
                  : {
                      resolvedOn: draft.kind === 'payment' ? draft.paidOn || day() : day(),
                      resolvedAt: new Date().toISOString(),
                      ...(draft.kind === 'payment'
                        ? { amount: draft.amount ?? null, currency: draft.currency ?? 'USD' }
                        : {}),
                    }),
              },
            },
          }
        : {}),
      ...(draft.recurrence && draft.status === 'done' ? { complete_instances: [first] } : {}),
      project: draft.project ? `[[${draft.project}]]` : '',
      scheduled: draft.scheduled || null,
      ...(draft.scheduledTime !== undefined ? { scheduledTime: draft.scheduledTime || null } : {}),
      ...(draft.workDates !== undefined ? { workDates: [...new Set(draft.workDates)].sort() } : {}),
      ...(draft.plannedMinutes !== undefined
        ? { plannedMinutes: Math.round(draft.plannedMinutes) }
        : {}),
      due: draft.due || null,
      recurrence: draft.recurrence || null,
      taskType: draft.kind,
      ...(draft.kind === 'payment'
        ? { amount: draft.amount ?? null, currency: draft.currency ?? 'USD' }
        : {}),
      ...(!draft.recurrence && draft.kind === 'payment' && draft.status === 'done'
        ? { topPayment: { amount: draft.amount ?? null, currency: draft.currency ?? 'USD' } }
        : {}),
      actualMinutes: draft.recurrence ? 0 : Math.round(draft.minutes),
      priority: draft.priority,
      dateCreated: new Date().toISOString(),
    });
  }
  async saveSubscription(draft: SubscriptionDraft, task?: Task): Promise<void> {
    if (!draft.title.trim() || draft.title.length > 1000)
      throw new Error('A title of at most 1000 characters is required.');
    if (draft.description.length > 100000) throw new Error('Description is too long.');
    if (
      draft.amount !== null &&
      (!Number.isFinite(draft.amount) || draft.amount < 0 || draft.amount > 1e12)
    )
      throw new Error('Invalid subscription amount.');
    if (!/^[A-Z]{3}$/.test(draft.currency)) throw new Error('Use a three-letter currency code.');
    if (!['monthly', 'yearly'].includes(draft.billingPeriod))
      throw new Error('Invalid billing period.');
    if (draft.scheduled && dateKey(draft.scheduled) !== draft.scheduled)
      throw new Error('Invalid date.');
    if (task && task.kind !== 'subscription') throw new Error('This note is not a subscription.');
    const fm: FM = {
      title: draft.title.trim(),
      description: draft.description,
      taskType: 'subscription',
      subscriptionActive: draft.active,
      amount: draft.amount,
      currency: draft.currency,
      billingPeriod: draft.billingPeriod,
      scheduled: draft.scheduled || null,
      project: draft.project ? `[[${draft.project}]]` : '',
      status: draft.active ? 'todo' : 'done',
    };
    if (task)
      await this.patchTask(task.path, (current) => {
        if (String(current.taskType ?? current.kind).toLowerCase() !== 'subscription')
          throw new Error('This note is no longer a subscription.');
        Object.assign(current, fm);
      });
    else await this.createNote('task', draft.title, fm);
  }
  async subscriptionActive(task: Task, active: boolean): Promise<void> {
    if (task.kind !== 'subscription') throw new Error('This note is not a subscription.');
    await this.patchTask(task.path, (fm) => {
      if (String(fm.taskType ?? fm.kind).toLowerCase() !== 'subscription')
        throw new Error('This note is no longer a subscription.');
      fm.subscriptionActive = active;
      fm.status = active ? 'todo' : 'done';
    });
  }
  async editTask(path: string, draft: TaskDraft): Promise<void> {
    if (draft.kind === 'subscription')
      throw new Error('Use subscription settings for expense trackers.');
    this.validate(draft);
    await this.patchTask(path, (fm) => {
      if (String(fm.taskType ?? fm.kind).toLowerCase() === 'subscription')
        throw new Error('Use subscription settings for expense trackers.');
      this.guardPaymentKind(fm, draft);
      Object.assign(fm, {
        title: draft.title.trim(),
        ...(draft.description !== undefined ? { description: draft.description } : {}),
        project: draft.project ? `[[${draft.project}]]` : '',
        scheduled: draft.scheduled || null,
        ...(draft.scheduledTime !== undefined
          ? { scheduledTime: draft.scheduledTime || null }
          : {}),
        ...(draft.workDates !== undefined
          ? { workDates: [...new Set(draft.workDates)].sort() }
          : {}),
        ...(draft.plannedMinutes !== undefined
          ? { plannedMinutes: Math.round(draft.plannedMinutes) }
          : {}),
        due: draft.due || null,
        recurrence: draft.recurrence || null,
        taskType: draft.kind,
        ...(draft.amount !== undefined
          ? { amount: draft.amount, currency: draft.currency ?? 'USD' }
          : {}),
        actualMinutes: Math.round(draft.minutes),
        priority: draft.priority,
      });
    });
  }
  private writeStatus(fm: FM, item: Occurrence, status: Status): void {
    if (item.task.kind === 'subscription' || fm.taskType === 'subscription')
      throw new Error('Subscriptions have no task workflow.');
    if (!STATUSES.includes(status)) throw new Error('Invalid status.');
    if (item.recurring) {
      if (!item.key || dateKey(item.key) !== item.key)
        throw new Error('No editable occurrence selected.');
      const records = { ...((fm.topOccurrences as Record<string, FM>) || {}) };
      const old = records[item.key] || {};
      // Re-applying the same status must not move historical work into today.
      if (normalizeTask(item.task.path, fm).occurrences[item.key]?.status === status) return;
      records[item.key] = {
        ...old,
        status,
        ...(fm.taskType === 'payment' && status === 'done'
          ? { amount: safeAmount(fm.amount), currency: fm.currency || 'USD' }
          : {}),
        resolvedAt: isActive(status) ? null : new Date().toISOString(),
        resolvedOn: isActive(status) ? null : day(),
      };
      fm.topOccurrences = records;
      const completed = new Set(
        Array.isArray(fm.complete_instances) ? fm.complete_instances.map(String) : [],
      );
      if (status === 'done') completed.add(item.key);
      else completed.delete(item.key);
      fm.complete_instances = [...completed].sort();
    } else {
      if (normalizeTask(item.task.path, fm).status === status) return;
      fm.status = status;
      delete fm.completedDate;
      delete fm.failedDate;
      if (status === 'done') {
        fm.completedDate = day();
        if (fm.taskType === 'payment')
          fm.topPayment = { amount: safeAmount(fm.amount), currency: fm.currency || 'USD' };
      }
      if (status === 'failed') fm.failedDate = day();
    }
  }
  async saveTask(
    item: Occurrence,
    draft: TaskDraft,
    minutes: number,
    status: Status,
  ): Promise<void> {
    if (item.task.kind === 'subscription' || draft.kind === 'subscription')
      throw new Error('Use subscription settings for expense trackers.');
    this.validate(draft);
    if (draft.recurrence && !item.recurring && !firstRepeatDate(draft.recurrence, draft.scheduled))
      throw new Error('The repeat rule has no occurrence within its dates.');
    if (!Number.isFinite(minutes) || minutes < 0)
      throw new Error('Minutes must be zero or greater.');
    if (!STATUSES.includes(status)) throw new Error('Invalid status.');
    await this.patchTask(item.task.path, (fm) => {
      if (String(fm.taskType ?? fm.kind).toLowerCase() === 'subscription')
        throw new Error('Use subscription settings for expense trackers.');
      this.guardPaymentKind(fm, draft);
      Object.assign(fm, {
        title: draft.title.trim(),
        ...(draft.description !== undefined ? { description: draft.description } : {}),
        project: draft.project ? `[[${draft.project}]]` : '',
        scheduled: draft.scheduled || null,
        ...(draft.scheduledTime !== undefined
          ? { scheduledTime: draft.scheduledTime || null }
          : {}),
        ...(draft.workDates !== undefined
          ? { workDates: [...new Set(draft.workDates)].sort() }
          : {}),
        ...(draft.plannedMinutes !== undefined
          ? { plannedMinutes: Math.round(draft.plannedMinutes) }
          : {}),
        due: draft.due || null,
        recurrence: draft.recurrence || null,
        taskType: draft.kind,
        ...(draft.amount !== undefined &&
        !(
          item.recurring &&
          item.task.kind === 'payment' &&
          (status === 'done' || item.status === 'done')
        )
          ? { amount: draft.amount, currency: draft.currency ?? 'USD' }
          : {}),
        priority: draft.priority,
      });

      const recurring = !!draft.recurrence;
      if (recurring) {
        fm.actualMinutes = item.recurring ? Math.round(draft.minutes) : 0;
        if (!item.recurring) fm.status = 'todo';
        const key = item.recurring ? item.key : firstRepeatDate(draft.recurrence, draft.scheduled);
        // An exhausted series can still edit its rule/title, without fabricating an occurrence.
        if (key) {
          const target = { ...item, recurring: true, key };
          if (status !== item.status || !item.recurring) this.writeStatus(fm, target, status);
          const records = { ...((fm.topOccurrences as Record<string, FM>) || {}) };
          records[key] = {
            ...(records[key] || { status }),
            minutes: Math.round(minutes),
            ...(draft.kind === 'payment' && status === 'done'
              ? {
                  amount: draft.amount !== undefined ? draft.amount : item.task.amount,
                  currency: draft.currency ?? item.task.currency,
                  resolvedOn:
                    draft.paidOn ||
                    records[key]?.resolvedOn ||
                    (item.status === 'done' && item.recurring ? undefined : day()),
                }
              : {}),
          };
          fm.topOccurrences = records;
        }
      } else {
        fm.actualMinutes = Math.round(minutes);
        if (status !== item.status || item.recurring)
          this.writeStatus(fm, { ...item, recurring: false }, status);
        if (draft.kind === 'payment' && status === 'done') {
          fm.topPayment = {
            amount: draft.amount !== undefined ? draft.amount : item.task.amount,
            currency: draft.currency ?? item.task.currency,
          };
          fm.completedDate =
            draft.paidOn ||
            fm.completedDate ||
            (item.status === 'done' && !item.recurring ? undefined : day());
        }
      }
    });
  }
  private guardPaymentKind(
    fm: FM,
    draft: TaskDraft,
    oldKind = String(fm.taskType ?? fm.kind),
  ): void {
    const current = normalizeTask('', fm);
    const hasHistory =
      fm.topPayment ||
      (!current.recurrence && current.status === 'done') ||
      Object.values(current.occurrences).some((r) => r.status === 'done' || 'amount' in r);
    if (oldKind === 'payment' && hasHistory && !!draft.recurrence !== !!fm.recurrence)
      throw new Error('Keep the recurrence mode while payment history exists.');
    if (oldKind === 'payment' && draft.kind !== 'payment' && hasHistory)
      throw new Error('Keep the payment type while payment history exists.');
  }
  async charge(
    task: Task,
    billingDate: string,
    amount: number,
    currency: string,
    paidOn: string,
  ): Promise<void> {
    if (
      dateKey(billingDate) !== billingDate ||
      !billingDate ||
      dateKey(paidOn) !== paidOn ||
      !paidOn ||
      paidOn > day()
    )
      throw new Error('Payment date must be today or earlier.');
    if (safeAmount(amount) === null) throw new Error('Invalid payment amount.');
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Use a three-letter currency code.');
    await this.patchTask(task.path, (fm) => {
      if (String(fm.taskType ?? fm.kind) !== 'subscription')
        throw new Error('This note is not a subscription.');
      const records = { ...((fm.topCharges as Record<string, FM>) || {}) };
      if (records[billingDate]) throw new Error('This billing date is already recorded.');
      records[billingDate] = { amount, currency, paidOn };
      fm.topCharges = records;
    });
  }
  async removeCharge(task: Task, key: string): Promise<void> {
    await this.patchTask(task.path, (fm) => {
      if (String(fm.taskType ?? fm.kind) !== 'subscription')
        throw new Error('This note is not a subscription.');
      const records = { ...((fm.topCharges as Record<string, FM>) || {}) };
      delete records[key];
      fm.topCharges = records;
    });
  }
  async status(item: Occurrence, status: Status): Promise<void> {
    await this.patchTask(item.task.path, (fm) => this.writeStatus(fm, item, status));
  }
  async minutes(item: Occurrence, value: number): Promise<void> {
    if (item.task.kind === 'subscription')
      throw new Error('Use subscription settings for expense trackers.');
    if (!Number.isFinite(value) || value < 0) throw new Error('Minutes must be zero or greater.');
    await this.patchTask(item.task.path, (fm) => {
      if (item.recurring) {
        const records = { ...((fm.topOccurrences as Record<string, FM>) || {}) };
        records[item.key] = {
          ...(records[item.key] || { status: item.status }),
          minutes: Math.round(value),
        };
        fm.topOccurrences = records;
      } else fm.actualMinutes = Math.round(value);
    });
  }
  async budget(path: string, amount: number | null, currency: string): Promise<void> {
    if (amount !== null && safeAmount(amount) === null) throw new Error('Invalid budget.');
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Use a three-letter currency code.');
    await this.patch(path, (fm) => {
      if (fm.type !== 'project' && fm.type !== 'area') throw new Error('Invalid budget.');
      fm.monthlyBudget = amount;
      fm.budgetCurrency = currency;
    });
  }
  async move(item: Occurrence, target: string): Promise<void> {
    if (item.task.kind === 'subscription')
      throw new Error('Use subscription settings for expense trackers.');
    if (!target || dateKey(target) !== target) throw new Error('Invalid date.');
    await this.patchTask(item.task.path, (fm) => {
      if (item.recurring) {
        const moves = { ...((fm.topMoves as Record<string, string>) || {}) };
        if (target === item.key) delete moves[item.key];
        else moves[item.key] = target;
        fm.topMoves = moves;
      } else if (item.calendarRole === 'deadline') {
        const task = normalizeTask(item.task.path, fm);
        if ([task.scheduled, ...(task.workDates || [])].filter(Boolean).some((d) => d > target))
          throw new Error('Invalid work dates.');
        fm.due = target;
      } else if (item.calendarRole === 'work') {
        const task = normalizeTask(item.task.path, fm);
        if (task.due && target > task.due) throw new Error('Invalid work dates.');
        if (item.date === task.scheduled) fm.scheduled = target;
        else
          fm.workDates = [
            ...new Set((task.workDates || []).map((d) => (d === item.date ? target : d))),
          ].sort();
      } else {
        const length =
          item.task.scheduled && item.task.due
            ? Math.max(0, distance(item.task.scheduled, item.task.due))
            : 0;
        fm.scheduled = target;
        if (item.task.due) fm.due = addDays(target, length);
      }
    });
  }
  async skip(item: Occurrence): Promise<void> {
    if (item.task.kind === 'subscription')
      throw new Error('Use subscription settings for expense trackers.');
    if (!item.recurring) throw new Error('This is not a recurring occurrence.');
    await this.patchTask(item.task.path, (fm) => {
      fm.topSkipped = [
        ...new Set([...(Array.isArray(fm.topSkipped) ? fm.topSkipped.map(String) : []), item.key]),
      ];
    });
  }
  async stopSeries(path: string, today = day()): Promise<void> {
    await this.patchTask(path, (fm) => {
      if (String(fm.taskType ?? fm.kind).toLowerCase() === 'subscription')
        throw new Error('Use subscription settings for expense trackers.');
      fm.topSeriesEnd = today;
    });
  }
  async resumeSeries(path: string): Promise<void> {
    await this.patchTask(path, (fm) => {
      if (String(fm.taskType ?? fm.kind).toLowerCase() === 'subscription')
        throw new Error('Use subscription settings for expense trackers.');
      delete fm.topSeriesEnd;
      fm.status = 'todo';
    });
  }
  async trash(path: string, expectedType?: 'task' | 'project' | 'area'): Promise<void> {
    await this.serial(path, async () => {
      const file = this.file(path);
      const content = await this.app.vault.read(file);
      const fm = frontmatter(content);
      if (Number(fm.topSchema) > SCHEMA) throw new Error('Cannot edit a future planner schema.');
      if (
        Number(fm.topSchema) !== SCHEMA ||
        !['task', 'project', 'area'].includes(String(fm.type)) ||
        (expectedType && fm.type !== expectedType)
      )
        throw new Error('This note is no longer the same planner type.');
      await this.app.fileManager.trashFile(file);
      this.remember({ path, content });
      this.repo.remove(path);
    });
  }
  undo(): Promise<void> {
    const next = this.undoQueue.catch(() => undefined).then(() => this.undoLast());
    this.undoQueue = next;
    return next;
  }
  private async undoLast(): Promise<void> {
    const entry = this.undoStack.at(-1);
    if (!entry) return;
    if ('content' in entry) {
      if (this.app.vault.getAbstractFileByPath(entry.path))
        throw new Error('Undo blocked: a note already exists at this path.');
      await this.ensureFolder(entry.path.split('/').slice(0, -1).join('/'));
      const f = await this.app.vault.create(entry.path, entry.content);
      const index = this.undoStack.indexOf(entry);
      if (index >= 0) this.undoStack.splice(index, 1);
      await this.repo.refresh(f);
    } else {
      await this.patch(
        entry.path,
        (fm) => {
          if (entry.keys.some((k) => JSON.stringify(fm[k]) !== JSON.stringify(entry.after[k])))
            throw new Error('Undo blocked: these fields were changed elsewhere.');
          for (const key of entry.keys) {
            if (Object.prototype.hasOwnProperty.call(entry.before, key))
              fm[key] = structuredClone(entry.before[key]);
            else delete fm[key];
          }
        },
        false,
      );
      const index = this.undoStack.indexOf(entry);
      if (index >= 0) this.undoStack.splice(index, 1);
      this.repo.emit();
    }
  }
}
