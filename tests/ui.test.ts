import test from 'node:test';
import assert from 'node:assert/strict';
import TinyPlanner from '../src/main';
import { readFileSync } from 'node:fs';
import { words, messageText } from '../src/ui/i18n';
import { PlannerView } from '../src/ui/view';
import { TaskModal, EntityModal, ImportModal, SubscriptionModal } from '../src/ui/modals';
import {
  addDays,
  day,
  shiftMonth,
  formatDate,
  calendarPeriod,
  periodDates,
} from '../src/core/dates';
import { periodBuckets } from '../src/ui/dashboard';
import { expand, taskItem } from '../src/core/selectors';
import { normalizeTask } from '../src/core/normalize';
import { TaskDraft } from '../src/services/tasks';
const mock = require('../tests/mock-obsidian.cjs');
const tick = () => new Promise((r) => setTimeout(r, 12));
const draft = (v: Partial<TaskDraft> = {}): TaskDraft => ({
  title: 'Example',
  scheduled: day(),
  due: '',
  project: '',
  kind: 'task',
  recurrence: '',
  minutes: 0,
  priority: 'normal',
  ...v,
});
async function fixture() {
  const dom = mock.makeDOM();
  const app = mock.makeApp();
  const plugin = new TinyPlanner(app, { id: 'tiny-planner' } as any);
  await plugin.onload();
  const view = new PlannerView({ app } as any, plugin);
  await view.onOpen();
  return {
    dom,
    app,
    plugin,
    view,
    root: view.contentEl,
    async close() {
      await view.onClose();
      plugin.unload();
      dom.window.close();
    },
  };
}
function byText(root: HTMLElement, text: string): HTMLButtonElement {
  const b = [...root.querySelectorAll('button')].find((b) => b.textContent === text);
  assert.ok(b, `Missing button: ${text}`);
  return b;
}
function click(el: Element | null) {
  assert.ok(el);
  (el as HTMLElement).click();
}
function change(el: HTMLInputElement | HTMLSelectElement, value: string) {
  el.value = value;
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
}
function submit(form: HTMLFormElement) {
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
}
function dragEvent(name: string, target: HTMLElement, transfer: any) {
  const e = new window.Event(name, { bubbles: true, cancelable: true });
  Object.defineProperty(e, 'dataTransfer', { value: transfer });
  target.dispatchEvent(e);
}
test('UI quick Enter-equivalent submit creates task and retains focus/draft fields', async () => {
  const f = await fixture();
  try {
    const title = f.root.querySelector<HTMLInputElement>('.tp-quick input[type=text]')!;
    title.value = 'Quick created';
    submit(f.root.querySelector('form')!);
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.title, 'Quick created');
    assert.equal(title.value, '');
    assert.equal(document.activeElement, title);
  } finally {
    await f.close();
  }
});
test('UI recurring checkbox keeps completed day visible and can reopen', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(draft({ recurrence: 'FREQ=DAILY' }));
    click(f.root.querySelector('.tp-check'));
    await tick();
    assert.ok(f.root.querySelector('.tp-done'));
    assert.equal(f.root.querySelector('.tp-task-title')?.textContent, 'Example');
    click(f.root.querySelector('.tp-check'));
    await tick();
    assert.ok(f.root.querySelector('.tp-todo'));
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.occurrences[day()]?.status, 'todo');
  } finally {
    await f.close();
  }
});
test('UI failed action resolves task and can reopen it', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(draft());
    click(f.root.querySelector('.tp-fail-button'));
    await tick();
    assert.ok(f.root.querySelector('.tp-failed'));
    click(f.root.querySelector('.tp-fail-button'));
    await tick();
    assert.ok(f.root.querySelector('.tp-todo'));
  } finally {
    await f.close();
  }
});
test('UI Today includes overdue daily and weekly tasks', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(
      draft({ title: 'Daily', scheduled: addDays(day(), -1), recurrence: 'FREQ=DAILY' }),
    );
    await f.plugin.service.createTask(
      draft({ title: 'Weekly', scheduled: addDays(day(), -7), recurrence: 'FREQ=WEEKLY' }),
    );
    assert.equal(f.root.querySelectorAll('.tp-overdue').length, 2);
  } finally {
    await f.close();
  }
});
test('UI deleted task goes to trash and Undo restores it', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(draft());
    click(f.root.querySelector('.tp-delete-button'));
    byText(document.querySelector('.tp-modal')!, 'Удалить').click();
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks.length, 0);
    assert.equal(f.app.vault.trash.length, 1);
    click(f.root.querySelector('[aria-label="Отменить действие"]'));
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks.length, 1);
  } finally {
    await f.close();
  }
});
test('UI deletes one recurrence without deleting its series', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(draft({ recurrence: 'FREQ=DAILY' }));
    click(f.root.querySelector('.tp-delete-button'));
    byText(document.querySelector('.tp-modal')!, 'Только этот день').click();
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks.length, 1);
    assert.equal(f.root.querySelectorAll('.tp-task').length, 0);
    assert.equal(
      expand(f.plugin.repo.snapshot().tasks[0]!, addDays(day(), 1), addDays(day(), 1)).length,
      1,
    );
  } finally {
    await f.close();
  }
});
test('UI calendar hover navigation keeps dragged node attached and drops next month', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(draft());
    click(f.root.querySelector('[data-tab=calendar]'));
    const source = f.root.querySelector<HTMLElement>(`[data-day="${day()}"] .tp-task`)!;
    const originalParent = source.parentElement;
    const transfer = { setData() {}, effectAllowed: '', dropEffect: '' };
    dragEvent('dragstart', source, transfer);
    dragEvent('dragover', f.root.querySelector('[aria-label="Следующий месяц"]')!, transfer);
    await new Promise((r) => setTimeout(r, 720));
    assert.equal(source.isConnected, true);
    assert.equal(source.parentElement, originalParent);
    assert.ok(source.closest('.tp-calendar-retained'));
    const target = shiftMonth(day(), 1).slice(0, 7) + '-12';
    dragEvent('drop', f.root.querySelector(`[data-day="${target}"]`)!, transfer);
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.scheduled, target);
    assert.ok(f.root.querySelector(`[data-day="${target}"] .tp-task`));
    assert.equal(f.root.querySelectorAll('.tp-calendar-retained').length, 0);
  } finally {
    await f.close();
  }
});
test('UI occurrence can be moved into distant month through a date dialog', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(draft({ recurrence: 'FREQ=DAILY' }));
    click(f.root.querySelector('[aria-label="Перенести"]'));
    const date = document.querySelector<HTMLInputElement>('.tp-modal input.tp-date')!;
    date.value = '2027-02-06';
    byText(document.querySelector('.tp-modal')!, 'Сохранить').click();
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.moves[day()], '2027-02-06');
  } finally {
    await f.close();
  }
});
test('UI task details manually record occurrence minutes', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(draft({ recurrence: 'FREQ=DAILY' }));
    click(f.root.querySelector('.tp-task-title'));
    document.querySelector<HTMLInputElement>('.tp-modal [data-field=minutes]')!.value = '24';
    submit(document.querySelector('.tp-modal form')!);
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.occurrences[day()]?.minutes, 24);
    assert.ok(f.root.textContent?.includes('24 мин'));
  } finally {
    await f.close();
  }
});
test('UI status in task details changes completed task back to open', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(draft());
    click(f.root.querySelector('.tp-check'));
    await tick();
    click(f.root.querySelector('.tp-task-title'));
    const statuses = [...document.querySelectorAll<HTMLSelectElement>('.tp-modal select')].find(
      (s) => [...s.options].some((o) => o.value === 'failed'),
    )!;
    change(statuses, 'todo');
    submit(document.querySelector('.tp-modal form')!);
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.status, 'todo');
  } finally {
    await f.close();
  }
});
test('UI repeat creation fills missing anchor and validates custom rules', async () => {
  const f = await fixture();
  try {
    new TaskModal(f.plugin).open();
    document.querySelector<HTMLInputElement>('.tp-modal input[type=text]')!.value = 'Routine';
    const repeat = [...document.querySelectorAll<HTMLSelectElement>('.tp-modal select')].find((s) =>
      [...s.options].some((o) => o.value === 'FREQ=DAILY'),
    )!;
    change(repeat, 'FREQ=DAILY');
    assert.equal(
      document.querySelector<HTMLInputElement>('.tp-modal input.tp-date')!.value,
      formatDate(day()),
    );
    submit(document.querySelector('.tp-modal form')!);
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.recurrence, 'FREQ=DAILY');
  } finally {
    await f.close();
  }
});
test('UI Today/Tomorrow shortcuts change work day and preserve a separate deadline', async () => {
  const f = await fixture();
  try {
    new TaskModal(f.plugin, undefined, { due: addDays(day(), 10) }).open();
    byText(document.querySelector('.tp-modal')!, 'Завтра').click();
    const dates = [...document.querySelectorAll<HTMLInputElement>('.tp-modal input.tp-date')];
    assert.equal(dates[0]?.value, formatDate(addDays(day(), 1)));
    assert.equal(dates[1]?.value, formatDate(addDays(day(), 10)));
    byText(document.querySelector('.tp-modal')!, 'Сегодня').click();
    assert.equal(dates[0]?.value, formatDate(day()));
    assert.equal(dates[1]?.value, formatDate(addDays(day(), 10)));
  } finally {
    await f.close();
  }
});
test('UI no-date subscription remains undated and disappears when cancelled', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(draft({ kind: 'subscription', scheduled: '' }));
    click(f.root.querySelector('[data-tab=subscriptions]'));
    click(f.root.querySelector('[data-expense-mode=subscriptions]'));
    assert.equal(f.root.querySelectorAll('.tp-subscription').length, 1);
    click(f.root.querySelector('.tp-subscription-toggle'));
    await tick();
    assert.equal(f.root.querySelectorAll('.tp-subscription').length, 0);
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.scheduled, '');
  } finally {
    await f.close();
  }
});
test('UI area/project creation gives a task an unambiguous hierarchy', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createNote('area', 'Home', {});
    const area = f.plugin.repo.snapshot().areas[0]!;
    await f.plugin.service.createNote('project', 'Household chores', {
      area: `[[${area.path}]]`,
      status: 'active',
    });
    const project = f.plugin.repo.snapshot().projects[0]!;
    await f.plugin.service.createTask(
      draft({ title: 'Take out the trash', project: project.path }),
    );
    click(f.root.querySelector('[data-tab=projects]'));
    assert.equal(f.root.querySelector('.tp-area h2')?.textContent, 'Home');
    assert.equal(f.root.querySelector('.tp-project strong')?.textContent, 'Household chores');
    const card = f.root.querySelector<HTMLDetailsElement>('.tp-project')!;
    assert.equal(card.open, false);
    card.open = true;
    await tick();
    assert.ok(f.root.querySelector('.tp-task-title')?.textContent?.includes('Take out the trash'));
  } finally {
    await f.close();
  }
});
test('UI project collapsed state survives external task changes', async () => {
  const f = await fixture();
  try {
    const p = await f.plugin.service.createNote('project', 'Example project', { status: 'active' });
    await f.plugin.service.createTask(draft({ project: p.path }));
    click(f.root.querySelector('[data-tab=projects]'));
    const detail = f.root.querySelector<HTMLDetailsElement>('.tp-project')!;
    detail.open = false;
    await f.plugin.service.status(taskItem(f.plugin.repo.snapshot().tasks[0]!, day()), 'done');
    assert.equal(f.root.querySelector<HTMLDetailsElement>('.tp-project')?.open, false);
  } finally {
    await f.close();
  }
});
test('UI external refresh keeps quick-entry text and focus', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(draft());
    const title = f.root.querySelector<HTMLInputElement>('.tp-quick input[type=text]')!;
    title.value = 'Unsaved next task';
    title.focus();
    await f.plugin.service.status(taskItem(f.plugin.repo.snapshot().tasks[0]!, day()), 'done');
    assert.equal(title.value, 'Unsaved next task');
    assert.equal(document.activeElement, title);
  } finally {
    await f.close();
  }
});
test('UI search filters tasks without resetting quick-entry fields', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(draft({ title: 'Alpha' }));
    await f.plugin.service.createTask(draft({ title: 'Beta' }));
    const search = f.root.querySelector<HTMLInputElement>('input[type=search]')!;
    search.value = 'Beta';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.equal(f.root.querySelectorAll('.tp-task').length, 1);
    assert.equal(f.root.querySelector('.tp-task-title')?.textContent, 'Beta');
  } finally {
    await f.close();
  }
});
test('UI multiple views contain no repeated DOM IDs and own separate modals', async () => {
  const f = await fixture();
  let second: PlannerView | undefined;
  try {
    second = new PlannerView({ app: f.app } as any, f.plugin);
    await second.onOpen();
    new TaskModal(f.plugin).open();
    const ids = [...document.querySelectorAll('[id]')].map((n) => n.id);
    assert.equal(ids.length, new Set(ids).size);
    assert.equal(document.querySelectorAll('.tp-shell').length, 2);
    await second.onClose();
    assert.equal(f.root.querySelectorAll('.tp-shell').length, 1);
  } finally {
    await second?.onClose();
    await f.close();
  }
});
test('UI importer reports warnings and never changes original files', async () => {
  const f = await fixture();
  try {
    const note = await f.app.vault.create(
      'Tasks/Old.md',
      '---\nstatus: open\nprojects: ["[[Missing]]"]\n---\nOriginal',
    );
    const before = await f.app.vault.read(note);
    new ImportModal(f.plugin).open();
    byText(document.querySelector('.tp-modal')!, 'Импортировать копии').click();
    await tick();
    assert.ok(document.querySelector('.tp-import-warnings'));
    assert.equal(await f.app.vault.read(note), before);
  } finally {
    await f.close();
  }
});
test('UI unload detaches view updates and cancels hover navigation', async () => {
  const f = await fixture();
  await f.plugin.service.createTask(draft());
  await f.view.onClose();
  f.plugin.repo.emit();
  assert.equal(f.root.childElementCount, 0);
  f.plugin.unload();
  f.dom.window.close();
});
test('production CSS hides the custom repeat field and strikes completed/failed titles', async () => {
  const f = await fixture();
  try {
    const fs = require('node:fs'),
      path = require('node:path');
    const style = document.createElement('style');
    style.textContent = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');
    document.head.append(style);
    new TaskModal(f.plugin).open();
    const custom = document.querySelector<HTMLElement>('.tp-modal [hidden]')!;
    assert.ok(custom);
    assert.equal(window.getComputedStyle(custom).display, 'none');
    await f.plugin.service.createTask(draft());
    const item = taskItem(f.plugin.repo.snapshot().tasks[0]!, day());
    await f.plugin.service.status(item, 'done');
    assert.equal(
      window.getComputedStyle(f.root.querySelector('.tp-task-title')!).textDecoration,
      'line-through',
    );
    await f.plugin.service.status(item, 'failed');
    assert.equal(
      window.getComputedStyle(f.root.querySelector('.tp-task-title')!).textDecoration,
      'line-through',
    );
  } finally {
    await f.close();
  }
});
test('UI quick-entry draft survives switching tabs', async () => {
  const f = await fixture();
  try {
    const title = f.root.querySelector<HTMLInputElement>('.tp-quick input[type=text]')!;
    title.value = 'Keep unsaved draft';
    title.dispatchEvent(new window.Event('input', { bubbles: true }));
    click(f.root.querySelector('[data-tab=calendar]'));
    assert.equal(
      f.root.querySelector<HTMLInputElement>('.tp-quick input[type=text]')?.value,
      'Keep unsaved draft',
    );
  } finally {
    await f.close();
  }
});
test('UI deleted selected project resets filter and keeps tasks in Inbox', async () => {
  const f = await fixture();
  try {
    const p = await f.plugin.service.createNote('project', 'To delete', {});
    await f.plugin.service.createTask(draft({ project: p.path }));
    const filters = f.root.querySelectorAll<HTMLSelectElement>('.tp-filter-panel select');
    change(filters[1]!, p.path);
    await f.plugin.service.trash(p.path);
    assert.equal(f.root.querySelectorAll('.tp-task').length, 1);
    click(f.root.querySelector('[data-tab=inbox]'));
    assert.equal(f.root.querySelectorAll('.tp-task').length, 1);
  } finally {
    await f.close();
  }
});
test('UI recurring minutes/status/details save is one undo operation', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(draft({ recurrence: 'FREQ=DAILY' }));
    click(f.root.querySelector('.tp-task-title'));
    document.querySelector<HTMLInputElement>('.tp-modal input[type=text]')!.value = 'Changed title';
    document.querySelector<HTMLInputElement>('.tp-modal [data-field=minutes]')!.value = '15';
    const status = [...document.querySelectorAll<HTMLSelectElement>('.tp-modal select')].find((s) =>
      [...s.options].some((o) => o.value === 'failed'),
    )!;
    change(status, 'done');
    submit(document.querySelector('.tp-modal form')!);
    await tick();
    await f.plugin.service.undo();
    const t = f.plugin.repo.snapshot().tasks[0]!;
    assert.equal(t.title, 'Example');
    assert.equal(t.occurrences[day()], undefined);
  } finally {
    await f.close();
  }
});
test('UI disabling recurrence keeps selected completion and entered minutes', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(draft({ recurrence: 'FREQ=DAILY' }));
    click(f.root.querySelector('.tp-check'));
    await tick();
    click(f.root.querySelector('.tp-task-title'));
    const repeat = [...document.querySelectorAll<HTMLSelectElement>('.tp-modal select')].find((s) =>
      [...s.options].some((o) => o.value === 'FREQ=DAILY'),
    )!;
    change(repeat, '');
    document.querySelector<HTMLInputElement>('.tp-modal [data-field=minutes]')!.value = '19';
    submit(document.querySelector('.tp-modal form')!);
    await tick();
    const t = f.plugin.repo.snapshot().tasks[0]!;
    assert.equal(t.recurrence, '');
    assert.equal(t.status, 'done');
    assert.equal(t.minutes, 19);
  } finally {
    await f.close();
  }
});
test('UI negative occurrence minutes cannot partially change title', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(draft({ recurrence: 'FREQ=DAILY' }));
    click(f.root.querySelector('.tp-task-title'));
    document.querySelector<HTMLInputElement>('.tp-modal input[type=text]')!.value =
      'Should not persist';
    document.querySelector<HTMLInputElement>('.tp-modal [data-field=minutes]')!.value = '-4';
    submit(document.querySelector('.tp-modal form')!);
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.title, 'Example');
  } finally {
    await f.close();
  }
});
test('UI a narrow desktop pane adapts independently of window width and disconnects observer', async () => {
  const f = await fixture();
  let callback: ResizeObserverCallback | undefined,
    disconnected = false;
  (window as any).ResizeObserver = class {
    constructor(fn: ResizeObserverCallback) {
      callback = fn;
    }
    observe() {}
    disconnect() {
      disconnected = true;
    }
  };
  const view = new PlannerView({ app: f.app } as any, f.plugin);
  try {
    await view.onOpen();
    callback!([{ contentRect: { width: 390 } }] as any, {} as any);
    assert(view.contentEl.classList.contains('tp-mobile'));
    callback!([{ contentRect: { width: 1200 } }] as any, {} as any);
    assert(!view.contentEl.classList.contains('tp-mobile'));
    assert(!view.contentEl.classList.contains('tp-narrow'));
    await view.onClose();
    assert(disconnected);
  } finally {
    await view.onClose();
    await f.close();
  }
});
test('UI exhausted skipped series does not offer phantom occurrence actions', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(draft({ recurrence: 'FREQ=DAILY;COUNT=1' }));
    await f.plugin.service.skip(taskItem(f.plugin.repo.snapshot().tasks[0]!, day()));
    click(f.root.querySelector('[data-tab=inbox]'));
    assert.equal(f.root.querySelector<HTMLButtonElement>('.tp-check')?.disabled, true);
    assert.equal(f.root.querySelector<HTMLButtonElement>('.tp-fail-button')?.disabled, true);
    assert.equal(f.root.querySelector<HTMLElement>('.tp-task')?.draggable, false);
  } finally {
    await f.close();
  }
});

