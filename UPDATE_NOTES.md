# Tiny Planner 1.0.6

Contact tasks, separate results, simpler forms and calendar improvements are included in this source release. Replace all three runtime files together; preserve notes and data.json. Minimum Obsidian remains 1.7.2 and schema remains 1. GitHub publication has not been performed here.

# Tiny Planner 1.0.5 — Obsidian review fixes

The previously published 1.0.4 tag is not rewritten. This patch adds the official recommended source lint to CI and fixes the reported static styles, DOM helpers, unnecessary cast, declaration types and :has selectors. Full details and verification are in docs/FINAL_AUDIT.md (AUDIT.md in the install archive).

# Tiny Planner 1.0.4 — local release candidate

Prepared from the supplied GitHub 1.0.3 source, with the requested mobile/calendar work and the follow-up fixes below. The version is 1.0.4 in manifest, package, lockfile and versions.json. No GitHub push, tag or release publication has been performed.

## Included changes

- Mobile-friendly layouts, touch targets and forms; a readable dated calendar agenda in narrow panes.
- Independent Hide failed / Show failed calendar filter and low-priority tasks. High priority uses a red outlined marker; Low uses the same compact outline in white, with no fill.
- Explicit subscription editing. Only changed fields are saved; unrelated external edits, charge history, unknown metadata and note bodies remain intact. Conflicting edits are rejected before any mutation, leaving the form open with a localized message. Undo restores only the saved fields. Legacy project aliases are resolved before conflict comparison.
- One consistent themed choice component across task, subscription, calendar/time, filter, board, finance and settings controls. Search and pages handle long option lists; arrows/Enter/Escape and touch are supported. User option text is rendered as text, never HTML.
- Minimal calendar cards show the checkbox, title and uniform icons. Ellipsis reveals project, time and actions; area is shown beside the project. Subtle intermediate-day marks connect start and deadline without checkboxes or workload. Days have no fixed height cap and no internal scrollbar. Only the main page scrolls, including when the pointer is over the calendar; navigation and statistics do not introduce nested scrolling. Description fields grow with their content.

## Validation

- Release metadata, TypeScript, build and 263 unit/integration tests.
- Strict generated-bundle comparison before and after rebuilding.
- 16 theme/width combinations, including the downloaded Minimal CSS.
- 36 additional width/scale/theme layouts, touch editing, custom selectors, transparent priority badges, and actual wheel scrolling up/down over the calendar. Checks reject nested scroll containers.
- Fresh dependency audit: zero known advisories; 61 verified registry signatures and four attestations. Runtime import boundary remains Obsidian only. Targeted source review found no network/exfiltration, dynamic execution, shell commands or unsafe HTML sinks in the plugin.

Browser checks use mock Obsidian APIs in Chromium. Native Obsidian, physical Android/iOS devices and remote GitHub CI have not been run. This is a targeted security review, not a proof that every possible vulnerability is absent.

## Install

Close Obsidian and back up the existing plugin folder. Copy main.js, manifest.json and styles.css from tiny-planner/ into the vault's .obsidian/plugins/tiny-planner/ folder, preserving the existing data.json, then reopen Obsidian. No local build is required for installation. Use the source archive for review/development. Private context, logs, test vaults, credentials, Git history and dependencies are excluded; all seven original README showcase images remain included.

Compact work, deadline and intermediate continuation cards share title line metrics. Full titles wrap without a line limit; equal visible title line counts produce equal compact-card heights, including cards with type or priority markers. Narrow panes retain at least a 44 px tap target. Ellipsis reveals metadata and actions. Done and Failed titles remain muted and struck through; status rails, filters and Undo stay synchronized.

The complete code and visual review is documented in [docs/QUALITY_REVIEW.md](docs/QUALITY_REVIEW.md).
