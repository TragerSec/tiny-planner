# Install Tiny Planner

The manifest targets Obsidian 1.7.2 or newer. Node.js is not required to use the plugin.

## Manual installation or update

1. Extract the release-assets archive.
2. Create `<vault>/.obsidian/plugins/tiny-planner/`. If your configuration directory has another name, use it instead of `.obsidian`.
3. Copy `main.js`, `manifest.json` and `styles.css` directly into that folder. For an update, replace the existing three files together.
4. Reload Obsidian and enable Tiny Planner in **Settings → Community plugins**.
5. Open the planner through the calendar-check ribbon icon or **Tiny Planner: Open planner** in the command palette.

Your planner notes remain in the vault during an update. The runtime files must come from the same build. The other release files are documentation, licensing notices and checksums; they need not be copied into the plugin folder.

## Community installation

After listing approval, search for Tiny Planner in **Settings → Community plugins → Browse**, install it and enable it. A GitHub release alone does not imply Community approval.

## First steps

Create an area and a project, then add a task in Today or Inbox. Click a title to edit its details. Choose your interface language and date format in settings. Read the built-in Guide or [GUIDE.md](GUIDE.md) for behavior and controls.

## Publishing version 1.0.3 from the verified source archive

Upload the full contents of the verified source archive to the repository default
branch, including the generated `main.js`, metadata, tests and workflows. GitHub
Actions checks that the committed bundle exactly matches the TypeScript sources
before running all quality checks. Wait for the check workflow to succeed before
creating a new tag named exactly `1.0.3` on that checked commit.

The Release workflow repeats the build verification and tests, then publishes
only `main.js`, `manifest.json` and `styles.css`, with the description from
`RELEASE_NOTES.md`. It handles a retry of the same release without creating a
duplicate. CI does not automatically commit bundles. Do not edit generated
`main.js` by hand or disable `verify:build`; a mismatch requires a fresh build
from the sources. Keep historical tags unchanged.