test('UI crowded calendar displays all tasks, project deadlines and subscriptions without more buttons', async () => {
  const f = await fixture();
  try {
    for (let i = 0; i < 18; i++) await f.plugin.service.createTask(draft({ title: `Task ${i}` }));
    for (let i = 0; i < 3; i++) {
      await f.plugin.service.createNote('project', `Deadline ${i}`, {
        due: day(),
        status: 'in-progress',
      });
      await f.plugin.service.saveSubscription({
        title: `Subscription ${i}`,
        scheduled: day(),
        active: true,
        amount: 10,
        currency: 'USD',
        billingPeriod: 'monthly',
        project: '',
        description: '',
      });
    }
    click(f.root.querySelector('[data-tab=calendar]'));
    const cell = f.root.querySelector<HTMLElement>(`[data-day="${day()}"]`)!;
    assert.equal(cell.querySelectorAll('.tp-task').length, 18);
    assert.equal(cell.querySelectorAll('.tp-calendar-project').length, 3);
    assert.equal(cell.querySelectorAll('.tp-calendar-payment').length, 3);
    assert.equal(f.root.querySelectorAll('.tp-show-more,[data-range-more]').length, 0);
    assert.equal(
      f.plugin.repo.snapshot().tasks.filter((t) => t.kind !== 'subscription').length,
      18,
    );
  } finally {
    await f.close();
  }
});
test('UI project contents load on open and keep status actions working', async () => {
  const f = await fixture();
  try {
    const p = await f.plugin.service.createNote('project', 'Lazy project', { status: 'active' });
    await f.plugin.service.createTask(draft({ project: p.path }));
    click(f.root.querySelector('[data-tab=projects]'));
    let card = f.root.querySelector<HTMLDetailsElement>('.tp-project')!;
    assert.equal(card.querySelectorAll('.tp-task').length, 0);
    card.open = true;
    await tick();
    assert.equal(card.querySelectorAll('.tp-task').length, 1);
    click(card.querySelector('.tp-check'));
    await tick();
    card = f.root.querySelector<HTMLDetailsElement>('.tp-project')!;
    assert.equal(card.open, true);
    assert.ok(card.querySelector('.tp-done'));
    card.open = false;
    await tick();
    assert.equal(card.querySelectorAll('.tp-task').length, 0);
  } finally {
    await f.close();
  }
});
test('UI large project groups expose every card through pagination', async () => {
  const f = await fixture();
  try {
    for (let i = 0; i < 35; i++)
      await f.plugin.service.createNote('project', `Project ${i}`, { status: 'active' });
    click(f.root.querySelector('[data-tab=projects]'));
    assert.equal(f.root.querySelectorAll('.tp-project').length, 30);
    click(f.root.querySelector('.tp-area > .tp-show-more'));
    assert.equal(f.root.querySelectorAll('.tp-project').length, 35);
    assert.equal(f.root.querySelectorAll('.tp-task').length, 0);
  } finally {
    await f.close();
  }
});

test('UI statistics empty/filtered states have zeros, no NaN and no quick-entry clutter', async () => {
  const f = await fixture();
  try {
    click(f.root.querySelector('[data-tab=statistics]'));
    assert.match(f.root.textContent!, /Нет данных для статистики/);
    assert.equal(f.root.querySelector<HTMLFormElement>('.tp-quick')?.hidden, true);
    assert.equal(f.root.querySelector('[data-metric=tasks] strong')?.textContent, '0');
    assert.equal(f.root.querySelector('[data-metric=progress] strong')?.textContent, '—');
    assert.equal(
      f.root.querySelectorAll('.tp-activity-details tbody tr').length,
      periodDates(day(), 30).length,
    );
    assert.doesNotMatch(f.root.textContent!, /NaN|Infinity/);
    const search = f.root.querySelector<HTMLInputElement>('input[type=search]')!;
    search.value = 'No match';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.match(f.root.textContent!, /Нет подходящих задач и проектов/);
    assert.equal(f.root.querySelectorAll('[data-project]').length, 0);
  } finally {
    await f.close();
  }
});
test('UI statistics update after resolution, Undo and an external note edit', async () => {
  const f = await fixture();
  try {
    const t = await f.plugin.service.createTask(draft());
    click(f.root.querySelector('[data-tab=statistics]'));
    assert.equal(f.root.querySelector('[data-metric=progress] strong')?.textContent, '0%');
    await f.plugin.service.status(taskItem(f.plugin.repo.snapshot().tasks[0]!, day()), 'done');
    assert.equal(f.root.querySelector('[data-metric=progress] strong')?.textContent, '100%');
    assert.equal(
      f.root.querySelectorAll('.tp-activity-chart .tp-chart-point:not([data-value="0"])').length,
      1,
    );
    await f.plugin.service.undo();
    assert.equal(f.root.querySelector('[data-metric=progress] strong')?.textContent, '0%');
    const file = f.app.vault.getAbstractFileByPath(t.path);
    f.root.querySelector<HTMLButtonElement>('[data-period="7"]')!.focus();
    await f.app.fileManager.processFrontMatter(file, (fm: any) => {
      fm.status = 'failed';
      fm.failedDate = day();
      fm.actualMinutes = 35;
    });
    await tick();
    assert.equal(f.root.querySelector('[data-metric=progress] strong')?.textContent, '0%');
    assert.match(f.root.querySelector('[data-metric=time]')!.textContent!, /35/);
    assert.equal(f.root.querySelectorAll('.tp-activity-chart path.tp-chart-failed').length, 1);
    assert.equal(document.activeElement, f.root.querySelector('[data-period="7"]'));
  } finally {
    await f.close();
  }
});
test('UI period selection changes the bounded daily table and preserves disclosure', async () => {
  const f = await fixture();
  try {
    const t = await f.plugin.service.createTask(draft());
    const file = f.app.vault.getAbstractFileByPath(t.path);
    await f.app.fileManager.processFrontMatter(file, (fm: any) => {
      fm.status = 'done';
      fm.scheduled = calendarPeriod(day(), 30).from;
      fm.completedDate = day();
    });
    await tick();
    click(f.root.querySelector('[data-tab=statistics]'));
    assert.equal(
      f.root.querySelectorAll('.tp-activity-chart .tp-chart-point:not([data-value="0"])').length,
      1,
    );
    f.root.querySelector<HTMLDetailsElement>('.tp-activity-details')!.open = true;
    await tick();
    click(f.root.querySelector('[data-period="7"]'));
    assert.equal(f.root.querySelectorAll('.tp-activity-details tbody tr').length, 7);
    assert.equal(
      f.root.querySelectorAll('.tp-activity-chart .tp-chart-point:not([data-value="0"])').length,
      0,
    );
    assert.equal(f.root.querySelector<HTMLDetailsElement>('.tp-activity-details')!.open, true);
    assert.equal(document.activeElement, f.root.querySelector('[data-period="7"]'));
    click(f.root.querySelector('[data-period="90"]'));
    assert.equal(
      f.root.querySelectorAll('.tp-activity-details tbody tr').length,
      periodDates(day(), 90).length,
    );
    assert.equal(
      f.root.querySelectorAll('.tp-activity-chart .tp-chart-point:not([data-value="0"])').length,
      1,
    );
  } finally {
    await f.close();
  }
});
test('UI statistics paginate a modest 25-project fixture without accumulating DOM rows', async () => {
  const f = await fixture();
  try {
    for (let i = 0; i < 25; i++)
      await f.plugin.service.createNote('project', `Project ${String(i).padStart(2, '0')}`, {});
    click(f.root.querySelector('[data-tab=statistics]'));
    assert.equal(f.root.querySelectorAll('.tp-project-stats tbody tr').length, 12);
    assert.match(f.root.querySelector('.tp-stats-pager')!.textContent!, /1 \/ 3/);
    click(f.root.querySelector('[data-page-action=next]'));
    assert.equal(f.root.querySelectorAll('.tp-project-stats tbody tr').length, 12);
    click(f.root.querySelector('[data-page-action=next]'));
    assert.equal(f.root.querySelectorAll('.tp-project-stats tbody tr').length, 1);
    const search = f.root.querySelector<HTMLInputElement>('input[type=search]')!;
    search.value = 'Project 00';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.equal(f.root.querySelectorAll('.tp-project-stats tbody tr').length, 1);
    assert.equal(f.root.querySelector('[data-metric=projects] strong')?.textContent, '1');
    assert.equal(f.root.querySelector('.tp-stats-pager'), null);
  } finally {
    await f.close();
  }
});
test('UI task/project/area filters give consistent dashboard totals including empty projects', async () => {
  const f = await fixture();
  try {
    const a = await f.plugin.service.createNote('area', 'Work', {});
    const p = await f.plugin.service.createNote('project', 'Release', { area: a.path });
    await f.plugin.service.createNote('project', 'Empty', { area: a.path });
    await f.plugin.service.createTask(draft({ project: p.path }));
    await f.plugin.service.createTask(draft({ title: 'Inbox' }));
    click(f.root.querySelector('[data-tab=statistics]'));
    change(f.root.querySelector<HTMLSelectElement>('.tp-filter-panel select')!, a.path);
    assert.equal(f.root.querySelector('[data-metric=tasks] strong')?.textContent, '1');
    assert.equal(f.root.querySelector('[data-metric=projects] strong')?.textContent, '2');
    change(f.root.querySelectorAll<HTMLSelectElement>('.tp-filter-panel select')[1]!, p.path);
    assert.equal(f.root.querySelector('[data-metric=projects] strong')?.textContent, '1');
    assert.equal(f.root.querySelector('.tp-project-stats tbody td')?.textContent, '1');
  } finally {
    await f.close();
  }
});
test('UI dashboard keeps hostile titles as text and instances retain independent periods', async () => {
  const f = await fixture();
  let second: PlannerView | undefined;
  try {
    await f.plugin.service.createNote('project', '<img src=x onerror=alert(1)>', {});
    click(f.root.querySelector('[data-tab=statistics]'));
    assert.match(
      f.root.querySelector('.tp-project-stats')!.textContent!,
      /<img src=x onerror=alert\(1\)>/,
    );
    assert.equal(f.root.querySelectorAll('.tp-dashboard img, .tp-dashboard script').length, 0);
    click(f.root.querySelector('[data-period="7"]'));
    second = new PlannerView({ app: f.app } as any, f.plugin);
    await second.onOpen();
    click(second.contentEl.querySelector('[data-tab=statistics]'));
    assert.equal(
      second.contentEl.querySelector('[data-period="30"]')?.getAttribute('aria-pressed'),
      'true',
    );
    assert.equal(f.root.querySelector('[data-period="7"]')?.getAttribute('aria-pressed'), 'true');
    const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
    assert.equal(new Set(ids).size, ids.length);
  } finally {
    await second?.onClose();
    await f.close();
  }
});

