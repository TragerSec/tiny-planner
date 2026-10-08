import manifest from '../manifest.json';
import { parse, stringify } from 'yaml';
Node.prototype.createEl = function (tag, { cls = '', text = '' } = {}) {
  const node = this.ownerDocument.createElement(tag);
  node.className = cls;
  node.textContent = text;
  this.appendChild(node);
  return node;
};
Node.prototype.createSvg = function (tag, { attr = {} } = {}) {
  const node = this.ownerDocument.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attr)) node.setAttribute(key, String(value));
  this.appendChild(node);
  return node;
};
class TFile {
  constructor(path) {
    this.path = path;
    this.name = path.split('/').at(-1);
    this.basename = this.name.replace(/\.md$/, '');
    this.extension = 'md';
    this.stat = { mtime: Date.now() };
  }
}
class TFolder {
  constructor(path) {
    this.path = path;
  }
}
class Events {
  refs = [];
  on(name, fn) {
    const r = { name, fn };
    this.refs.push(r);
    return r;
  }
  offref(r) {
    this.refs = this.refs.filter((x) => x !== r);
  }
  emit(name, ...a) {
    for (const r of this.refs) if (r.name === name) r.fn(...a);
  }
}
const fm = (text) => {
  const m = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  return m ? parse(m[1]) || {} : {};
};
class Vault extends Events {
  files = new Map();
  trash = [];
  getMarkdownFiles() {
    return [...this.files.values()].filter((x) => x.file instanceof TFile).map((x) => x.file);
  }
  getAbstractFileByPath(p) {
    return this.files.get(p)?.file || null;
  }
  async createFolder(p) {
    if (this.files.has(p)) throw Error('exists');
    this.files.set(p, { file: new TFolder(p), text: '' });
  }
  async create(p, text) {
    if (this.files.has(p)) throw Error('exists');
    const f = new TFile(p);
    this.files.set(p, { file: f, text });
    this.emit('create', f);
    return f;
  }
  async read(f) {
    return this.files.get(f.path).text;
  }
  async cachedRead(f) {
    return this.read(f);
  }
  async modify(f, text) {
    this.files.get(f.path).text = text;
    this.emit('modify', f);
  }
}
class Component {
  registerEvent() {}
  registerInterval(id) {
    (this.intervals ??= []).push(id);
  }
}
class ItemView extends Component {
  constructor(leaf) {
    super();
    this.leaf = leaf;
    this.app = leaf.app;
    this.containerEl = document.querySelector('#app');
    this.contentEl = document.createElement('div');
    this.containerEl.append(this.contentEl);
  }
}
class Modal {
  constructor(app) {
    this.app = app;
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-container';
    const overlay = document.createElement('div');
    overlay.className = 'modal-bg';
    overlay.addEventListener('click', () => this.close());
    this.modalEl.append(overlay);
    const card = document.createElement('div');
    card.className = 'modal';
    this.contentEl = document.createElement('div');
    card.append(this.contentEl);
    this.modalEl.append(card);
    this.key = (e) => {
      if (e.key === 'Escape') this.close();
    };
  }
  open() {
    document.body.append(this.modalEl);
    document.addEventListener('keydown', this.key);
    this.onOpen();
  }
  close() {
    this.onClose?.();
    document.removeEventListener('keydown', this.key);
    this.modalEl.remove();
  }
}
class Plugin extends Component {
  constructor(app) {
    super();
    this.app = app;
  }
  async loadData() {
    return { language: 'ru', folder: 'Planner' };
  }
  async saveData(data) {
    this.data = data;
  }
  registerView(type, fn) {
    this.app.factory = fn;
  }
  addRibbonIcon() {}
  addCommand(cmd) {
    (this.commands ??= []).push(cmd);
  }
  removeCommand(id) {
    this.commands = (this.commands || []).filter((c) => c.id !== id);
  }
  addSettingTab(tab) {
    (this.settingTabs ??= []).push(tab);
  }
}
class PluginSettingTab {
  constructor(app, plugin) {
    this.containerEl = document.createElement('div');
  }
}
class Setting {
  constructor(parent) {
    this.row = document.createElement('div');
    parent.append(this.row);
    this.label = document.createElement('label');
    this.row.append(this.label);
  }
  setName(name) {
    this.label.textContent = name;
    return this;
  }
  setDesc() {
    return this;
  }
  addText() {
    return this;
  }
  addButton() {
    return this;
  }
  addDropdown(callback) {
    const node = document.createElement('select');
    this.label.append(node);
    const control = {
      addOptions(options) {
        for (const [value, text] of Object.entries(options)) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = text;
          node.append(option);
        }
        return control;
      },
      setValue(value) {
        node.value = value;
        return control;
      },
      onChange(fn) {
        node.addEventListener('change', () => void fn(node.value));
        return control;
      },
    };
    callback(control);
    return this;
  }
}

