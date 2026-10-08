import { Modal, Notice } from 'obsidian';
import { Area, Kind, Occurrence, Project, Task, Status, STATUSES, isActive } from '../core/model';
import { addDays, day, dateKey, formatDate, parseDate } from '../core/dates';
import { expenseValue, plannedExpenses } from '../core/expenses';
import { nextPaymentDate } from '../core/subscriptions';
import { TaskDraft } from '../services/tasks';
import { recurrenceEnd, withRecurrenceEnd, firstRepeatDate } from '../core/recurrence';
import {
  button,
  stabilizeButton,
  el,
  field,
  input,
  select,
  dateInput,
  readDate,
  writeDate,
  timeInput,
  readTime,
} from './dom';
import { words, Words, messageText } from './i18n';
import type TinyPlanner from '../main';
export class BaseModal extends Modal {
  readonly w: Words;
  constructor(readonly plugin: TinyPlanner) {
    super(plugin.app);
    this.w = words(plugin.settings.language);
  }
  onOpen(): void {
    this.contentEl.classList.add('tp-modal');
    this.contentEl.style.setProperty(
      '--tp-ui-scale',
      String(this.plugin.normalizeUiScale(this.plugin.settings.uiScalePercent) / 100),
    );
  }
  onClose(): void {
    this.contentEl.replaceChildren();
  }
  async run(fn: () => Promise<unknown>, close = true): Promise<void> {
    try {
      await fn();
      if (close) this.close();
    } catch (e) {
      new Notice(
        messageText(e instanceof Error ? e.message : String(e), this.plugin.settings.language),
      );
    }
  }
}
export class TaskModal extends BaseModal {
  constructor(
    plugin: TinyPlanner,
    readonly item?: Occurrence,
    readonly defaults: Partial<TaskDraft> = {},
  ) {
    super(plugin);
  }
  onOpen(): void {
    super.onOpen();
    const w = this.w;
    const task = this.item?.task;
    if (task?.kind === 'subscription') {
      this.close();
      new SubscriptionModal(this.plugin, task).open();
      return;
    }
    el(
      this.contentEl,
      'h2',
      '',
      task
        ? task.kind === 'payment'
          ? w.editPayment
          : w.edit
        : this.defaults.kind === 'payment'
          ? w.addPayment
          : w.add,
    );
    if (this.item?.recurring)
      el(
        this.contentEl,
        'p',
        'tp-muted',
        formatDate(this.item.date, this.plugin.settings.dateFormat),
      );
    const form = el(this.contentEl, 'form');
    const title = input(field(form, w.title), 'text', task?.title ?? this.defaults.title ?? '');
    title.required = true;
    title.maxLength = 1000;
    const snap = this.plugin.repo.snapshot();
    const grid = el(form, 'div', 'tp-form-grid');
    const project = select(
      field(grid, w.project),
      [
        ['', w.noProject],
        ...snap.projects
          .filter((p) => isActive(p.status) || p.path === (task?.project ?? this.defaults.project))
          .sort((a, b) => this.plugin.compareProjects(a, b))
          .map((p) => [p.path, this.plugin.projectLabel(p)] as [string, string]),
      ],
      task?.project ?? this.defaults.project ?? '',
    );
    if (task?.project && !snap.projects.some((p) => p.path === task.project)) {
      const o = el(project, 'option', '', w.unresolved + ' · ' + task.project);
      o.value = task.project;
      project.value = task.project;
    }
    const date = dateInput(
      field(grid, w.date),
      task?.scheduled ?? this.defaults.scheduled ?? '',
      this.plugin.settings.dateFormat,
      this.plugin.settings.language,
    );
    const rule = task?.recurrence ?? this.defaults.recurrence ?? '';
    const dueLabel = field(grid, rule ? w.repeatUntil : w.due);
    const due = dateInput(
      dueLabel,
      rule ? recurrenceEnd(rule) : (task?.due ?? this.defaults.due ?? ''),
      this.plugin.settings.dateFormat,
      this.plugin.settings.language,
    );
    const shortcuts = el(form, 'div', 'tp-date-shortcuts');
    button(shortcuts, w.today, () => {
      writeDate(date, day());
    });
    button(shortcuts, w.tomorrow, () => {
      writeDate(date, addDays(day(), 1));
    });
    button(shortcuts, w.noDate, () => {
      if (!repeat.value) {
        date.value = '';
        due.value = '';
      }
    });
    const opts: [string, string][] = [
      ['', w.never],
      ['FREQ=DAILY', w.daily],
      ['FREQ=WEEKLY', w.weekly],
      ['FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', w.weekdays],
      ['FREQ=MONTHLY', w.monthly],
      ['FREQ=YEARLY', w.yearly],
      ['custom', w.custom],
    ];
    const preset = rule
      .split(';')
      .filter((part) => !part.startsWith('UNTIL='))
      .join(';');
    const repeat = select(
      field(grid, w.repeat),
      opts,
      opts.some((o) => o[0] === preset) ? preset : 'custom',
    );
    const customLabel = field(form, w.custom);
    const custom = input(customLabel, 'text', rule, 'FREQ=WEEKLY;BYDAY=MO,TH');
    let repeating = !!repeat.value;
    let taskDue = formatDate(task?.due ?? this.defaults.due ?? '', this.plugin.settings.dateFormat);
    let repeatEnd = formatDate(recurrenceEnd(rule), this.plugin.settings.dateFormat);
    const updateRepeat = () => {
      customLabel.hidden = repeat.value !== 'custom';
      const next = !!repeat.value;
      if (next !== repeating) {
        if (repeating) repeatEnd = due.value;
        else taskDue = due.value;
        due.value = next ? repeatEnd : taskDue;
        due.setCustomValidity('');
        repeating = next;
      }
      dueLabel.querySelector('span')!.textContent = next ? w.repeatUntil : w.due;
      due.classList.toggle('tp-repeat-until', next);
      if (repeat.value && !date.value) writeDate(date, day());
    };
    repeat.addEventListener('change', () => {
      if (this.item?.recurring && !repeat.value) {
        writeDate(date, this.item.date || task!.scheduled);
        taskDue = '';
      }
      updateRepeat();
    });
    custom.addEventListener('change', () => {
      if (repeat.value === 'custom') writeDate(due, recurrenceEnd(custom.value));
    });
    updateRepeat();
    const recurrenceValue = (end: string) => {
      const raw = repeat.value === 'custom' ? custom.value.trim() : repeat.value;
      const base = repeat.value !== 'custom' && repeat.value === preset ? rule : raw;
      return raw ? withRecurrenceEnd(base, end) : '';
    };
    const preview = el(form, 'small', 'tp-muted tp-repeat-preview');
    const updatePreview = () => {
      preview.hidden = !repeat.value;
      if (!repeat.value) return;
      try {
        const start = parseDate(date.value, this.plugin.settings.dateFormat);
        const end = parseDate(due.value, this.plugin.settings.dateFormat);
        if (!start || (due.value.trim() && !end)) {
          preview.textContent = w.invalid;
          return;
        }
        const first = firstRepeatDate(recurrenceValue(end), start);
        preview.textContent = first
          ? `${w.firstRepeat}: ${formatDate(first, this.plugin.settings.dateFormat)}`
          : messageText(
              'The repeat rule has no occurrence within its dates.',
              this.plugin.settings.language,
            );
      } catch (e) {
        preview.textContent = messageText(
          e instanceof Error ? e.message : String(e),
          this.plugin.settings.language,
        );
      }
    };
    repeat.addEventListener('change', updatePreview);
    custom.addEventListener('change', updatePreview);
    date.addEventListener('blur', updatePreview);
    date.addEventListener('change', updatePreview);
    due.addEventListener('blur', updatePreview);
    due.addEventListener('change', updatePreview);
    updatePreview();
    const appointment = timeInput(
      field(grid, w.appointmentTime),
      task?.scheduledTime ?? this.defaults.scheduledTime ?? '',
      w.appointmentTime,
      this.plugin.settings.language,
    );
    const kind = select(
      field(grid, w.kind),
      (['task', 'meeting', 'payment', 'status'] as Kind[]).map((k) => [k, w[k]]),
      task?.kind ?? this.defaults.kind ?? 'task',
    );
    const priority = select(
      field(grid, w.priority),
      [
        ['normal', w.normal],
        ['high', w.high],
      ],
      task?.priority ?? this.defaults.priority ?? 'normal',
    );
    const planned = input(
      field(grid, w.plannedMinutes),
      'number',
      String(task?.plannedMinutes ?? this.defaults.plannedMinutes ?? 0),
    );
    planned.dataset.field = 'plannedMinutes';
    planned.min = '0';
    planned.max = '10000000';
    planned.step = '1';
    const minutes = input(
      field(grid, w.minutes),
      'number',
      String(this.item?.minutes ?? task?.minutes ?? 0),
    );
    minutes.dataset.field = 'minutes';
    minutes.min = '0';
    minutes.step = '1';
    const status = select(
      field(grid, w.status),
      STATUSES.map((s) => [s, w[s]]),
      this.item?.status ?? this.defaults.status ?? (this.defaults.scheduled ? 'todo' : 'backlog'),
    );
    status.setAttribute('aria-label', w.status);
    const price = this.item
      ? expenseValue(this.item)
      : { amount: this.defaults.amount ?? null, currency: this.defaults.currency ?? 'USD' };
    const amountLabel = field(grid, w.paymentAmount);
    const amount = input(amountLabel, 'number', price.amount === null ? '' : String(price.amount));
    amount.dataset.field = 'amount';
    amount.min = '0';
    amount.max = '1000000000000';
    amount.step = 'any';
    const currencyLabel = field(grid, w.currency);
    const currency = input(currencyLabel, 'text', price.currency);
    currency.maxLength = 3;
    currency.pattern = '[A-Za-z]{3}';
    const paidLabel = field(grid, w.paidOn);
    const paymentDate = dateInput(
      paidLabel,
      this.item?.status === 'done'
        ? this.item.recurring
          ? task?.occurrences[this.item.key]?.resolvedOn ||
            dateKey(task?.occurrences[this.item.key]?.resolvedAt) ||
            ''
          : task?.resolvedOn || ''
        : day(),
      this.plugin.settings.dateFormat,
      this.plugin.settings.language,
    );
    const updatePayment = () => {
      const payment = kind.value === 'payment';
      amountLabel.hidden = currencyLabel.hidden = !payment;
      amount.disabled = currency.disabled = !payment;
      currency.required = payment;
      paidLabel.hidden = !payment || status.value !== 'done';
      paymentDate.disabled = paidLabel.hidden;
      paymentDate.required = !paidLabel.hidden;
      for (const option of status.options)
        option.textContent =
          payment && option.value === 'done'
            ? w.paymentDone
            : payment && option.value === 'failed'
              ? w.paymentFailed
              : w[option.value as Status];
    };
    kind.addEventListener('change', updatePayment);
    status.addEventListener('change', updatePayment);
    updatePayment();
    for (const control of [
      project,
      status,
      kind,
      priority,
      date,
      appointment,
      due,
      repeat,
      planned,
      minutes,
      amount,
      currency,
      paymentDate,
    ]) {
      grid.appendChild(control.closest('.tp-field')!);
    }
    form.insertBefore(shortcuts, grid.nextSibling);
    const description = el(field(form, w.description), 'textarea', 'tp-description');
    description.value = task?.description ?? this.defaults.description ?? '';
    description.rows = 3;
    description.maxLength = 100000;
    description.placeholder = w.description;
    if (this.item?.recurring && !this.item.key) {
      minutes.disabled = true;
      if (status) status.disabled = true;
    }
    if (task?.recurrence) {
      const tools = el(form, 'div', 'tp-series-tools');
      const seriesToggle = button(
        tools,
        task.seriesEnd || !isActive(task.status) ? w.resume : w.stop,
        () =>
          void this.run(() =>
            task.seriesEnd || !isActive(task.status)
              ? this.plugin.service.resumeSeries(task.path)
              : this.plugin.service.stopSeries(task.path),
          ),
      );
      stabilizeButton(seriesToggle, [w.stop, w.resume]);
    }
    const actions = el(form, 'div', 'tp-modal-actions');
    button(actions, w.cancel, () => this.close());
    const save = el(actions, 'button', 'mod-cta', w.save);
    save.type = 'submit';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (save.disabled) return;
      save.disabled = true;
      void this.run(async () => {
        const recurrence = recurrenceValue(repeat.value ? readDate(due) : '');
        const draft: TaskDraft = {
          title: title.value,
          description: description.value,
          status: status.value as Status,
          project: project.value,
          scheduled: readDate(date),
          scheduledTime: readTime(appointment),
          workDates: recurrence ? [] : (task?.workDates ?? this.defaults.workDates),
          plannedMinutes: Number(planned.value),
          due: recurrence ? '' : readDate(due),
          recurrence,
          kind: kind.value as Kind,
          ...(kind.value === 'payment'
            ? {
                amount: amount.value.trim() ? Number(amount.value) : null,
                currency: currency.value.trim().toUpperCase(),
                paidOn: status.value === 'done' ? readDate(paymentDate) : '',
              }
            : {}),
          minutes: this.item?.recurring ? task!.minutes : Number(minutes.value),
          priority: priority.value as 'normal' | 'high',
        };
        if (this.item) {
          await this.plugin.service.saveTask(
            this.item,
            draft,
            Number(minutes.value),
            (status?.value ?? this.item.status) as Status,
          );
        } else {
          await this.plugin.service.createTask(draft);
          const first = recurrence ? firstRepeatDate(recurrence, draft.scheduled) : '';
          new Notice(
            `${w.taskCreated}${first ? ` · ${w.firstRepeat}: ${formatDate(first, this.plugin.settings.dateFormat)}` : ''}`,
          );
        }
      }).finally(() => {
        save.disabled = false;
      });
    });
    title.focus();
  }
}
export class MoveModal extends BaseModal {
  constructor(
    plugin: TinyPlanner,
    readonly item: Occurrence,
  ) {
    super(plugin);
  }
  onOpen(): void {
    super.onOpen();
    el(this.contentEl, 'h2', '', this.w.reschedule);
    el(this.contentEl, 'p', '', this.item.task.title);
    const date = dateInput(
      field(this.contentEl, this.w.date),
      this.item.date || day(),
      this.plugin.settings.dateFormat,
      this.plugin.settings.language,
    );
    const actions = el(this.contentEl, 'div', 'tp-modal-actions');
    button(
      actions,
      this.w.today,
      () => void this.run(() => this.plugin.service.move(this.item, day())),
    );
    button(
      actions,
      this.w.tomorrow,
      () => void this.run(() => this.plugin.service.move(this.item, addDays(day(), 1))),
    );
    button(
      actions,
      this.w.save,
      () => void this.run(() => this.plugin.service.move(this.item, readDate(date))),
      'mod-cta',
    );
  }
}
export class DeleteModal extends BaseModal {
  constructor(
    plugin: TinyPlanner,
    readonly item: Occurrence,
  ) {
    super(plugin);
  }
  onOpen(): void {
    super.onOpen();
    el(this.contentEl, 'h2', '', this.w.deleteTitle);
    el(this.contentEl, 'p', '', this.item.task.title);
    el(this.contentEl, 'p', 'tp-muted', this.item.recurring ? this.w.skipText : this.w.deleteText);
    const actions = el(this.contentEl, 'div', 'tp-modal-actions');
    button(actions, this.w.cancel, () => this.close());
    if (this.item.recurring && this.item.key)
      button(
        actions,
        this.w.occurrence,
        () => void this.run(() => this.plugin.service.skip(this.item)),
      );
    button(
      actions,
      this.item.recurring ? this.w.series : this.w.remove,
      () => void this.run(() => this.plugin.service.trash(this.item.task.path, 'task')),
      'mod-warning',
    );
  }
}
export class EntityModal extends BaseModal {
  constructor(
    plugin: TinyPlanner,
    readonly type: 'area' | 'project',
    readonly entity?: Area | Project,
  ) {
    super(plugin);
  }
  onOpen(): void {
    super.onOpen();
    el(this.contentEl, 'h2', '', this.type === 'area' ? this.w.area : this.w.project);
    const form = el(this.contentEl, 'form');
    const title = input(field(form, this.w.title), 'text', this.entity?.title || '');
    title.required = true;
    let area: HTMLSelectElement | undefined;
    let status: HTMLSelectElement | undefined;
    let due: HTMLInputElement | undefined;
    if (this.type === 'project') {
      area = select(
        field(form, this.w.area),
        [
          ['', this.w.noArea],
          ...this.plugin.repo.snapshot().areas.map((a) => [a.path, a.title] as [string, string]),
        ],
        (this.entity as Project)?.area || '',
      );
      status = select(
        field(form, this.w.status),
        STATUSES.map((s) => [s, this.w[s]]),
        (this.entity as Project)?.status || 'backlog',
      );
      due = dateInput(
        field(form, this.w.due),
        (this.entity as Project)?.due || '',
        this.plugin.settings.dateFormat,
        this.plugin.settings.language,
      );
    }
    const budgetAmount = input(
      field(form, this.w.monthlyBudget),
      'number',
      this.entity?.monthlyBudget == null ? '' : String(this.entity.monthlyBudget),
    );
    budgetAmount.dataset.field = 'monthlyBudget';
    budgetAmount.min = '0';
    budgetAmount.max = '1000000000000';
    budgetAmount.step = 'any';
    const budgetCurrency = input(
      field(form, this.w.currency),
      'text',
      this.entity?.budgetCurrency || 'USD',
    );
    budgetCurrency.dataset.field = 'budgetCurrency';
    budgetCurrency.pattern = '[A-Za-z]{3}';
    budgetCurrency.maxLength = 3;
    budgetCurrency.required = true;
    const actions = el(form, 'div', 'tp-modal-actions');
    button(actions, this.w.cancel, () => this.close());
    const save = el(actions, 'button', 'mod-cta', this.w.save);
    save.type = 'submit';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (save.disabled) return;
      save.disabled = true;
      void this.run(async () => {
        const amount = budgetAmount.value.trim() ? Number(budgetAmount.value) : null;
        const currency = budgetCurrency.value.trim().toUpperCase();
        if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 1e12))
          throw new Error('Invalid budget.');
        if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Use a three-letter currency code.');
        const fm = {
          monthlyBudget: amount,
          budgetCurrency: currency,
          title: title.value.trim(),
          ...(this.type === 'project'
            ? {
                area: area?.value ? `[[${area.value}]]` : '',
                status: status?.value,
                due: due ? readDate(due) || null : null,
              }
            : {}),
        };
        if (!fm.title) throw new Error('A title is required.');
        if (this.entity)
          await this.plugin.service.patch(this.entity.path, (current) => {
            if (current.type !== this.type)
              throw new Error('This note is no longer the same planner type.');
            Object.assign(current, fm);
          });
        else await this.plugin.service.createNote(this.type, title.value, fm);
      }).finally(() => {
        save.disabled = false;
      });
    });
    title.focus();
  }
}
export class ImportModal extends BaseModal {
  onOpen(): void {
    super.onOpen();
    el(this.contentEl, 'h2', '', this.w.import);
    el(this.contentEl, 'p', '', this.w.importText);
    const actions = el(this.contentEl, 'div', 'tp-modal-actions');
    const start = button(
      actions,
      this.w.importStart,
      () => {
        start.disabled = true;
        void this.run(async () => {
          const r = await this.plugin.importer.run();
          el(this.contentEl, 'h3', '', this.w.imported);
          el(
            this.contentEl,
            'p',
            '',
            `${this.w.task}: ${r.tasks} · ${this.w.project}: ${r.projects} · ${this.w.area}: ${r.areas} · ${this.w.skipped}: ${r.skipped}`,
          );
          if (r.warnings.length) {
            el(this.contentEl, 'h4', '', this.w.warnings);
            const list = el(this.contentEl, 'ul', 'tp-import-warnings');
            for (const warning of r.warnings)
              el(list, 'li', '', messageText(warning, this.plugin.settings.language));
          }
        }, false).finally(() => {
          start.disabled = false;
        });
      },
      'mod-cta',
    );
  }
}