test('UI task description supports multiline lists and all workflow states', async () => {
  const f = await fixture();
  try {
    const modal = new TaskModal(f.plugin);
    modal.open();
    const root = modal.contentEl;
    root.querySelector<HTMLInputElement>('input[type=text]')!.value = 'Detailed task';
    root.querySelector<HTMLTextAreaElement>('textarea')!.value =
      '- [ ] Review\n- [ ] Release\n\nLonger explanation';
    const status = [...root.querySelectorAll('select')].find(
      (s) => s.options.length === 5 && s.options[0]?.value === 'backlog',
    )!;
    change(status, 'backlog');
    submit(root.querySelector('form')!);
    await tick();
    const task = f.plugin.repo.snapshot().tasks[0]!;
    assert.equal(task.status, 'backlog');
    assert.ok(task.description.includes('\n- [ ] Release'));
    click(f.root.querySelector('[data-tab=kanban]'));
    assert.equal(f.root.querySelectorAll('.tp-board-column').length, 5);
    change(f.root.querySelector<HTMLSelectElement>('[data-board-scope]')!, 'all');
    const card = f.root.querySelector<HTMLSelectElement>('.tp-board-card select')!;
    change(card, 'in-progress');
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.status, 'in-progress');
    assert.equal(f.root.querySelectorAll('[data-status="in-progress"] .tp-board-card').length, 1);
    await f.plugin.service.undo();
    assert.equal(f.root.querySelectorAll('[data-status=backlog] .tp-board-card').length, 1);
  } finally {
    await f.close();
  }
});
test('UI date setting controls entry and labels; invalid dates cannot silently become undated', async () => {
  const f = await fixture();
  try {
    for (const [format, text] of [
      ['dmy', '03.10.2026'],
      ['mdy', '10/03/2026'],
      ['iso', '2026-10-03'],
    ] as const) {
      f.plugin.settings.dateFormat = format;
      const modal = new TaskModal(f.plugin, undefined, { scheduled: '2026-10-03' });
      modal.open();
      assert.equal(modal.contentEl.querySelector<HTMLInputElement>('.tp-date')!.value, text);
      modal.close();
    }
    f.plugin.settings.dateFormat = 'dmy';
    const modal = new TaskModal(f.plugin);
    modal.open();
    modal.contentEl.querySelector<HTMLInputElement>('input[type=text]')!.value = 'Invalid';
    modal.contentEl.querySelector<HTMLInputElement>('.tp-date')!.value = '31.02.2026';
    submit(modal.contentEl.querySelector('form')!);
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks.length, 0);
    assert.ok(document.body.contains(modal.contentEl));
    modal.close();
  } finally {
    await f.close();
  }
});
test('UI board pagination bounds cards without creating any vault notes', async () => {
  const f = await fixture();
  try {
    const original = f.plugin.repo.snapshot.bind(f.plugin.repo);
    const snap = original();
    // 100 synthetic in-memory cards. No vault files or projects created.
    const tasks = Array.from({ length: 100 }, (_, i) =>
      normalizeTask(`synthetic/${i}.md`, {
        title: `Card ${String(i).padStart(2, '0')}`,
        status: 'backlog',
        description: '<img src=x onerror=alert(1)>',
      }),
    );
    f.plugin.repo.snapshot = () => ({ ...snap, tasks });
    click(f.root.querySelector('[data-tab=kanban]'));
    assert.equal(f.root.querySelectorAll('.tp-board-card').length, 0);
    change(f.root.querySelector<HTMLSelectElement>('[data-board-scope]')!, 'undated');
    assert.equal(f.root.querySelectorAll('.tp-board-card').length, 12);
    assert.equal(f.root.querySelector('.tp-board-pager small')?.textContent, '1 / 9');
    assert.equal(f.root.querySelectorAll('.tp-board-card img').length, 0);
    click(f.root.querySelector('[aria-label="Следующие карточки · Отложено"]'));
    assert.equal(f.root.querySelectorAll('.tp-board-card').length, 12);
    assert.equal(f.root.querySelector('.tp-board-pager small')?.textContent, '2 / 9');
    f.plugin.repo.snapshot = original;
    assert.equal(f.app.vault.getMarkdownFiles().length, 0);
  } finally {
    await f.close();
  }
});

test('declarative settings remain searchable alongside the legacy settings tab', async () => {
  const f = await fixture();
  try {
    const tab = (f.plugin as any).settingTabs[0];
    const names = tab.getSettingDefinitions().map((definition: { name: string }) => definition.name);
    const w = words(f.plugin.settings.language);
    assert.deepEqual(names, [w.folder, w.language, w.dateFormat, w.capacity, w.uiScale, w.import]);
    tab.display(); // Retain compatibility with Obsidian versions older than 1.13.
    assert.equal(tab.containerEl.querySelectorAll('select').length >= 2, true);
  } finally {
    await f.close();
  }
});

test('UI settings date dropdown persists selection and rebuilds open views', async () => {
  const f = await fixture();
  try {
    f.app.workspace.getLeavesOfType = () => [{ view: f.view }];
    const tab = (f.plugin as any).settingTabs[0];
    tab.display();
    const control = [...tab.containerEl.querySelectorAll('select')].find(
      (s: any) => s.options[0]?.value === 'dmy',
    ) as HTMLSelectElement;
    assert.ok(control);
    change(control, 'mdy');
    await tick();
    assert.equal(f.plugin.settings.dateFormat, 'mdy');
    assert.equal((f.plugin as any).data.dateFormat, 'mdy');
    assert.equal(
      f.root.querySelector<HTMLInputElement>('.tp-quick .tp-date')?.value,
      formatDate(day(), 'mdy'),
    );
    change(control, 'iso');
    await tick();
    assert.equal(f.root.querySelector<HTMLInputElement>('.tp-quick .tp-date')?.value, day());
  } finally {
    await f.close();
  }
});

test('UI invalid quick date is reported for Details without uncaught errors or lost draft', async () => {
  const f = await fixture();
  try {
    const errors: string[] = [];
    window.addEventListener('error', (e) => errors.push(e.message));
    const title = f.root.querySelector<HTMLInputElement>(
      '.tp-quick input[type=text]:not(.tp-date)',
    )!;
    title.value = 'Keep draft';
    f.root.querySelector<HTMLInputElement>('.tp-quick .tp-date')!.value = '31.02.2026';
    click(f.root.querySelector('[aria-label="Подробнее"]'));
    await tick();
    assert.deepEqual(errors, []);
    assert.equal(document.querySelectorAll('.tp-modal').length, 0);
    click(f.root.querySelector('[data-tab=kanban]'));
    assert.equal(f.root.querySelector<HTMLInputElement>('.tp-quick .tp-date')!.value, '31.02.2026');
    assert.equal(f.plugin.repo.snapshot().tasks.length, 0);
  } finally {
    await f.close();
  }
});

test('UI project creation/edit, quick capture and details expose the same five statuses', async () => {
  const f = await fixture();
  try {
    const project = new EntityModal(f.plugin, 'project');
    project.open();
    project.contentEl.querySelector<HTMLInputElement>('input')!.value = 'Production project';
    const status = project.contentEl.querySelectorAll<HTMLSelectElement>('select')[1]!;
    assert.deepEqual(
      [...status.options].map((o) => o.value),
      ['backlog', 'todo', 'in-progress', 'done', 'failed'],
    );
    change(status, 'in-progress');
    submit(project.contentEl.querySelector('form')!);
    await tick();
    const p = f.plugin.repo.snapshot().projects[0]!;
    assert.equal(p.status, 'in-progress');
    const edit = new EntityModal(f.plugin, 'project', p);
    edit.open();
    const editStatus = edit.contentEl.querySelectorAll<HTMLSelectElement>('select')[1]!;
    assert.equal(editStatus.value, 'in-progress');
    change(editStatus, 'failed');
    submit(edit.contentEl.querySelector('form')!);
    await tick();
    assert.equal(f.plugin.repo.snapshot().projects[0]?.status, 'failed');
    await f.plugin.service.undo();
    assert.equal(f.plugin.repo.snapshot().projects[0]?.status, 'in-progress');
    const quick = f.root.querySelector<HTMLSelectElement>('.tp-quick select[aria-label="Статус"]')!;
    change(quick, 'backlog');
    f.root.querySelector<HTMLInputElement>('.tp-quick input[type=text]')!.value = 'Quick backlog';
    click(f.root.querySelector('.tp-quick [aria-label="Подробнее"]'));
    const modal = document.querySelector('.tp-modal')!;
    const detail = [...modal.querySelectorAll('select')].find(
      (s) => s.options[0]?.value === 'backlog',
    )!;
    assert.equal(detail.value, 'backlog');
    click(byText(modal as HTMLElement, 'Отмена'));
    submit(f.root.querySelector('.tp-quick')!);
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.status, 'backlog');
  } finally {
    await f.close();
  }
});
test('UI subscriptions have dedicated forms, financial totals and cancel/resume Undo', async () => {
  const f = await fixture();
  try {
    click(f.root.querySelector('[data-tab=subscriptions]'));
    click(f.root.querySelector('[data-expense-mode=subscriptions]'));
    assert.equal(f.root.querySelector<HTMLFormElement>('.tp-quick')!.hidden, true);
    click(byText(f.root, 'Добавить подписку'));
    const modal = document.querySelector<HTMLElement>('.tp-modal')!;
    modal.querySelector<HTMLInputElement>('input[type=text]')!.value = 'Safe service';
    modal.querySelector<HTMLInputElement>('input[type=number]')!.value = '120';
    modal.querySelectorAll<HTMLInputElement>('input[type=text]')[1]!.value = 'EUR';
    const period = [...modal.querySelectorAll('select')].find(
      (s) => s.options[0]?.value === 'monthly',
    )!;
    change(period, 'yearly');
    submit(modal.querySelector('form')!);
    await tick();
    assert.equal(f.root.querySelectorAll('.tp-subscription').length, 1);
    assert.match(f.root.querySelector('.tp-cost-total')!.textContent!, /10,00 EUR/);
    assert.equal(f.root.querySelectorAll('.tp-check, .tp-fail-button, .tp-board-card').length, 0);
    const task = f.plugin.repo.snapshot().tasks[0]!;
    await assert.rejects(
      f.plugin.service.status(taskItem(task, day()), 'done'),
      /no task workflow/,
    );
    click(f.root.querySelector('.tp-subscription-toggle'));
    await tick();
    assert.equal(f.root.querySelectorAll('.tp-subscription').length, 0);
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.subscriptionActive, false);
    change(
      f.root.querySelector<HTMLSelectElement>('.tp-subscription-summary select')!,
      'cancelled',
    );
    assert.equal(f.root.querySelectorAll('.tp-subscription').length, 1);
    click(f.root.querySelector('.tp-subscription-toggle'));
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.subscriptionActive, true);
    await f.plugin.service.undo();
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.subscriptionActive, false);
    for (const tab of ['today', 'inbox', 'upcoming', 'calendar', 'kanban', 'projects']) {
      click(f.root.querySelector(`[data-tab=${tab}]`));
      assert.equal(f.root.querySelectorAll('.tp-task, .tp-board-card').length, 0, tab);
    }
    click(f.root.querySelector('[data-tab=statistics]'));
    assert.equal(f.root.querySelectorAll('.tp-dashboard').length, 1);
    assert.ok(f.root.textContent!.includes('Нет данных для статистики'));
    const legacy = new TaskModal(f.plugin, taskItem(task, day()));
    legacy.open();
    assert.equal(
      document.querySelector('.tp-modal input[type=number]')?.getAttribute('step'),
      'any',
    );
  } finally {
    await f.close();
  }
});

test('UI repetition end is editable for presets, inclusive, reloadable and reversible', async () => {
  const f = await fixture();
  try {
    const until = addDays(day(), 2);
    await f.plugin.service.createTask(
      draft({ recurrence: `FREQ=DAILY;UNTIL=${until.replaceAll('-', '')}T235959Z` }),
    );
    const task = f.plugin.repo.snapshot().tasks[0]!;
    const modal = new TaskModal(f.plugin, taskItem(task, day()));
    modal.open();
    // The recurrence preset remains a preset even with a stored UNTIL.
    const daily = [...document.querySelectorAll<HTMLSelectElement>('.tp-modal select')].find(
      (s) => s.value === 'FREQ=DAILY',
    );
    assert.ok(daily);
    const end = document.querySelector<HTMLInputElement>('.tp-modal .tp-repeat-until')!;
    assert.equal(end.disabled, false);
    assert.equal(end.value, formatDate(until, f.plugin.settings.dateFormat));
    end.value = formatDate(addDays(day(), 1), f.plugin.settings.dateFormat);
    submit(document.querySelector<HTMLFormElement>('.tp-modal form')!);
    await tick();
    assert.equal(
      f.plugin.repo.snapshot().tasks[0]?.recurrence,
      `FREQ=DAILY;UNTIL=${addDays(day(), 1).replaceAll('-', '')}T235959Z`,
    );
    assert.equal(
      expand(f.plugin.repo.snapshot().tasks[0]!, addDays(day(), 2), addDays(day(), 4)).length,
      0,
    );
    await f.plugin.service.undo();
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.recurrence, task.recurrence);
  } finally {
    document.querySelector('.modal-container')?.remove();
    await f.close();
  }
});
test('UI recurrence date error leaves the modal and note intact', async () => {
  const f = await fixture();
  try {
    const modal = new TaskModal(f.plugin, undefined, draft({ recurrence: 'FREQ=WEEKLY' }));
    modal.open();
    const end = document.querySelector<HTMLInputElement>('.tp-repeat-until')!;
    end.value = formatDate(addDays(day(), -1), f.plugin.settings.dateFormat);
    submit(document.querySelector<HTMLFormElement>('.tp-modal form')!);
    await tick();
    assert.ok(document.querySelector('.tp-modal'));
    assert.equal(f.plugin.repo.snapshot().tasks.length, 0);
    end.value = '';
    submit(document.querySelector<HTMLFormElement>('.tp-modal form')!);
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.recurrence, 'FREQ=WEEKLY');
  } finally {
    document.querySelector('.modal-container')?.remove();
    await f.close();
  }
});

test('UI toggling repeat modes preserves invalid end text until validation on save', async () => {
  const f = await fixture();
  try {
    const modal = new TaskModal(f.plugin, undefined, draft({ recurrence: 'FREQ=DAILY' }));
    modal.open();
    const repeat = [...document.querySelectorAll<HTMLSelectElement>('.tp-modal select')].find(
      (s) => s.value === 'FREQ=DAILY',
    )!;
    const end = document.querySelector<HTMLInputElement>('.tp-repeat-until')!;
    end.value = 'invalid';
    change(repeat, '');
    assert.equal(end.value, '');
    change(repeat, 'FREQ=WEEKLY');
    assert.equal(end.value, 'invalid');
    submit(document.querySelector<HTMLFormElement>('.tp-modal form')!);
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks.length, 0);
    assert.ok(document.querySelector('.tp-modal'));
    modal.close();
  } finally {
    await f.close();
  }
});

