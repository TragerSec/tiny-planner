import { ItemView, Notice, WorkspaceLeaf, setIcon } from 'obsidian';
import { Occurrence, Project, Task, Status, STATUSES, isActive } from '../core/model';
import {
  addDays,
  day,
  formatDate,
  parseDate,
  DateFormat,
  shiftMonth,
  calendarPeriod,
  utc,
} from '../core/dates';
import { isOverdue, sortItems, taskItem, todayItems } from '../core/selectors';
import { calendarItems, calendarDays, CalendarView, dayLoad, workDays } from '../core/calendar';
import { budgetReport } from '../core/budgets';
import { boardItems, boardWindow, BoardScope } from '../core/board';
import { monthlyCosts, paymentOn, nextPaymentDate } from '../core/subscriptions';
import { Expense, actualExpenses, expenseValue, financialAnalytics } from '../core/expenses';
import { financeDashboard, expenseHistory, FinanceState, money } from './finance';
import { recurrenceEnd } from '../core/recurrence';
import { analytics, isSeries, loggedMinutes } from '../core/analytics';
import { manual } from './manual';
import { dashboard, DashboardState, periodHeading } from './dashboard';
import {
  button,
  stabilizeButton,
  el,
  datedHeading,
  iconButton,
  input,
  select,
  dateInput,
  readDate,
  timeInput,
  readTime,
} from './dom';
import { words, Words, messageText } from './i18n';
import {
  DeleteModal,
  EntityModal,
  ImportModal,
  MoveModal,
  TaskModal,
  SubscriptionModal,
  ChargeModal,
} from './modals';
import type TinyPlanner from '../main';
export const VIEW_TYPE = 'tiny-planner-view';
type Tab =
  | 'today'
  | 'inbox'
  | 'upcoming'
  | 'calendar'
  | 'projects'
  | 'subscriptions'
  | 'statistics'
  | 'kanban'
  | 'manualTab';