export class SubscriptionModal extends BaseModal {
  constructor(
    plugin: TinyPlanner,
    readonly task?: Task,
  ) {
    super(plugin);
  }
  onOpen(): void {
    super.onOpen();
    const w = this.w,
      t = this.task;
    el(this.contentEl, 'h2', '', t ? w.subscription : w.addSubscription);
    const form = el(this.contentEl, 'form');
    const title = input(field(form, w.title), 'text', t?.title || '');
    title.required = true;
    title.maxLength = 1000;
    const grid = el(form, 'div', 'tp-form-grid');
    const amount = input(
      field(grid, w.amount),
      'number',
      t?.amount == null ? '' : String(t.amount),
    );
    amount.min = '0';
    amount.max = '1000000000000';
    amount.step = 'any';
    const currency = input(field(grid, w.currency), 'text', t?.currency || 'USD');
    currency.required = true;
    currency.maxLength = 3;
    currency.pattern = '[A-Za-z]{3}';
    const period = select(
      field(grid, w.billingPeriod),
      [
        ['monthly', w.monthly],
        ['yearly', w.yearly],
      ],
      t?.billingPeriod || 'monthly',
    );
    const date = dateInput(
      field(grid, w.nextPayment),
      t?.scheduled || '',
      this.plugin.settings.dateFormat,
      this.plugin.settings.language,
    );
    const snap = this.plugin.repo.snapshot();
    const options: [string, string][] = [
      ['', w.noProject],
      ...snap.projects
        .filter((p) => isActive(p.status) || p.path === t?.project)
        .sort((a, b) => this.plugin.compareProjects(a, b))
        .map((p) => [p.path, this.plugin.projectLabel(p)] as [string, string]),
    ];
    if (t?.project && !snap.projects.some((p) => p.path === t.project))
      options.push([t.project, w.unresolved + ' · ' + t.project]);
    const project = select(field(grid, w.project), options, t?.project || '');
    const active = select(
      field(grid, w.status),
      [
        ['active', w.activeSubscription],
        ['cancelled', w.cancelledSubscription],
      ],
      t?.subscriptionActive === false ? 'cancelled' : 'active',
    );
    const description = el(field(form, w.description), 'textarea', 'tp-description');
    description.value = t?.description || '';
    description.rows = 5;
    description.maxLength = 100000;
    const actions = el(form, 'div', 'tp-modal-actions');
    button(actions, w.cancel, () => this.close());
    const save = el(actions, 'button', 'mod-cta', w.save);
    save.type = 'submit';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (save.disabled) return;
      save.disabled = true;
      void this.run(() =>
        this.plugin.service.saveSubscription(
          {
            title: title.value,
            description: description.value,
            project: project.value,
            amount: amount.value.trim() ? Number(amount.value) : null,
            currency: currency.value.trim().toUpperCase(),
            billingPeriod: period.value as 'monthly' | 'yearly',
            scheduled: readDate(date),
            active: active.value === 'active',
          },
          t,
        ),
      ).finally(() => {
        save.disabled = false;
      });
    });
    title.focus();
  }
}