test('translations cover matching dictionaries, Boards, commands and actionable errors', async () => {
  assert.deepEqual(Object.keys(words('ru')).sort(), Object.keys(words('en')).sort());
  assert.equal(words('ru').kanban, 'Доски');
  assert.equal(words('en').kanban, 'Boards');
  assert.match(
    messageText('Invalid appointment time. Use HH:mm from 00:00 to 23:59.', 'ru'),
    /ЧЧ:ММ/,
  );
  assert.match(
    messageText('Note not found: Tasks/Экзамен.md', 'ru'),
    /Заметка не найдена: Tasks\/Экзамен.md/,
  );
  const f = await fixture();
  try {
    assert.equal((f.plugin as any).commands.length, 5);
    assert.ok((f.plugin as any).commands.some((c: any) => c.name === 'Открыть планировщик'));
    f.plugin.settings.language = 'en';
    f.plugin.registerCommands();
    assert.equal((f.plugin as any).commands.length, 5);
    assert.ok((f.plugin as any).commands.some((c: any) => c.name === 'Open planner'));
    f.plugin.settings.language = 'ru';
    f.plugin.registerCommands();
    assert.equal((f.plugin as any).commands.length, 5);
    assert.equal(f.root.querySelector('[data-tab=kanban]')?.textContent?.includes('Доски'), true);
  } finally {
    await f.close();
  }
});
test('quick form and modal save optional appointment time and display priority meaning', async () => {
  const f = await fixture();
  try {
    f.root.querySelector<HTMLInputElement>('.tp-quick input[type=text]')!.value = 'Экзамен';
    f.root.querySelector<HTMLInputElement>('.tp-quick .tp-time')!.value = '14:00';
    submit(f.root.querySelector('form')!);
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.scheduledTime, '14:00');
    assert.equal(f.root.querySelector('.tp-appointment-time')?.textContent, '14:00');
    const t = f.plugin.repo.snapshot().tasks[0]!;
    const modal = new TaskModal(f.plugin, taskItem(t, day()));
    modal.open();
    assert.equal(document.querySelector<HTMLInputElement>('.tp-modal .tp-time')?.value, '14:00');
    document.querySelector<HTMLInputElement>('.tp-modal .tp-time')!.value = '09:00';
    const selects = document.querySelectorAll<HTMLSelectElement>('.tp-modal select');
    const priority = [...selects].find((n) => [...n.options].some((o) => o.value === 'high'))!;
    change(priority, 'high');
    submit(document.querySelector('.tp-modal form')!);
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.scheduledTime, '09:00');
    assert.equal(f.root.querySelector('.tp-priority')?.textContent, '!');
    assert.equal(
      f.root.querySelector('.tp-priority')?.getAttribute('aria-label'),
      'Высокий приоритет',
    );
    assert.ok(f.root.querySelector('.tp-high-priority'));
    modal.close();
  } finally {
    await f.close();
  }
});

test('Russian translations cover literal production validation errors without generic fallback', () => {
  for (const file of [
    'src/core/recurrence.ts',
    'src/services/tasks.ts',
    'src/ui/dom.ts',
    'src/ui/modals.ts',
  ]) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/throw new Error\(\s*'([^']+)'/g)) {
      const translated = messageText(match[1]!, 'ru');
      assert.notEqual(translated, match[1]);
      assert.ok(!translated.includes('Подробности в консоли'), match[1]);
    }
  }
});

test('calendar picker chooses dates and years, clears values and updates repeat preview', async () => {
  const f = await fixture();
  try {
    const modal = new TaskModal(f.plugin, undefined, { scheduled: '2026-10-04' });
    modal.open();
    const root = modal.contentEl;
    const repeat = [...root.querySelectorAll<HTMLSelectElement>('select')].find((s) =>
      [...s.options].some((o) => o.value === 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'),
    )!;
    change(repeat, 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
    assert.match(root.querySelector('.tp-repeat-preview')?.textContent || '', /05.10.2026/);
    const date = root.querySelector<HTMLInputElement>('.tp-date')!;
    const control = date.closest('.tp-date-control')!;
    click(control.querySelector('.tp-date-picker-button'));
    const picker = control.querySelector<HTMLElement>('.tp-picker-popup')!;
    assert.equal(picker.hidden, false);
    click(picker.querySelector('[data-picker-day="2026-10-07"]'));
    assert.equal(date.value, '07.10.2026');
    assert.match(root.querySelector('.tp-repeat-preview')?.textContent || '', /07.10.2026/);
    assert.equal(picker.hidden, true);
    click(control.querySelector('.tp-date-picker-button'));
    change(picker.querySelector<HTMLSelectElement>('[data-picker-control=year]')!, '2027');
    change(picker.querySelector<HTMLSelectElement>('[data-picker-control=month]')!, '02');
    assert.equal(
      picker.querySelector('[tabindex="0"]')?.getAttribute('data-picker-day'),
      '2027-02-01',
    );
    click(picker.querySelector('[data-picker-day="2027-02-06"]'));
    assert.equal(date.value, '06.02.2027');
    const end = root.querySelector<HTMLInputElement>('.tp-repeat-until')!;
    click(end.closest('.tp-date-control')!.querySelector('.tp-date-picker-button'));
    const endPicker = end
      .closest('.tp-date-control')!
      .querySelector<HTMLElement>('.tp-picker-popup')!;
    click(endPicker.querySelector('[data-picker-day="2026-10-09"]'));
    assert.equal(end.value, '09.10.2026');
    click(end.closest('.tp-date-control')!.querySelector('.tp-date-picker-button'));
    byText(endPicker, 'Очистить дату').click();
    assert.equal(end.value, '');
    modal.close();
  } finally {
    await f.close();
  }
});
test('guide is last in navigation, localized in both UI languages and carries safe author metadata', async () => {
  const f = await fixture();
  try {
    (f.plugin as any).manifest = { author: 'Author <img src=x>', version: '1.0.0' };
    const tabs = [...f.root.querySelectorAll<HTMLElement>('[data-tab]')];
    assert.equal(tabs.at(-1)?.dataset.tab, 'manualTab');
    click(tabs.at(-1)!);
    assert.ok(f.root.querySelector('.tp-manual'));
    assert.equal(f.root.querySelector<HTMLElement>('.tp-manual')?.lang, 'ru');
    assert.match(f.root.querySelector('.tp-manual')!.textContent!, /[А-Яа-яЁё]/);
    assert.match(f.root.querySelector('.tp-manual')!.textContent || '', /Сфера → проект → задача/);
    assert.match(f.root.querySelector('.tp-manual')!.textContent || '', /Author <img src=x>/);
    assert.equal(f.root.querySelectorAll('.tp-manual img').length, 0);
    assert.equal(f.root.querySelector<HTMLElement>('.tp-quick')!.hidden, true);
    assert.equal(f.root.querySelector<HTMLElement>('.tp-filters')!.hidden, true);
    for (const tab of [
      'today',
      'inbox',
      'upcoming',
      'calendar',
      'projects',
      'kanban',
      'subscriptions',
      'statistics',
    ]) {
      click(f.root.querySelector(`[data-tab=${tab}]`));
      assert.equal(f.root.querySelectorAll('.tp-help, .tp-board-help, .tp-tagline').length, 0);
    }
    f.plugin.settings.language = 'en';
    click(f.root.querySelector('[data-tab=manualTab]'));
    assert.equal(f.root.querySelector('[data-tab=manualTab]')?.textContent, 'Guide');
    assert.equal(f.root.querySelector<HTMLElement>('.tp-manual')?.lang, 'en');
    assert.match(f.root.querySelector('.tp-manual')?.textContent || '', /Area → project → task/);
    assert.doesNotMatch(f.root.querySelector('.tp-manual')!.textContent!, /[А-Яа-яЁё]/);
  } finally {
    await f.close();
  }
});

test('24-hour clock picker applies, cancels and clears local time without adding idle selects', async () => {
  const f = await fixture();
  try {
    const modal = new TaskModal(f.plugin);
    modal.open();
    const root = modal.contentEl;
    const time = root.querySelector<HTMLInputElement>('.tp-time')!;
    const control = time.closest('.tp-time-control')!;
    const trigger = control.querySelector<HTMLElement>('.tp-time-picker-button')!;
    const picker = control.querySelector<HTMLElement>('.tp-clock-popup')!;
    assert.equal(picker.querySelectorAll('select').length, 0);
    click(trigger);
    assert.equal(picker.hidden, false);
    change(picker.querySelector<HTMLSelectElement>('[aria-label="Часы"]')!, '14');
    change(picker.querySelector<HTMLSelectElement>('[aria-label="Минуты"]')!, '35');
    byText(picker, 'Выбрать время').click();
    assert.equal(time.value, '14:35');
    assert.equal(picker.hidden, true);
    assert.equal(picker.querySelectorAll('select').length, 0);
    click(trigger);
    change(picker.querySelector<HTMLSelectElement>('[aria-label="Часы"]')!, '22');
    picker.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(time.value, '14:35');
    assert.equal(document.activeElement, time);
    click(trigger);
    byText(picker, 'Очистить время').click();
    assert.equal(time.value, '');
    time.value = '930';
    time.dispatchEvent(new window.Event('blur'));
    assert.equal(time.value, '09:30');
    modal.close();
  } finally {
    await f.close();
  }
});
test('priority sits with titles and guide contains chapters, contents and dividers', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(draft({ priority: 'high', title: 'Important task' }));
    const row = f.root.querySelector('.tp-high-priority')!;
    assert.ok(row.querySelector('.tp-task-heading .tp-priority'));
    assert.equal(row.querySelector('.tp-task-meta .tp-priority'), null);
    click(f.root.querySelector('[data-tab=kanban]'));
    assert.ok(f.root.querySelector('.tp-board-card .tp-task-heading .tp-priority'));
    click(f.root.querySelector('[data-tab=manualTab]'));
    assert.equal(f.root.querySelectorAll('.tp-manual section').length, 11);
    assert.equal(f.root.querySelectorAll('.tp-manual-divider').length, 10);
    assert.equal(f.root.querySelectorAll('ol.tp-manual-links a.tp-manual-link').length, 11);
    const contents = f.root.querySelector('.tp-manual-contents')!;
    assert.equal(contents.getAttribute('aria-label'), null);
    for (const link of f.root.querySelectorAll<HTMLAnchorElement>('.tp-manual-link')) {
      assert.ok(f.root.querySelector(link.getAttribute('href')!));
    }
    assert.equal(f.root.querySelectorAll('.tp-manual-heading .tp-manual-number').length, 11);
  } finally {
    await f.close();
  }
});

test('calendar puts completed work first, orders times within states and keeps payments at the bottom', async () => {
  const f = await fixture();
  try {
    for (const [title, status, scheduledTime] of [
      ['Open early', 'in-progress', '07:00'],
      ['Done untimed', 'done', ''],
      ['Done late', 'done', '21:00'],
      ['Failed', 'failed', '08:00'],
      ['Open late', 'todo', '19:00'],
    ] as const)
      await f.plugin.service.createTask(draft({ title, status, scheduledTime }));
    await f.plugin.service.saveSubscription({
      title: 'YouTube Premium',
      scheduled: day(),
      active: true,
      amount: 14,
      currency: 'USD',
      billingPeriod: 'monthly',
      project: '',
      description: '',
    });
    click(f.root.querySelector('[data-tab=calendar]'));
    const cell = f.root.querySelector<HTMLElement>(`[data-day="${day()}"]`)!;
    assert.deepEqual(
      [...cell.querySelectorAll('.tp-task-title')].map((n) => n.textContent),
      ['Done late', 'Done untimed', 'Failed', 'Open early', 'Open late'],
    );
    assert.equal(cell.lastElementChild?.className, 'tp-calendar-billing');
    assert.match(cell.querySelector('.tp-calendar-payment')!.textContent!, /YouTube Premium.*14/);
    assert.equal(f.root.querySelectorAll('.tp-task[data-path*="YouTube"]').length, 0);
    assert.equal(
      cell.querySelector('.tp-workflow-label')?.classList.contains('tp-visually-hidden'),
      true,
    );
  } finally {
    await f.close();
  }
});
test('calendar forecasts next month separately from work and respects filters, cancellation and Undo', async () => {
  const f = await fixture();
  try {
    const p = await f.plugin.service.createNote('project', 'Video', {});
    await f.plugin.service.saveSubscription({
      title: 'YouTube Premium',
      scheduled: day().slice(0, 7) + '-01',
      active: true,
      amount: 14,
      currency: 'USD',
      billingPeriod: 'monthly',
      project: p.path,
      description: '',
    });
    const t = f.plugin.repo.snapshot().tasks[0]!;
    click(f.root.querySelector('[data-tab=calendar]'));
    click(f.root.querySelector(`.tp-calendar-toolbar [aria-label="${words('ru').next}"]`));
    const date = shiftMonth(day(), 1);
    const payment = () => f.root.querySelector(`[data-day="${date}"] .tp-calendar-payment`);
    assert.ok(payment());
    assert.equal(f.root.querySelectorAll('.tp-task').length, 0);
    await f.plugin.service.subscriptionActive(t, false);
    assert.equal(payment(), null);
    await f.plugin.service.undo();
    assert.ok(payment());
    const search = f.root.querySelector<HTMLInputElement>('input[type=search]')!;
    search.value = 'No match';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.equal(payment(), null);
    search.value = 'YouTube';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.ok(payment());
    click(f.root.querySelector('[data-tab=statistics]'));
    assert.equal(f.root.querySelector('[data-metric=tasks] strong')?.textContent, '0');
  } finally {
    await f.close();
  }
});
test('dashboard removes reopened minutes from primary totals and time chart, keeps saved minutes and supports Undo', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(draft({ status: 'done', minutes: 32 }));
    click(f.root.querySelector('[data-tab=statistics]'));
    assert.match(f.root.querySelector('[data-metric=time]')!.textContent!, /32/);
    assert.equal(
      f.root.querySelectorAll('.tp-time-chart .tp-chart-point:not([data-value="0"])').length,
      1,
    );
    assert.equal(f.root.querySelectorAll('.tp-workflow-ring circle').length, 2);
    await f.plugin.service.status(
      taskItem(f.plugin.repo.snapshot().tasks[0]!, day()),
      'in-progress',
    );
    assert.match(f.root.querySelector('[data-metric=time]')!.textContent!, /0 ч 0 мин/);
    assert.equal(
      f.root.querySelectorAll('.tp-time-chart .tp-chart-point:not([data-value="0"])').length,
      0,
    );
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.minutes, 32);
    assert.equal(f.root.querySelector<HTMLDetailsElement>('.tp-stats-disclosure')?.open, false);
    assert.match(f.root.querySelector('.tp-stats-extra')!.textContent!, /Открытые дела · мин32/);
    await f.plugin.service.undo();
    assert.equal(
      f.root.querySelectorAll('.tp-time-chart .tp-chart-point:not([data-value="0"])').length,
      1,
    );
    assert.match(f.root.querySelector('[data-metric=time]')!.textContent!, /32/);
  } finally {
    await f.close();
  }
});
test('boards use the same terminal state classes as calendar and disclose project numbers on demand', async () => {
  const f = await fixture();
  try {
    const p = await f.plugin.service.createNote('project', 'Project chart', {});
    await f.plugin.service.createTask(draft({ project: p.path, status: 'done' }));
    click(f.root.querySelector('[data-tab=kanban]'));
    assert.equal(f.root.querySelector('.tp-board-card')?.classList.contains('tp-done'), true);
    click(f.root.querySelector('[data-tab=statistics]'));
    assert.equal(f.root.querySelectorAll('.tp-project-chart-row').length, 1);
    assert.equal(f.root.querySelector<HTMLDetailsElement>('.tp-project-details')?.open, false);
    assert.equal(f.root.querySelector('.tp-project-chart-row strong')?.textContent, '100%');
    f.root.querySelector<HTMLDetailsElement>('.tp-project-details')!.open = true;
    await tick();
    click(f.root.querySelector('[data-period="7"]'));
    assert.equal(f.root.querySelector<HTMLDetailsElement>('.tp-project-details')?.open, true);
  } finally {
    await f.close();
  }
});