interface Drag {
  item: Occurrence;
  source: HTMLElement;
}
export class PlannerView extends ItemView {
  private static nextLabelId = 0;
  private readonly navLabelId = `tp-navigation-${PlannerView.nextLabelId++}`;
  private tab: Tab = 'today';
  private boardScope: BoardScope = 'week';
  private expenseMode: 'payments' | 'subscriptions' = 'payments';
  private subscriptionScope = 'active';
  private hideCalendarDone = false;
  private hideCalendarRecurring = false;
  private sidebarCollapsed = false;
  private statsMode: 'business' | 'finance' = 'business';
  private financeState: FinanceState = { days: 30, currency: 'USD', limit: 40 };
  private query = '';
  private area = '';
  private project = '';
  private month = day().slice(0, 7) + '-01';
  private calendarView: CalendarView = 'month';
  private calendarFocus = day();
  private w: Words;
  private main!: HTMLElement;
  private shell!: HTMLElement;
  private stash!: HTMLElement;
  private undoButton!: HTMLButtonElement;
  private projectFilter!: HTMLSelectElement;
  private areaFilter!: HTMLSelectElement;
  private quickProject!: HTMLSelectElement;
  private quickStatus!: HTMLSelectElement;
  private unsubscribe?: () => void;
  private limits = new Map<string, number>();
  private projectOpen = new Map<string, boolean>();
  private dashboardState: DashboardState = { days: 30, page: 0, details: false };
  private drag?: Drag;
  private monthTimer?: ReturnType<typeof setTimeout>;
  private opened = false;
  private resizeObserver?: ResizeObserver;
  private quickDraft?: {
    title: string;
    project: string;
    date: string;
    scheduledTime: string;
    status: Status;
  };
  constructor(
    leaf: WorkspaceLeaf,
    readonly plugin: TinyPlanner,
  ) {
    super(leaf);
    this.w = words(plugin.settings.language);
  }
  getViewType(): string {
    return VIEW_TYPE;
  }
  getDisplayText(): string {
    return 'Tiny Planner';
  }
  getIcon(): string {
    return 'calendar-check';
  }
  async onOpen(): Promise<void> {
    this.opened = true;
    const Observer = this.contentEl.ownerDocument.defaultView?.ResizeObserver;
    if (Observer) {
      let previousWidth = 0;
      this.resizeObserver = new Observer((entries) => {
        const width = entries[0]?.contentRect.width;
        if (!width) return;
        this.contentEl.classList.toggle('tp-narrow', width <= 1050);
        this.contentEl.classList.toggle('tp-mobile', width <= 600);
        if (Math.abs(width - previousWidth) > 1) {
          previousWidth = width;
          if (this.tab === 'statistics') this.render();
        }
      });
      this.resizeObserver.observe(this.contentEl);
    }
    this.build();
    this.unsubscribe = this.plugin.repo.subscribe(() => {
      if (this.opened) {
        this.updateOptions();
        this.render();
      }
    });
  }
  async onClose(): Promise<void> {
    this.opened = false;
    this.unsubscribe?.();
    this.resizeObserver?.disconnect();
    this.cancelMonth();
    this.contentEl.replaceChildren();
  }
  rebuild(): void {
    if (this.opened) this.build();
  }
  private pretty(key: string): string {
    return formatDate(key, this.plugin.settings.dateFormat);
  }
  private duration(minutes: number): string {
    const hours = Math.floor(minutes / 60),
      rest = minutes % 60;
    return hours
      ? `${hours} ${this.w.hourUnit}${rest ? ` ${rest} ${this.w.minuteUnit}` : ''}`
      : `${rest} ${this.w.minuteUnit}`;
  }
  private taskTimes(parent: HTMLElement, item: Occurrence): void {
    const work = item.task.kind !== 'payment' && item.task.kind !== 'subscription';
    if (work && item.task.plannedMinutes)
      el(
        parent,
        'span',
        'tp-planned-minutes',
        `${item.status === 'done' ? this.w.taskPlan : this.w.estimate}: ${this.duration(item.task.plannedMinutes)}`,
      );
    if (item.minutes)
      el(
        parent,
        'span',
        'tp-actual-minutes',
        item.status === 'done' && work
          ? `${this.w.taskSpent}: ${this.duration(item.minutes)}`
          : `${item.minutes} ${this.w.minuteUnit}`,
      );
  }
  private locale(): string {
    return this.plugin.settings.language === 'ru' ? 'ru-RU' : 'en-US';
  }
  private perform(fn: () => Promise<unknown>): void {
    void fn().catch(
      (e) =>
        new Notice(
          messageText(e instanceof Error ? e.message : String(e), this.plugin.settings.language),
        ),
    );
  }
  private build(): void {
    const oldTitle = this.contentEl.querySelector<HTMLInputElement>('.tp-quick input[type=text]');
    if (oldTitle)
      this.quickDraft = oldTitle.value
        ? {
            title: oldTitle.value,
            scheduledTime:
              this.contentEl.querySelector<HTMLInputElement>('.tp-quick .tp-time')?.value || '',
            status: this.quickStatus.value as Status,
            project: this.quickProject.value,
            date: (() => {
              const input = this.contentEl.querySelector<HTMLInputElement>('.tp-quick .tp-date');
              return input
                ? parseDate(input.value, input.dataset.dateFormat as DateFormat) || input.value
                : '';
            })(),
          }
        : undefined;
    this.w = words(this.plugin.settings.language);
    this.contentEl.replaceChildren();
    this.contentEl.classList.add('tp-host');
    this.shell = el(this.contentEl, 'div', 'tp-shell');
    this.shell.classList.toggle('tp-sidebar-collapsed', this.sidebarCollapsed);
    const sidebar = el(this.shell, 'aside', 'tp-sidebar');
    sidebar.id = `${this.navLabelId}-sidebar`;
    const sidebarHead = el(sidebar, 'div', 'tp-sidebar-heading');
    const brand = el(sidebarHead, 'div', 'tp-brand', 'Tiny Planner');
    brand.id = this.navLabelId;
    const nav = el(sidebar, 'nav', 'tp-nav');
    nav.setAttribute('aria-labelledby', this.navLabelId);
    const icons: Record<Tab, string> = {
      today: 'sun',
      inbox: 'inbox',
      upcoming: 'list-todo',
      calendar: 'calendar-days',
      projects: 'folders',
      kanban: 'columns-3',
      subscriptions: 'credit-card',
      statistics: 'chart-no-axes-combined',
      manualTab: 'book-open',
    };
    const groups: [string, Tab[]][] = [
      [this.w.navPlan, ['inbox', 'today', 'upcoming', 'calendar']],
      [this.w.navOrganize, ['projects', 'kanban']],
      [this.w.navReview, ['subscriptions', 'statistics']],
      [this.w.navHelp, ['manualTab']],
    ];
    for (const [label, tabs] of groups) {
      const group = el(nav, 'div', 'tp-nav-group');
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', label);
      el(group, 'div', 'tp-nav-heading', label);
      for (const tab of tabs) {
        const b = button(
          group,
          '',
          () => {
            this.tab = tab;
            this.limits.clear();
            this.build();
          },
          'tp-nav-button',
        );
        const icon = el(b, 'span', 'tp-nav-icon');
        icon.setAttribute('aria-hidden', 'true');
        setIcon(icon, icons[tab]);
        el(b, 'span', '', this.w[tab]);
        b.dataset.tab = tab;
        b.setAttribute('aria-current', String(this.tab === tab));
      }
    }
    const bottom = el(sidebar, 'div', 'tp-sidebar-bottom');
    button(
      bottom,
      this.w.addArea,
      () => new EntityModal(this.plugin, 'area').open(),
      'tp-text-button',
    );
    button(
      bottom,
      this.w.addProject,
      () => new EntityModal(this.plugin, 'project').open(),
      'tp-text-button',
    );
    button(bottom, this.w.import, () => new ImportModal(this.plugin).open(), 'tp-text-button');
    const content = el(this.shell, 'div', 'tp-content');
    const header = el(content, 'header', 'tp-header');
    const menuToggle = iconButton(
      sidebarHead,
      'panel-left-close',
      this.w.collapseMenu,
      () => {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        this.shell.classList.toggle('tp-sidebar-collapsed', this.sidebarCollapsed);
        updateSidebar();
        updateMenuToggle();
        if (this.tab === 'statistics') this.render();
      },
      'tp-menu-toggle',
    );
    menuToggle.dataset.menuToggle = 'true';
    nav.id = `${sidebar.id}-navigation`;
    bottom.id = `${sidebar.id}-actions`;
    menuToggle.setAttribute('aria-controls', `${nav.id} ${bottom.id}`);
    const updateSidebar = () => {
      brand.hidden = this.sidebarCollapsed;
      nav.hidden = this.sidebarCollapsed;
      bottom.hidden = this.sidebarCollapsed;
    };
    updateSidebar();
    const updateMenuToggle = () => {
      const label = this.sidebarCollapsed ? this.w.expandMenu : this.w.collapseMenu;
      menuToggle.setAttribute('aria-label', label);
      menuToggle.setAttribute('aria-expanded', String(!this.sidebarCollapsed));
      menuToggle.title = label;
      menuToggle.replaceChildren();
      setIcon(menuToggle, this.sidebarCollapsed ? 'panel-left-open' : 'panel-left-close');
    };
    updateMenuToggle();
    const headings = el(header, 'div', 'tp-page-heading');
    el(headings, 'h1', '', this.w[this.tab]);
    const tools = el(header, 'div', 'tp-header-tools');
    tools.hidden = this.tab === 'manualTab';
    if (this.tab !== 'manualTab') {
      const date = el(tools, 'time', 'tp-header-date', this.pretty(day()));
      date.dateTime = day();
      date.setAttribute('aria-label', `${this.w.today}: ${this.pretty(day())}`);
      const icon = el(date, 'span');
      icon.setAttribute('aria-hidden', 'true');
      setIcon(icon, 'calendar-days');
      date.prepend(icon);
    }

    this.undoButton = iconButton(tools, 'undo-2', this.w.undo, () =>
      this.perform(() => this.plugin.service.undo()),
    );
    iconButton(tools, 'refresh-cw', this.w.refresh, () =>
      this.perform(() => this.plugin.repo.load()),
    );
    if (this.tab === 'subscriptions') {
      button(tools, this.w.addSubscription, () => {
        this.expenseMode = 'subscriptions';
        this.render();
        new SubscriptionModal(this.plugin).open();
      });
      button(
        tools,
        this.w.addPayment,
        () => {
          this.expenseMode = 'payments';
          this.render();
          new TaskModal(this.plugin, undefined, {
            kind: 'payment',
            status: 'done',
            scheduled: day(),
            project: this.project,
          }).open();
        },
        'mod-cta',
      );
    } else
      button(
        tools,
        this.w.add,
        () =>
          new TaskModal(this.plugin, undefined, {
            scheduled:
              this.tab === 'today' ||
              (this.tab === 'kanban' && !['all', 'undated'].includes(this.boardScope))
                ? day()
                : '',
            project: this.project,
          }).open(),
        'mod-cta',
      );
    const quick = el(content, 'form', 'tp-quick');
    quick.hidden = ['statistics', 'subscriptions', 'manualTab'].includes(this.tab);
    const title = input(quick, 'text', this.quickDraft?.title || '', this.w.quick);
    title.setAttribute('aria-label', this.w.title);
    title.maxLength = 1000;
    title.required = true;
    const quickOptions = el(quick, 'div', 'tp-quick-options');
    quickOptions.id = `${this.navLabelId}-quick-options`;
    quickOptions.hidden = true;
    this.quickProject = select(quickOptions, [['', this.w.noProject]], this.project);
    this.quickProject.setAttribute('aria-label', this.w.project);
    this.quickProject.addEventListener('change', () => this.projectTooltip());
    const date = dateInput(
      quick,
      this.quickDraft?.date ??
        (this.tab === 'today' ||
        (this.tab === 'kanban' && !['all', 'undated'].includes(this.boardScope))
          ? day()
          : ''),
      this.plugin.settings.dateFormat,
      this.plugin.settings.language,
    );
    date.setAttribute('aria-label', this.w.date);
    const appointment = timeInput(
      quickOptions,
      this.quickDraft?.scheduledTime || '',
      this.w.appointmentTime,
      this.plugin.settings.language,
    );
    this.quickStatus = select(
      quickOptions,
      STATUSES.map((s) => [s, this.w[s]]),
      this.quickDraft?.status ?? (date.value ? 'todo' : 'backlog'),
    );
    this.quickStatus.setAttribute('aria-label', this.w.status);
    const options = button(
      quick,
      this.w.quickOptions,
      () => {
        quickOptions.hidden = !quickOptions.hidden;
        options.setAttribute('aria-expanded', String(!quickOptions.hidden));
      },
      'tp-quick-toggle',
    );
    options.dataset.quickOptions = 'true';
    options.setAttribute('aria-expanded', 'false');
    options.setAttribute('aria-controls', quickOptions.id);
    const add = el(quick, 'button', 'tp-quick-add mod-cta', '+');
    add.type = 'submit';
    add.setAttribute('aria-label', this.w.add);
    iconButton(quick, 'sliders-horizontal', this.w.details, () =>
      this.perform(async () => {
        new TaskModal(this.plugin, undefined, {
          title: title.value,
          status: this.quickStatus.value as Status,
          project: this.quickProject.value,
          scheduled: readDate(date),
          scheduledTime: readTime(appointment),
        }).open();
      }),
    );
    quick.appendChild(quickOptions);
    if (this.quickDraft) {
      quickOptions.hidden = false;
      options.setAttribute('aria-expanded', 'true');
    }
    quick.addEventListener('submit', (e) => {
      e.preventDefault();
      if (add.disabled) return;
      add.disabled = true;
      this.perform(async () => {
        try {
          await this.plugin.service.createTask({
            title: title.value,
            status: this.quickStatus.value as Status,
            project: this.quickProject.value,
            scheduled: readDate(date),
            scheduledTime: readTime(appointment),
            due: '',
            recurrence: '',
            kind: 'task',
            minutes: 0,
            priority: 'normal',
          });
          title.value = '';
          appointment.value = '';
          new Notice(this.w.taskCreated);
          this.quickDraft = undefined;
          title.focus();
        } finally {
          add.disabled = false;
        }
      });
    });
    const filters = el(content, 'div', 'tp-filters');
    filters.hidden = this.tab === 'manualTab';
    const searchLabel = this.tab === 'subscriptions' ? this.w.searchSubscriptions : this.w.search;
    const search = input(filters, 'search', this.query, searchLabel);
    search.setAttribute('aria-label', searchLabel);
    search.addEventListener('input', () => {
      this.query = search.value;
      this.limits.clear();
      this.dashboardState.page = 0;
      this.render();
    });
    this.areaFilter = select(filters, [['', this.w.all]], this.area);
    this.areaFilter.setAttribute('aria-label', this.w.area);
    this.areaFilter.addEventListener('change', () => {
      this.area = this.areaFilter.value;
      this.limits.clear();
      this.project = '';
      this.dashboardState.page = 0;
      this.updateOptions();
      this.render();
    });
    this.projectFilter = select(filters, [['', this.w.allProjects]], this.project);
    this.projectFilter.setAttribute('aria-label', this.w.project);
    this.projectFilter.addEventListener('change', () => {
      this.project = this.projectFilter.value;
      this.limits.clear();
      this.dashboardState.page = 0;
      this.quickProject.value = this.project;
      this.projectTooltip();
      this.render();
    });
    iconButton(filters, 'filter-x', this.w.clear, () => {
      this.area = '';
      this.project = '';
      this.query = '';
      this.dashboardState.page = 0;
      this.build();
    });
    content.insertBefore(filters, quick);
    this.main = el(content, 'main', 'tp-main');
    this.stash = el(content, 'div', 'tp-drag-stash');
    this.stash.setAttribute('aria-hidden', 'true');
    this.updateOptions();
    if (
      this.quickDraft &&
      [...this.quickProject.options].some((o) => o.value === this.quickDraft!.project)
    )
      this.quickProject.value = this.quickDraft.project;
    this.projectTooltip();
    this.render();
  }
  private fill(s: HTMLSelectElement, options: [string, string][], value: string): void {
    s.replaceChildren();
    for (const [v, t] of options) {
      const o = el(s, 'option', '', t);
      o.value = v;
    }
    s.value = options.some((o) => o[0] === value) ? value : '';
  }
  private updateOptions(): void {
    const snap = this.plugin.repo.snapshot();
    if (this.area && !snap.areas.some((a) => a.path === this.area)) this.area = '';
    if (
      this.project &&
      !snap.projects.some((p) => p.path === this.project && (!this.area || p.area === this.area))
    )
      this.project = '';
    const projects = snap.projects
      .filter((p) => !this.area || p.area === this.area)
      .sort((a, b) => this.plugin.compareProjects(a, b));
    this.fill(
      this.areaFilter,
      [['', this.w.all], ...snap.areas.map((a) => [a.path, a.title] as [string, string])],
      this.area,
    );
    this.fill(
      this.projectFilter,
      [
        ['', this.w.allProjects],
        ...projects.map((p) => [p.path, this.plugin.projectLabel(p)] as [string, string]),
      ],
      this.project,
    );
    const value = this.quickProject.value || this.project;
    this.fill(
      this.quickProject,
      [
        ['', this.w.noProject],
        ...snap.projects
          .filter((p) => isActive(p.status) || p.path === value)
          .sort((a, b) => this.plugin.compareProjects(a, b))
          .map((p) => [p.path, this.plugin.projectLabel(p)] as [string, string]),
      ],
      value,
    );
    this.projectTooltip();
  }
  private projectTooltip(): void {
    this.quickProject.title = this.quickProject.value
      ? this.quickProject.selectedOptions[0]?.textContent || ''
      : this.w.inbox + ' · ' + this.w.noProject.toLocaleLowerCase();
  }
  private filtered(): Task[] {
    const snap = this.plugin.repo.snapshot();
    const projects = new Map(snap.projects.map((p) => [p.path, p]));
    const areas = new Map(snap.areas.map((a) => [a.path, a.title]));
    const q = this.query.trim().toLocaleLowerCase();
    return snap.tasks.filter((t) => {
      const p = projects.get(t.project);
      return (
        (!this.project || t.project === this.project) &&
        (!this.area || p?.area === this.area) &&
        (!q ||
          [t.title, t.description, p?.title, areas.get(p?.area || '')]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase()
            .includes(q))
      );
    });
  }
  private render(): void {
    if (!this.main) return;
    const scrollPositions: { node: HTMLElement; top: number; left: number }[] = [];
    for (let node: HTMLElement | null = this.main; node; node = node.parentElement)
      scrollPositions.push({ node, top: node.scrollTop, left: node.scrollLeft });
    // Retain the actual source node while switching month during an HTML drag.
    const retained = this.drag?.source.isConnected && this.main.contains(this.drag.source);
    if (retained) {
      for (const child of [...this.main.children]) {
        if (child.contains(this.drag!.source)) {
          // Keep only the source grid alive; period controls are rebuilt below.
          child.querySelector('.tp-calendar-toolbar')?.remove();
          child.classList.add('tp-calendar-retained');
          child.setAttribute('aria-hidden', 'true');
        } else child.remove();
      }
    }
    const focused = this.contentEl.ownerDocument.activeElement as HTMLElement | null;
    const focusedBoardPage = focused?.dataset.boardPage;
    const focusedCard = focused?.closest<HTMLElement>('.tp-board-card');
    const focusedRow = focused?.closest<HTMLElement>('.tp-task');
    const focusedLabel = focused?.getAttribute('aria-label');
    const focusedPeriod = this.main.contains(focused) ? focused?.dataset.period : undefined;
    const focusedPage = this.main.contains(focused) ? focused?.dataset.pageAction : undefined;
    const focusedDetails = focused?.matches('.tp-activity-details > summary');
    const activityDetails = this.main.querySelector<HTMLDetailsElement>('.tp-activity-details');
    if (activityDetails) this.dashboardState.details = activityDetails.open;
    const projectDetails = this.main.querySelector<HTMLDetailsElement>('.tp-project-details');
    if (projectDetails) this.dashboardState.projectDetails = projectDetails.open;
    const extraDetails = this.main.querySelector<HTMLDetailsElement>('.tp-stats-disclosure');
    if (extraDetails) this.dashboardState.extraDetails = extraDetails.open;
    for (const details of this.main.querySelectorAll<HTMLDetailsElement>('.tp-project'))
      this.projectOpen.set(details.dataset.path!, details.open);
    if (!retained) this.main.replaceChildren();
    this.undoButton.disabled = !this.plugin.service.canUndo;
    const records = this.filtered();
    const tasks = records.filter((t) => t.kind !== 'subscription');
    const today = day();
    const headerDate = this.contentEl.querySelector<HTMLTimeElement>('.tp-header-date');
    if (headerDate && headerDate.dateTime !== today) {
      headerDate.dateTime = today;
      headerDate.setAttribute('aria-label', `${this.w.today}: ${this.pretty(today)}`);
      headerDate.lastChild!.textContent = this.pretty(today);
    }
    if (this.tab === 'manualTab')
      manual(
        this.main,
        this.plugin.settings.language,
        this.plugin.manifest?.author || 'Tiny Planner contributors',
        this.plugin.manifest?.version || '',
      );
    if (this.tab === 'today') {
      const sections = todayItems(tasks, today, {
        overdue: this.limits.get('overdue') || 60,
        today: this.limits.get('today') || 60,
      });
      this.section(
        this.w.overdue,
        sections.overdue,
        'overdue',
        false,
        this.main,
        sections.counts.overdue,
      );
      this.section(this.w.today, sections.today, 'today', false, this.main, sections.counts.today);
      if (!sections.overdue.length && !sections.today.length) this.empty();
    }
    if (this.tab === 'inbox')
      this.section(
        '',
        sortItems(
          tasks
            .filter((t) => !t.project || !this.plugin.repo.project(t.project))
            .map((t) => taskItem(t, today)),
        ),
        'inbox',
        true,
      );
    if (this.tab === 'subscriptions') this.expenses(records);
    if (this.tab === 'upcoming') {
      for (let i = 0; i < 7; i++) {
        const d = addDays(today, i);
        const items = tasks.flatMap((t) => calendarItems(t, d, d));
        this.section(this.pretty(d), sortItems(items, true), d);
      }
      if (!this.main.childElementCount) this.empty();
    }
    if (this.tab === 'calendar')
      this.calendar(
        tasks,
        records.filter((t) => t.kind === 'subscription'),
      );
    if (this.tab === 'today') this.workloadPanel(tasks, [today]);
    if (this.tab === 'projects') this.projects(tasks);
    if (this.tab === 'kanban') this.board(tasks);
    if (this.tab === 'statistics') {
      const modes = el(this.main, 'div', 'tp-stat-modes');
      modes.setAttribute('role', 'group');
      modes.setAttribute('aria-label', this.w.statistics);
      for (const mode of ['business', 'finance'] as const) {
        const b = button(
          modes,
          mode === 'business' ? this.w.businessStats : this.w.financialStats,
          () => {
            this.statsMode = mode;
            this.render();
            this.main
              .querySelector<HTMLElement>(`[data-stats-mode=${mode}]`)
              ?.focus({ preventScroll: true });
          },
        );
        b.dataset.statsMode = mode;
        b.setAttribute('aria-pressed', String(this.statsMode === mode));
      }
      if (this.statsMode === 'finance') {
        financeDashboard(
          this.main,
          records,
          today,
          this.financeState,
          this.w,
          this.locale(),
          this.plugin.settings.dateFormat,
          () => this.refreshPeriod(this.financeState),
          (t) => this.expenseProject(t),
          () => {
            this.tab = 'subscriptions';
            this.expenseMode = 'payments';
            this.build();
          },
        );
        this.budgetPanel(records);
      }
      if (this.statsMode === 'business') {
        const snap = this.plugin.repo.snapshot();
        const matching = new Set(tasks.map((t) => t.project));
        const q = this.query.trim().toLocaleLowerCase();
        const projects = snap.projects
          .filter(
            (p) =>
              (!this.area || p.area === this.area) &&
              (!this.project || p.path === this.project) &&
              (!q ||
                matching.has(p.path) ||
                this.plugin.projectLabel(p).toLocaleLowerCase().includes(q)),
          )
          .sort((a, b) => a.title.localeCompare(b.title) || a.path.localeCompare(b.path));
        dashboard(
          this.main,
          analytics(
            tasks,
            projects,
            today,
            this.dashboardState.days,
            new Set(snap.projects.map((p) => p.path)),
          ),
          this.dashboardState,
          this.w,
          this.locale(),
          !!(q || this.area || this.project),
          () => this.refreshPeriod(this.dashboardState),
          (p) => new EntityModal(this.plugin, 'project', p).open(),
          (p) => this.plugin.projectLabel(p),
          this.plugin.settings.dateFormat,
        );
        const workload = el(this.main, 'details', 'tp-stats-disclosure tp-week-workload');
        el(workload, 'summary', '', this.w.workloadThisWeek);
        this.workloadPanel(
          tasks,
          Array.from({ length: 7 }, (_, i) => addDays(calendarPeriod(today, 7).from, i)),
        );
        const panel = this.main.querySelector('.tp-workload-panel');
        if (panel) workload.appendChild(panel);
      }
    }
    if (focusedRow && focusedLabel) {
      const replacement = [...this.main.querySelectorAll<HTMLElement>('.tp-task')].find(
        (r) =>
          r.dataset.path === focusedRow.dataset.path && r.dataset.key === focusedRow.dataset.key,
      );
      const target = [...(replacement?.querySelectorAll<HTMLButtonElement>('button') || [])].find(
        (b) => b.getAttribute('aria-label') === focusedLabel,
      );
      target?.focus({ preventScroll: true });
    }
    if (this.tab === 'kanban' && focusedBoardPage) {
      const pager = [...this.main.querySelectorAll<HTMLElement>('.tp-board-pager')].find(
        (n) => n.dataset.status === focusedBoardPage,
      );
      pager
        ?.querySelector<HTMLButtonElement>('button:not(:disabled)')
        ?.focus({ preventScroll: true });
    }
    if (this.tab === 'kanban' && focusedCard) {
      const card = [...this.main.querySelectorAll<HTMLElement>('.tp-board-card')].find(
        (n) =>
          n.dataset.path === focusedCard.dataset.path && n.dataset.key === focusedCard.dataset.key,
      );
      card
        ?.querySelector<HTMLElement>(focused?.tagName === 'SELECT' ? 'select' : 'button')
        ?.focus({ preventScroll: true });
    }
    if (this.tab === 'statistics') {
      let target: HTMLElement | null = null;
      if (focusedPeriod) target = this.main.querySelector(`[data-period="${focusedPeriod}"]`);
      if (focusedPage) target = this.main.querySelector(`[data-page-action="${focusedPage}"]`);
      if (focusedDetails) target = this.main.querySelector('.tp-activity-details > summary');
      if (
        target instanceof this.contentEl.ownerDocument.defaultView!.HTMLButtonElement &&
        target.disabled
      )
        target = this.main.querySelector('.tp-stats-pager button:not(:disabled)');
      target?.focus({ preventScroll: true });
    }
    const unsupported = tasks.filter((t) => t.unsupportedRepeat);
    if (unsupported.length) {
      const warning = el(this.main, 'div', 'tp-warning');
      el(warning, 'p', '', `${this.w.warnings}: ${unsupported.length}`);
      const key = 'unsupported';
      const limit = this.limits.get(key) || 12;
      for (const t of unsupported.slice(0, limit))
        button(
          warning,
          `${t.title}: ${messageText(t.unsupportedRepeat, this.plugin.settings.language)}`,
          () => this.plugin.openNote(t.path),
          'tp-text-button',
        );
      if (unsupported.length > limit)
        button(
          warning,
          `${this.w.showMore} (${unsupported.length - limit})`,
          () => {
            this.limits.set(key, limit + 12);
            this.render();
          },
          'tp-show-more',
        );
    }
    for (const { node, top, left } of scrollPositions) {
      node.scrollTop = top;
      node.scrollLeft = left;
    }
  }
  private workloadPanel(tasks: Task[], dates: string[]): void {
    const capacity = this.plugin.settings.dailyCapacityMinutes ?? 480;
    const loads = dates.map((d) => dayLoad(tasks, d, capacity));
    const panel = el(this.main, 'section', 'tp-workload-panel');
    const heading = el(panel, 'div', 'tp-workload-heading');
    el(heading, 'h2', '', this.w.workload);
    if (this.tab !== 'calendar' && dates.length > 1)
      el(
        heading,
        'span',
        'tp-muted tp-period-range',
        `${this.pretty(dates[0]!)} — ${this.pretty(dates.at(-1)!)}`,
      );
    const total = loads.reduce((n, d) => n + d.minutes, 0);
    const unestimated = new Set<string>();
    for (const task of tasks) {
      if (task.plannedMinutes || task.kind === 'payment' || task.kind === 'subscription') continue;
      for (const item of calendarItems(task, dates[0] || '', dates.at(-1) || '')) {
        if (isActive(item.status) && (item.calendarRole === 'work' || !workDays(task).length))
          unestimated.add(task.path + '\0' + (item.recurring ? item.key : ''));
      }
    }
    panel.dataset.plannedMinutes = String(total);
    panel.dataset.unestimatedTasks = String(unestimated.size);
    el(
      panel,
      'strong',
      '',
      total || !unestimated.size
        ? `${this.w.workloadPlanned}: ${this.duration(total)}`
        : this.w.workloadNoEstimates,
    );
    if (dates.length === 1)
      el(panel, 'span', 'tp-muted', `${this.w.workloadAvailable}: ${this.duration(capacity)}`);

    if (unestimated.size)
      el(panel, 'span', 'tp-muted', `${this.w.workloadUnknownTasks}: ${unestimated.size}`);
    const overloaded = loads.filter((d) => d.over).length;
    if (overloaded)
      el(panel, 'span', 'tp-load-over', `${this.w.workloadOverloadedDays}: ${overloaded}`);
    if (dates.length === 1 && total > 0) {
      const meter = el(panel, 'progress');
      meter.max = Math.max(1, capacity);
      meter.value = Math.min(total, meter.max);
      meter.setAttribute('aria-label', this.w.workload);
      meter.classList.toggle('tp-load-over', total > capacity);
    }
  }