export class ChargeModal extends BaseModal {
  constructor(
    plugin: TinyPlanner,
    readonly task: Task,
  ) {
    super(plugin);
  }
  onOpen(): void {
    super.onOpen();
    const w = this.w,
      t = this.task;
    el(this.contentEl, 'h2', '', w.recordCharge + ' · ' + t.title);
    el(this.contentEl, 'p', 'tp-muted', w.chargeHelp);
    const form = el(this.contentEl, 'form'),
      grid = el(form, 'div', 'tp-form-grid');
    const billing = dateInput(
      field(grid, w.billingDate),
      plannedExpenses([t], addDays(day(), -365), day()).at(-1)?.date ||
        nextPaymentDate(t, day()) ||
        day(),
      this.plugin.settings.dateFormat,
      this.plugin.settings.language,
    );
    const paid = dateInput(
      field(grid, w.paidOn),
      day(),
      this.plugin.settings.dateFormat,
      this.plugin.settings.language,
    );
    const amount = input(
      field(grid, w.paymentAmount),
      'number',
      t.amount === null ? '' : String(t.amount),
    );
    amount.required = true;
    amount.min = '0';
    amount.max = '1000000000000';
    amount.step = 'any';
    const currency = input(field(grid, w.currency), 'text', t.currency);
    currency.required = true;
    currency.maxLength = 3;
    currency.pattern = '[A-Za-z]{3}';
    const actions = el(form, 'div', 'tp-modal-actions');
    button(actions, w.cancel, () => this.close());
    const save = el(actions, 'button', 'mod-cta', w.save);
    save.type = 'submit';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (save.disabled) return;
      save.disabled = true;
      void this.run(() =>
        this.plugin.service.charge(
          t,
          readDate(billing),
          Number(amount.value),
          currency.value.trim().toUpperCase(),
          readDate(paid),
        ),
      ).finally(() => (save.disabled = false));
    });
  }
}