test('task context stays visible in lists, calendar and boards; overdue repeats retain their meaning', async () => {
  const f = await fixture();
  try {
    const area = await f.plugin.service.createNote('area', 'Work', {});
    const project = await f.plugin.service.createNote('project', 'Launch', { area: area.path });
    const yesterday = addDays(day(), -1);
    await f.plugin.service.createTask(
      draft({
        title: 'Late repeat',
        project: project.path,
        scheduled: yesterday,
        recurrence: 'FREQ=DAILY',
      }),
    );
    await f.plugin.service.createTask(
      draft({ title: 'Closed task', project: project.path, scheduled: yesterday, status: 'done' }),
    );
    for (const tab of ['today', 'calendar', 'kanban']) {
      click(f.root.querySelector(`[data-tab=${tab}]`));
      const card = [...f.root.querySelectorAll<HTMLElement>('.tp-task, .tp-board-card')].find((n) =>
        n.textContent?.includes('Late repeat'),
      )!;
      assert.ok(card);
      assert.match(card.textContent!, /Work \/ Launch/);
      assert.match(card.querySelector('.tp-overdue-label')!.textContent!, /Просрочено/);
    }
    click(f.root.querySelector('[data-tab=calendar]'));
    const closed = [...f.root.querySelectorAll<HTMLElement>('.tp-task')].find((n) =>
      n.textContent?.includes('Closed task'),
    )!;
    assert.equal(closed.querySelector('.tp-overdue-label'), null);
    assert.equal(closed.classList.contains('tp-overdue'), false);
    const repeat = f.plugin.repo.snapshot().tasks.find((t) => t.title === 'Late repeat')!;
    await f.plugin.service.move(expand(repeat, yesterday, yesterday)[0]!, addDays(day(), 1));
    const moved = f.root.querySelector<HTMLElement>(`.tp-task[data-key="${yesterday}"]`)!;
    assert.equal(moved.dataset.date, addDays(day(), 1));
    assert.equal(moved.querySelector('.tp-overdue-label'), null);
  } finally {
    await f.close();
  }
});

test('navigation groups keep a consistent order in both languages and statistics show compact workflow bars', async () => {
  const f = await fixture();
  try {
    assert.equal(f.root.querySelectorAll('.tp-nav-group').length, 4);
    const tabs = () =>
      [...f.root.querySelectorAll<HTMLElement>('[data-tab]')].map((n) => n.dataset.tab);
    const order = tabs();
    assert.deepEqual(order, [
      'inbox',
      'today',
      'upcoming',
      'calendar',
      'projects',
      'kanban',
      'subscriptions',
      'statistics',
      'manualTab',
    ]);
    await f.plugin.service.createTask(draft());
    click(f.root.querySelector('[data-tab=statistics]'));
    assert.equal(f.root.querySelectorAll('.tp-workflow-stat').length, 5);
    assert.equal(
      f.root.querySelectorAll(
        '.tp-workflow-track, .tp-project-chart-track, .tp-project-progress-bar',
      ).length,
      5,
    );
    f.plugin.settings.language = 'en';
    click(f.root.querySelector('[data-tab=manualTab]'));
    assert.deepEqual(tabs(), order);
    assert.equal(f.root.querySelector('[data-tab=upcoming]')?.textContent, 'Upcoming');
    assert.equal(f.root.querySelector<HTMLElement>('.tp-manual')?.lang, 'en');
  } finally {
    await f.close();
  }
});

test('meeting, payment and status markers coexist with priority in lists, calendar and boards', async () => {
  const f = await fixture();
  try {
    for (const kind of ['meeting', 'payment', 'status'] as const)
      await f.plugin.service.createTask(draft({ title: `Marked ${kind}`, kind, priority: 'high' }));
    await f.plugin.service.createTask(draft({ title: 'Plain task' }));
    for (const language of ['ru', 'en']) {
      f.plugin.settings.language = language as 'ru' | 'en';
      for (const tab of ['today', 'calendar', 'kanban']) {
        click(f.root.querySelector(`[data-tab=${tab}]`));
        for (const kind of ['meeting', 'payment', 'status'] as const) {
          const card = [...f.root.querySelectorAll<HTMLElement>('.tp-task, .tp-board-card')].find(
            (n) => n.textContent?.includes(`Marked ${kind}`),
          )!;
          const marker = card.querySelector<HTMLElement>('.tp-kind-badge')!;
          assert.equal(marker.dataset.kind, kind);
          assert.equal(marker.getAttribute('aria-label'), words(language)[kind]);
          assert.equal(card.querySelector('.tp-task-heading .tp-priority')?.textContent, '!');
          if (kind === 'payment') assert.equal(marker.textContent, '$');
          else assert.ok(marker.querySelector('svg'));
        }
        const plain = [...f.root.querySelectorAll<HTMLElement>('.tp-task, .tp-board-card')].find(
          (n) => n.textContent?.includes('Plain task'),
        )!;
        assert.equal(plain.querySelector('.tp-kind-badge'), null);
      }
    }
  } finally {
    await f.close();
  }
});

test('project bars sit below the chart row and match exact completion totals including empty projects', async () => {
  const f = await fixture();
  try {
    const p = await f.plugin.service.createNote('project', 'Project with progress', {});
    await f.plugin.service.createNote('project', 'Empty project', {});
    for (const status of ['done', 'todo', 'failed'] as const)
      await f.plugin.service.createTask(draft({ project: p.path, status }));
    click(f.root.querySelector('[data-tab=statistics]'));
    assert.ok(f.root.querySelector('.tp-dashboard > .tp-project-panel'));
    const projectRow = [...f.root.querySelectorAll<HTMLElement>('.tp-project-chart-row')].find(
      (n) => n.textContent?.includes('Project with progress'),
    )!;
    assert.equal(
      projectRow.querySelector<HTMLElement>('.tp-project-chart-track > span')?.style.width,
      '33%',
    );
    assert.match(projectRow.textContent!, /1 \/ 3/);
    const emptyRow = [...f.root.querySelectorAll<HTMLElement>('.tp-project-chart-row')].find((n) =>
      n.textContent?.includes('Empty project'),
    )!;
    assert.equal(
      emptyRow.querySelector<HTMLElement>('.tp-project-chart-track > span')?.style.width,
      '0%',
    );
    assert.equal(emptyRow.querySelector('strong')?.textContent, '—');
    assert.equal(
      f.root.querySelector<HTMLElement>(
        '.tp-workflow-stat[data-status=done] .tp-workflow-track > span',
      )?.style.width,
      '33.33333333333333%',
    );
  } finally {
    await f.close();
  }
});

test('UI period buckets cover every day and both charts fit without scrolling', async () => {
  const f = await fixture();
  try {
    click(f.root.querySelector('[data-tab=statistics]'));
    for (const days of [7, 30, 90, 365]) {
      click(f.root.querySelector(`[data-period="${days}"]`));
      for (const chart of ['.tp-activity-chart', '.tp-time-chart']) {
        const ticks = f.root.querySelectorAll(`${chart} .tp-day-tick`);
        const expected = periodBuckets(
          periodDates(day(), days as 7 | 30 | 90 | 365),
          days as 7 | 30 | 90 | 365,
        ).length;
        assert.equal(ticks.length, expected);
        assert.equal(
          (ticks[0] as HTMLElement).dataset.date,
          calendarPeriod(day(), days as 7 | 30 | 90 | 365).from,
        );
        assert.equal(
          (ticks[ticks.length - 1] as HTMLElement).dataset.through,
          calendarPeriod(day(), days as 7 | 30 | 90 | 365).to,
        );
      }
    }
    assert.equal(f.root.querySelector('[data-period="365"]')?.textContent, 'Год');
    assert.equal(f.root.querySelector('[data-period="30"]')?.textContent, 'Месяц');
  } finally {
    await f.close();
  }
});
test('UI payment fields follow task type, preserve unrelated work and enter expenses through the same note', async () => {
  const f = await fixture();
  try {
    click(f.root.querySelector('[data-tab=subscriptions]'));
    assert.equal(f.root.querySelector('[data-tab=subscriptions]')?.textContent, 'Расходы');
    click(byText(f.root, 'Добавить расход'));
    const modal = document.querySelector<HTMLElement>('.tp-modal')!;
    modal.querySelector<HTMLInputElement>('input[type=text]')!.value = 'Team lunch';
    modal.querySelector<HTMLInputElement>('[data-field=amount]')!.value = '75';
    const currency = [...modal.querySelectorAll<HTMLInputElement>('input[type=text]')].find(
      (n) => n.pattern === '[A-Za-z]{3}',
    )!;
    currency.value = 'EUR';
    const status = [...modal.querySelectorAll('select')].find(
      (n) => n.options[0]?.value === 'backlog',
    )!;
    change(status, 'todo');
    submit(modal.querySelector('form')!);
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks.length, 1);
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.amount, 75);
    assert.match(f.root.querySelector('.tp-task')!.textContent!, /75,00 EUR/);
    click(f.root.querySelector('.tp-check'));
    await tick();
    assert.equal(f.root.querySelectorAll('.tp-expense-record').length, 1);
    click(f.root.querySelector('[data-tab=statistics]'));
    assert.equal(f.root.querySelector('[data-metric=tasks] strong')?.textContent, '0');
    click(f.root.querySelector('[data-stats-mode=finance]'));
    assert.match(f.root.querySelector('.tp-finance-metrics')!.textContent!, /75,00 EUR/);
    click(f.root.querySelector('[data-finance-ledger]'));
    click(f.root.querySelector('.tp-expense-history button:last-child'));
    await tick();
    click(f.root.querySelector('[data-tab=statistics]'));
    click(f.root.querySelector('[data-stats-mode=finance]'));
    assert.equal(
      f.root.querySelector('.tp-finance-metrics')?.textContent?.includes('Оплачено'),
      true,
    );
    assert.ok(
      [...f.root.querySelectorAll<SVGElement>('.tp-finance-chart .tp-chart-point')].every(
        (n) => n.dataset.value === '0',
      ),
    );
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.amount, 75);
  } finally {
    await f.close();
  }
});
test('UI financial filters isolate department spending and currencies', async () => {
  const f = await fixture();
  try {
    const area = await f.plugin.service.createNote('area', 'Operations', {});
    const project = await f.plugin.service.createNote('project', 'Office', { area: area.path });
    await f.plugin.service.createTask(
      draft({
        kind: 'payment',
        title: 'Rent',
        project: project.path,
        amount: 50,
        currency: 'USD',
        status: 'done',
      }),
    );
    await f.plugin.service.createTask(
      draft({ kind: 'payment', title: 'Home', amount: 40, currency: 'EUR', status: 'done' }),
    );
    click(f.root.querySelector('[data-tab=statistics]'));
    click(f.root.querySelector('[data-stats-mode=finance]'));
    assert.match(f.root.querySelector('.tp-finance-metrics')!.textContent!, /50,00 USD/);
    assert.match(f.root.querySelector('.tp-finance-metrics')!.textContent!, /40,00 EUR/);
    change(f.root.querySelector<HTMLSelectElement>('.tp-filter-panel select')!, area.path);
    assert.equal(f.root.querySelector('.tp-finance-metrics')!.textContent!.includes('EUR'), false);
    assert.match(f.root.querySelector('.tp-cost-allocation')!.textContent!, /Operations \/ Office/);
    click(f.root.querySelector('[data-period="365"]'));
    assert.equal(f.root.querySelectorAll('.tp-finance-chart .tp-day-tick').length, 12);
    assert.equal(
      f.root.querySelectorAll('.tp-finance-daily-list > div').length,
      periodDates(day(), 365).length,
    );
  } finally {
    await f.close();
  }
});

