# Tiny Planner 1.0.1

Fixes workspace layout preservation during plugin unload and updates. Tiny Planner no longer detaches its planner leaves, allowing Obsidian to restore them in their existing positions. View cleanup and registered event/interval cleanup remain in their normal lifecycle handlers.

To install or update manually, copy `main.js`, `manifest.json` and `styles.css` from this release into your vault's `.obsidian/plugins/tiny-planner/` directory, then reload Obsidian. Replace the three files together. Planner notes remain in the vault.

Requires Obsidian 1.7.2 or newer.
