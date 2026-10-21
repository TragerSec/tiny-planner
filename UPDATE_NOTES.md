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

Calendar work, deadline and continuation cards use the same closed height with up to two title lines. The vertical ellipsis expands metadata and the full title; opening a task also shows its full name. Continuations inherit all five statuses and their colors; Done and Failed titles are struck through. Filters and Undo keep these marks synchronized.

Calendar appearance: **Minimal view** collapses task context; **Detailed view** expands all task titles, area/project context, time and actions. The choice stays in the open planner view across day/week/month and tab navigation. Outside clicks do not collapse Detailed view. Calendar cards are separated by 7 px on desktop and 8 px in the narrow agenda.

Calendar polish: expanded card context and four equal action buttons align with the title after the checkbox. Project and overdue/deadline labels wrap on their own rows. Period, appearance and visibility controls use consistent button sizing, borders, selected states and keyboard focus, with symmetric responsive groups.

Calendar controls now distinguish their roles: a shared segmented period switch, underlined appearance tabs, and rectangular visibility buttons with state indicators. Thin separators become horizontal in narrow panes; keyboard focus and touch targets remain visible.

Choice menus float above the page and never resize forms or calendar pickers. Search and viewport-adaptive pagination avoid internal scrollbars. Status-type tasks retain a flag; final task deadlines use a calendar-clock icon. Yellow task accents mean In progress, including continuation marks, independently of priority.

The built-in bilingual guide now has a Colors and icons chapter with five status swatches, priority markers and the actual task/action icons. Continuation titles reserve the same empty checkbox gutter as ordinary cards. Only visibility filter buttons use a compact 4 px corner radius and indicators centered 16 px from the leading edge.

Final audit: choice labels follow programmatic changes without firing business handlers; clock choices initially show the saved time. Choice-menu height fitting uses a bounded loop without recursive rendering. Removed unused legacy task-context CSS and date formatting helper. README, guide and technical planning documentation were reconciled with 1.0.4. CI jobs have a 20-minute bound.

Workload now counts each active occurrence when several repeats share a moved date, and includes explicitly reopened occurrences in legacy closed series. Added regression coverage for estimates, missing estimates, overload and closed history.

Calendar cards now retain assigned HH:mm time before the title in Minimal and Detailed views, including continuation marks. No duplicate time appears in the expanded metadata, and untimed tasks keep their previous appearance.

CI follow-up: update the appointment browser scenario to verify the visible calendar title time instead of the removed metadata element. Full npm run test:browser passes (81 UI, 16 theme and 36 mobile cases), with diagnostic captures enabled. Runtime assets are unchanged.

1.0.5 final validation under Node 22.23.3: official recommended source lint and vendor declarations have zero errors/warnings; 264 tests; full browser chain 81+16+36 passed without skipping captures. A clean archive install passed both lockfile installations, pre-build verification, complete check and post-build verification. Both dependency audits report zero known advisories. Three scoped CSS important declarations and vault discovery are intentionally documented recommendations, not claimed as a clean remote scanner result.
