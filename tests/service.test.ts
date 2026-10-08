import test from 'node:test';
import assert from 'node:assert/strict';
import { Repository, frontmatter } from '../src/services/repository';
import { TaskService, TaskDraft } from '../src/services/tasks';
import { LegacyImporter } from '../src/services/importer';
import { day, addDays } from '../src/core/dates';
import { expand, taskItem } from '../src/core/selectors';
import type { App } from 'obsidian';
const mock = require('../tests/mock-obsidian.cjs');
const draft = (v: Partial<TaskDraft> = {}): TaskDraft => ({
  title: 'Example',
  scheduled: '2026-10-02',
  due: '',
  project: '',
  kind: 'task',
  recurrence: '',
  minutes: 0,
  priority: 'normal',
  ...v,
});
function fixture() {
  const app = mock.makeApp() as App;
  const repo = new Repository(app);
  const service = new TaskService(app, repo, () => 'Planner');
  return { app, repo, service, importer: new LegacyImporter(app, repo, service) };
}
async function put(
  app: App,
  path: string,
  data: Record<string, unknown>,
  body = '\n# Original body\n',
) {
  return app.vault.create(path, '---\n' + mock.stringifyYaml(data) + '---\n' + body);
}
test('native task creation has schema/type, unique safe filenames and no dependency', async () => {
  const { app, repo, service } = fixture();
  const a = await service.createTask(draft({ title: 'A:/ title [[x]]' }));
  const b = await service.createTask(draft({ title: 'A:/ title [[x]]' }));
  assert.notEqual(a.path, b.path);
  assert.ok(a.path.startsWith('Planner/Tasks/'));
  assert.equal(repo.snapshot().tasks.length, 2);
  const fm = frontmatter(await app.vault.read(a));
  assert.equal(fm.type, 'task');
  assert.equal(fm.topSchema, 1);
  assert.equal(fm.title, 'A:/ title [[x]]');
});
test('completion/reopen/failure remove stale terminal metadata', async () => {
  const { app, repo, service } = fixture();
  const f = await service.createTask(draft());
  const item = taskItem(repo.snapshot().tasks[0]!, '2026-10-02');
  await service.status(item, 'done');
  assert.equal(repo.snapshot().tasks[0]?.status, 'done');
  await service.status(item, 'todo');
  assert.equal(repo.snapshot().tasks[0]?.status, 'todo');
  assert.equal(frontmatter(await app.vault.read(f)).completedDate, undefined);
  await service.status(item, 'failed');
  const fm = frontmatter(await app.vault.read(f));
  assert.equal(fm.status, 'failed');
  assert.ok(fm.failedDate);
  assert.equal(fm.completedDate, undefined);
});
test('series completion and manually entered minutes survive reload', async () => {
  const { app, repo, service } = fixture();
  await service.createTask(draft({ recurrence: 'FREQ=DAILY' }));
  const item = expand(repo.snapshot().tasks[0]!, '2026-10-02', '2026-10-02')[0]!;
  await service.status(item, 'done');
  await service.minutes(item, 17);
  const next = new Repository(app);
  await next.load();
  const t = next.snapshot().tasks[0]!;
  assert.equal(t.status, 'todo');
  assert.equal(expand(t, '2026-10-02', '2026-10-03')[0]?.status, 'done');
  assert.equal(expand(t, '2026-10-02', '2026-10-03')[0]?.minutes, 17);
  assert.equal(expand(t, '2026-10-02', '2026-10-03')[1]?.status, 'todo');
});
test('concurrent occurrence writes merge without losing status or minutes', async () => {
  const { repo, service } = fixture();
  await service.createTask(draft({ recurrence: 'FREQ=DAILY' }));
  const items = expand(repo.snapshot().tasks[0]!, '2026-10-02', '2026-10-03');
  await Promise.all([
    service.status(items[0]!, 'done'),
    service.status(items[1]!, 'failed'),
    service.minutes(items[0]!, 23),
  ]);
  const t = repo.snapshot().tasks[0]!;
  assert.equal(t.occurrences['2026-10-02']?.status, 'done');
  assert.equal(t.occurrences['2026-10-02']?.minutes, 23);
  assert.equal(t.occurrences['2026-10-03']?.status, 'failed');
});
test('cross-month reschedule preserves multi-day duration and supports undo', async () => {
  const { repo, service } = fixture();
  await service.createTask(draft({ scheduled: '2026-10-30', due: '2026-11-02' }));
  await service.move(taskItem(repo.snapshot().tasks[0]!, '2026-10-02'), '2026-12-05');
  assert.equal(repo.snapshot().tasks[0]?.scheduled, '2026-12-05');
  assert.equal(repo.snapshot().tasks[0]?.due, '2026-12-08');
  await service.undo();
  assert.equal(repo.snapshot().tasks[0]?.scheduled, '2026-10-30');
});
test('trash and undo restore original note body and metadata', async () => {
  const { app, repo, service } = fixture();
  const f = await service.createTask(draft());
  const original = await app.vault.read(f);
  await service.trash(f.path);
  assert.equal(repo.snapshot().tasks.length, 0);
  assert.equal(app.vault.getAbstractFileByPath(f.path), null);
  assert.equal((app.vault as any).trash.length, 1);
  await service.undo();
  assert.equal(repo.snapshot().tasks.length, 1);
  assert.equal(await app.vault.read(service.file(f.path)), original);
});
test('undo refuses conflicting external edits without overwriting them', async () => {
  const { app, repo, service } = fixture();
  const f = await service.createTask(draft());
  await service.status(taskItem(repo.snapshot().tasks[0]!, '2026-10-02'), 'done');
  await app.fileManager.processFrontMatter(f, (fm) => {
    fm.status = 'failed';
    fm.personal = 'keep';
  });
  await assert.rejects(() => service.undo(), /changed elsewhere/);
  const fm = frontmatter(await app.vault.read(f));
  assert.equal(fm.status, 'failed');
  assert.equal(fm.personal, 'keep');
});
test('skip/stop/resume keep per-day history and are reversible', async () => {
  const { repo, service } = fixture();
  const f = await service.createTask(draft({ recurrence: 'FREQ=DAILY' }));
  const item = expand(repo.snapshot().tasks[0]!, '2026-10-02', '2026-10-02')[0]!;
  await service.skip(item);
  assert.equal(expand(repo.snapshot().tasks[0]!, '2026-10-02', '2026-10-02').length, 0);
  await service.undo();
  assert.equal(expand(repo.snapshot().tasks[0]!, '2026-10-02', '2026-10-02').length, 1);
  await service.status(item, 'done');
  await service.stopSeries(f.path, '2026-10-02');
  assert.equal(expand(repo.snapshot().tasks[0]!, '2026-10-03', '2026-10-04').length, 0);
  await service.resumeSeries(f.path);
  assert.equal(expand(repo.snapshot().tasks[0]!, '2026-10-03', '2026-10-04').length, 2);
  assert.equal(repo.snapshot().tasks[0]?.occurrences['2026-10-02']?.status, 'done');
});
test('missing files and blocked folders produce explicit errors', async () => {
  const { app, service } = fixture();
  await app.vault.create('Planner', 'blocking file');
  await assert.rejects(() => service.createTask(draft()), /blocks/);
  await assert.rejects(
    () => service.status({ task: { path: 'missing.md' } } as any, 'done'),
    /not found/,
  );
});
test('invalid dates, negative minutes, missing title and unsafe folder are rejected', async () => {
  const { app, repo, service } = fixture();
  await assert.rejects(() => service.createTask(draft({ title: '' })));
  await assert.rejects(() => service.createTask(draft({ scheduled: '2026-02-30' })));
  await assert.rejects(() => service.createTask(draft({ minutes: -1 })));
  await assert.rejects(() =>
    service.createTask(draft({ scheduled: '', recurrence: 'FREQ=DAILY' })),
  );
  await assert.rejects(
    () => new TaskService(app, repo, () => '../escape').createTask(draft()),
    /inside/,
  );
});
test('all ASCII control characters are rejected in folders and removed from filenames', async () => {
  const { app, repo, service } = fixture();
  for (let code = 0; code < 32; code++) {
    const control = String.fromCharCode(code);
    await assert.rejects(
      () => new TaskService(app, repo, () => `Planner${control}Unsafe`).createTask(draft()),
      /inside/,
    );
    const file = await service.createTask(draft({ title: `A${control}B` }));
    assert.ok(file.name.startsWith('A B--'), `Control character ${code} remains in filename`);
    assert.equal(frontmatter(await app.vault.read(file)).title, `A${control}B`);
  }
});

