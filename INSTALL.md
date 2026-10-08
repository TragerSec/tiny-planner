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

## Committing version 1.0.2 without building on your computer

Push the full source tree to the repository default branch. GitHub Actions first runs
all quality checks using the TypeScript-generated `main.js`. After checks succeed,
a separate, write-scoped job **sync-generated-bundle** rebuilds and commits the
exact generated `main.js` to the default branch, only if it differs. The write
permission is never granted to pull-request jobs. Wait for both Actions jobs
to succeed, and confirm that the generated bundle commit is visible, **before**
creating the release tag `1.0.2`. The tag-triggered Release workflow retains
strict `npm run verify:build` and does not rewrite release files.

If the branch is protected or GitHub Actions cannot commit, the synchronization
job will fail explicitly. Enable permission for Actions to write repository
contents or update `main.js` using a trusted GitHub build; do not disable
`verify:build`.
