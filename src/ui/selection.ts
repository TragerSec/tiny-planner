import { setIcon } from 'obsidian';
import { words } from './i18n';

let nextId = 0;
const openMenus = new WeakMap<Document, () => void>();
const synchronizers = new WeakMap<HTMLSelectElement, () => void>();

/** Update presentation without firing business change handlers. */
export function setSelectValue(native: HTMLSelectElement, value: string): void {
  native.value = value;
  synchronizers.get(native)?.();
}

/** Retain the native value/change contract; draw the control and choices in the
 * host theme. Long catalogs use search and pages, never a nested scroll area. */
export function enhanceSelect(native: HTMLSelectElement): void {
  if (native.dataset.tpSelection) return;
  const parent = native.parentElement;
  const win = native.ownerDocument.defaultView;
  if (!parent || !win) return;
  native.dataset.tpSelection = 'true';
  const doc = native.ownerDocument;
  const w = words(parent.closest<HTMLElement>('[lang]')?.lang === 'en' ? 'en' : 'ru');
  const wrapper = parent.createDiv( { cls: 'tp-select-control' });
  parent.insertBefore(wrapper, native);
  wrapper.append(native);
  native.classList.add('tp-native-select');
  native.tabIndex = -1;
  native.setAttribute('aria-hidden', 'true');
  const trigger = wrapper.createEl('button', { cls: 'tp-select-trigger' });
  trigger.type = 'button';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  const text = trigger.createSpan( { cls: 'tp-select-value' });
  const arrow = trigger.createSpan( { cls: 'tp-select-arrow' });
  arrow.setAttribute('aria-hidden', 'true');
  setIcon(arrow, 'chevron-down');
  const panel = wrapper.createDiv( { cls: 'tp-select-panel' });
  panel.hidden = true;
  panel.setAttribute('popover', 'manual');
  const search = panel.createEl('input', { cls: 'tp-select-search' });
  search.type = 'search';
  search.placeholder = w.searchOptions;
  search.setAttribute('aria-label', w.searchOptions);
  search.autocomplete = 'off';
  const list = panel.createDiv( { cls: 'tp-select-options' });
  list.id = `tp-select-${nextId++}`;
  list.setAttribute('role', 'listbox');
  list.tabIndex = -1;
  trigger.setAttribute('aria-controls', list.id);
  const pager = panel.createDiv( { cls: 'tp-select-pager' });
  const previous = pager.createEl('button', { text: '‹' });
  previous.type = 'button';
  previous.setAttribute('aria-label', w.previousOptions);
  const count = pager.createSpan();
  count.setAttribute('aria-live', 'polite');
  const next = pager.createEl('button', { text: '›' });
  next.type = 'button';
  next.setAttribute('aria-label', w.nextOptions);
  let active = 0;
  let matches: HTMLOptionElement[] = [];
  let controller: AbortController | undefined;
  let detached: MutationObserver | undefined;
  const preferredPageSize = native.closest('.tp-picker-popup') ? 5 : 8;
  let pageSize = preferredPageSize;
  let sized: ResizeObserver | undefined;
  const label = () =>
    native.getAttribute('aria-label') ||
    native.closest('label')?.querySelector('span')?.textContent ||
    native.closest('.setting-item')?.querySelector('.setting-item-name')?.textContent ||
    '';
  const close = (focus = false) => {
    if (panel.hidePopover) {
      try {
        panel.hidePopover();
      } catch {
        /* Detached or fallback panel. */
      }
    }
    panel.hidden = true;
    sized?.disconnect();
    sized = undefined;
    trigger.setAttribute('aria-expanded', 'false');
    controller?.abort();
    controller = undefined;
    detached?.disconnect();
    detached = undefined;
    if (openMenus.get(doc) === dismiss) openMenus.delete(doc);
    if (focus && trigger.isConnected) trigger.focus({ preventScroll: true });
  };
  const dismiss = () => close();
  const place = () => {
    if (panel.hidden) return;
    const viewport = win.visualViewport;
    const leftEdge = (viewport?.offsetLeft || 0) + 8;
    const topEdge = (viewport?.offsetTop || 0) + 8;
    const availableWidth = Math.max(1, (viewport?.width || win.innerWidth) - 16);
    const availableHeight = Math.max(1, (viewport?.height || win.innerHeight) - 16);
    const anchor = trigger.getBoundingClientRect();
    panel.style.width = `${Math.min(availableWidth, Math.max(200, anchor.width))}px`;
    // At most eight passes. Drawing and positioning never call each other.
    let height = panel.getBoundingClientRect().height;
    for (let remaining = pageSize - 1; height > availableHeight && remaining > 0; remaining--) {
      pageSize--;
      draw();
      height = panel.getBoundingClientRect().height;
    }
    const left = Math.min(
      Math.max(leftEdge, anchor.left),
      leftEdge + availableWidth - panel.getBoundingClientRect().width,
    );
    const below = anchor.bottom + 4;
    const above = anchor.top - height - 4;
    const top =
      below + height <= topEdge + availableHeight ? below : above >= topEdge ? above : topEdge;
    panel.style.left = `${Math.max(leftEdge, left)}px`;
    panel.style.top = `${Math.max(topEdge, Math.min(top, topEdge + availableHeight - height))}px`;
  };
  const resize = () => {
    pageSize = preferredPageSize;
    render();
  };
  const choose = (option: HTMLOptionElement) => {
    if (option.disabled || native.disabled) return;
    const changed = native.value !== option.value;
    native.value = option.value;
    sync();
    close(true);
    if (changed) native.dispatchEvent(new win.Event('change', { bubbles: true }));
  };
  const draw = () => {
    const query = search.value.trim().toLocaleLowerCase();
    matches = [...native.options].filter(
      (o) => !o.hidden && !o.disabled && (!query || o.text.toLocaleLowerCase().includes(query)),
    );
    active = Math.min(Math.max(0, active), Math.max(0, matches.length - 1));
    const page = Math.floor(active / pageSize);
    list.replaceChildren();
    if (!matches.length) list.createDiv( { cls: 'tp-select-empty', text: w.noOptions });
    for (const option of matches.slice(page * pageSize, (page + 1) * pageSize)) {
      const index = matches.indexOf(option);
      const node = list.createDiv( { cls: 'tp-select-option', text: option.text });
      node.id = `${list.id}-${index}`;
      node.setAttribute('role', 'option');
      node.setAttribute('aria-selected', String(option.value === native.value));
      node.classList.toggle('tp-option-active', index === active);
      node.addEventListener('pointerdown', (e) => e.preventDefault());
      node.addEventListener('click', (event) => {
        // Options can live inside a form label; do not activate its native control.
        event.preventDefault();
        choose(option);
      });
    }
    if (matches.length) list.setAttribute('aria-activedescendant', `${list.id}-${active}`);
    else list.removeAttribute('aria-activedescendant');
    pager.hidden = matches.length <= pageSize;
    previous.disabled = page === 0;
    next.disabled = (page + 1) * pageSize >= matches.length;
    count.textContent = `${page + 1} / ${Math.max(1, Math.ceil(matches.length / pageSize))}`;
  };
  const render = () => {
    draw();
    place();
  };
  const sync = () => {
    text.textContent = native.selectedOptions[0]?.text || '';
    trigger.disabled = native.disabled;
    if (native.disabled && !panel.hidden) close();
    const name = label();
    if (name) {
      trigger.setAttribute('aria-label', `${name}: ${text.textContent}`);
      list.setAttribute('aria-label', name);
    } else trigger.removeAttribute('aria-label');
    trigger.title = native.title || text.textContent || '';
    if (!panel.hidden) render();
  };
  const open = () => {
    if (native.disabled || !native.isConnected) return;
    openMenus.get(doc)?.();
    openMenus.set(doc, dismiss);
    search.value = '';
    pageSize = preferredPageSize;
    search.hidden = native.options.length <= pageSize;
    active = Math.max(
      0,
      [...native.options]
        .filter((o) => !o.hidden && !o.disabled)
        .findIndex((o) => o.value === native.value),
    );
    panel.hidden = false;
    panel.showPopover?.();
    trigger.setAttribute('aria-expanded', 'true');
    render();
    controller = new win.AbortController();
    win.addEventListener('resize', resize, { signal: controller.signal });
    win.visualViewport?.addEventListener('resize', resize, { signal: controller.signal });
    win.visualViewport?.addEventListener('scroll', place, { signal: controller.signal });
    doc.addEventListener('scroll', place, { capture: true, signal: controller.signal });
    if (win.ResizeObserver) {
      sized = new win.ResizeObserver(resize);
      sized.observe(wrapper);
    }
    for (const name of ['pointerdown', 'focusin'])
      doc.addEventListener(
        name,
        (e) => {
          if (!wrapper.contains(e.target as Node | null)) close();
        },
        { signal: controller.signal },
      );
    detached = new win.MutationObserver(() => {
      if (!native.isConnected) close();
    });
    detached.observe(doc.body, { childList: true, subtree: true });
    (search.hidden ? list : search).focus({ preventScroll: true });
  };
  panel.addEventListener('toggle', (event) => {
    if (event.newState === 'closed' && !panel.hidden) close();
  });
  trigger.addEventListener('click', () => (panel.hidden ? open() : close(true)));
  trigger.addEventListener('keydown', (event) => {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      open();
      if (event.key === 'Home') active = 0;
      if (event.key === 'End') active = Math.max(0, matches.length - 1);
      render();
      list.focus({ preventScroll: true });
    }
  });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key === 'Tab') {
      close();
      return;
    }
    if (event.key === 'Enter' || (event.key === ' ' && event.target === list)) {
      event.preventDefault();
      if (matches[active]) choose(matches[active]!);
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      if (event.target === search && ['Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'ArrowDown') active = Math.min(matches.length - 1, active + 1);
      if (event.key === 'ArrowUp') active = Math.max(0, active - 1);
      if (event.target === list && event.key === 'Home') active = 0;
      if (event.target === list && event.key === 'End') active = matches.length - 1;
      render();
    } else if (
      event.target === list &&
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      search.hidden = false;
      search.value += event.key;
      active = 0;
      render();
      search.focus();
    }
  });
  search.addEventListener('input', () => {
    active = 0;
    render();
  });
  previous.addEventListener('click', () => {
    active = Math.max(0, (Math.floor(active / pageSize) - 1) * pageSize);
    render();
  });
  next.addEventListener('click', () => {
    active = Math.min(matches.length - 1, (Math.floor(active / pageSize) + 1) * pageSize);
    render();
  });
  native.addEventListener('change', sync);
  synchronizers.set(native, sync);
  native.addEventListener('focus', () => trigger.focus({ preventScroll: true }));
  new win.MutationObserver(sync).observe(native, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['disabled', 'label', 'selected', 'aria-label', 'title', 'value'],
  });
  sync();
}