test('edits preserve note body and unrelated frontmatter', async () => {
  const { app, repo, service } = fixture();
  const f = await put(
    app,
    'Planner/Tasks/Native.md',
    { topSchema: 1, type: 'task', title: 'Native', status: 'todo', personal: { keep: true } },
    '\nSome **body**\n',
  );
  await repo.refresh(f);
  await service.editTask(f.path, draft({ title: 'Renamed' }));
  const text = await app.vault.read(f);
  assert.ok(text.includes('Some **body**'));
  assert.deepEqual(frontmatter(text).personal, { keep: true });
});
test('exact path wins over duplicate project titles; ambiguous aliases remain unresolved', async () => {
  const { app, repo } = fixture();
  await put(app, 'Planner/Projects/A.md', { topSchema: 1, type: 'project', title: 'Same' });
  await put(app, 'Planner/Projects/B.md', { topSchema: 1, type: 'project', title: 'Same' });
  await put(app, 'Planner/Tasks/A.md', {
    topSchema: 1,
    type: 'task',
    project: '[[Planner/Projects/B]]',
  });
  await put(app, 'Planner/Tasks/B.md', { topSchema: 1, type: 'task', project: 'Same' });
  await repo.load();
  assert.equal(
    repo.snapshot().tasks.find((t) => t.path.endsWith('/A.md'))?.project,
    'Planner/Projects/B.md',
  );
  assert.equal(repo.snapshot().tasks.find((t) => t.path.endsWith('/B.md'))?.project, 'Same');
});
test('unknown future schema is not silently interpreted', async () => {
  const { app, repo } = fixture();
  const f = await put(app, 'Planner/Future.md', { topSchema: 99, type: 'task' });
  await assert.rejects(() => repo.refresh(f), /future/);
});
test('legacy import preserves originals, copies history, creates hierarchy, and is idempotent', async () => {
  const { app, repo, importer } = fixture();
  const p = await put(app, 'Projects/Home/Household/_project.md', {
    type: 'project',
    title: 'Household',
    area: 'Home',
  });
  const t = await put(app, 'Tasks/Trash.md', {
    tags: ['task'],
    status: 'todo',
    title: 'Take out trash',
    projects: ['[[Projects/Home/Household/_project]]'],
    scheduled: '2026-10-02',
    recurrence: 'FREQ=DAILY',
    complete_instances: ['2026-10-02'],
    taskType: 'subscription',
  });
  const originals = [await app.vault.read(p), await app.vault.read(t)];
  const r = await importer.run();
  assert.equal(r.tasks, 1);
  assert.equal(r.projects, 1);
  assert.equal(r.areas, 1);
  const s = repo.snapshot();
  assert.equal(s.tasks[0]?.project, s.projects[0]?.path);
  assert.equal(s.projects[0]?.area, s.areas[0]?.path);
  assert.equal(s.tasks[0]?.kind, 'subscription');
  assert.equal(s.tasks[0]?.occurrences['2026-10-02']?.status, 'done');
  assert.deepEqual([await app.vault.read(p), await app.vault.read(t)], originals);
  const second = await importer.run();
  assert.equal(second.tasks, 0);
  assert.equal(second.projects, 0);
  assert.equal(repo.snapshot().tasks.length, 1);
});
test('unresolved and multiple legacy project links generate warnings', async () => {
  const { app, importer, repo } = fixture();
  await put(app, 'Tasks/Task.md', { status: 'todo', projects: ['[[Missing]]', '[[Other]]'] });
  const r = await importer.run();
  assert.equal(r.warnings.length, 2);
  assert.equal(repo.snapshot().tasks[0]?.project, '');
});
test('demo examples are excluded from legacy import', async () => {
  const { app, importer } = fixture();
  await put(app, 'examples/Tasks/Demo.md', { type: 'task', status: 'todo' });
  const r = await importer.run();
  assert.equal(r.tasks, 0);
});
test('legacy finished timers become manual totals without continuing unfinished timers', async () => {
  const { app, importer, repo } = fixture();
  await put(app, 'Tasks/Timed.md', {
    status: 'todo',
    timeEntries: [
      { startTime: '2026-10-02T10:00:00+04:00', endTime: '2026-10-02T10:20:00+04:00' },
      { startTime: '2026-10-02T11:00:00+04:00' },
    ],
  });
  const r = await importer.run();
  assert.equal(repo.snapshot().tasks[0]?.minutes, 20);
  assert.ok(r.warnings.some((w) => w.includes('Unfinished')));
});
test('long multilingual task filenames stay within filesystem byte limits', async () => {
  const { service } = fixture();
  const f = await service.createTask(draft({ title: '学习'.repeat(80) }));
  assert.ok(new TextEncoder().encode(f.name).length < 255);
});
test('unrelated malformed note YAML does not break the native planner index', async () => {
  const { app, repo, service } = fixture();
  await app.vault.create('Notes/Broken.md', '---\nbad: [missing\n---\nNormal unrelated note');
  await service.createTask(draft());
  await repo.load();
  assert.equal(repo.snapshot().tasks.length, 1);
});
test('schema parser errors identify the exact native note path', async () => {
  const { app, repo } = fixture();
  const f = await app.vault.create(
    'Planner/Tasks/Broken.md',
    '---\ntopSchema: 1\nbad: [missing\n---\n',
  );
  await assert.rejects(
    () => repo.refresh(f),
    /Invalid planner metadata: Planner\/Tasks\/Broken.md/,
  );
});
test('legacy importer ignores malformed metadata in unrelated personal notes', async () => {
  const { app, importer } = fixture();
  await app.vault.create('Notes/Broken.md', '---\nbad: [missing\n---\n');
  await put(app, 'Tasks/Task.md', { status: 'todo' });
  const r = await importer.run();
  assert.equal(r.tasks, 1);
});
test('one corrupt planner note does not stop loading later batches', async () => {
  const { app, repo } = fixture();
  await app.vault.create('Broken.md', '---\ntopSchema: 1\nbad: [missing\n---\n');
  for (let i = 0; i < 30; i++)
    await put(app, `Planner/Tasks/${i}.md`, { topSchema: 1, type: 'task', title: String(i) });
  await assert.rejects(() => repo.load(), /Broken.md/);
  assert.equal(repo.snapshot().tasks.length, 30);
});
test('simultaneous undo requests do not apply one entry twice', async () => {
  const { repo, service } = fixture();
  await service.createTask(draft());
  await service.status(taskItem(repo.snapshot().tasks[0]!, '2026-10-02'), 'done');
  await Promise.all([service.undo(), service.undo()]);
  assert.equal(repo.snapshot().tasks[0]?.status, 'todo');
});
test('pending edits cannot silently downgrade a future schema', async () => {
  const { app, repo, service } = fixture();
  const f = await service.createTask(draft());
  const selected = taskItem(repo.snapshot().tasks[0]!, '2026-10-02');
  await app.fileManager.processFrontMatter(f, (fm) => {
    fm.topSchema = 99;
  });
  await assert.rejects(() => service.status(selected, 'done'), /future/);
  assert.equal(frontmatter(await app.vault.read(f)).topSchema, 99);
});

