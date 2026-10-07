import { App, TFile } from 'obsidian';
import { FM, link, strings, title, Resolution } from '../core/model';
import { day, dateKey } from '../core/dates';
import { normalizeTask } from '../core/normalize';
import { frontmatter, Repository } from './repository';
import { TaskService } from './tasks';
export interface ImportResult {
  tasks: number;
  projects: number;
  areas: number;
  warnings: string[];
  skipped: number;
}
export class LegacyImporter {
  private running = false;
  constructor(
    readonly app: App,
    readonly repo: Repository,
    readonly service: TaskService,
  ) {}
  async run(): Promise<ImportResult> {
    if (this.running) throw new Error('Import is already running.');
    this.running = true;
    try {
      return await this.execute();
    } finally {
      this.running = false;
    }
  }
  private async execute(): Promise<ImportResult> {
    const result: ImportResult = { tasks: 0, projects: 0, areas: 0, warnings: [], skipped: 0 };
    const data: { file: TFile; fm: FM; text: string }[] = [];
    const imported = new Map<string, string>();
    for (const file of this.app.vault.getMarkdownFiles()) {
      const text = await this.app.vault.cachedRead(file);
      const header = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || '';
      if (!/^(Tasks|Projects)\//i.test(file.path) && !header.includes('topLegacySource')) continue;
      const fm = frontmatter(text);
      if (fm.topLegacySource) imported.set(String(fm.topLegacySource), file.path);
      if (fm.topSchema || !/^(Tasks|Projects)\//i.test(file.path)) continue;
      const isProject = fm.type === 'project' || file.basename === '_project';
      const isTask =
        !isProject &&
        (fm.type === 'task' ||
          strings(fm.tags).some((t) => t.replace(/^#/, '') === 'task') ||
          fm.status !== undefined);
      if (isProject || isTask) data.push({ file, fm, text });
    }
    const areas = new Map(this.repo.snapshot().areas.map((a) => [a.title, a.path]));
    for (const entry of data.filter(
      (d) => d.fm.type === 'project' || d.file.basename === '_project',
    )) {
      if (imported.has(entry.file.path)) {
        result.skipped++;
        continue;
      }
      const name = String(entry.fm.area || entry.file.path.split('/')[1] || 'General');
      let area = areas.get(name);
      if (!area) {
        const f = await this.service.createNote('area', name, {});
        area = f.path;
        areas.set(name, area);
        result.areas++;
      }
      const fm = { ...entry.fm, area: `[[${area}]]`, topLegacySource: entry.file.path };
      const f = await this.service.createNote(
        'project',
        title(entry.fm, entry.file.path),
        fm,
        body(entry.text),
      );
      imported.set(entry.file.path, f.path);
      result.projects++;
    }
    for (const entry of data.filter(
      (d) => d.fm.type !== 'project' && d.file.basename !== '_project',
    )) {
      if (imported.has(entry.file.path)) {
        result.skipped++;
        continue;
      }
      const normalized = normalizeTask(entry.file.path, entry.fm);
      const raw = link(entry.fm.project ?? entry.fm.projects);
      const exact = raw.endsWith('.md') ? raw : raw + '.md';
      const resolved =
        imported.get(exact) ||
        imported.get(this.app.metadataCache.getFirstLinkpathDest(raw, entry.file.path)?.path || '');
      if (raw && !resolved)
        result.warnings.push(`Unresolved project: ${entry.file.path} → ${raw}. Assigned to inbox.`);
      if (strings(entry.fm.projects).length > 1)
        result.warnings.push(
          `Multiple projects: ${entry.file.path}. The first is active; all original links are retained in topLegacyProjects.`,
        );
      const scheduled =
        normalized.scheduled || (normalized.recurrence ? normalized.due || day() : '');
      if (normalized.recurrence && !normalized.scheduled)
        result.warnings.push(`Missing repeat start: ${entry.file.path}. Used ${scheduled}.`);
      if (normalized.unsupportedRepeat)
        result.warnings.push(
          `Check recurrence in ${entry.file.path}: ${normalized.unsupportedRepeat}`,
        );
      const occurrences: Record<string, Resolution> = structuredClone(normalized.occurrences);
      let historicMinutes = 0;
      for (const rawEntry of Array.isArray(entry.fm.timeEntries) ? entry.fm.timeEntries : []) {
        if (!rawEntry || typeof rawEntry !== 'object') continue;
        const time = rawEntry as FM;
        if (!time.endTime) {
          result.warnings.push(
            `Unfinished timer in ${entry.file.path}. Original entry retained; no duration invented.`,
          );
          continue;
        }
        const start = new Date(String(time.startTime)),
          end = new Date(String(time.endTime));
        const minutes = Math.round((end.valueOf() - start.valueOf()) / 60000);
        if (Number.isFinite(minutes) && minutes > 0) {
          if (normalized.recurrence) {
            const key = dateKey(time.startTime);
            if (key) {
              const record = occurrences[key] || { status: 'todo' as const };
              occurrences[key] = { ...record, minutes: (record.minutes || 0) + minutes };
            }
          } else historicMinutes += minutes;
        }
      }
      // Preserve unknown metadata and all note body text; originals stay untouched.
      const fm: FM = {
        ...entry.fm,
        status: normalized.status,
        project: resolved ? `[[${resolved}]]` : '',
        scheduled: scheduled || null,
        due: normalized.due || null,
        recurrence: normalized.recurrence || null,
        taskType: normalized.kind,
        topOccurrences: occurrences,
        topLegacySource: entry.file.path,
        topLegacyProjects: entry.fm.projects ?? null,
        actualMinutes: entry.fm.actualMinutes === undefined ? historicMinutes : normalized.minutes,
      };
      if (normalized.recurrence && fm.completedDate && normalized.status === 'todo')
        delete fm.completedDate;
      const f = await this.service.createNote('task', normalized.title, fm, body(entry.text));
      imported.set(entry.file.path, f.path);
      result.tasks++;
    }
    return result;
  }
}
function body(text: string): string {
  return text.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '').replace(/^\s*\n/, '');
}
