# Tiny Planner

**1.0.6 · Obsidian 1.7.2+ · Desktop and mobile**

A local planner for tasks, projects and expenses. Everything stays in Markdown notes in your vault. No account, Dataview or runtime internet connection is required.

## What you can do

| Section | Purpose |
| --- | --- |
| Today / Inbox / Upcoming | Capture tasks and choose what to work on. |
| Calendar | Plan work dates and deadlines in Day, Week or Month. |
| Areas & projects | Group work and review project progress. |
| Boards | Move tasks through five workflow statuses. |
| Statistics | Review work and spending by calendar period. |
| Expenses | Record payments and manage subscriptions. |

Tasks support **Contact** (write or call someone), recurring schedules, priorities and optional time estimates. **Description** holds the brief; **Result** records the outcome. Each recurring occurrence has its own result and history.

## Start here

1. Open **Tiny Planner: Open planner** from the command palette or use the calendar-check ribbon icon.
2. Enter a task title and press **Enter** or **+**. Dates and projects are optional.
3. Click the title to edit. Optional sections cover planning, repeats, time tracking and description/result.
4. Use the checkmark to complete or reopen; use Boards for other statuses.

Areas group projects, and projects group tasks. Tasks without a recognized project appear in Inbox. Language, date format and daily capacity are in plugin settings. The built-in **Guide** is available in Russian and English.

## Calendar

- Full titles wrap naturally; card height follows the visible lines. Closed titles are muted and crossed out.
- Work dates and deadlines are separate. Drag a work card to move that session, or a deadline card to move the deadline.
- Daily bars show planned workload across every week. The current week has a small date underline; weekends use a subtle text color.
- **Display** controls task visibility, details and the optional three-entry Month overview. **Show more** opens the complete day.
- Wide calendars align multi-day tasks; narrow panes use an agenda. The sidebar can collapse for more space.

Estimates and recorded spent time are separate. Payments and subscriptions do not increase work totals. Financial reports keep currencies separate; optional budgets belong to projects or areas.

## Install or update

1. Download **main.js**, **manifest.json** and **styles.css** from the same [GitHub release](https://github.com/TragerSec/tiny-planner/releases).
2. Place all three directly in `<vault>/.obsidian/plugins/tiny-planner/`, using your actual configuration directory if different.
3. Reload Obsidian and enable **Tiny Planner** in **Settings → Community plugins**.

For updates, replace those three files together. Keep your existing `data.json` and planner notes. Node.js is needed only for development.

## Your data

New notes default to `Planner/Areas`, `Planner/Projects` and `Planner/Tasks`. The plugin discovers planner notes throughout the vault, preserves unknown note properties and bodies, makes no runtime network requests and sends no telemetry. Deletion uses Obsidian's configured trash.

Up to 20 recent form drafts can be recovered. Undo keeps 50 changes in the current session, excluding creation and import, and protects conflicting external edits. Legacy import copies supported notes without modifying originals.

[Detailed guide](GUIDE.md) · [Installation](INSTALL.md) · [Data schema](docs/SCHEMA.md) · [Security](SECURITY.md)

## Development

Use Node.js 22+ and the committed lockfiles:

```sh
npm ci --ignore-scripts
npm ci --prefix tools/obsidian-lint --ignore-scripts
npm run verify:build
npm run check
npm run verify:build
npx --no-install playwright install --with-deps chromium
npm run test:browser
npm run package
```

`check` validates versions, runs the official Obsidian linter with zero warnings, checks types, builds and tests. `verify:build` rejects a stale committed bundle. Both GitHub workflows run these checks before publication. Run an Obsidian preview scan on the final commit before creating its version tag.

[Development](docs/DEVELOPMENT.md) · [Release notes](RELEASE_NOTES.md) · [MIT license](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)