test('description saves multiline Markdown atomically with status and undo preserves note body', async () => {
  const { app, repo, service } = fixture();
  const file = await service.createTask(draft({ description: 'Before', status: 'backlog' }));
  const body = (await app.vault.read(file)).split('---').slice(2).join('---');
  const description = '- [ ] First\n- [x] Second\n\nDetailed text: <script>unsafe()</script>';
  await service.saveTask(
    taskItem(repo.snapshot().tasks[0]!, '2026-10-03'),
    draft({ description }),
    7,
    'in-progress',
  );
  assert.equal(repo.snapshot().tasks[0]?.description, description);
  assert.equal(repo.snapshot().tasks[0]?.status, 'in-progress');
  assert.equal((await app.vault.read(file)).split('---').slice(2).join('---'), body);
  await service.undo();
  assert.equal(repo.snapshot().tasks[0]?.description, 'Before');
  assert.equal(repo.snapshot().tasks[0]?.status, 'backlog');
});
test('returning terminal tasks to any unfinished state clears resolution dates', async () => {
  const { app, repo, service } = fixture();
  const file = await service.createTask(draft({ status: 'done' }));
  assert.ok(frontmatter(await app.vault.read(file)).completedDate);
  for (const status of ['backlog', 'in-progress', 'todo'] as const) {
    await service.status(taskItem(repo.snapshot().tasks[0]!, '2026-10-03'), status);
    const fm = frontmatter(await app.vault.read(file));
    assert.equal(fm.status, status);
    assert.equal(fm.completedDate, undefined);
    assert.equal(fm.failedDate, undefined);
  }
});
test('new recurring card status affects only its anchor and future repeats remain available', async () => {
  const { repo, service } = fixture();
  await service.createTask(draft({ recurrence: 'FREQ=DAILY', status: 'done' }));
  const task = repo.snapshot().tasks[0]!;
  assert.equal(task.status, 'todo');
  assert.equal(expand(task, '2026-10-02', '2026-10-03')[0]?.status, 'done');
  assert.equal(expand(task, '2026-10-02', '2026-10-03')[1]?.status, 'todo');
});
test('oversized descriptions and invalid status are rejected before any write', async () => {
  const { repo, service } = fixture();
  await assert.rejects(
    service.createTask(draft({ description: 'a'.repeat(100001) })),
    /Description/,
  );
  await assert.rejects(service.createTask(draft({ status: 'unknown' as any })), /Invalid status/);
  assert.equal(repo.snapshot().tasks.length, 0);
});