  private budgetPanel(tasks: Task[]): void {
    const snap = this.plugin.repo.snapshot(),
      bounds = calendarPeriod(day(), this.financeState.days);
    const scopes = budgetReport(
      tasks,
      snap.projects.filter(
        (p) => (!this.project || p.path === this.project) && (!this.area || p.area === this.area),
      ),
      snap.areas.filter((a) => (!this.area || a.path === this.area) && !this.project),
      bounds.from,
      bounds.to,
    );
    const panel = el(this.main, 'section', 'tp-stats-panel tp-budget-panel');
    datedHeading(panel, this.w.budgets, `${this.pretty(bounds.from)} — ${this.pretty(bounds.to)}`);
    const configure = select(
      panel,
      [
        ['', this.w.editBudget],
        ...snap.areas.map(
          (a) => ['area:' + a.path, this.w.area + ' · ' + a.title] as [string, string],
        ),
        ...[...snap.projects]
          .sort((a, b) => this.plugin.compareProjects(a, b))
          .map(
            (p) =>
              ['project:' + p.path, this.w.project + ' · ' + this.plugin.projectLabel(p)] as [
                string,
                string,
              ],
          ),
      ],
      '',
    );
    configure.dataset.budgetConfigure = 'true';
    configure.setAttribute('aria-label', this.w.editBudget);
    configure.addEventListener('change', () => {
      const value = configure.value;
      const entity = value.startsWith('area:')
        ? snap.areas.find((a) => a.path === value.slice(5))
        : snap.projects.find((p) => p.path === value.slice(8));
      if (entity)
        new EntityModal(this.plugin, value.startsWith('area:') ? 'area' : 'project', entity).open();
      configure.value = '';
    });
    if (!scopes.length) el(panel, 'p', 'tp-muted', this.w.noBudgets);
    for (const data of scopes) {
      const row = el(panel, 'article', 'tp-budget-card');
      row.dataset.path = data.scope.path;
      const heading = el(row, 'div', 'tp-stats-heading');
      el(
        heading,
        'h3',
        '',
        data.scope.scope === 'project'
          ? this.plugin.projectLabel(data.scope as Project)
          : data.scope.title,
      );
      button(
        heading,
        this.w.editBudget,
        () => new EntityModal(this.plugin, data.scope.scope, data.scope).open(),
        'tp-text-button',
      );
      const values = el(row, 'dl', 'tp-budget-values');
      for (const [label, n] of [
        [this.w.budgetLimit, data.limit],
        [this.w.budgetSpent, data.spent],
        [this.w.budgetPlanned, data.forecast],
        [this.w.budgetRemaining, data.remaining],
        [this.w.budgetCommitted, data.committed],
      ] as [string, number][]) {
        el(values, 'dt', '', label);
        const value = el(values, 'dd', '', money(n, data.currency, this.locale()));
        if (n < 0) value.classList.add('tp-budget-over');
      }
      const meter = el(row, 'progress');
      meter.max = Math.max(1, data.limit);
      meter.value = Math.min(data.spent, meter.max);
      meter.setAttribute('aria-label', this.w.budgets + ' · ' + data.scope.title);
      meter.classList.toggle('tp-load-over', data.spent > data.limit);
      if (data.other.length)
        el(row, 'p', 'tp-warning', `${this.w.budgetOther}: ${data.other.join(', ')}`);
      if (data.unpriced) el(row, 'p', 'tp-warning', `${this.w.unpricedPayments}: ${data.unpriced}`);
    }
  }
  private expenseProject(task: Task): string {
    const project = this.plugin.repo.project(task.project);
    return project
      ? this.plugin.projectLabel(project)
      : task.project
        ? this.w.unresolved + ' · ' + task.project
        : this.w.noProject;
  }
  private editExpense(entry: Expense): void {
    if (entry.task.kind === 'subscription') new SubscriptionModal(this.plugin, entry.task).open();
    else new TaskModal(this.plugin, entry.item || taskItem(entry.task, day())).open();
  }
  private undoExpense(entry: Expense): void {
    if (entry.task.kind === 'subscription')
      this.perform(() => this.plugin.service.removeCharge(entry.task, entry.key));
    else if (entry.item) this.perform(() => this.plugin.service.status(entry.item!, 'todo'));
  }
  private refreshPeriod(state: { days: FinanceState['days'] }): void {
    this.dashboardState.days = this.financeState.days = state.days;
    this.render();
  }
  private expenses(records: Task[]): void {
    const sections = el(this.main, 'div', 'tp-expense-modes tp-stat-modes');
    sections.setAttribute('role', 'group');
    sections.setAttribute('aria-label', this.w.expenseSections);
    for (const mode of ['payments', 'subscriptions'] as const) {
      const choice = button(
        sections,
        mode === 'payments' ? this.w.payments : this.w.subscriptionsSection,
        () => {
          this.expenseMode = mode;
          this.render();
          this.main
            .querySelector<HTMLElement>(`[data-expense-mode=${mode}]`)
            ?.focus({ preventScroll: true });
        },
      );
      choice.dataset.expenseMode = mode;
      choice.setAttribute('aria-pressed', String(this.expenseMode === mode));
    }
    if (this.expenseMode === 'subscriptions') {
      this.subscriptions(records.filter((t) => t.kind === 'subscription'));
      return;
    }
    const data = financialAnalytics(records, day(), this.financeState.days);
    const range = `${this.pretty(data.from)} — ${this.pretty(data.to)}`;
    const header = periodHeading(
      this.main,
      this.w.payments,
      range,
      this.financeState,
      this.w,
      () => this.refreshPeriod(this.financeState),
      this.main,
    );
    const analyticsLink = button(
      header,
      this.w.expensesAnalytics,
      () => {
        this.tab = 'statistics';
        this.statsMode = 'finance';
        this.build();
      },
      'tp-text-button',
    );
    analyticsLink.dataset.expensesAnalytics = 'true';
    const ledger = el(this.main, 'div', 'tp-expense-ledger');
    const payments = records.filter((t) => t.kind === 'payment');
    const history = data.actual;
    expenseHistory(
      ledger,
      history,
      this.w,
      this.locale(),
      this.plugin.settings.dateFormat,
      (t) => this.expenseProject(t),
      (e) => this.editExpense(e),
      (e) => this.undoExpense(e),
      this.limits.get('expense-history') || 40,
      () => {
        this.limits.set('expense-history', (this.limits.get('expense-history') || 40) + 40);
        this.render();
      },
      range,
    );
    const plan = el(ledger, 'section', 'tp-finance-plan tp-stats-panel');
    datedHeading(plan, this.w.forecast, range);
    ledger.prepend(plan);
    const planList = el(plan, 'div', 'tp-task-list');
    for (const e of data.planned.slice(0, this.financeState.limit)) {
      if (e.item) {
        this.row(planList, e.item);
        continue;
      }
      const row = el(planList, 'div', 'tp-expense-record');
      button(row, e.task.title, () => this.editExpense(e), 'tp-text-button');
      el(row, 'span', 'tp-muted', `${this.pretty(e.date)} · ${this.expenseProject(e.task)}`);
      el(
        row,
        'strong',
        '',
        e.amount === null ? this.w.unpriced : money(e.amount, e.currency, this.locale()),
      );
    }
    if (!data.planned.length) el(plan, 'p', 'tp-muted', this.w.forecastEmpty);
    if (data.planned.length > this.financeState.limit)
      button(plan, this.w.showMore, () => {
        this.financeState.limit += 40;
        this.render();
      });
    const issues = el(this.main, 'details', 'tp-stats-disclosure tp-payment-issues');
    el(issues, 'summary', '', this.w.paymentIssues);
    const unresolved = boardItems(payments, day(), 'all').filter((i) => isActive(i.status));
    const overdue = unresolved.filter((i) => i.date && i.date < data.from);
    if (overdue.length)
      this.section(this.w.overduePayments, sortItems(overdue), 'expense-overdue', true, issues);
    const undated = unresolved.filter((i) => !i.date);
    if (undated.length)
      this.section(this.w.undatedPayments, undated, 'expense-undated', true, issues);
    const unknown = actualExpenses(records).filter((e) => !e.date);
    if (unknown.length) {
      const details = el(issues, 'details', 'tp-stats-disclosure');
      el(details, 'summary', '', `${this.w.undatedExpenses} · ${unknown.length}`);
      expenseHistory(
        details,
        unknown,
        this.w,
        this.locale(),
        this.plugin.settings.dateFormat,
        (t) => this.expenseProject(t),
        (e) => this.editExpense(e),
        (e) => this.undoExpense(e),
        this.financeState.limit,
        () => {
          this.financeState.limit += 40;
          this.render();
        },
      );
    }
    const other = boardItems(payments, day(), 'all').filter(
      (i) => !isActive(i.status) && i.status !== 'done',
    );
    if (other.length) this.section(this.w.paymentFailed, other, 'expense-failed', true, issues);
    if (!overdue.length && !undated.length && !unknown.length && !other.length) issues.remove();
  }
  private subscriptions(tasks: Task[]): void {
    const totals = monthlyCosts(tasks);
    const summary = el(this.main, 'section', 'tp-subscription-summary');
    const summaryHeading = el(summary, 'div', 'tp-subscription-summary-heading');
    el(summaryHeading, 'h2', '', this.w.monthlyEstimate);
    const totalList = el(summary, 'div', 'tp-subscription-totals');
    const money = (amount: number, currency: string) =>
      new Intl.NumberFormat(this.locale(), {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) +
      ' ' +
      currency;
    for (const [currency, amount] of totals)
      el(
        el(totalList, 'div', 'tp-subscription-cost'),
        'strong',
        'tp-cost-total',
        money(amount, currency),
      );
    if (!totals.size) el(totalList, 'p', 'tp-muted', '—');
    const unpriced = tasks.filter((t) => t.subscriptionActive && t.amount === null).length;
    if (unpriced) el(summary, 'small', 'tp-muted', `${this.w.unpriced}: ${unpriced}`);
    const scope = select(
      summaryHeading,
      [
        ['active', this.w.activeSubscription],
        ['cancelled', this.w.cancelledSubscription],
        ['all', this.w.allSubscriptions],
      ],
      this.subscriptionScope,
    );
    scope.setAttribute('aria-label', this.w.subscriptions);
    scope.addEventListener('change', () => {
      this.subscriptionScope = scope.value;
      this.limits.delete('subscriptions');
      this.render();
      this.main
        .querySelector<HTMLElement>('.tp-subscription-summary select')
        ?.focus({ preventScroll: true });
    });
    const matching = tasks
      .filter(
        (t) =>
          this.subscriptionScope === 'all' ||
          t.subscriptionActive === (this.subscriptionScope === 'active'),
      )
      .sort((a, b) => a.title.localeCompare(b.title));
    const size = 20,
      pages = Math.max(1, Math.ceil(matching.length / size));
    const page = Math.min(this.limits.get('subscriptions') || 0, pages - 1);
    this.limits.set('subscriptions', page);
    if (!matching.length)
      el(
        this.main,
        'p',
        'tp-empty',
        tasks.length ? this.w.subscriptionsNoMatch : this.w.subscriptionsEmpty,
      );
    const list = el(this.main, 'div', 'tp-subscription-list');
    for (const t of matching.slice(page * size, (page + 1) * size)) {
      const row = el(list, 'article', 'tp-subscription');
      row.dataset.active = String(t.subscriptionActive);
      row.dataset.path = t.path;
      const body = el(row, 'div', 'tp-task-body');
      const heading = el(body, 'div', 'tp-subscription-heading');
      button(heading, t.title, () => new SubscriptionModal(this.plugin, t).open(), 'tp-task-title');
      el(
        heading,
        'span',
        'tp-subscription-status',
        t.subscriptionActive ? this.w.activeSubscription : this.w.cancelledSubscription,
      );
      const meta = el(body, 'div', 'tp-task-meta');
      const nextPayment = nextPaymentDate(t, day());
      if (nextPayment) el(meta, 'span', '', this.w.paymentDate + ': ' + this.pretty(nextPayment));
      const project = this.plugin.repo.project(t.project);
      if (project) el(meta, 'span', '', this.plugin.projectLabel(project));
      const price = el(row, 'div', 'tp-subscription-price');
      el(price, 'strong', '', t.amount === null ? this.w.unpriced : money(t.amount, t.currency));
      if (t.amount !== null)
        el(
          price,
          'span',
          'tp-muted',
          '/ ' +
            (t.billingPeriod === 'yearly'
              ? this.w.billingYear
              : this.w.billingMonth
            ).toLocaleLowerCase(),
        );
      const actions = el(row, 'div', 'tp-subscription-actions');
      button(
        actions,
        this.w.recordCharge,
        () => new ChargeModal(this.plugin, t).open(),
        'tp-text-button',
      );
      const toggle = button(
        actions,
        t.subscriptionActive ? this.w.subscriptionCancelAction : this.w.subscriptionResumeAction,
        () => {
          toggle.disabled = true;
          this.perform(async () => {
            try {
              await this.plugin.service.subscriptionActive(t, !t.subscriptionActive);
            } finally {
              toggle.disabled = false;
            }
          });
        },
        'tp-subscription-toggle',
      );
      stabilizeButton(toggle, [this.w.subscriptionCancelAction, this.w.subscriptionResumeAction]);
      const toggleLabel = t.subscriptionActive
        ? this.w.cancelSubscription
        : this.w.resumeSubscription;
      toggle.setAttribute('aria-label', toggleLabel);
      toggle.title = toggleLabel;
      iconButton(actions, 'file-text', this.w.note, () => this.plugin.openNote(t.path));
      iconButton(actions, 'trash-2', this.w.remove, () =>
        new DeleteModal(this.plugin, {
          task: t,
          key: '',
          date: '',
          end: '',
          status: t.status,
          minutes: 0,
          recurring: false,
        }).open(),
      );
    }
    if (pages > 1) {
      const pager = el(this.main, 'div', 'tp-board-pager');
      const prev = button(pager, '←', () => {
        this.limits.set('subscriptions', page - 1);
        this.render();
      });
      prev.disabled = page === 0;
      prev.setAttribute('aria-label', this.w.previousPage);
      el(pager, 'span', '', `${page + 1} / ${pages}`);
      const next = button(pager, '→', () => {
        this.limits.set('subscriptions', page + 1);
        this.render();
      });
      next.disabled = page === pages - 1;
      next.setAttribute('aria-label', this.w.nextPage);
    }
  }
  private board(tasks: Task[]): void {
    const controls = el(this.main, 'div', 'tp-board-controls');
    const scope = select(
      controls,
      [
        ['today', this.w.today],
        ['week', this.w.week],
        ['month', this.w.month],
        ['all', this.w.allItems],
        ['undated', this.w.noDate],
      ],
      this.boardScope,
    );
    scope.dataset.boardScope = 'true';
    scope.setAttribute('aria-label', this.w.period);
    scope.addEventListener('change', () => {
      this.boardScope = scope.value as BoardScope;
      this.limits.clear();
      this.build();
      this.main.querySelector<HTMLElement>('[data-board-scope]')?.focus({ preventScroll: true });
    });
    const undated = tasks.filter((t) => !t.scheduled && !t.due).length;
    const noDate = button(controls, `${this.w.noDate} · ${undated}`, () => {
      this.boardScope = 'undated';
      this.limits.clear();
      this.build();
    });
    noDate.setAttribute('aria-pressed', String(this.boardScope === 'undated'));
    const itemsInScope = boardItems(tasks, day(), this.boardScope);
    el(controls, 'small', 'tp-muted', `${itemsInScope.length} / ${tasks.length}`);
    if (!['all', 'undated'].includes(this.boardScope)) {
      const range = boardWindow(this.boardScope, day());
      el(
        controls,
        'span',
        'tp-muted tp-period-range tp-board-range',
        `${this.pretty(range[0])} — ${this.pretty(range[1])}`,
      );
    }
    const board = el(this.main, 'div', 'tp-board');
    const groups = new Map<Status, Occurrence[]>(STATUSES.map((s) => [s, []]));
    for (const item of itemsInScope) groups.get(item.status)!.push(item);
    let dragged: Occurrence | undefined;
    const pageSize = 12;
    for (const status of STATUSES) {
      const items = groups.get(status)!;
      const column = el(board, 'section', 'tp-board-column');
      column.dataset.status = status;
      const heading = el(column, 'div', 'tp-board-heading');
      el(heading, 'h2', '', this.w[status]);
      el(heading, 'span', 'tp-muted', String(items.length));
      button(heading, '+', () =>
        new TaskModal(this.plugin, undefined, {
          project: this.project,
          status,
          scheduled: ['all', 'undated'].includes(this.boardScope) ? '' : day(),
        }).open(),
      ).setAttribute('aria-label', `${this.w.add} · ${this.w[status]}`);
      const key = 'board:' + status;
      const pages = Math.max(1, Math.ceil(items.length / pageSize));
      const page = Math.min(this.limits.get(key) || 0, pages - 1);
      this.limits.set(key, page);
      if (!items.length) el(column, 'p', 'tp-board-empty tp-muted', this.w.boardEmpty);
      for (const item of items.slice(page * pageSize, (page + 1) * pageSize)) {
        const card = el(column, 'article', 'tp-board-card tp-' + item.status);
        card.dataset.path = item.task.path;
        card.dataset.key = item.key;
        card.dataset.status = item.status;
        if (item.task.priority === 'high') card.classList.add('tp-high-priority');
        const heading = el(card, 'div', 'tp-task-heading');
        button(
          heading,
          item.task.title,
          () => new TaskModal(this.plugin, item).open(),
          'tp-board-title',
        );
        if (item.task.scheduledTime)
          el(card, 'strong', 'tp-appointment-time', item.task.scheduledTime);
        this.kindBadge(heading, item.task.kind);
        if (item.task.priority === 'high') this.priorityBadge(heading);
        const project = this.plugin.repo.project(item.task.project);
        if (project) el(card, 'small', 'tp-muted', this.plugin.projectLabel(project));
        if (item.task.kind === 'payment') {
          const value = expenseValue(item);
          el(
            card,
            'strong',
            'tp-payment-amount',
            value.amount === null
              ? this.w.unpriced
              : money(value.amount, value.currency, this.locale()),
          );
        }
        if (
          item.status === 'done' &&
          item.task.kind !== 'payment' &&
          (item.task.plannedMinutes || item.minutes)
        ) {
          const times = el(card, 'div', 'tp-task-meta tp-board-times');
          this.taskTimes(times, item);
        }
        if (item.task.description)
          el(card, 'p', 'tp-board-description', item.task.description.slice(0, 180));
        if (item.date)
          el(
            card,
            'small',
            isOverdue(item, day()) ? 'tp-overdue-label' : 'tp-muted',
            this.pretty(item.date) +
              (item.recurring ? ' · ↻' : '') +
              (isOverdue(item, day()) ? ' · ' + this.w.overdue : ''),
          );
        const until = recurrenceEnd(item.task.recurrence);
        if (until) el(card, 'small', 'tp-muted', `${this.w.repeatUntil}: ${this.pretty(until)}`);
        const exhausted = item.recurring && !item.key;
        if (exhausted) el(card, 'small', 'tp-muted', this.w.noOccurrence);
        const choice = select(
          card,
          STATUSES.map((s) => [
            s,
            item.task.kind === 'payment' && s === 'done'
              ? this.w.paymentDone
              : item.task.kind === 'payment' && s === 'failed'
                ? this.w.paymentFailed
                : this.w[s],
          ]),
          item.status,
        );
        choice.setAttribute('aria-label', `${this.w.status} · ${item.task.title}`);
        choice.disabled = exhausted;
        choice.addEventListener('change', () => {
          const next = choice.value as Status;
          choice.disabled = true;
          this.perform(async () => {
            try {
              await this.plugin.service.status(item, next);
            } finally {
              if (choice.isConnected) {
                choice.disabled = exhausted;
                choice.value = item.status;
              }
            }
          });
        });
        card.draggable = !exhausted;
        card.addEventListener('dragstart', (e) => {
          dragged = item;
          card.classList.add('tp-dragging');
          e.dataTransfer?.setData('text/plain', item.task.path);
          if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragend', () => {
          dragged = undefined;
          card.classList.remove('tp-dragging');
          board
            .querySelectorAll('.tp-board-drop')
            .forEach((n) => n.classList.remove('tp-board-drop'));
        });
      }
      column.addEventListener('dragover', (e) => {
        if (!dragged) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        column.classList.add('tp-board-drop');
      });
      column.addEventListener('dragleave', (e) => {
        if (
          !(e.relatedTarget instanceof column.ownerDocument.defaultView!.Node) ||
          !column.contains(e.relatedTarget)
        )
          column.classList.remove('tp-board-drop');
      });
      column.addEventListener('drop', (e) => {
        if (!dragged) return;
        e.preventDefault();
        const item = dragged;
        dragged = undefined;
        column.classList.remove('tp-board-drop');
        if (item.status !== status) this.perform(() => this.plugin.service.status(item, status));
      });
      if (pages > 1) {
        const pager = el(column, 'div', 'tp-board-pager');
        pager.dataset.status = status;
        const prev = button(pager, '←', () => {
          this.limits.set(key, page - 1);
          this.render();
        });
        prev.dataset.boardPage = status;
        prev.disabled = page === 0;
        prev.setAttribute('aria-label', `${this.w.boardPrev} · ${this.w[status]}`);
        el(pager, 'small', 'tp-muted', `${page + 1} / ${pages}`);
        const next = button(pager, '→', () => {
          this.limits.set(key, page + 1);
          this.render();
        });
        next.dataset.boardPage = status;
        next.disabled = page === pages - 1;
        next.setAttribute('aria-label', `${this.w.boardNext} · ${this.w[status]}`);
      }
    }
  }
  private kindBadge(parent: HTMLElement, kind: Task['kind']): void {
    if (!['meeting', 'payment', 'status'].includes(kind)) return;
    const badge = el(parent, 'span', 'tp-kind-badge');
    badge.dataset.kind = kind;
    badge.title = this.w[kind];
    badge.setAttribute('role', 'img');
    badge.setAttribute('aria-label', this.w[kind]);
    if (kind === 'payment') badge.textContent = '$';
    else setIcon(badge, kind === 'meeting' ? 'users-round' : 'flag');
  }
  private priorityBadge(parent: HTMLElement): void {
    const badge = el(parent, 'span', 'tp-priority', '!');
    badge.title = this.w.highPriority;
    badge.setAttribute('role', 'img');
    badge.setAttribute('aria-label', this.w.highPriority);
  }
  private empty(parent = this.main): void {
    el(parent, 'div', 'tp-empty', this.w.empty);
  }
  private section(
    label: string,
    items: Occurrence[],
    key: string,
    showEmpty = false,
    parent = this.main,
    total = items.length,
  ): void {
    if (!items.length) {
      if (showEmpty) this.empty(parent);
      return;
    }
    const section = el(parent, 'section', 'tp-section');
    if (label) {
      const head = el(section, 'div', 'tp-section-heading');
      el(head, 'h2', '', label);
      el(head, 'span', 'tp-count', String(total));
    }
    const limit = this.limits.get(key) || 60;
    const list = el(section, 'div', 'tp-task-list');
    for (const item of items.slice(0, limit)) this.row(list, item);
    if (total > limit)
      button(
        section,
        `${this.w.showMore} (${total - limit})`,
        () => {
          this.limits.set(key, limit + 60);
          this.render();
        },
        'tp-show-more',
      );
  }
  private row(parent: HTMLElement, item: Occurrence, compact = false): HTMLElement {
    const row = el(
      parent,
      'div',
      `tp-task tp-${item.status}${isOverdue(item, day()) ? ' tp-overdue' : ''}${compact ? ' tp-task-compact' : ''}`,
    );
    row.dataset.path = item.task.path;
    row.dataset.key = item.key;
    row.dataset.status = item.status;
    row.dataset.date = item.date;
    if (item.task.priority === 'high') row.classList.add('tp-high-priority');
    const payment = item.task.kind === 'payment';
    const completeLabel = payment
      ? item.status === 'done'
        ? this.w.removeCharge
        : item.status === 'failed'
          ? this.w.returnToPlan
          : this.w.recordCharge
      : this.w.complete;
    const statusLabel = payment
      ? item.status === 'done'
        ? this.w.paymentDone
        : item.status === 'failed'
          ? this.w.paymentFailed
          : this.w.pendingPayment
      : this.w[item.status];
    const check = iconButton(
      row,
      item.status === 'done' ? 'check' : item.status === 'failed' ? 'x' : 'circle',
      completeLabel,
      () =>
        this.perform(() =>
          this.plugin.service.status(item, isActive(item.status) ? 'done' : 'todo'),
        ),
      'tp-check',
    );
    check.setAttribute('role', 'checkbox');
    check.setAttribute('aria-checked', String(item.status === 'done'));
    const exhausted = item.recurring && !item.key;
    check.disabled = exhausted;
    const body = el(row, 'div', 'tp-task-body');
    const heading = el(body, 'div', 'tp-task-heading');
    const title = button(
      heading,
      item.task.title,
      () => new TaskModal(this.plugin, item).open(),
      'tp-task-title',
    );
    title.title = item.task.title;
    this.kindBadge(heading, item.task.kind);
    if (item.task.priority === 'high') this.priorityBadge(heading);
    if (item.task.description) {
      const details = el(heading, 'span', 'tp-description-icon');
      setIcon(details, 'file-text');
      details.title = this.w.description;
      details.setAttribute('role', 'img');
      details.setAttribute('aria-label', this.w.description);
    }
    const meta = el(body, 'div', 'tp-task-meta');
    if (item.task.scheduledTime) el(meta, 'strong', 'tp-appointment-time', item.task.scheduledTime);
    const project = this.plugin.repo.project(item.task.project);
    if (project) el(meta, 'span', 'tp-project-label', this.plugin.projectLabel(project));
    else if (item.task.project) el(meta, 'span', '', this.w.unresolved);
    if (project) title.title += '\n' + this.plugin.projectLabel(project);
    if (compact && (item.task.scheduledTime || item.task.project)) {
      const context = el(row, 'div', 'tp-task-context');
      for (const label of [...meta.children]) context.appendChild(label);
      row.insertBefore(context, check);
    }
    if (isOverdue(item, day())) el(meta, 'span', 'tp-overdue-label', this.w.overdue);
    if (!compact && item.date)
      el(
        meta,
        'span',
        '',
        this.pretty(item.date) +
          (item.end && item.end !== item.date ? ' → ' + this.pretty(item.end) : ''),
      );
    if (item.calendarRole === 'work' && item.task.due && item.date !== item.task.due)
      el(meta, 'span', 'tp-deadline-label', `${this.w.deadline}: ${this.pretty(item.task.due)}`);
    this.taskTimes(meta, item);
    if (item.recurring)
      el(
        meta,
        'span',
        '',
        item.task.seriesEnd || !isActive(item.task.status) ? '↻ ' + this.w.stopped : '↻',
      );
    const until = recurrenceEnd(item.task.recurrence);
    if (until && !compact)
      el(meta, 'span', 'tp-repeat-end-label', `${this.w.repeatUntil}: ${this.pretty(until)}`);
    if (exhausted) el(meta, 'span', '', this.w.noOccurrence);
    if (item.task.kind === 'payment') {
      const value = expenseValue(item);
      el(
        meta,
        'strong',
        'tp-payment-amount',
        value.amount === null
          ? this.w.unpriced
          : money(value.amount, value.currency, this.locale()),
      );
    }
    // Compact status lives in the checkbox tooltip/label and color accent.
    el(meta, 'span', 'tp-workflow-label' + (compact ? ' tp-visually-hidden' : ''), statusLabel);
    if (compact) check.title = `${statusLabel} · ${completeLabel}`;
    const actions = el(row, 'div', 'tp-task-actions');
    const fail = iconButton(
      actions,
      'circle-x',
      payment
        ? item.status === 'failed'
          ? this.w.returnToPlan
          : this.w.markPaymentFailed
        : this.w.fail,
      () =>
        this.perform(() =>
          this.plugin.service.status(item, item.status === 'failed' ? 'todo' : 'failed'),
        ),
      'tp-fail-button',
    );
    fail.disabled = exhausted;
    const move = iconButton(actions, 'calendar-days', this.w.reschedule, () =>
      new MoveModal(this.plugin, item).open(),
    );
    move.disabled = exhausted;
    if (!compact)
      iconButton(actions, 'file-text', this.w.note, () => this.plugin.openNote(item.task.path));
    iconButton(
      actions,
      'trash-2',
      this.w.remove,
      () => new DeleteModal(this.plugin, item).open(),
      'tp-delete-button',
    );
    row.draggable = !exhausted;
    row.addEventListener('dragstart', (e) => {
      this.drag = { item, source: row };
      e.dataTransfer?.setData(
        'application/x-tiny-planner',
        JSON.stringify({ path: item.task.path, key: item.key, date: item.date }),
      );
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
      row.classList.add('tp-dragging');
    });
    row.addEventListener('dragend', () => this.endDrag());
    return row;
  }
  private cancelMonth(): void {
    if (this.monthTimer) {
      clearTimeout(this.monthTimer);
      this.monthTimer = undefined;
    }
  }
  private endDrag(): void {
    this.cancelMonth();
    this.drag = undefined;
    this.stash.replaceChildren();
    this.main.querySelectorAll('.tp-calendar-retained').forEach((n) => n.remove());
    this.main
      .querySelectorAll('.tp-drop-target')
      .forEach((n) => n.classList.remove('tp-drop-target'));
  }
  private calendar(tasks: Task[], subscriptions: Task[]): void {
    const surface = el(this.main, 'section', 'tp-calendar-surface');
    const toolbar = el(surface, 'div', 'tp-calendar-toolbar');
    el(toolbar, 'span', 'tp-calendar-caption', this.w.calendar);
    const change = (amount: number) => {
      if (this.calendarView === 'month') {
        this.month = shiftMonth(this.month, amount);
        this.calendarFocus = this.month;
      } else {
        this.calendarFocus = addDays(
          this.calendarFocus,
          amount * (this.calendarView === 'week' ? 7 : 1),
        );
        this.month = this.calendarFocus.slice(0, 7) + '-01';
      }
      this.render();
    };
    const navigation = el(toolbar, 'div', 'tp-calendar-navigation');
    const previous = iconButton(navigation, 'chevron-left', this.w.previous, () => change(-1));
    const dates = calendarDays(this.calendarView, this.calendarFocus, this.month);
    const title =
      this.calendarView === 'month'
        ? new Intl.DateTimeFormat(this.locale(), {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          }).format(utc(this.month))
        : this.calendarView === 'day'
          ? this.pretty(this.calendarFocus)
          : `${this.pretty(dates[0]!)} — ${this.pretty(dates.at(-1)!)}`;
    el(navigation, 'h2', '', title);
    const next = iconButton(navigation, 'chevron-right', this.w.next, () => change(1));
    const current = button(
      toolbar,
      this.calendarView === 'month' ? this.w.thisMonth : this.w.currentPeriod,
      () => {
        this.calendarFocus = day();
        this.month = day().slice(0, 7) + '-01';
        this.render();
      },
    );
    stabilizeButton(current, [this.w.thisMonth, this.w.currentPeriod]);
    const controls = el(this.main, 'div', 'tp-calendar-controls');
    const views = el(controls, 'div', 'tp-calendar-views');
    views.setAttribute('role', 'group');
    views.setAttribute('aria-label', this.w.calendar);
    for (const [view, label] of [
      ['day', this.w.calendarDay],
      ['week', this.w.calendarWeek],
      ['month', this.w.calendarMonth],
    ] as const) {
      const b = button(views, label, () => {
        if (this.calendarFocus.slice(0, 7) !== this.month.slice(0, 7))
          this.calendarFocus = this.month;
        this.calendarView = view;
        this.render();
        this.main
          .querySelector<HTMLElement>(`[data-calendar-view=${view}]`)
          ?.focus({ preventScroll: true });
      });
      b.dataset.calendarView = view;
      b.setAttribute('aria-pressed', String(this.calendarView === view));
    }
    const visibility = el(controls, 'div', 'tp-calendar-visibility');
    const hide = button(
      visibility,
      this.hideCalendarDone ? this.w.showCompleted : this.w.hideCompleted,
      () => {
        this.hideCalendarDone = !this.hideCalendarDone;
        this.render();
        this.main
          .querySelector<HTMLElement>('[data-calendar-hide-done]')
          ?.focus({ preventScroll: true });
      },
    );
    stabilizeButton(hide, [this.w.hideCompleted, this.w.showCompleted]);
    hide.dataset.calendarHideDone = 'true';
    hide.setAttribute('aria-pressed', String(this.hideCalendarDone));
    const recurring = button(
      visibility,
      this.hideCalendarRecurring ? this.w.showRecurring : this.w.hideRecurring,
      () => {
        this.hideCalendarRecurring = !this.hideCalendarRecurring;
        this.render();
        this.main
          .querySelector<HTMLElement>('[data-calendar-hide-recurring]')
          ?.focus({ preventScroll: true });
      },
    );
    stabilizeButton(recurring, [this.w.hideRecurring, this.w.showRecurring]);
    recurring.dataset.calendarHideRecurring = 'true';
    recurring.setAttribute('aria-pressed', String(this.hideCalendarRecurring));
    for (const [target, amount] of [
      [previous, -1],
      [next, 1],
    ] as [HTMLElement, number][]) {
      target.addEventListener('dragover', (e) => {
        if (this.drag) {
          e.preventDefault();
          if (!this.monthTimer)
            this.monthTimer = setTimeout(() => {
              this.monthTimer = undefined;
              change(amount);
            }, 650);
        }
      });
      target.addEventListener('dragleave', () => this.cancelMonth());
    }
    this.workloadPanel(
      tasks,
      dates.filter(
        (d) => this.calendarView !== 'month' || d.slice(0, 7) === this.month.slice(0, 7),
      ),
    );
    const grouped = new Map(dates.map((d) => [d, [] as Occurrence[]]));
    for (const task of tasks.filter((t) => !this.hideCalendarRecurring || !t.recurrence))
      for (const item of calendarItems(task, dates[0]!, dates.at(-1)!)) {
        if (this.hideCalendarDone && item.status === 'done') continue;
        grouped.get(item.date)?.push(item);
      }
    const grid = el(this.main, 'div', `tp-calendar-grid tp-calendar-${this.calendarView}-view`);
    // Keep period navigation and its grid in one outlined calendar surface.
    surface.appendChild(grid);
    this.main.appendChild(surface);
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', this.w.calendar);
    for (let i = 0; i < (this.calendarView === 'day' ? 0 : 7); i++)
      el(
        grid,
        'div',
        'tp-weekday',
        new Intl.DateTimeFormat(this.locale(), { weekday: 'short', timeZone: 'UTC' }).format(
          utc(this.calendarView === 'day' ? this.calendarFocus : addDays('2026-09-28', i)),
        ),
      );
    const projects = this.plugin.repo
      .snapshot()
      .projects.filter(
        (p) =>
          isActive(p.status) &&
          (!this.area || p.area === this.area) &&
          (!this.project || p.path === this.project) &&
          (!this.query ||
            this.plugin
              .projectLabel(p)
              .toLocaleLowerCase()
              .includes(this.query.toLocaleLowerCase())),
      );
    for (const date of dates) {
      const cell = el(
        grid,
        'div',
        'tp-day' +
          (date.slice(0, 7) !== this.month.slice(0, 7) ? ' tp-outside' : '') +
          (date === day() ? ' tp-day-today' : ''),
      );
      cell.dataset.day = date;
      cell.setAttribute('role', 'group');
      cell.setAttribute('aria-label', date);
      const dateButton = button(
        cell,
        this.calendarView === 'day'
          ? new Intl.DateTimeFormat(this.locale(), {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              timeZone: 'UTC',
            }).format(utc(date))
          : String(Number(date.slice(8))),
        () =>
          new TaskModal(this.plugin, undefined, { scheduled: date, project: this.project }).open(),
        'tp-day-number',
      );
      dateButton.title = this.w.add + ' · ' + date;
      dateButton.setAttribute('aria-label', dateButton.title);
      const load = dayLoad(tasks, date, this.plugin.settings.dailyCapacityMinutes ?? 480);
      if (this.calendarView !== 'day' && (load.minutes || load.unestimated)) {
        const summary = el(
          cell,
          'div',
          'tp-day-load',
          [
            load.minutes ? `${load.minutes} ${this.w.minuteUnit}` : '',
            load.unestimated ? `${this.w.unestimated}: ${load.unestimated}` : '',
          ]
            .filter(Boolean)
            .join(' · '),
        );
        summary.classList.toggle('tp-load-over', load.over);
        if (load.unestimated) summary.title = `${this.w.unestimated}: ${load.unestimated}`;
      }
      const deadlines = projects.filter((p) => p.due === date);
      for (const project of deadlines)
        button(
          cell,
          project.title,
          () => new EntityModal(this.plugin, 'project', project).open(),
          'tp-calendar-project',
        );
      const rank = (status: Status) => (status === 'done' ? 0 : status === 'failed' ? 1 : 2);
      const items = sortItems(grouped.get(date)!, true).sort(
        (a, b) => rank(a.status) - rank(b.status),
      );
      for (const item of items.filter((i) => i.calendarRole !== 'deadline'))
        this.row(cell, item, true);
      const payments = subscriptions
        .filter((t) => paymentOn(t, date))
        .sort((a, b) => a.title.localeCompare(b.title) || a.path.localeCompare(b.path));
      if (payments.length) {
        const billing = el(cell, 'section', 'tp-calendar-billing');
        billing.setAttribute('aria-label', this.w.subscriptions);
        el(billing, 'h3', '', this.w.subscriptions);
        for (const t of payments) this.calendarPayment(billing, t, date);
      }
      cell.addEventListener('dragover', (e) => {
        if (this.drag) {
          e.preventDefault();
          this.cancelMonth();
          cell.classList.add('tp-drop-target');
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        }
      });
      cell.addEventListener('dragleave', (e) => {
        if (!cell.contains(e.relatedTarget as Node | null)) cell.classList.remove('tp-drop-target');
      });
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        const item = this.drag?.item;
        this.endDrag();
        if (item) this.perform(() => this.plugin.service.move(item, date));
      });
      const longTasks = items.filter((i) => i.calendarRole === 'deadline');
      for (const item of longTasks) {
        const row = this.row(cell, item, true);
        row.classList.add('tp-calendar-long-task', 'tp-calendar-deadline');
        row.classList.toggle('tp-calendar-long-first', item === longTasks[0]);
        row.dataset.from = item.date;
        row.dataset.to = item.end;
        const range = `${this.w.deadline}: ${this.pretty(item.task.due)}`;
        row.title = `${item.task.title} · ${range} · ${this.expenseProject(item.task)}`;
        row.querySelector<HTMLElement>('.tp-task-title')!.title = row.title;
        el(row.querySelector<HTMLElement>('.tp-task-meta')!, 'span', 'tp-range-dates', range);
      }
    }
  }
  private calendarPayment(parent: HTMLElement, task: Task, date: string): void {
    const payment = button(
      parent,
      '',
      () => new SubscriptionModal(this.plugin, task).open(),
      'tp-calendar-payment',
    );
    payment.dataset.path = task.path;
    el(payment, 'span', 'tp-payment-title', task.title);
    const amount =
      task.amount === null
        ? this.w.unpriced
        : new Intl.NumberFormat(this.locale(), {
            style: 'currency',
            currency: task.currency,
            currencyDisplay: 'code',
            maximumFractionDigits: 2,
          }).format(task.amount);
    el(payment, 'strong', '', amount);
    payment.title = `${task.title} · ${amount} · ${this.pretty(date)}`;
    payment.setAttribute('aria-label', payment.title);
  }
  private projects(tasks: Task[]): void {
    const snap = this.plugin.repo.snapshot();
    const groups = new Map<string, Project[]>();
    const byProject = new Map<string, Task[]>();
    for (const task of tasks) {
      const group = byProject.get(task.project) || [];
      group.push(task);
      byProject.set(task.project, group);
    }
    for (const project of snap.projects) {
      if (
        (this.area && project.area !== this.area) ||
        (this.project && project.path !== this.project)
      )
        continue;
      if (
        this.query &&
        !byProject.has(project.path) &&
        !this.plugin
          .projectLabel(project)
          .toLocaleLowerCase()
          .includes(this.query.toLocaleLowerCase())
      )
        continue;
      const g = groups.get(project.area) || [];
      g.push(project);
      groups.set(project.area, g);
    }
    const areaNames = new Map(snap.areas.map((a) => [a.path, a.title]));
    for (const area of snap.areas) {
      if (
        (!this.area || area.path === this.area) &&
        !groups.has(area.path) &&
        !this.query &&
        !this.project
      )
        groups.set(area.path, []);
    }
    for (const [area, projects] of groups) {
      const areaSection = el(this.main, 'section', 'tp-area');
      const heading = el(areaSection, 'div', 'tp-section-heading');
      el(heading, 'h2', '', areaNames.get(area) || this.w.noArea);
      const entity = snap.areas.find((a) => a.path === area);
      if (entity)
        iconButton(heading, 'pencil', this.w.editEntity, () =>
          new EntityModal(this.plugin, 'area', entity).open(),
        );
      if (!projects.length) el(areaSection, 'p', 'tp-muted', this.w.addProject);
      const sorted = projects.sort((a, b) => a.title.localeCompare(b.title));
      const groupKey = 'area:' + area;
      const groupLimit = this.limits.get(groupKey) || 30;
      for (const project of sorted.slice(0, groupLimit)) {
        const own = byProject.get(project.path) || [];
        const finite = own.filter((t) => !isSeries(t) && t.kind !== 'payment');
        const done = finite.filter((t) => t.status === 'done').length;
        const failed = finite.filter((t) => t.status === 'failed').length;
        const card = el(areaSection, 'details', 'tp-project');
        card.dataset.path = project.path;
        card.open = this.projectOpen.get(project.path) ?? this.project === project.path;
        const summary = el(card, 'summary', 'tp-project-summary');
        el(summary, 'strong', '', project.title);
        el(
          summary,
          'span',
          'tp-muted',
          `${done}/${finite.length} · ${this.w.failed}: ${failed} · ${this.w[project.status]}`,
        );
        const content = el(card, 'div', 'tp-project-content');
        const populate = () => {
          content.replaceChildren();
          if (!card.open) return;
          const tools = el(content, 'div', 'tp-project-tools');
          button(tools, this.w.add, () =>
            new TaskModal(this.plugin, undefined, { project: project.path }).open(),
          );
          button(tools, this.w.kanban, () => {
            this.project = project.path;
            this.tab = 'kanban';
            this.limits.clear();
            this.build();
          });
          iconButton(tools, 'pencil', this.w.editEntity, () =>
            new EntityModal(this.plugin, 'project', project).open(),
          );
          const minutes = own.reduce(
            (n, t) => Math.min(Number.MAX_SAFE_INTEGER, n + loggedMinutes(t)),
            0,
          );
          if (minutes) el(tools, 'small', 'tp-muted', `${minutes} ${this.w.minuteUnit}`);
          this.section(
            '',
            sortItems(own.map((t) => taskItem(t, day()))),
            project.path,
            true,
            content,
          );
        };
        populate();
        card.addEventListener('toggle', () => {
          if (!card.isConnected) return;
          this.projectOpen.set(project.path, card.open);
          populate();
        });
      }
      if (sorted.length > groupLimit)
        button(
          areaSection,
          `${this.w.showMore} (${sorted.length - groupLimit})`,
          () => {
            this.limits.set(groupKey, groupLimit + 30);
            this.render();
          },
          'tp-show-more',
        );
    }
    const projectPaths = new Set(snap.projects.map((p) => p.path));
    const inbox = tasks.filter((t) => !t.project || !projectPaths.has(t.project));
    if (inbox.length)
      this.section(this.w.inbox, sortItems(inbox.map((t) => taskItem(t, day()))), 'project-inbox');
    if (!this.main.childElementCount) this.empty();
  }
}