test('UI hide completed belongs only to the calendar and retains failed tasks and note data', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(
      draft({ title: 'Completed example', status: 'done', minutes: 25 }),
    );
    await f.plugin.service.createTask(draft({ title: 'Failed example', status: 'failed' }));
    await f.plugin.service.createTask(draft({ title: 'Active example' }));
    click(f.root.querySelector('[data-tab=calendar]'));
    const notes = JSON.stringify(f.plugin.repo.snapshot().tasks);
    assert.ok(
      f.root.querySelector('.tp-calendar-grid')!.textContent!.includes('Completed example'),
    );
    click(f.root.querySelector('[data-calendar-hide-done]'));
    assert.equal(
      f.root.querySelector('.tp-calendar-grid')!.textContent!.includes('Completed example'),
      false,
    );
    assert.ok(f.root.querySelector('.tp-calendar-grid')!.textContent!.includes('Failed example'));
    assert.equal(
      f.root.querySelector('[data-calendar-hide-done]')!.getAttribute('aria-pressed'),
      'true',
    );
    assert.equal(JSON.stringify(f.plugin.repo.snapshot().tasks), notes);
    click(f.root.querySelector('[data-tab=today]'));
    assert.equal(f.root.querySelector('[data-calendar-hide-done]'), null);
    click(f.root.querySelector('[data-tab=calendar]'));
    assert.equal(
      f.root.querySelector('.tp-calendar-grid')!.textContent!.includes('Completed example'),
      false,
    );
    click(f.root.querySelector('[data-calendar-hide-done]'));
    assert.ok(
      f.root.querySelector('.tp-calendar-grid')!.textContent!.includes('Completed example'),
    );
  } finally {
    await f.close();
  }
});
test('UI calendar hides recurring cards independently and retains load, billing, notes and view state', async () => {
  const f = await fixture();
  try {
    for (const v of [
      { title: 'Repeat work', recurrence: 'FREQ=DAILY', plannedMinutes: 45 },
      { title: 'Repeat payment', recurrence: 'FREQ=WEEKLY', kind: 'payment' as const, amount: 12 },
      { title: 'One-off work', plannedMinutes: 30 },
      { title: 'One-off done', status: 'done' as const },
    ])
      await f.plugin.service.createTask(draft(v));
    await f.plugin.service.saveSubscription({
      title: 'Billing stays',
      scheduled: day(),
      active: true,
      amount: 14,
      currency: 'USD',
      billingPeriod: 'monthly',
      project: '',
      description: '',
    });
    const notes = JSON.stringify(f.plugin.repo.snapshot());
    for (const language of ['ru', 'en'] as const) {
      f.plugin.settings.language = language;
      f.view.rebuild();
      click(f.root.querySelector('[data-tab=calendar]'));
      click(f.root.querySelector('[data-calendar-view=day]'));
      const load = f.root.querySelector('.tp-workload-panel')!.textContent;
      const toggle = () => f.root.querySelector('[data-calendar-hide-recurring]')!;
      assert.equal(
        toggle().textContent,
        language === 'ru' ? 'Скрыть повторяющиеся' : 'Hide recurring',
      );
      click(toggle());
      assert.equal(toggle().getAttribute('aria-pressed'), 'true');
      assert.equal(toggle(), document.activeElement);
      assert.equal(
        toggle().textContent,
        language === 'ru' ? 'Показать повторяющиеся' : 'Show recurring',
      );
      assert.equal(f.root.querySelector('.tp-workload-panel')!.textContent, load);
      for (const mode of ['day', 'week', 'month']) {
        click(f.root.querySelector(`[data-calendar-view=${mode}]`));
        const titles = f.root.querySelector('.tp-calendar-grid')!.textContent!;
        assert.equal(titles.includes('Repeat work'), false);
        assert.equal(titles.includes('Repeat payment'), false);
        assert.ok(titles.includes('One-off work'));
        assert.ok(titles.includes('One-off done'));
        assert.ok(titles.includes('Billing stays'));
      }
      click(f.root.querySelector('[data-calendar-hide-done]'));
      assert.equal(
        f.root.querySelector('.tp-calendar-grid')!.textContent!.includes('One-off done'),
        false,
      );
      click(f.root.querySelector('[data-tab=today]'));
      assert.equal(f.root.querySelector('[data-calendar-hide-recurring]'), null);
      assert.ok(f.root.textContent!.includes('Repeat work'));
      click(f.root.querySelector('[data-tab=calendar]'));
      f.view.rebuild();
      assert.equal(toggle().getAttribute('aria-pressed'), 'true');
      click(toggle());
      assert.ok(f.root.querySelector('.tp-calendar-grid')!.textContent!.includes('Repeat work'));
      assert.equal(
        f.root.querySelector('.tp-calendar-grid')!.textContent!.includes('One-off done'),
        false,
      );
      click(f.root.querySelector('[data-calendar-hide-done]'));
      assert.equal(JSON.stringify(f.plugin.repo.snapshot()), notes);
    }
  } finally {
    await f.close();
  }
});
test('UI expense period scopes paid history and planning without changing monthly subscription estimates', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(
      draft({ kind: 'payment', title: 'Recent cost', amount: 12, status: 'done' }),
    );
    await f.plugin.service.createTask(
      draft({
        kind: 'payment',
        title: 'Older cost',
        amount: 20,
        status: 'done',
        paidOn: addDays(day(), -15),
      }),
    );
    click(f.root.querySelector('[data-tab=subscriptions]'));
    click(f.root.querySelector('[data-period="7"]'));
    assert.ok(f.root.querySelector('.tp-expense-history')!.textContent!.includes('Recent cost'));
    assert.equal(
      f.root.querySelector('.tp-expense-history')!.textContent!.includes('Older cost'),
      false,
    );
    assert.ok(f.root.querySelector('.tp-finance-plan .tp-period-range'));
    click(f.root.querySelector('[data-period="365"]'));
    assert.ok(f.root.querySelector('.tp-expense-history')!.textContent!.includes('Older cost'));
    click(f.root.querySelector('[data-tab=statistics]'));
    click(f.root.querySelector('[data-stats-mode=finance]'));
    assert.equal(f.root.querySelector('[data-period="365"]')?.getAttribute('aria-pressed'), 'true');
  } finally {
    await f.close();
  }
});

test('UI reporting shares calendar periods across work, finance and payments with explicit lifetime scope', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(
      draft({
        title: 'Current payment',
        kind: 'payment',
        status: 'done',
        amount: 72.75,
        currency: 'USD',
        paidOn: day(),
      }),
    );
    await f.plugin.service.createTask(
      draft({
        title: 'Previous year payment',
        kind: 'payment',
        status: 'done',
        amount: 100,
        currency: 'USD',
        paidOn: `${Number(day().slice(0, 4)) - 1}-12-31`,
      }),
    );
    await f.plugin.service.createTask(
      draft({
        title: 'Euro payment',
        kind: 'payment',
        status: 'done',
        amount: 11,
        currency: 'EUR',
        paidOn: day(),
      }),
    );
    await f.plugin.service.createTask(
      draft({
        title: 'Free payment',
        kind: 'payment',
        status: 'done',
        amount: 0,
        currency: 'JPY',
        paidOn: day(),
      }),
    );
    const notes = JSON.stringify(f.plugin.repo.snapshot());
    click(f.root.querySelector('[data-tab=statistics]'));
    click(f.root.querySelector('[data-period="90"]'));
    assert.equal(f.root.querySelector<HTMLTimeElement>('.tp-header-date')!.dateTime, day());
    assert.equal(f.root.querySelector('.tp-header-date')!.textContent, formatDate(day()));
    assert.ok(
      f.root.querySelector('.tp-header-tools')!.contains(f.root.querySelector('.tp-header-date')),
    );
    assert.ok(f.root.querySelector('.tp-stats-overview')!.textContent!.includes('За всё время'));
    assert.ok(f.root.querySelector('.tp-project-panel')!.textContent!.includes('За всё время'));
    assert.equal(f.root.querySelectorAll('.tp-periods').length, 1);
    click(f.root.querySelector('[data-stats-mode=finance]'));
    assert.equal(f.root.querySelector('[data-period="90"]')!.getAttribute('aria-pressed'), 'true');
    const chartValues = () =>
      [...f.root.querySelectorAll<SVGElement>('.tp-finance-chart .tp-chart-point')].map(
        (n) => n.dataset.value,
      );
    const beforeCurrencyChange = chartValues();
    change(f.root.querySelector<HTMLSelectElement>('[data-finance-currency]')!, 'JPY');
    assert.deepEqual(chartValues(), beforeCurrencyChange);
    assert.equal(f.root.querySelector('.tp-finance-activity [data-finance-currency]'), null);
    assert.ok(
      [...f.root.querySelectorAll<SVGElement>('[data-currency="JPY"] .tp-chart-point')].every(
        (n) => n.dataset.value === '0',
      ),
    );
    assert.equal(
      f.root.querySelector('.tp-finance-activity')!.textContent!.includes(words('ru').financeEmpty),
      false,
    );
    change(f.root.querySelector<HTMLSelectElement>('[data-finance-currency]')!, 'USD');
    for (const period of [7, 30, 90, 365] as const) {
      click(f.root.querySelector(`[data-period="${period}"]`));
      const { from, to } = calendarPeriod(day(), period);
      assert.equal(
        f.root.querySelector('.tp-finance > .tp-period-heading .tp-period-range')!.textContent,
        `${formatDate(from)} — ${formatDate(to)}`,
      );
      assert.equal(f.root.querySelectorAll('.tp-finance-chart path.tp-chart-line').length, 3);
      assert.equal(f.root.querySelectorAll('.tp-finance-chart rect').length, 0);
      for (const [code, amount] of [
        ['EUR', 11],
        ['JPY', 0],
        ['USD', 72.75],
      ] as const) {
        const points = [
          ...f.root.querySelectorAll<SVGElement>(`[data-currency="${code}"] .tp-chart-point`),
        ];
        assert.equal(points[0]!.dataset.date, from);
        assert.equal(points.at(-1)!.dataset.through, to);
        assert.equal(
          points.reduce((sum, n) => sum + Number(n.dataset.value), 0),
          amount,
        );
        assert.ok(
          points.every((n) => n.tabIndex === 0 && n.getAttribute('aria-label')!.includes(code)),
        );
        assert.equal(
          f.root.querySelectorAll(`.tp-finance-daily-values [data-currency="${code}"]`).length,
          periodDates(day(), period).length,
        );
      }
      assert.equal(
        f.root.querySelectorAll('.tp-finance-daily-list > div').length,
        periodDates(day(), period).length,
      );
      click(f.root.querySelector('[data-finance-ledger]'));
      assert.equal(
        f.root.querySelector('[data-expense-mode=payments]')!.getAttribute('aria-pressed'),
        'true',
      );
      assert.equal(
        f.root.querySelector('[data-period="' + period + '"]')!.getAttribute('aria-pressed'),
        'true',
      );
      assert.equal(f.root.querySelector('.tp-subscription-summary'), null);
      assert.equal(
        f.root.querySelector('.tp-expense-ledger')!.firstElementChild!.className,
        'tp-finance-plan tp-stats-panel',
      );
      click(f.root.querySelector('[data-expenses-analytics]'));
    }
    click(f.root.querySelector('[data-stats-mode=business]'));
    assert.equal(f.root.querySelector('[data-period="365"]')!.getAttribute('aria-pressed'), 'true');
    assert.equal(JSON.stringify(f.plugin.repo.snapshot()), notes);
  } finally {
    await f.close();
  }
});
test('UI Expenses separates payment operations from subscription management in both languages', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(
      draft({ title: 'Awaiting example', kind: 'payment', amount: 12 }),
    );
    for (const language of ['ru', 'en'] as const) {
      f.plugin.settings.language = language;
      f.view.rebuild();
      click(f.root.querySelector('[data-tab=subscriptions]'));
      click(f.root.querySelector('[data-expense-mode=payments]'));
      assert.equal(
        f.root.querySelector('.tp-finance-plan .tp-check')!.getAttribute('aria-label'),
        language === 'ru' ? 'Отметить оплату' : 'Record payment',
      );
      assert.ok(f.root.querySelector('.tp-finance-plan'));
      assert.ok(f.root.querySelector('.tp-expense-history'));
      assert.equal(f.root.querySelector('.tp-subscription-summary'), null);
      click(f.root.querySelector('[data-expense-mode=subscriptions]'));
      assert.equal(
        document.activeElement,
        f.root.querySelector('[data-expense-mode=subscriptions]'),
      );
      assert.ok(f.root.querySelector('.tp-subscription-summary'));
      assert.equal(f.root.querySelector('.tp-expense-history'), null);
      assert.equal(f.root.querySelector('.tp-finance-plan'), null);
      assert.equal(f.root.querySelector('.tp-periods'), null);
      click(byText(f.root, language === 'ru' ? 'Добавить расход' : 'Add expense'));
      assert.equal(
        f.root.querySelector('[data-expense-mode=payments]')!.getAttribute('aria-pressed'),
        'true',
      );
      click(
        byText(
          document.querySelector<HTMLElement>('.tp-modal')!,
          language === 'ru' ? 'Отмена' : 'Cancel',
        ),
      );
      click(byText(f.root, language === 'ru' ? 'Добавить подписку' : 'Add subscription'));
      assert.equal(
        f.root.querySelector('[data-expense-mode=subscriptions]')!.getAttribute('aria-pressed'),
        'true',
      );
      click(
        byText(
          document.querySelector<HTMLElement>('.tp-modal')!,
          language === 'ru' ? 'Отмена' : 'Cancel',
        ),
      );
    }
  } finally {
    await f.close();
  }
});
test('UI explanations are confined to the bilingual guide and all expense ranges use the selected calendar period', async () => {
  const f = await fixture();
  try {
    const w = words('ru');
    for (const tab of ['statistics', 'subscriptions']) {
      click(f.root.querySelector(`[data-tab=${tab}]`));
      if (tab === 'statistics') click(f.root.querySelector('[data-stats-mode=finance]'));
      for (const period of [7, 30, 90, 365] as const) {
        click(f.root.querySelector(`[data-period="${period}"]`));
        const { from, to } = calendarPeriod(day(), period);
        const range = `${formatDate(from, 'dmy')} — ${formatDate(to, 'dmy')}`;
        const panels = f.root.querySelectorAll(
          '.tp-finance-metrics .tp-metric, .tp-expense-history, .tp-finance-plan, .tp-finance-forecast',
        );
        assert.ok(panels.length >= 2);
        if (tab === 'statistics') {
          assert.equal(f.root.querySelector('.tp-expense-history'), null);
          assert.equal(f.root.querySelector('.tp-finance-plan'), null);
        } else assert.equal(f.root.querySelector('.tp-finance-metrics'), null);
        for (const panel of panels) assert.ok(panel.textContent!.includes(range));
        assert.equal(f.root.textContent!.includes(w.expensesHelp), false);
        assert.equal(f.root.textContent!.includes(w.periodRangeHelp), false);
        assert.equal(f.root.textContent!.includes(w.subscriptionCatalogHelp), false);
      }
    }
    click(f.root.querySelector('[data-tab=manualTab]'));
    assert.ok(f.root.textContent!.includes(w.expensesHelp));
    assert.ok(f.root.textContent!.includes(w.periodRangeHelp));
    assert.ok(f.root.textContent!.includes(w.subscriptionCatalogHelp));
    f.plugin.settings.language = 'en';
    f.view.rebuild();
    const en = words('en');
    assert.ok(f.root.textContent!.includes(en.periodRangeHelp));
    assert.ok(f.root.textContent!.includes(en.expensesHelp));
  } finally {
    await f.close();
  }
});

test('UI late completion keeps September work out of the current October totals and preserves closure metadata', async () => {
  const f = await fixture();
  try {
    const previous = addDays(calendarPeriod(day(), 30).from, -2);
    await f.plugin.service.createTask(
      draft({ title: 'Late closure', scheduled: previous, minutes: 25 }),
    );
    const task = f.plugin.repo.snapshot().tasks[0]!;
    await f.plugin.service.status(taskItem(task, day()), 'done');
    assert.equal(f.plugin.repo.snapshot().tasks[0]!.resolvedOn, day());
    click(f.root.querySelector('[data-tab=statistics]'));
    assert.equal(
      f.root.querySelectorAll('.tp-activity-chart .tp-chart-point:not([data-value="0"])').length,
      0,
    );
    assert.equal(
      f.root.querySelectorAll('.tp-time-chart .tp-chart-point:not([data-value="0"])').length,
      0,
    );
    assert.match(f.root.querySelector('[data-metric=time]')!.textContent!, /25/);
    click(f.root.querySelector('[data-period="365"]'));
    assert.equal(
      f.root.querySelectorAll('.tp-activity-chart .tp-chart-point:not([data-value="0"])').length,
      1,
    );
  } finally {
    await f.close();
  }
});
test('UI project pickers sort by area then project for task, quick entry, filters and subscriptions', async () => {
  const f = await fixture();
  try {
    const z = await f.plugin.service.createNote('area', 'Я', {});
    const a = await f.plugin.service.createNote('area', 'А', {});
    await f.plugin.service.createNote('project', 'Альфа', { area: z.path });
    await f.plugin.service.createNote('project', 'Ясный', { area: a.path });
    await f.plugin.service.createNote('project', 'Альфа', { area: a.path });
    const expected = ['А / Альфа', 'А / Ясный', 'Я / Альфа'];
    const projectSelect = (parent: ParentNode) =>
      [...parent.querySelectorAll<HTMLSelectElement>('select')].find((n) =>
        [...n.options].some((o) => o.textContent === expected[0]),
      )!;
    const labels = (select: HTMLSelectElement) =>
      [...select.options].slice(1).map((o) => o.textContent);
    assert.deepEqual(labels(projectSelect(f.root.querySelector('.tp-quick')!)), expected);
    assert.deepEqual(labels(projectSelect(f.root.querySelector('.tp-filter-panel')!)), expected);
    const taskModal = new TaskModal(f.plugin);
    taskModal.open();
    assert.deepEqual(labels(projectSelect(document.querySelector('.tp-modal')!)), expected);
    taskModal.close();
    new SubscriptionModal(f.plugin).open();
    assert.deepEqual(labels(projectSelect(document.querySelector('.tp-modal')!)), expected);
  } finally {
    await f.close();
  }
});