test('planned recurrence cutoff edits atomically, preserves note body/history and supports Undo', async () => {
  const { app, repo, service } = fixture();
  const base = draft({ recurrence: 'FREQ=DAILY' });
  const file = await service.createTask(base);
  await service.patch(file.path, (fm) => {
    fm.personal = 'keep';
  });
  await service.status(expand(repo.snapshot().tasks[0]!, '2026-10-02', '2026-10-02')[0]!, 'done');
  const before = await app.vault.read(file);
  await service.saveTask(
    taskItem(repo.snapshot().tasks[0]!, '2026-10-03'),
    { ...base, recurrence: 'FREQ=DAILY;UNTIL=20261003T235959Z' },
    0,
    'todo',
  );
  assert.equal(expand(repo.snapshot().tasks[0]!, '2026-10-04', '2026-10-06').length, 0);
  assert.equal(repo.snapshot().tasks[0]?.occurrences['2026-10-02']?.status, 'done');
  const after = await app.vault.read(file);
  assert.equal(frontmatter(after).personal, 'keep');
  assert.equal(after.split('---')[2], before.split('---')[2]);
  await service.undo();
  assert.equal(repo.snapshot().tasks[0]?.recurrence, 'FREQ=DAILY');
  assert.equal(expand(repo.snapshot().tasks[0]!, '2026-10-04', '2026-10-06').length, 3);
});
test('recurrence cutoff cannot precede its anchor and COUNT retains its earlier limit', async () => {
  const { repo, service } = fixture();
  await assert.rejects(
    () => service.createTask(draft({ recurrence: 'FREQ=DAILY;UNTIL=20261001T235959Z' })),
    /precede/,
  );
  await service.createTask(draft({ recurrence: 'FREQ=DAILY;COUNT=2;UNTIL=20261006T235959Z' }));
  assert.equal(expand(repo.snapshot().tasks[0]!, '2026-10-02', '2026-10-08').length, 2);
});

