import { App, parseYaml, TFile } from 'obsidian';
import { Area, FM, Project, Snapshot, Task } from '../core/model';
import { normalizeArea, normalizeProject, normalizeTask } from '../core/normalize';
export function frontmatter(text: string): FM {
  const match = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return {};
  const data: unknown = parseYaml(match[1]!);
  return data && typeof data === 'object' && !Array.isArray(data) ? (data as FM) : {};
}
export class Repository {
  private tasks = new Map<string, Task>();
  private projects = new Map<string, Project>();
  private areas = new Map<string, Area>();
  private revisions = new Map<string, number>();
  private listeners = new Set<() => void>();
  private cached?: Snapshot;
  private projectIndex = new Map<string, Project>();
  private areaIndex = new Map<string, Area>();
  constructor(readonly app: App) {}
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit(): void {
    this.cached = undefined;
    for (const fn of this.listeners) fn();
  }
  snapshot(): Snapshot {
    if (this.cached) return this.cached;
    const projects = [...this.projects.values()];
    const areas = [...this.areas.values()];
    const index = (items: { path: string; title: string }[]) => {
      const paths = new Set(items.map((item) => item.path));
      const names = new Map<string, Set<string>>();
      for (const item of items)
        for (const name of new Set([
          item.title,
          item.path.split('/').pop()!.replace(/\.md$/, ''),
        ])) {
          const group = names.get(name) || new Set<string>();
          group.add(item.path);
          names.set(name, group);
        }
      return { paths, names };
    };
    const projectLookup = index(projects),
      areaLookup = index(areas);
    const resolve = (raw: string, source: string, lookup: ReturnType<typeof index>): string => {
      if (!raw) return '';
      const full = raw.endsWith('.md') ? raw : raw + '.md';
      if (lookup.paths.has(full)) return full;
      const aliases = lookup.names.get(raw);
      if (!raw.includes('/') && aliases && aliases.size > 1) return raw;
      const linked = this.app.metadataCache.getFirstLinkpathDest(raw, source);
      if (linked && lookup.paths.has(linked.path)) return linked.path;
      return aliases?.size === 1 ? [...aliases][0]! : raw;
    };
    this.cached = {
      tasks: [...this.tasks.values()].map((t) => ({
        ...t,
        project: resolve(t.project, t.path, projectLookup),
      })),
      projects: projects.map((p) => ({ ...p, area: resolve(p.area, p.path, areaLookup) })),
      areas,
    };
    this.projectIndex = new Map(this.cached.projects.map((p) => [p.path, p]));
    this.areaIndex = new Map(areas.map((a) => [a.path, a]));
    return this.cached;
  }
  project(path: string): Project | undefined {
    this.snapshot();
    return this.projectIndex.get(path);
  }
  areaTitle(path: string): string {
    this.snapshot();
    return this.areaIndex.get(path)?.title || '';
  }
  async load(): Promise<void> {
    // Read in bounded batches; metadata cache is not the authority after a write.
    const files = this.app.vault.getMarkdownFiles();
    const present = new Set(files.map((file) => file.path));
    for (const path of new Set([
      ...this.tasks.keys(),
      ...this.projects.keys(),
      ...this.areas.keys(),
    ]))
      if (!present.has(path)) this.remove(path, false);
    const errors: string[] = [];
    for (let i = 0; i < files.length; i += 24) {
      const results = await Promise.allSettled(
        files.slice(i, i + 24).map((f) => this.refresh(f, false)),
      );
      for (const result of results)
        if (result.status === 'rejected')
          errors.push(
            String(result.reason instanceof Error ? result.reason.message : result.reason),
          );
    }
    this.emit();
    if (errors.length) throw new Error(errors.join('\n'));
  }
  remove(path: string, emit = true, descendants = !path.endsWith('.md')): void {
    this.cached = undefined;
    // Folder events can arrive before (or without) individual child events.
    const paths = descendants
      ? new Set([
          path,
          ...this.revisions.keys(),
          ...this.tasks.keys(),
          ...this.projects.keys(),
          ...this.areas.keys(),
        ])
      : [path];
    for (const key of paths) {
      if (key !== path && !key.startsWith(path + '/')) continue;
      this.revisions.set(key, (this.revisions.get(key) || 0) + 1);
      this.tasks.delete(key);
      this.projects.delete(key);
      this.areas.delete(key);
    }
    if (emit) this.emit();
  }
  async refresh(file: TFile, emit = true): Promise<void> {
    const path = file.path;
    const rev = (this.revisions.get(path) || 0) + 1;
    this.revisions.set(path, rev);
    const text = await this.app.vault.read(file);
    const header = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || '';
    const had = this.tasks.has(path) || this.projects.has(path) || this.areas.has(path);
    if (!header.includes('topSchema') && !had) return;
    let fm: FM;
    try {
      fm = frontmatter(text);
    } catch (error) {
      if (this.revisions.get(path) !== rev) return;
      this.remove(path, emit);
      throw new Error(
        `Invalid planner metadata: ${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (this.revisions.get(path) !== rev) return;
    this.cached = undefined;
    this.tasks.delete(path);
    this.projects.delete(path);
    this.areas.delete(path);
    if (fm.topSchema !== undefined && Number(fm.topSchema) > 1) {
      if (emit) this.emit();
      throw new Error(`Unsupported future planner schema: ${path}`);
    }
    if (Number(fm.topSchema) === 1) {
      if (fm.type === 'task') this.tasks.set(path, normalizeTask(path, fm));
      if (fm.type === 'project') this.projects.set(path, normalizeProject(path, fm));
      if (fm.type === 'area') this.areas.set(path, normalizeArea(path, fm));
    }
    if (emit) this.emit();
  }
}