test('UI twenty distant tasks appear on work dates and deadlines without disclosure buttons', async () => {
  const f = await fixture();
  try {
    const due = addDays(day(), 90);
    for (let i = 0; i < 20; i++)
      await f.plugin.service.createTask(draft({ title: `Long ${i}`, due }));
    click(f.root.querySelector('[data-tab=calendar]'));
    const todayCell = f.root.querySelector(`[data-day="${day()}"]`)!;
    assert.equal(todayCell.querySelectorAll('.tp-task').length, 20);
    assert.equal(
      f.root.querySelector(`[data-day="${addDays(day(), 1)}"]`)?.querySelectorAll('.tp-task')
        .length,
      0,
    );
    assert.equal(f.root.querySelectorAll('.tp-show-more,[data-range-more]').length, 0);
    (f.view as any).month = due.slice(0, 7) + '-01';
    f.view.rebuild();
    const cell = () => f.root.querySelector(`[data-day="${due}"]`)!;
    assert.equal(cell().querySelectorAll('.tp-calendar-deadline').length, 20);
    assert.ok(cell().lastElementChild!.classList.contains('tp-calendar-deadline'));
    click(cell().querySelector('.tp-check'));
    await tick();
    click(f.root.querySelector('[data-calendar-hide-done]'));
    assert.equal(cell().querySelectorAll('.tp-task').length, 19);
  } finally {
    await f.close();
  }
});
test('UI bottom-of-day ranges retain full labels, priority, kind, dates and note controls', async () => {
  const f = await fixture();
  try {
    const area = await f.plugin.service.createNote('area', 'Work', {});
    const project = await f.plugin.service.createNote('project', 'Playbooks', { area: area.path });
    const start = day().slice(0, 7) + '-01';
    await f.plugin.service.createTask(
      draft({
        title: 'A very long task title for a three month project',
        scheduled: start,
        due: addDays(start, 90),
        project: project.path,
        priority: 'high',
        kind: 'status',
      }),
    );
    click(f.root.querySelector('[data-tab=calendar]'));
    (f.view as any).month = addDays(start, 90).slice(0, 7) + '-01';
    f.view.rebuild();
    const band = f.root.querySelector<HTMLElement>('.tp-calendar-deadline')!;
    assert.ok(band.querySelector('.tp-kind-badge[data-kind=status]'));
    assert.ok(band.querySelector('.tp-priority'));
    assert.ok(band.textContent!.includes('Work / Playbooks'));
    assert.equal(band.dataset.from, addDays(start, 90));
    assert.equal(band.dataset.to, addDays(start, 90));
    assert.equal(band.draggable, true);
    click(band.querySelector('.tp-task-title'));
    assert.ok(document.querySelector('.tp-modal form'));
  } finally {
    await f.close();
  }
});

test('UI calendar views expose day/week/month and the estimate remains distinct from actual minutes', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(
      draft({
        plannedMinutes: 90,
        workDates: [addDays(day(), 1), addDays(day(), 2)],
        due: addDays(day(), 5),
      }),
    );
    click(f.root.querySelector('[data-tab=calendar]'));
    click(f.root.querySelector('[data-calendar-view=week]'));
    assert.equal(f.root.querySelectorAll('.tp-day').length, 7);
    click(f.root.querySelector('[data-calendar-view=day]'));
    assert.equal(f.root.querySelectorAll('.tp-day').length, 1);
    assert.equal(f.root.querySelector('.tp-day-load'), null);
    assert.equal(
      f.root.querySelector<HTMLElement>('.tp-workload-panel')?.dataset.plannedMinutes,
      '30',
    );
    assert.match(f.root.querySelector('.tp-workload-panel')!.textContent!, /Доступно на день: 8 ч/);
    assert.equal(f.root.querySelector('.tp-planned-minutes')?.textContent, 'Оценка: 1 ч 30 мин');
    click(f.root.querySelector('.tp-task-title'));
    assert.equal(
      document.querySelector<HTMLInputElement>('[data-field=plannedMinutes]')!.value,
      '90',
    );
    assert.equal(document.querySelector<HTMLInputElement>('[data-field=minutes]')!.value, '0');
  } finally {
    await f.close();
  }
});
test('UI task forms omit extra-day controls and preserve saved work dates in both languages', async () => {
  for (const language of ['ru', 'en'] as const) {
    const f = await fixture();
    try {
      f.plugin.settings.language = language;
      f.view.rebuild();
      const create = new TaskModal(f.plugin);
      create.open();
      assert.equal(create.contentEl.querySelector('[data-field=workDate], .tp-work-dates'), null);
      assert.ok(
        !create.contentEl.textContent?.includes(
          language === 'ru' ? 'Добавить день работы' : 'Add work day',
        ),
      );
      create.contentEl.querySelector<HTMLInputElement>('input[type=text]')!.value = 'Simple task';
      submit(create.contentEl.querySelector('form')!);
      await tick();
      const simple = f.plugin.repo.snapshot().tasks.find((t) => t.title === 'Simple task')!;
      assert.ok(simple);
      assert.deepEqual(simple.workDates, []);
      assert.doesNotMatch(
        await f.app.vault.read(f.app.vault.getAbstractFileByPath(simple.path)),
        /^workDates:/m,
      );

      const workDates = [addDays(day(), 1), addDays(day(), 2)];
      const file = await f.plugin.service.createTask(
        draft({
          title: 'Existing plan',
          workDates,
          due: addDays(day(), 5),
          plannedMinutes: 91,
          minutes: 11,
        }),
      );
      await f.app.fileManager.processFrontMatter(file, (fm: any) => {
        fm.customExample = 'Keep this';
      });
      await f.app.vault.modify(file, (await f.app.vault.read(file)) + '\nKeep note body.\n');
      await f.plugin.repo.load();
      const task = f.plugin.repo.snapshot().tasks.find((t) => t.path === file.path)!;
      const edit = new TaskModal(f.plugin, taskItem(task, day()));
      edit.open();
      assert.equal(edit.contentEl.querySelector('[data-field=workDate], .tp-work-dates'), null);
      edit.contentEl.querySelector<HTMLInputElement>('input[type=text]')!.value = 'Edited plan';
      edit.contentEl.querySelector<HTMLInputElement>('[data-field=plannedMinutes]')!.value = '120';
      submit(edit.contentEl.querySelector('form')!);
      await tick();
      const saved = f.plugin.repo.snapshot().tasks.find((t) => t.path === file.path)!;
      assert.deepEqual(saved.workDates, workDates);
      assert.equal(saved.title, 'Edited plan');
      assert.equal(saved.scheduled, task.scheduled);
      assert.equal(saved.due, task.due);
      assert.equal(saved.minutes, 11);
      assert.equal(saved.plannedMinutes, 120);
      const text = await f.app.vault.read(file);
      assert.match(text, /customExample: Keep this/);
      assert.match(text, /Keep note body\./);
      await f.plugin.service.undo();
      const undone = f.plugin.repo.snapshot().tasks.find((t) => t.path === file.path)!;
      assert.equal(undone.title, 'Existing plan');
      assert.deepEqual(undone.workDates, workDates);
      assert.equal(undone.plannedMinutes, 91);
    } finally {
      await f.close();
    }
  }
});
test('UI financial budgets can be configured by project and do not duplicate payment ledger', async () => {
  const f = await fixture();
  try {
    const area = await f.plugin.service.createNote('area', 'Department', {
      monthlyBudget: 1000,
      budgetCurrency: 'USD',
    });
    const project = await f.plugin.service.createNote('project', 'Project', {
      area: area.path,
      monthlyBudget: 100,
      budgetCurrency: 'USD',
    });
    await f.plugin.service.createTask(
      draft({
        kind: 'payment',
        project: project.path,
        status: 'done',
        amount: 30,
        currency: 'USD',
      }),
    );
    click(f.root.querySelector('[data-tab=statistics]'));
    click(f.root.querySelector('[data-stats-mode=finance]'));
    assert.equal(f.root.querySelectorAll('.tp-budget-card').length, 2);
    assert.ok(
      f.root
        .querySelector(`.tp-budget-card[data-path="${project.path}"]`)!
        .textContent!.includes('70'),
    );
    change(
      f.root.querySelector<HTMLSelectElement>('[data-budget-configure]')!,
      'project:' + project.path,
    );
    document.querySelector<HTMLInputElement>('[data-field=monthlyBudget]')!.value = '200';
    submit(document.querySelector('.tp-modal form')!);
    await tick();
    assert.equal(f.plugin.repo.snapshot().projects[0]!.monthlyBudget, 200);
  } finally {
    await f.close();
  }
});

test('UI workload distinguishes unknown estimates from zero and never multiplies capacity into month totals', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(
      draft({ title: 'Unknown effort', workDates: [addDays(day(), 1)], due: addDays(day(), 2) }),
    );
    click(f.root.querySelector('[data-tab=calendar]'));
    let panel = f.root.querySelector<HTMLElement>('.tp-workload-panel')!;
    assert.equal(panel.dataset.unestimatedTasks, '1');
    assert.match(panel.textContent!, /Время не оценено/);
    assert.equal(panel.querySelector('progress'), null);
    assert.ok(!panel.textContent!.includes('14880'));
    assert.ok(!panel.textContent!.includes('Доступно на день'));
    await f.plugin.service.createTask(draft({ title: 'Estimated effort', plannedMinutes: 600 }));
    await tick();
    panel = f.root.querySelector<HTMLElement>('.tp-workload-panel')!;
    assert.match(panel.textContent!, /В плане: 10 ч/);
    assert.match(panel.textContent!, /Дней с перегрузкой: 1/);
    click(f.root.querySelector('[data-calendar-view=day]'));
    panel = f.root.querySelector<HTMLElement>('.tp-workload-panel')!;
    assert.match(panel.textContent!, /Доступно на день: 8 ч/);
    assert.ok(panel.querySelector('progress.tp-load-over'));
    f.plugin.settings.language = 'en';
    f.view.rebuild();
    assert.match(
      f.root.querySelector('.tp-workload-panel')!.textContent!,
      /Available for the day: 8 h/,
    );
  } finally {
    await f.close();
  }
});

test('UI calendar load uses hours and minutes alongside date and retains unknown-estimate count', async () => {
  const f = await fixture();
  try {
    await f.plugin.service.createTask(draft({ title: 'Measured', plannedMinutes: 115 }));
    await f.plugin.service.createTask(draft({ title: 'Unknown', plannedMinutes: undefined }));
    click(f.root.querySelector('[data-tab=calendar]'));
    const heading = f.root.querySelector<HTMLElement>(`[data-day="${day()}"] .tp-day-heading`)!;
    assert.ok(heading.querySelector('.tp-day-number'));
    assert.equal(heading.querySelector('.tp-day-duration')?.textContent, '1 ч 55 мин');
    const unknown = heading.querySelector<HTMLElement>('.tp-day-unestimated')!;
    assert.match(unknown.textContent!, /^\?\d+$/);
    assert.match(unknown.getAttribute('aria-label')!, /Без оценки/);
    assert.equal(heading.parentElement?.classList.contains('tp-day'), true);
  } finally {
    await f.close();
  }
});

test('UI menu toggle keeps drafts, language labels and Guide access without saving settings', async () => {
  const f = await fixture();
  try {
    const settings = JSON.stringify(f.plugin.settings);
    const toggle = () => f.root.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
    const title = f.root.querySelector<HTMLInputElement>('.tp-quick input[type=text]')!;
    title.value = 'Draft stays while toggling';
    assert.equal(toggle().getAttribute('aria-expanded'), 'true');
    assert.equal(toggle().getAttribute('aria-label'), words('ru').collapseMenu);
    const sidebar = f.root.querySelector<HTMLElement>('.tp-sidebar')!;
    assert.equal(toggle().closest('.tp-sidebar'), sidebar);
    assert.equal(f.root.querySelectorAll('[data-menu-toggle]').length, 1);
    assert.equal(
      toggle().getAttribute('aria-controls'),
      `${sidebar.id}-navigation ${sidebar.id}-actions`,
    );
    click(toggle());
    assert.equal(sidebar.querySelector<HTMLElement>('.tp-nav')!.hidden, true);
    assert.equal(sidebar.hidden, true);
    assert.equal(toggle().closest('.tp-header'), f.root.querySelector('.tp-header'));
    assert.equal(toggle().closest('.tp-sidebar'), null);
    assert.equal(toggle().getAttribute('aria-expanded'), 'false');
    assert.equal(toggle().querySelectorAll('svg').length, 1);
    assert.equal(toggle().getAttribute('aria-label'), words('ru').expandMenu);
    assert.equal(title.value, 'Draft stays while toggling');
    f.view.rebuild();
    assert.equal(f.root.querySelector<HTMLElement>('.tp-nav')!.hidden, true);
    assert.equal(
      f.root.querySelector<HTMLInputElement>('.tp-quick input[type=text]')!.value,
      title.value,
    );
    click(toggle());
    assert.equal(sidebar.hidden, false);
    assert.equal(toggle().closest('.tp-sidebar'), sidebar);
    click(f.root.querySelector('[data-tab=manualTab]'));
    click(toggle());
    assert.equal(toggle().closest('[hidden]'), null);
    assert.equal(f.root.querySelector<HTMLElement>('.tp-header-tools')!.hidden, true);
    assert.equal(f.root.querySelector<HTMLElement>('.tp-nav')!.hidden, true);
    assert.equal(JSON.stringify(f.plugin.settings), settings);
    f.plugin.settings.language = 'en';
    f.view.rebuild();
    assert.equal(toggle().getAttribute('aria-label'), words('en').expandMenu);
    click(toggle());
    assert.equal(toggle().getAttribute('aria-label'), words('en').collapseMenu);
  } finally {
    await f.close();
  }
});