test('weekday series created on Sunday records initial status on Monday without phantom Sunday', async () => {
  for (const status of ['todo', 'backlog', 'in-progress', 'done', 'failed'] as const) {
    const { repo, service } = fixture();
    await service.createTask(
      draft({
        scheduled: '2026-10-04',
        recurrence: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
        status,
        scheduledTime: '14:00',
      }),
    );
    const t = repo.snapshot().tasks[0]!;
    const items = expand(t, '2026-10-04', '2026-10-06');
    assert.deepEqual(
      items.map((i) => i.key),
      ['2026-10-05', '2026-10-06'],
    );
    assert.equal(items[0]?.status, status);
    assert.equal(items[1]?.status, 'todo');
    assert.equal(t.occurrences['2026-10-04'], undefined);
    assert.equal(items[0]?.task.scheduledTime, '14:00');
  }
});
test('repeat range without any matching date refuses creation and conversion atomically', async () => {
  const { repo, service } = fixture();
  const recurrence = 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20261004T235959Z';
  await assert.rejects(
    service.createTask(draft({ scheduled: '2026-10-04', recurrence })),
    /no occurrence/,
  );
  assert.equal(repo.snapshot().tasks.length, 0);
  await service.createTask(draft({ scheduled: '2026-10-04' }));
  await assert.rejects(
    service.saveTask(
      taskItem(repo.snapshot().tasks[0]!, '2026-10-04'),
      draft({ scheduled: '2026-10-04', recurrence }),
      0,
      'todo',
    ),
    /no occurrence/,
  );
  assert.equal(repo.snapshot().tasks[0]?.recurrence, '');
});
test('appointment time edits, preservation, clearing, move and Undo retain body and unknown fields', async () => {
  const { app, repo, service } = fixture();
  const f = await service.createTask(draft({ scheduledTime: '14:00' }));
  await app.fileManager.processFrontMatter(f, (fm) => {
    fm.customFlag = 'kept';
  });
  const body = (await app.vault.read(f)).split('---\n').slice(2).join('---\n');
  await service.editTask(f.path, draft());
  assert.equal(repo.snapshot().tasks[0]?.scheduledTime, '14:00');
  await service.saveTask(
    taskItem(repo.snapshot().tasks[0]!, '2026-10-02'),
    draft({ scheduledTime: '09:00' }),
    0,
    'todo',
  );
  assert.equal(repo.snapshot().tasks[0]?.scheduledTime, '09:00');
  await service.move(taskItem(repo.snapshot().tasks[0]!, '2026-10-02'), '2026-10-03');
  assert.equal(repo.snapshot().tasks[0]?.scheduledTime, '09:00');
  await service.editTask(f.path, draft({ scheduled: '2026-10-03', scheduledTime: '' }));
  assert.equal(repo.snapshot().tasks[0]?.scheduledTime, '');
  await service.undo();
  assert.equal(repo.snapshot().tasks[0]?.scheduledTime, '09:00');
  assert.equal(frontmatter(await app.vault.read(f)).customFlag, 'kept');
  assert.equal((await app.vault.read(f)).split('---\n').slice(2).join('---\n'), body);
  for (const scheduledTime of ['24:00', '12:60', '9:00'])
    await assert.rejects(service.createTask(draft({ scheduledTime })), /appointment time/);
});

