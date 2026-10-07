const { JSDOM } = require('jsdom');
const YAML = require('yaml');
const notices = [];
class TFile {
  constructor(path) {
    this.path = path;
    this.name = path.split('/').at(-1);
    this.basename = this.name.replace(/\.md$/, '');
    this.extension = this.name.split('.').at(-1);
    this.stat = { mtime: Date.now(), ctime: Date.now(), size: 1 };
  }
}
class TFolder {
  constructor(path) {
    this.path = path;
    this.name = path.split('/').at(-1);
    this.children = [];
  }
}
class Events {
  refs = [];
  on(name, fn) {
    const ref = { name, fn, owner: this };
    this.refs.push(ref);
    return ref;
  }
  offref(ref) {
    this.refs = this.refs.filter((r) => r !== ref);
  }
  emit(name, ...args) {
    for (const r of this.refs) if (r.name === name) r.fn(...args);
  }
}
function fm(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  return m ? YAML.parse(m[1]) || {} : {};
}
class Vault extends Events {
  files = new Map();
  trash = [];
  getMarkdownFiles() {
    return [...this.files.values()]
      .map((v) => v.file)
      .filter((f) => f instanceof TFile && f.extension === 'md');
  }
  getAbstractFileByPath(p) {
    return this.files.get(p)?.file || null;
  }
  async createFolder(p) {
    if (this.files.has(p)) throw Error('Already exists');
    this.files.set(p, { file: new TFolder(p), text: '' });
  }
  async create(p, text) {
    if (this.files.has(p)) throw Error('Already exists');
    const file = new TFile(p);
    this.files.set(p, { file, text });
    this.emit('create', file);
    return file;
  }
  async cachedRead(f) {
    return this.read(f);
  }
  async read(f) {
    const v = this.files.get(f.path);
    if (!v) throw Error('Missing note');
    return v.text;
  }
  async modify(f, text) {
    const v = this.files.get(f.path);
    if (!v) throw Error('Missing note');
    v.text = text;
    this.emit('modify', f);
  }
  async rename(f, path) {
    const before = f.path;
    const v = this.files.get(before);
    this.files.delete(before);
    f.path = path;
    this.files.set(path, v);
    this.emit('rename', f, before);
  }
}
class Component {
  register(fn) {
    (this.cleanups ??= []).push(fn);
  }
  registerEvent(ref) {
    this.register(() => ref.owner?.offref(ref));
  }
  registerInterval(id) {
    this.register(() => clearInterval(id));
  }
  unload() {
    for (const fn of this.cleanups || []) fn();
  }
}
class ItemView extends Component {
  constructor(leaf) {
    super();
    this.leaf = leaf;
    this.app = leaf.app;
    this.containerEl = document.createElement('div');
    this.contentEl = document.createElement('div');
    this.containerEl.append(this.contentEl);
    document.body.append(this.containerEl);
  }
}
class Modal {
  constructor(app) {
    this.app = app;
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal';
    this.contentEl = document.createElement('div');
    this.modalEl.append(this.contentEl);
  }
  open() {
    document.body.append(this.modalEl);
    this.onOpen?.();
  }
  close() {
    this.onClose?.();
    this.modalEl.remove();
  }
}
class Plugin extends Component {
  constructor(app) {
    super();
    this.app = app;
  }
  async loadData() {
    return null;
  }
  async saveData(data) {
    this.data = data;
  }
  registerView(type, fn) {
    this.app.factories[type] = fn;
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
    this.app = app;
    this.plugin = plugin;
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

function setIcon(node, icon) {
  const svg = node.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('data-icon', icon);
  svg.innerHTML = '<path d="M5 5L19 19M19 5L5 19" stroke="currentColor" fill="none"/>';
  node.append(svg);
}
function makeApp() {
  const vault = new Vault();
  const app = {
    vault,
    factories: {},
    fileManager: {
      async processFrontMatter(file, fn) {
        const text = await vault.read(file);
        const data = fm(text);
        fn(data);
        const body = text.replace(/^---\n[\s\S]*?\n---(?:\n|$)/, '');
        await vault.modify(file, '---\n' + YAML.stringify(data) + '---\n' + body);
      },
      async trashFile(file) {
        const v = vault.files.get(file.path);
        vault.trash.push(v);
        vault.files.delete(file.path);
        vault.emit('delete', file);
      },
    },
    metadataCache: new Events(),
    workspace: new Events(),
  };
  app.metadataCache.getFirstLinkpathDest = (link, source) => {
    const p = link.endsWith('.md') ? link : link + '.md';
    return (
      vault.getAbstractFileByPath(p) ||
      vault.getMarkdownFiles().find((f) => f.basename === link) ||
      null
    );
  };
  app.metadataCache.getFileCache = (file) => ({
    frontmatter: fm(vault.files.get(file.path)?.text || ''),
  });
  app.workspace.onLayoutReady = (fn) => fn();
  app.workspace.leaves = [];
  app.workspace.getLeavesOfType = (type) => app.workspace.leaves.filter((l) => l.type === type);
  app.workspace.getLeaf = () => {
    const leaf = {
      app,
      async setViewState(s) {
        this.type = s.type;
        this.view = app.factories[s.type](this);
        await this.view.onOpen();
      },
    };
    app.workspace.leaves.push(leaf);
    return leaf;
  };
  app.workspace.revealLeaf = async () => {};
  app.workspace.openLinkText = async () => {};
  app.workspace.detachLeavesOfType = (type) => {
    for (const l of app.workspace.getLeavesOfType(type)) l.view.onClose();
    app.workspace.leaves = app.workspace.leaves.filter((l) => l.type !== type);
  };
  return app;
}
function makeDOM() {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    pretendToBeVisual: true,
    url: 'https://planner.test',
  });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;
  return dom;
}
module.exports = {
  TFile,
  TFolder,
  ItemView,
  Modal,
  Plugin,
  PluginSettingTab,
  Setting,
  Notice: class {
    constructor(s) {
      notices.push(s);
    }
  },
  setIcon,
  parseYaml: YAML.parse,
  stringifyYaml: YAML.stringify,
  normalizePath: (p) =>
    p
      .replace(/\\/g, '/')
      .replace(/\/{2,}/g, '/')
      .replace(/\/$/, ''),
  makeApp,
  makeDOM,
  fm,
  notices,
};
