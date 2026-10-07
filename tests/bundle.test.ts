import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const mock = require('../tests/mock-obsidian.cjs');

test('shipped bundle opens Statistics without networking and preserves workspace leaves on unload', async () => {
  const dom = mock.makeDOM();
  const app = mock.makeApp();
  const imports: string[] = [];
  const output = { exports: {} as any };
  const block = () => {
    throw new Error('Unexpected network access');
  };
  let plugin: any;
  try {
    dom.window.fetch = block;
    dom.window.XMLHttpRequest = block;
    runInNewContext(
      readFileSync('main.js', 'utf8'),
      {
        module: output,
        exports: output.exports,
        require(id: string) {
          imports.push(id);
          if (id === 'obsidian') return mock;
          throw new Error('Non-host runtime import: ' + id);
        },
        window: dom.window,
        document: dom.window.document,
        console,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        TextEncoder,
        crypto: globalThis.crypto,
        fetch: block,
        XMLHttpRequest: block,
      },
      { timeout: 2000 },
    );
    plugin = new output.exports.default(app, { id: 'tiny-planner' });
    await plugin.onload();
    await plugin.open();
    const view = app.workspace.leaves[0].view;
    view.contentEl.querySelector('[data-tab=statistics]').click();
    assert.equal(view.contentEl.querySelector('[data-metric=tasks] strong').textContent, '0');
    const note = await plugin.service.createTask({
      title: 'Bundle smoke',
      project: '',
      scheduled: '',
      due: '',
      recurrence: '',
      kind: 'task',
      minutes: 5,
      priority: 'normal',
    });
    assert.equal(view.contentEl.querySelector('[data-metric=tasks] strong').textContent, '1');
    assert.equal(note.extension, 'md');
    assert.ok(imports.length > 0);
    assert.ok(imports.every((id) => id === 'obsidian'));
    const leaf = app.workspace.leaves[0];
    leaf.location = 'right-sidebar';
    const originalLeaves = [...app.workspace.leaves];
    const detach = app.workspace.detachLeavesOfType;
    let detachCalls = 0;
    app.workspace.detachLeavesOfType = (type: string) => {
      detachCalls++;
      detach(type);
    };
    plugin.onunload?.();
    plugin.unload();
    assert.equal(detachCalls, 0, 'Plugin unload must let Obsidian retain workspace leaves');
    assert.deepEqual(app.workspace.leaves, originalLeaves);
    assert.equal(leaf.location, 'right-sidebar');
    assert.equal(app.vault.refs.length, 0, 'Registered vault events are released on unload');
  } finally {
    for (const leaf of app.workspace.leaves) await leaf.view.onClose();
    plugin?.unload();
    dom.window.close();
  }
});