test('reapplying a terminal status preserves actual historical resolution dates', async () => {
  const { app, repo, service } = fixture();
  const f = await put(app, 'Planner/Tasks/History.md', {
    topSchema: 1,
    type: 'task',
    status: 'done',
    completedDate: '2025-05-01',
    actualMinutes: 25,
  });
  await repo.load();
  await service.status(taskItem(repo.snapshot().tasks[0]!, '2026-10-02'), 'done');
  assert.equal(frontmatter(await app.vault.read(f)).completedDate, '2025-05-01');
  const r = await service.createTask(
    draft({ title: 'Repeated history', recurrence: 'FREQ=DAILY' }),
  );
  await app.fileManager.processFrontMatter(r, (fm) => {
    fm.topOccurrences = {
      '2026-10-02': {
        status: 'done',
        resolvedOn: '2025-05-01',
        resolvedAt: '2025-05-01T14:00:00Z',
        minutes: 15,
      },
    };
  });
  await repo.load();
  const item = expand(
    repo.snapshot().tasks.find((t) => t.path === r.path)!,
    '2026-10-02',
    '2026-10-02',
  )[0]!;
  await service.status(item, 'done');
  const record = (frontmatter(await app.vault.read(r)).topOccurrences as any)['2026-10-02'];
  assert.equal(record.resolvedOn, '2025-05-01');
  assert.equal(record.resolvedAt, '2025-05-01T14:00:00Z');
});
test('new series minutes belong to its first actual repeat, never every generated day', async () => {
  const { repo, service } = fixture();
  await service.createTask(
    draft({
      scheduled: '2026-10-03',
      recurrence: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
      minutes: 25,
      status: 'done',
    }),
  );
  const t = repo.snapshot().tasks[0]!;
  assert.equal(t.minutes, 0);
  assert.equal(t.occurrences['2026-10-05']?.minutes, 25);
  assert.equal(t.occurrences['2026-10-05']?.status, 'done');
  assert.equal(expand(t, '2026-10-06', '2026-10-06')[0]?.minutes, 0);
});

test('payment complete, reprice, reopen, Undo and reload preserve a single financial identity', async () => {
  const { service, repo, app } = fixture();
  const file = await service.createTask(draft({ kind: 'payment', amount: 12.5, currency: 'EUR' }));
  await service.status(taskItem(repo.snapshot().tasks[0]!, day()), 'done');
  assert.deepEqual(repo.snapshot().tasks[0]?.payment, { amount: 12.5, currency: 'EUR' });
  await service.editTask(file.path, draft({ kind: 'payment', amount: 20, currency: 'USD' }));
  assert.deepEqual(repo.snapshot().tasks[0]?.payment, { amount: 12.5, currency: 'EUR' });
  await service.status(taskItem(repo.snapshot().tasks[0]!, day()), 'todo');
  assert.equal(repo.snapshot().tasks[0]?.amount, 20);
  await service.undo();
  assert.equal(repo.snapshot().tasks[0]?.status, 'done');
  const next = new Repository(app);
  await next.load();
  assert.deepEqual(next.snapshot().tasks[0]?.payment, { amount: 12.5, currency: 'EUR' });
});
test('recurring payments capture amount per occurrence and actual payment date independently', async () => {
  const { service, repo } = fixture();
  await service.createTask(
    draft({
      kind: 'payment',
      amount: 10,
      currency: 'EUR',
      scheduled: addDays(day(), -2),
      recurrence: 'FREQ=DAILY',
    }),
  );
  const first = expand(repo.snapshot().tasks[0]!, addDays(day(), -2), day())[0]!;
  await service.saveTask(
    first,
    draft({
      kind: 'payment',
      amount: 8,
      currency: 'USD',
      scheduled: first.task.scheduled,
      recurrence: 'FREQ=DAILY',
      paidOn: addDays(day(), -1),
    }),
    0,
    'done',
  );
  let t = repo.snapshot().tasks[0]!;
  assert.equal(t.occurrences[first.key]?.amount, 8);
  assert.equal(t.occurrences[first.key]?.resolvedOn, addDays(day(), -1));
  const next = expand(t, day(), day())[0]!;
  await service.status(next, 'done');
  t = repo.snapshot().tasks[0]!;
  assert.equal(t.occurrences[next.key]?.amount, 10);
  assert.equal(t.occurrences[next.key]?.currency, 'EUR');
  assert.equal(t.amount, 10);
  assert.equal(t.currency, 'EUR');
  assert.equal(t.occurrences[first.key]?.currency, 'USD');
  await service.editTask(
    t.path,
    draft({
      kind: 'payment',
      amount: 30,
      currency: 'EUR',
      scheduled: t.scheduled,
      recurrence: 'FREQ=DAILY',
    }),
  );
  assert.equal(repo.snapshot().tasks[0]?.occurrences[first.key]?.amount, 8);
  const paid = expand(repo.snapshot().tasks[0]!, first.date, first.date)[0]!;
  await service.saveTask(
    paid,
    draft({
      kind: 'payment',
      amount: 8,
      currency: 'USD',
      scheduled: t.scheduled,
      recurrence: 'FREQ=DAILY',
    }),
    0,
    'todo',
  );
  assert.equal(repo.snapshot().tasks[0]?.amount, 30);
  assert.equal(repo.snapshot().tasks[0]?.currency, 'EUR');
});
test('subscription recording prevents duplicate charges, keeps cancellation history, supports Undo', async () => {
  const { service, repo } = fixture();
  await service.saveSubscription({
    title: 'Service',
    description: '',
    project: '',
    amount: 10,
    currency: 'USD',
    billingPeriod: 'monthly',
    scheduled: day(),
    active: true,
  });
  const t = repo.snapshot().tasks[0]!;
  await Promise.allSettled([
    service.charge(t, day(), 10, 'USD', day()),
    service.charge(t, day(), 10, 'USD', day()),
  ]);
  assert.equal(Object.keys(repo.snapshot().tasks[0]!.charges!).length, 1);
  await assert.rejects(service.charge(t, day(), 10, 'USD', day()), /already recorded/);
  await service.subscriptionActive(t, false);
  assert.equal(repo.snapshot().tasks[0]?.charges?.[day()]?.amount, 10);
  await service.removeCharge(t, day());
  assert.equal(Object.keys(repo.snapshot().tasks[0]!.charges!).length, 0);
  await service.undo();
  assert.equal(repo.snapshot().tasks[0]?.charges?.[day()]?.amount, 10);
});
test('financial validation rejects invalid numbers, dates and unsafe conversions before writes', async () => {
  const { service, repo } = fixture();
  for (const amount of [-1, Infinity, NaN, 1e13])
    await assert.rejects(service.createTask(draft({ kind: 'payment', amount })), /amount/);
  await assert.rejects(service.createTask(draft({ kind: 'payment', currency: 'US' })), /currency/);
  await assert.rejects(
    service.createTask(draft({ kind: 'payment', status: 'done', paidOn: addDays(day(), 1) })),
    /today or earlier/,
  );
  const f = await service.createTask(
    draft({ kind: 'payment', status: 'done', amount: 10, currency: 'USD' }),
  );
  await assert.rejects(
    service.saveTask(
      taskItem(repo.snapshot().tasks[0]!, day()),
      draft({ title: 'Lost', kind: 'task' }),
      0,
      'done',
    ),
    /payment type/,
  );
  await assert.rejects(
    service.editTask(f.path, draft({ kind: 'payment', recurrence: 'FREQ=DAILY' })),
    /recurrence mode/,
  );
  assert.equal(repo.snapshot().tasks[0]?.title, 'Example');
});