const iconPaths = {
  'panel-left-close':
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18m7-12-3 3 3 3"/>',
  'panel-left-open':
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18m4-12 3 3-3 3"/>',
  'users-round':
    '<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M21 21v-2a6 6 0 0 0-4-5"/>',
  flag: '<path d="M4 22V3c5-3 10 3 16 0v11c-6 3-11-3-16 0"/>',

  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  inbox: '<path d="M4 4h16l2 10v6H2v-6ZM2 14h6l2 3h4l2-3h6"/>',
  'list-todo':
    '<path d="m3 6 2 2 3-4M11 6h10M11 12h10M11 18h10"/><rect x="3" y="11" width="4" height="4"/><rect x="3" y="18" width="4" height="4"/>',
  folders: '<path d="M6 3h6l2 3h8v12H6ZM2 7v15h16"/>',
  'columns-3': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
  'credit-card': '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9h20M6 15h3"/>',
  'chart-no-axes-combined': '<path d="M3 20v-5M8 20v-8M13 20v-5M18 20v-8M3 10l5-5 5 4 8-7"/>',
  'book-open':
    '<path d="M12 5v16M12 5C8 2 4 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-2-1-6-2-10 1Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',

  check: '<path d="m5 12 4 4L19 6"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  'circle-x': '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
  'trash-2': '<path d="M3 6h18M9 6V3h6v3M5 6l1 14h12l1-14M10 10v6M14 10v6"/>',
  'calendar-days':
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18M7 15h2m3 0h2m3 0h2"/>',
  'file-text': '<path d="M14 2H5v20h14V7ZM14 2v6h5M8 12h8M8 16h6"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'undo-2': '<path d="m3 8 4-4M3 8l4 4M3 8h11a6 6 0 0 1 0 12"/>',
  'refresh-cw': '<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>',
  'sliders-horizontal': '<path d="M3 6h18M3 12h18M3 18h18M8 3v6M16 9v6M10 15v6"/>',
  'filter-x': '<path d="M3 3h18l-7 9v7l-4 2V12ZM16 16l5 5m0-5-5 5"/>',
  pencil: '<path d="m15 4 5 5L7 22H2v-5ZM15 4l3-3 5 5-3 3"/>',
};
function setIcon(n, icon) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('fill', 'none');
  svg.innerHTML = iconPaths[icon] || iconPaths.circle;
  n.append(svg);
}
const notices = [];
const mock = {
  requireApiVersion: (minimum) => {
    const actual = [1, 13, 1];
    const required = minimum.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if (actual[i] !== required[i]) return actual[i] > required[i];
    }
    return true;
  },
  TFile,
  TFolder,
  ItemView,
  Modal,
  Plugin,
  PluginSettingTab,
  Setting,
  setIcon,
  Notice: class {
    constructor(s) {
      notices.push(s);
      console.log('Notice:', s);
    }
  },
  parseYaml: parse,
  stringifyYaml: stringify,
  normalizePath: (p) =>
    p
      .replace(/\\/g, '/')
      .replace(/\/{2,}/g, '/')
      .replace(/\/$/, ''),
};
window.require = (id) => {
  if (id === 'obsidian') return mock;
  throw Error('Unexpected require: ' + id);
};
window.module = { exports: {} };
window.boot = async () => {
  const vault = new Vault();
  const app = {
    vault,
    fileManager: {
      async processFrontMatter(f, fn) {
        const text = await vault.read(f);
        const data = fm(text);
        fn(data);
        await vault.modify(
          f,
          '---\n' + stringify(data) + '---\n' + text.replace(/^---\n[\s\S]*?\n---(?:\n|$)/, ''),
        );
      },
      async trashFile(f) {
        vault.trash.push(vault.files.get(f.path));
        vault.files.delete(f.path);
        vault.emit('delete', f);
      },
    },
    metadataCache: new Events(),
    workspace: new Events(),
  };
  app.metadataCache.getFirstLinkpathDest = (raw) =>
    vault.getAbstractFileByPath(raw) || vault.getAbstractFileByPath(raw + '.md');
  app.workspace.onLayoutReady = (fn) => fn();
  app.workspace.getLeavesOfType = () => [];
  app.workspace.detachLeavesOfType = () => {};
  app.workspace.openLinkText = async () => {};
  const PluginClass = window.module.exports.default;
  const plugin = new PluginClass(app);
  plugin.manifest = manifest;
  await plugin.onload();
  const put = async (path, data) =>
    vault.create(
      path,
      '---\n' + stringify({ topSchema: 1, ...data }) + '---\n\n# ' + data.title + '\n',
    );
  await put('Planner/Areas/Home.md', { type: 'area', title: 'Home' });
  await put('Planner/Areas/Work.md', { type: 'area', title: 'Work' });
  await put('Planner/Areas/Learning.md', { type: 'area', title: 'Learning' });
  await put('Planner/Projects/Household.md', {
    type: 'project',
    title: 'Household chores',
    area: '[[Planner/Areas/Home]]',
    status: 'active',
  });
  await put('Planner/Projects/Release.md', {
    type: 'project',
    title: 'Website launch',
    area: '[[Planner/Areas/Work]]',
    status: 'active',
    due: '2026-10-09',
  });
  await put('Planner/Projects/English.md', {
    type: 'project',
    title: 'English practice',
    area: '[[Planner/Areas/Learning]]',
    status: 'active',
  });
  const tasks = [
    ['shower', 'Shower', '2026-10-02', 'Planner/Projects/Household', 'FREQ=DAILY'],
    ['weekly', 'Weekly review', '2026-09-25', 'Planner/Projects/Release', 'FREQ=WEEKLY'],
    ['trash', 'Take out the trash', '2026-10-02', 'Planner/Projects/Household', ''],
    ['museum', 'Go to the museum', '2026-10-02', 'Planner/Projects/Household', ''],
    ['copy', 'Review the homepage copy', '2026-10-02', 'Planner/Projects/Release', ''],
    [
      'english',
      'Practice speaking for 20 minutes',
      '2026-10-02',
      'Planner/Projects/English',
      'FREQ=DAILY',
    ],
    ['next', 'Send the launch checklist', '2026-10-30', 'Planner/Projects/Release', ''],
    ['inbox', 'An idea for the weekend', '', '', ''],
    ['service', 'Example service · €10', '2026-09-01', 'Planner/Projects/Release', ''],
  ];
  for (const [id, title, scheduled, project, recurrence] of tasks)
    await put(`Planner/Tasks/${id}.md`, {
      type: 'task',
      title,
      status: id === 'museum' ? 'failed' : id === 'trash' ? 'done' : 'todo',
      scheduled,
      project: project ? `[[${project}]]` : '',
      recurrence: recurrence || null,
      taskType: id === 'service' ? 'subscription' : 'task',
      actualMinutes: id === 'trash' ? 8 : 0,
    });
  await plugin.repo.load();
  const leaf = { app };
  const view = app.factory(leaf);
  await view.onOpen();
  window.tp = { plugin, app, view, notices };
  window.ready = true;
};