test('UI description uses a translated document icon without a button and literal text opens from the title', async () => {
  const f = await fixture();
  try {
    const description = '<img src=x onerror=alert(1)>\n- Private detail';
    await f.plugin.service.createTask(
      draft({ description, plannedMinutes: 180, kind: 'meeting', priority: 'high' }),
    );
    for (const language of ['ru', 'en'] as const) {
      f.plugin.settings.language = language;
      f.view.rebuild();
      const indicator = f.root.querySelector<HTMLElement>('.tp-description-icon')!;
      assert.equal(indicator.textContent, '');
      assert.equal(indicator.tagName, 'SPAN');
      assert.equal(indicator.parentElement?.className, 'tp-task-heading');
      assert.ok(indicator.parentElement?.querySelector('.tp-kind-badge'));
      assert.ok(indicator.parentElement?.querySelector('.tp-priority'));
      assert.equal(
        f.root.querySelector('.tp-planned-minutes')?.textContent,
        language === 'ru' ? 'Оценка: 3 ч' : 'Estimate: 3 h',
      );
      assert.equal(indicator.title, words(language).description);
      assert.equal(indicator.querySelectorAll('svg').length, 1);
      assert.equal(f.root.querySelector('.tp-description-button'), null);
      assert.equal(indicator.getAttribute('aria-label'), words(language).description);
      assert.equal(f.root.querySelector('img'), null);
      click(indicator.closest('.tp-task')!.querySelector('.tp-task-title'));
      assert.equal(
        document.querySelector<HTMLTextAreaElement>('.tp-modal textarea.tp-description')?.value,
        description,
      );
      click(byText(document.querySelector('.tp-modal')!, words(language).cancel));
    }
  } finally {
    await f.close();
  }
});

test('UI line statistics retain zero dates, separate units and use independent series heights', async () => {
  const f = await fixture();
  try {
    for (const language of ['ru', 'en'] as const) {
      f.plugin.settings.language = language;
      f.view.rebuild();
      click(f.root.querySelector('[data-tab=statistics]'));
      for (const period of [7, 30, 90, 365]) {
        click(f.root.querySelector(`[data-period="${period}"]`));
        const total = f.root.querySelector('.tp-activity-totals')!;
        assert.equal(total.tagName, 'DL');
        assert.equal(total.querySelectorAll(':scope > div > dt').length, 3);
        assert.equal(total.querySelectorAll(':scope > div > dd').length, 3);
        const expected = periodBuckets(
          periodDates(day(), period as 7 | 30 | 90 | 365),
          period as 7 | 30 | 90 | 365,
        ).length;
        assert.equal(f.root.querySelectorAll('.tp-activity-chart').length, 1);
        assert.equal(f.root.querySelectorAll('.tp-activity-chart path.tp-chart-line').length, 2);
        assert.equal(
          f.root.querySelectorAll('.tp-activity-chart .tp-chart-point').length,
          expected * 2,
        );
        assert.equal(f.root.querySelectorAll('.tp-time-chart .tp-chart-point').length, expected);
        assert.equal(f.root.querySelectorAll('.tp-time-chart path.tp-chart-line').length, 1);
      }
    }
    const { fitChart } = await import('../src/ui/dashboard');
    const chart = document.createElement('div');
    f.root.append(chart);
    fitChart(
      chart,
      [{ start: 0, end: 1, from: day(), to: day(), values: [3, 3], title: 'Three of each' }],
      ['tp-chart-done', 'tp-chart-failed'],
      'tp-activity-chart',
      'Test',
      'dmy',
      'en-US',
      'line',
    );
    assert.deepEqual(
      [...chart.querySelectorAll('.tp-chart-point')].map((p) => p.getAttribute('cy')),
      ['57.5', '57.5'],
    );
    assert.equal(
      chart.querySelector('.tp-chart-point')!.getAttribute('aria-label'),
      'Three of each',
    );
  } finally {
    await f.close();
  }
});

test('UI folder rename and deletion refresh planner records without child file events', async () => {
  const f = await fixture();
  try {
    const task = await f.plugin.service.createTask(draft());
    await tick();
    for (const [path, record] of [...f.app.vault.files]) {
      if (path !== 'Planner' && !path.startsWith('Planner/')) continue;
      f.app.vault.files.delete(path);
      const moved = path.replace(/^Planner/, 'Archive');
      record.file.path = moved;
      f.app.vault.files.set(moved, record);
    }
    f.app.vault.emit('rename', new mock.TFolder('Archive'), 'Planner');
    await tick();
    await tick();
    assert.equal(f.plugin.repo.snapshot().tasks[0]?.path, task.path);
    assert.ok(task.path.startsWith('Archive/'));
    assert.equal(f.root.querySelectorAll('.tp-task').length, 1);
    for (const path of [...f.app.vault.files.keys()])
      if (path === 'Archive' || path.startsWith('Archive/')) f.app.vault.files.delete(path);
    f.app.vault.emit('delete', new mock.TFolder('Archive'));
    assert.equal(f.plugin.repo.snapshot().tasks.length, 0);
    assert.equal(f.root.querySelectorAll('.tp-task').length, 0);
  } finally {
    await f.close();
  }
});

test('UI completed work shows plan and recorded spent time in lists, calendar and boards', async () => {
  const f = await fixture();
  try {
    const both = await f.plugin.service.createTask(
      draft({ title: 'Compared work', status: 'done', plannedMinutes: 180, minutes: 135 }),
    );
    const noSpent = await f.plugin.service.createTask(
      draft({ title: 'No spent record', status: 'done', plannedMinutes: 90 }),
    );
    const noPlan = await f.plugin.service.createTask(
      draft({ title: 'No estimate', status: 'done', minutes: 50 }),
    );
    const recurring = await f.plugin.service.createTask(
      draft({
        title: 'Repeat duration',
        status: 'done',
        recurrence: 'FREQ=DAILY',
        plannedMinutes: 60,
        minutes: 75,
      }),
    );
    for (const language of ['ru', 'en'] as const) {
      f.plugin.settings.language = language;
      f.view.rebuild();
      for (const tab of ['today', 'calendar', 'kanban']) {
        click(f.root.querySelector(`[data-tab=${tab}]`));
        if (tab === 'calendar') click(f.root.querySelector('[data-calendar-view=day]'));
        const selectCard = (path: string) =>
          [...f.root.querySelectorAll<HTMLElement>('.tp-task,.tp-board-card')].find(
            (n) => n.dataset.path === path,
          )!;
        const card = selectCard(both.path);
        assert.equal(
          card.querySelector('.tp-planned-minutes')?.textContent,
          language === 'ru' ? 'План: 3 ч' : 'Plan: 3 h',
        );
        assert.equal(
          card.querySelector('.tp-actual-minutes')?.textContent,
          language === 'ru' ? 'Потрачено: 2 ч 15 мин' : 'Spent: 2 h 15 min',
        );
        assert.equal(selectCard(noSpent.path).querySelector('.tp-actual-minutes'), null);
        assert.equal(selectCard(noPlan.path).querySelector('.tp-planned-minutes'), null);
        assert.equal(
          selectCard(noPlan.path).querySelector('.tp-actual-minutes')?.textContent,
          language === 'ru' ? 'Потрачено: 50 мин' : 'Spent: 50 min',
        );
        assert.equal(
          selectCard(recurring.path).querySelector('.tp-actual-minutes')?.textContent,
          language === 'ru' ? 'Потрачено: 1 ч 15 мин' : 'Spent: 1 h 15 min',
        );
      }
    }
    const task = f.plugin.repo.snapshot().tasks.find((t) => t.path === both.path)!;
    await f.plugin.service.status(taskItem(task, day()), 'todo');
    click(f.root.querySelector('[data-tab=today]'));
    const open = [...f.root.querySelectorAll<HTMLElement>('.tp-task')].find(
      (n) => n.dataset.path === both.path,
    )!;
    assert.equal(open.querySelector('.tp-planned-minutes')?.textContent, 'Estimate: 3 h');
    assert.equal(f.plugin.repo.snapshot().tasks.find((t) => t.path === both.path)?.minutes, 135);
  } finally {
    await f.close();
  }
});

test('UI finance shows every currency with independent scales, daily values and planned-only empty states', async () => {
  const f = await fixture();
  try {
    for (const [code, amount, status] of [
      ['USD', 20, 'done'],
      ['AMD', 100000, 'done'],
      ['JPY', 0, 'done'],
      ['CAD', 40, 'todo'],
    ] as const) {
      await f.plugin.service.createTask(
        draft({
          title: `Currency ${code}`,
          kind: 'payment',
          status,
          amount,
          currency: code,
          scheduled: day(),
          paidOn: status === 'done' ? day() : undefined,
        }),
      );
    }
    const before = JSON.stringify(f.plugin.repo.snapshot());
    for (const language of ['ru', 'en'] as const) {
      f.plugin.settings.language = language;
      f.view.rebuild();
      click(f.root.querySelector('[data-tab=statistics]'));
      click(f.root.querySelector('[data-stats-mode=finance]'));
      assert.deepEqual(
        [...f.root.querySelectorAll<HTMLElement>('.tp-finance-currency')].map(
          (n) => n.dataset.currency,
        ),
        ['AMD', 'CAD', 'JPY', 'USD'],
      );
      const peaks: number[] = [];
      for (const [code, amount] of [
        ['AMD', 100000],
        ['USD', 20],
      ] as const) {
        const lane = f.root.querySelector(`.tp-finance-currency[data-currency="${code}"]`)!;
        const points = [...lane.querySelectorAll<SVGElement>('.tp-chart-point')];
        assert.equal(
          points.reduce((sum, n) => sum + Number(n.dataset.value), 0),
          amount,
        );
        peaks.push(
          Number(points.find((n) => Number(n.dataset.value) === amount)!.getAttribute('cy')),
        );
        assert.ok(lane.querySelector('h3')!.textContent === code);
      }
      assert.equal(peaks[0], peaks[1], 'Each currency uses its own monetary scale');
      assert.equal(
        f.root
          .querySelector('[data-currency="CAD"]')!
          .textContent!.includes(words(language).financeEmpty),
        true,
      );
      assert.equal(
        f.root
          .querySelector('[data-currency="JPY"]')!
          .textContent!.includes(words(language).financeEmpty),
        false,
      );
      const current = [...f.root.querySelectorAll('.tp-finance-daily-list > div')].find(
        (n) => n.firstElementChild!.textContent === formatDate(day()),
      )!;
      assert.equal(current.querySelectorAll('strong[data-currency]').length, 4);
      assert.ok(current.querySelector('[data-currency="AMD"]')!.textContent!.includes('AMD'));
      const paths = [...f.root.querySelectorAll('.tp-finance-chart path')].map((n) =>
        n.getAttribute('d'),
      );
      change(f.root.querySelector<HTMLSelectElement>('[data-finance-currency]')!, 'USD');
      assert.deepEqual(
        [...f.root.querySelectorAll('.tp-finance-chart path')].map((n) => n.getAttribute('d')),
        paths,
      );
      {
        const search = f.root.querySelector<HTMLInputElement>('.tp-filters input[type=search]')!;
        search.value = 'Currency USD';
        search.dispatchEvent(new window.Event('input', { bubbles: true }));
      }
      assert.equal(f.root.querySelectorAll('.tp-finance-currency').length, 1);
      {
        const search = f.root.querySelector<HTMLInputElement>('.tp-filters input[type=search]')!;
        search.value = 'No matching expense';
        search.dispatchEvent(new window.Event('input', { bubbles: true }));
      }
      assert.equal(f.root.querySelectorAll('.tp-finance-chart').length, 0);
      assert.ok(
        f.root
          .querySelector('.tp-finance-activity')!
          .textContent!.includes(words(language).financeEmpty),
      );
      {
        const search = f.root.querySelector<HTMLInputElement>('.tp-filters input[type=search]')!;
        search.value = '';
        search.dispatchEvent(new window.Event('input', { bubbles: true }));
      }
    }
    assert.equal(JSON.stringify(f.plugin.repo.snapshot()), before);
  } finally {
    await f.close();
  }
});

test('UI header date advances on the midnight repository refresh without rebuilding controls', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-07T12:00:00Z') });
  const f = await fixture();
  try {
    const header = f.root.querySelector<HTMLTimeElement>('.tp-header-date')!;
    const icon = header.querySelector('[aria-hidden=true]');
    const oldDay = day();
    t.mock.timers.tick(86400000);
    f.plugin.repo.emit();
    assert.notEqual(day(), oldDay);
    assert.equal(header.dateTime, day());
    assert.equal(header.textContent, formatDate(day()));
    assert.equal(header.getAttribute('aria-label'), `${words('ru').today}: ${formatDate(day())}`);
    assert.equal(header.querySelector('[aria-hidden=true]'), icon);
  } finally {
    await f.close();
  }
});

test('UI board drag highlight respects nodes from the owning window', async () => {
  const f = await fixture();
  const otherWindow = new (require('jsdom').JSDOM)('').window;
  const primaryNode = globalThis.Node;
  try {
    await f.plugin.service.createTask(draft());
    click(f.root.querySelector('[data-tab=kanban]'));
    const card = f.root.querySelector<HTMLElement>('.tp-board-card')!;
    const column = card.closest<HTMLElement>('.tp-board-column')!;
    const transfer = { setData() {}, effectAllowed: '', dropEffect: '' };
    dragEvent('dragstart', card, transfer);
    dragEvent('dragover', column, transfer);
    assert.ok(column.classList.contains('tp-board-drop'));
    globalThis.Node = otherWindow.Node;
    const leave = new f.dom.window.Event('dragleave', { bubbles: true });
    Object.defineProperty(leave, 'relatedTarget', { value: card });
    column.dispatchEvent(leave);
    assert.ok(column.classList.contains('tp-board-drop'));
    const outside = new f.dom.window.Event('dragleave', { bubbles: true });
    column.dispatchEvent(outside);
    assert.equal(column.classList.contains('tp-board-drop'), false);
  } finally {
    globalThis.Node = primaryNode;
    otherWindow.close();
    await f.close();
  }
});

test('UI Today board excludes old closed work with future deadlines and keeps history in All', async () => {
  const f = await fixture();
  try {
    const yesterday = addDays(day(), -1);
    const files = await Promise.all([
      f.plugin.service.createNote('task', 'Old completion', {
        status: 'done',
        scheduled: day(),
        completedDate: yesterday,
        due: addDays(day(), 60),
      }),
      f.plugin.service.createNote('task', 'Legacy completion', {
        status: 'done',
        scheduled: yesterday,
        due: addDays(day(), 60),
      }),
      f.plugin.service.createNote('task', 'Legacy failure', {
        status: 'failed',
        scheduled: yesterday,
        due: addDays(day(), 60),
      }),
      f.plugin.service.createNote('task', 'Completed today', {
        status: 'done',
        scheduled: yesterday,
        completedDate: day(),
        due: addDays(day(), 60),
      }),
      f.plugin.service.createNote('task', 'Open overdue', {
        status: 'todo',
        scheduled: yesterday,
      }),
    ]);
    const original = await Promise.all(files.map((file) => f.app.vault.read(file)));
    click(f.root.querySelector('[data-tab=kanban]'));
    change(f.root.querySelector<HTMLSelectElement>('[data-board-scope]')!, 'today');
    const titles = () =>
      [...f.root.querySelectorAll('.tp-board-title')].map((n) => n.textContent).sort();
    assert.deepEqual(titles(), ['Completed today', 'Open overdue']);
    change(f.root.querySelector<HTMLSelectElement>('[data-board-scope]')!, 'all');
    assert.equal(titles().length, 5);
    assert.deepEqual(await Promise.all(files.map((file) => f.app.vault.read(file))), original);
  } finally {
    await f.close();
  }
});