test('editing legacy paid payment metadata cannot invent a payment date', async () => {
  const { service, repo, app } = fixture();
  const f = await put(app, 'old-payment.md', {
    topSchema: 1,
    type: 'task',
    taskType: 'payment',
    title: 'Old',
    status: 'done',
    amount: 10,
    currency: 'EUR',
    scheduled: '2020-01-01',
  });
  await repo.refresh(f);
  await service.saveTask(
    taskItem(repo.snapshot().tasks[0]!, day()),
    draft({ kind: 'payment', title: 'Old revised', status: 'done', amount: 11, currency: 'EUR' }),
    0,
    'done',
  );
  assert.equal(repo.snapshot().tasks[0]?.resolvedOn, '');
  assert.equal(repo.snapshot().tasks[0]?.payment?.amount, 11);
});

test('work dates and planned minutes round-trip, reject invalid input and retain manual minutes', async () => {
  const f = fixture();
  await f.service.createTask(
    draft({
      workDates: ['2026-10-05', '2026-10-05'],
      plannedMinutes: 90,
      due: '2026-12-31',
      minutes: 17,
    }),
  );
  let t = f.repo.snapshot().tasks[0]!;
  assert.deepEqual(t.workDates, ['2026-10-05']);
  assert.equal(t.plannedMinutes, 90);
  assert.equal(t.minutes, 17);
  await assert.rejects(f.service.createTask(draft({ workDates: ['2026-02-30'] })));
  await assert.rejects(
    f.service.createTask(draft({ recurrence: 'FREQ=DAILY', workDates: ['2026-10-05'] })),
  );
  await assert.rejects(f.service.createTask(draft({ plannedMinutes: -1 })));
  const { calendarItems } = await import('../src/core/calendar');
  await f.service.move(calendarItems(t, '2026-10-05', '2026-10-05')[0]!, '2026-10-06');
  t = f.repo.snapshot().tasks[0]!;
  assert.deepEqual(t.workDates, ['2026-10-06']);
  assert.equal(t.due, '2026-12-31');
  await f.service.move(calendarItems(t, '2026-12-31', '2026-12-31')[0]!, '2027-01-05');
  t = f.repo.snapshot().tasks[0]!;
  assert.equal(t.scheduled, '2026-10-02');
  assert.equal(t.due, '2027-01-05');
  await f.service.undo();
  assert.equal(f.repo.snapshot().tasks[0]!.due, '2026-12-31');
});
test('project budget writes validate scope, preserve body and support Undo', async () => {
  const f = fixture();
  const p = await f.service.createNote('project', 'Budget', {
    monthlyBudget: 100,
    budgetCurrency: 'USD',
  });
  await f.service.budget(p.path, 200, 'EUR');
  assert.equal(f.repo.snapshot().projects[0]!.monthlyBudget, 200);
  await f.service.undo();
  assert.equal(f.repo.snapshot().projects[0]!.monthlyBudget, 100);
  await assert.rejects(f.service.budget(p.path, -1, 'USD'));
  await assert.rejects(f.service.budget(p.path, 1, 'bad'));
});

