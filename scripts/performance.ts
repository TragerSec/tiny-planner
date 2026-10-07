import { Repository } from '../src/services/repository';
import { normalizeTask } from '../src/core/normalize';
import { todayItems, taskItem } from '../src/core/selectors';
import { PlannerView } from '../src/ui/view';
import { TaskService } from '../src/services/tasks';
const fs = require('node:fs/promises');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const mock = require('../tests/mock-obsidian.cjs');
const today = new Date().toISOString().slice(0, 10);
const noteCount = 50000,
  taskCount = 5000,
  seriesCount = 500;
function task(i: number, recurring = false) {
  return normalizeTask(`Planner/Tasks/${i}.md`, {
    topSchema: 1,
    type: 'task',
    title: `Task ${i}`,
    status: 'open',
    scheduled: recurring ? '2024-10-03' : today,
    recurrence: recurring ? 'FREQ=DAILY' : '',
    project: `Planner/Projects/${i % 100}.md`,
  });
}
function median(v: number[]) {
  const x = [...v].sort((a, b) => a - b);
  return x.length % 2 ? x[Math.floor(x.length / 2)] : (x[x.length / 2 - 1] + x[x.length / 2]) / 2;
}
async function measure(fn: () => any, n = 3) {
  const times = [];
  let result;
  for (let i = 0; i < n; i++) {
    const start = performance.now();
    result = await fn();
    times.push(performance.now() - start);
  }
  return { medianMs: median(times), runsMs: times, result };
}
(async () => {
  await fs.mkdir('.perf-work', { recursive: true });
  const phase = process.argv[2] || 'run',
    mode = process.argv[3] || 'all';
  const output: any = {
    phase,
    environment: { node: process.version, platform: process.platform, arch: process.arch },
    today,
  };
  if (mode === 'all' || mode === 'load') {
    const dir = path.resolve('.perf-work/vault');
    await fs.mkdir(dir, { recursive: true });
    const app = mock.makeApp(),
      metadata = new Map();
    const body = 'Ordinary local note with no planner metadata.\n'.repeat(92);
    for (let i = 0; i < noteCount; i++) {
      const p = `${i}.md`,
        file = new mock.TFile(p);
      const planner = i < taskCount;
      const fm = planner
        ? { topSchema: 1, type: 'task', title: `Task ${i}`, status: 'open', scheduled: today }
        : {};
      const text = planner
        ? `---\ntopSchema: 1\ntype: task\ntitle: Task ${i}\nstatus: open\nscheduled: ${today}\n---\n` +
          body
        : body;
      app.vault.files.set(p, { file, text: '' });
      metadata.set(p, { frontmatter: fm });
      if (phase === 'before' || phase === 'run') await fs.writeFile(path.join(dir, p), text);
    }
    app.metadataCache.getFileCache = (file: any) => metadata.get(file.path);
    let reads = 0,
      bytes = 0;
    app.vault.read = async (file: any) => {
      reads++;
      const data = await fs.readFile(path.join(dir, file.path), 'utf8');
      bytes += Buffer.byteLength(data);
      return data;
    };
    const m = await measure(async () => {
      reads = 0;
      bytes = 0;
      const repo = new Repository(app);
      await repo.load();
      return { indexed: repo.snapshot().tasks.length, reads, bytes };
    });
    output.load = { notes: noteCount, plannerTasks: taskCount, ...m };
    console.log('load', JSON.stringify(output.load));
  }
  if (mode === 'all' || mode === 'selectors') {
    const tasks = Array.from({ length: seriesCount }, (_, i) => task(i, true));
    let m = await measure(() => {
      const r = todayItems(tasks, today);
      return { overdue: r.overdue.length, today: r.today.length };
    });
    output.today = { seriesCount, anchor: '2024-10-03', ...m };
    console.log('today', JSON.stringify(output.today));
    const bounded = await measure(() => {
      const r = todayItems(tasks, today, { overdue: 60, today: 60 });
      return { rows: r.overdue.length + r.today.length, counts: r.counts };
    });
    output.boundedToday = bounded;
    console.log('boundedToday', JSON.stringify(bounded));
    m = await measure(() => {
      const items = tasks.map((t) => taskItem(t, today));
      return { items: items.length, earliest: items[0]?.date };
    });
    output.representatives = { ...m };
    console.log('representatives', JSON.stringify(m));
  }
  if (mode === 'all' || mode === 'dom') {
    const dom = mock.makeDOM(),
      app = mock.makeApp(),
      repo = new Repository(app);
    const tasks = Array.from({ length: 5000 }, (_, i) => task(i));
    // Populate the repository directly: DOM timings exclude disk reads/YAML parsing.
    (repo as any).tasks = new Map(tasks.map((t) => [t.path, t]));
    (repo as any).projects = new Map(
      Array.from({ length: 100 }, (_, i) => {
        const p = {
          path: `Planner/Projects/${i}.md`,
          title: `Project ${i}`,
          area: '',
          status: 'active',
          due: '',
        };
        return [p.path, p];
      }),
    );
    const plugin: any = {
      settings: { language: 'ru', folder: 'Planner' },
      repo,
      service: new TaskService(app, repo, () => 'Planner'),
      projectLabel: (p: any) => p.title,
      compareProjects: (a: any, b: any) => a.title.localeCompare(b.title),
      openNote: () => {},
      app,
    };
    const view = new PlannerView({ app } as any, plugin);
    await view.onOpen();
    for (const tab of ['today', 'calendar', 'projects']) {
      (view as any).tab = tab;
      const m = await measure(() => {
        (view as any).build();
        return {
          rows: view.contentEl.querySelectorAll('.tp-task').length,
          nodes: view.contentEl.querySelectorAll('*').length,
        };
      }, 2);
      output[tab + 'DOM'] = { tasks: 5000, projects: 100, ...m };
      console.log(tab + 'DOM', JSON.stringify(m));
    }
    await view.onClose();
    dom.window.close();
  }
  output.peakRSSMiB = process.resourceUsage().maxRSS / 1024;
  await fs.writeFile(`.perf-work/perf-${phase}-${mode}.json`, JSON.stringify(output, null, 2));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
