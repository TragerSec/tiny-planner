import { Plugin, PluginSettingTab, Setting, Notice, TFile, TFolder, normalizePath } from 'obsidian';
import { Repository } from './services/repository';
import { TaskService } from './services/tasks';
import { LegacyImporter } from './services/importer';
import { PlannerView, VIEW_TYPE } from './ui/view';
import { TaskModal, ImportModal, SubscriptionModal } from './ui/modals';
import { DateFormat } from './core/dates';
import { Project } from './core/model';
import { words, messageText } from './ui/i18n';
export interface PlannerSettings {
  folder: string;
  language: 'ru' | 'en';
  dateFormat: DateFormat;
  dailyCapacityMinutes?: number;
}
export default class TinyPlanner extends Plugin {
  settings: PlannerSettings = {
    folder: 'Planner',
    language: 'ru',
    dateFormat: 'dmy',
    dailyCapacityMinutes: 480,
  };
  repo!: Repository;
  service!: TaskService;
  importer!: LegacyImporter;
  async onload(): Promise<void> {
    const saved = await this.loadData();
    this.settings = {
      folder: typeof saved?.folder === 'string' ? saved.folder : 'Planner',
      language: saved?.language === 'en' ? 'en' : 'ru',
      dailyCapacityMinutes: Number.isFinite(saved?.dailyCapacityMinutes)
        ? Math.min(1440, Math.max(0, Math.round(saved.dailyCapacityMinutes)))
        : 480,
      dateFormat: ['dmy', 'mdy', 'iso'].includes(saved?.dateFormat) ? saved.dateFormat : 'dmy',
    };
    this.repo = new Repository(this.app);
    this.service = new TaskService(this.app, this.repo, () => this.settings.folder);
    this.importer = new LegacyImporter(this.app, this.repo, this.service);
    this.registerView(VIEW_TYPE, (leaf) => new PlannerView(leaf, this));
    this.addRibbonIcon('calendar-check', 'Tiny Planner', () => void this.open());
    this.registerCommands();
    this.addSettingTab(new PlannerSettingsTab(this));
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (file instanceof TFile && file.extension === 'md')
          void this.repo.refresh(file).catch((e) => this.error(e));
      }),
    );
    this.registerEvent(
      this.app.vault.on('create', (file) => {
        if (file instanceof TFile && file.extension === 'md')
          void this.repo.refresh(file).catch((e) => this.error(e));
      }),
    );
    this.registerEvent(
      this.app.vault.on('delete', (file) =>
        this.repo.remove(file.path, true, file instanceof TFolder),
      ),
    );
    this.registerEvent(
      this.app.vault.on('rename', (file, old) => {
        this.repo.remove(old, true, file instanceof TFolder);
        if (file instanceof TFile && file.extension === 'md')
          void this.repo.refresh(file).catch((e) => this.error(e));
        else if (file instanceof TFolder) void this.repo.load().catch((e) => this.error(e));
      }),
    );
    this.app.workspace.onLayoutReady(() => void this.repo.load().catch((e) => this.error(e)));
    // Midnight and resume-from-sleep refresh without task trackers or timers in data.
    let today = new Date().toDateString();
    this.registerInterval(
      window.setInterval(() => {
        const now = new Date().toDateString();
        if (now !== today) {
          today = now;
          this.repo.emit();
        }
      }, 30000),
    );
  }
  private commandsRegistered = false;
  registerCommands(): void {
    const w = words(this.settings.language);
    const commands = [
      { id: 'open-planner', name: w.openPlanner, callback: () => void this.open() },
      { id: 'quick-add-task', name: w.add, callback: () => new TaskModal(this).open() },
      {
        id: 'add-subscription',
        name: w.addSubscription,
        callback: () => new SubscriptionModal(this).open(),
      },
      { id: 'import-legacy', name: w.import, callback: () => new ImportModal(this).open() },
      {
        id: 'undo-last-change',
        name: w.undoCommand,
        callback: () => void this.service.undo().catch((e) => this.error(e)),
      },
    ];
    for (const command of commands) {
      if (this.commandsRegistered) this.removeCommand(command.id);
      this.addCommand(command);
    }
    this.commandsRegistered = true;
  }
  onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }
  error(e: unknown): void {
    console.error('[Tiny Planner]', e);
    new Notice(messageText(e instanceof Error ? e.message : String(e), this.settings.language));
  }
  async open(): Promise<void> {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }
  openNote(path: string): void {
    void this.app.workspace.openLinkText(path, '', false).catch((e) => this.error(e));
  }
  compareProjects(a: Project, b: Project): number {
    return (
      this.projectLabel(a).localeCompare(this.projectLabel(b), this.settings.language, {
        numeric: true,
        sensitivity: 'base',
      }) || a.path.localeCompare(b.path)
    );
  }
  projectLabel(p: Project): string {
    const area = this.repo.areaTitle(p.area);
    return area ? `${area} / ${p.title}` : p.title;
  }
}
class PlannerSettingsTab extends PluginSettingTab {
  constructor(readonly planner: TinyPlanner) {
    super(planner.app, planner);
  }
  display(): void {
    const w = words(this.planner.settings.language);
    this.containerEl.replaceChildren();
    new Setting(this.containerEl)
      .setName(w.folder)
      .setDesc(w.folderHelp)
      .addText((text) =>
        text.setValue(this.planner.settings.folder).onChange(async (value) => {
          const path = normalizePath(value.trim());
          if (
            !path ||
            path.startsWith('/') ||
            path.split('/').some((p) => p === '..' || p.startsWith('.'))
          )
            return;
          this.planner.settings.folder = path;
          await this.planner.saveData(this.planner.settings);
        }),
      );
    new Setting(this.containerEl).setName(w.language).addDropdown((d) =>
      d
        .addOptions({ ru: 'Русский', en: 'English' })
        .setValue(this.planner.settings.language)
        .onChange(async (value) => {
          this.planner.settings.language = value === 'en' ? 'en' : 'ru';
          this.planner.registerCommands();
          await this.planner.saveData(this.planner.settings);
          for (const leaf of this.planner.app.workspace.getLeavesOfType(VIEW_TYPE))
            if (leaf.view instanceof PlannerView) leaf.view.rebuild();
          this.display();
        }),
    );
    new Setting(this.containerEl)
      .setName(w.dateFormat)
      .setDesc(w.dateFormatHelp)
      .addDropdown((d) =>
        d
          .addOptions({ dmy: 'DD.MM.YYYY', mdy: 'MM/DD/YYYY', iso: 'YYYY-MM-DD' })
          .setValue(this.planner.settings.dateFormat)
          .onChange(async (value) => {
            if (!['dmy', 'mdy', 'iso'].includes(value)) return;
            this.planner.settings.dateFormat = value as DateFormat;
            await this.planner.saveData(this.planner.settings);
            for (const leaf of this.planner.app.workspace.getLeavesOfType(VIEW_TYPE))
              if (leaf.view instanceof PlannerView) leaf.view.rebuild();
          }),
      );
    new Setting(this.containerEl).setName(w.capacity).addText((text) =>
      text
        .setValue(String(this.planner.settings.dailyCapacityMinutes ?? 480))
        .onChange(async (value) => {
          const n = Number(value);
          if (!value.trim() || !Number.isFinite(n) || n < 0 || n > 1440) return;
          this.planner.settings.dailyCapacityMinutes = Math.round(n);
          await this.planner.saveData(this.planner.settings);
          for (const leaf of this.planner.app.workspace.getLeavesOfType(VIEW_TYPE))
            if (leaf.view instanceof PlannerView) leaf.view.rebuild();
        }),
    );
    new Setting(this.containerEl)
      .setName(w.import)
      .setDesc(w.importText)
      .addButton((b) =>
        b.setButtonText(w.importStart).onClick(() => new ImportModal(this.planner).open()),
      );
  }
}