test('release review: malformed or future metadata removes stale entries and notifies views', async () => {
  const { app, repo, service } = fixture();
  const file = await service.createTask(draft());
  let updates = 0;
  repo.subscribe(() => updates++);
  await app.vault.modify(file, '---\ntopSchema: 1\ntype: task\nbad: [\n---\nKeep this body');
  await assert.rejects(repo.refresh(file), /Invalid planner metadata/);
  assert.equal(repo.snapshot().tasks.length, 0);
  assert.equal(updates, 1);
  await app.vault.modify(file, '---\ntopSchema: 1\ntype: task\n---\nKeep this body');
  await repo.refresh(file);
  await app.vault.modify(file, '---\ntopSchema: 99\ntype: task\n---\nKeep this body');
  await assert.rejects(repo.refresh(file), /Unsupported future/);
  assert.equal(repo.snapshot().tasks.length, 0);
  assert.equal(updates, 3);
});

test('release review: folder removal and explicit reload prune absent planner records', async () => {
  const { app, repo, service } = fixture();
  const a = await service.createTask(draft());
  const b = await service.createNote('project', 'Parent', {});
  repo.remove('Planner/Tasks');
  assert.equal(repo.snapshot().tasks.length, 0);
  assert.equal(repo.snapshot().projects.length, 1);
  await repo.refresh(a);
  (app.vault as any).files.delete(a.path);
  (app.vault as any).files.delete(b.path);
  await repo.load();
  assert.equal(repo.snapshot().tasks.length, 0);
  assert.equal(repo.snapshot().projects.length, 0);
});

test('release review: stale task controls cannot adopt an unrelated or reclassified note', async () => {
  const { app, repo, service } = fixture();
  const file = await service.createTask(draft());
  const stale = taskItem(repo.snapshot().tasks[0]!, '2026-10-02');
  for (const data of [{ type: 'task' }, { topSchema: 1, type: 'project' }]) {
    const text =
      '---\n' + mock.stringifyYaml({ ...data, custom: { keep: true } }) + '---\nUnchanged body';
    await app.vault.modify(file, text);
    await assert.rejects(service.status(stale, 'done'), /no longer/);
    assert.equal(await app.vault.read(file), text);
    assert.equal(service.canUndo, false);
  }
});

test('release review: stale delete controls refuse reclassified and future notes', async () => {
  const { app, service } = fixture();
  const file = await service.createTask(draft());
  for (const data of [
    { type: 'project', topSchema: 1 },
    { type: 'task', topSchema: 99 },
  ]) {
    const text = '---\n' + mock.stringifyYaml(data) + '---\nUnchanged body';
    await app.vault.modify(file, text);
    await assert.rejects(service.trash(file.path, 'task'), /no longer|future/);
    assert.equal(await app.vault.read(file), text);
    assert.equal((app.vault as any).trash.length, 0);
  }
});

test('Undo retains only the latest 50 deletions and restores their original contents', async () => {
  const { app, service } = fixture();
  const notes = [];
  for (let i = 0; i < 51; i++) {
    const file = await put(
      app,
      `Planner/Tasks/trash-${i}.md`,
      {
        type: 'task',
        topSchema: 1,
        title: `Trash ${i}`,
        custom: { retained: i },
      },
      `Body ${i}\n`,
    );
    notes.push({ path: file.path, text: await app.vault.read(file) });
    await service.trash(file.path, 'task');
  }
  for (let i = 0; i < 50; i++) await service.undo();
  assert.equal(service.canUndo, false);
  assert.equal(app.vault.getAbstractFileByPath(notes[0]!.path), null);
  for (const note of notes.slice(1)) {
    const file = service.file(note.path);
    assert.equal(await app.vault.read(file), note.text);
  }
});
