# Changelog

## 1.0.6

- Shorten the README and built-in bilingual Guide; update instructions to match the final calendar appearance.

- Remove weekend column/header fills; distinguish Saturday/Sunday labels and date numbers only with a restrained theme-derived text tone. Preserve today, current-week underlines and all load bars.

- Complete the code and visual review documented in `docs/QUALITY_REVIEW.md`.
- Unify continuation and work-card title metrics and inline markers, including equal heights by actual wrapped line count; restore transparent Day surfaces.
- Keep mobile form actions after the fields so they cannot obscure task results; retain a restrained semantic color on destructive actions.
- Remove 247 superseded CSS declarations; share legacy and modern settings definitions instead of duplicating handlers.
- Cache task search text per repository snapshot, reuse calendar load calculations and limit textarea measurement to edited/visible fields.
- Release repository read guards on completion while preserving stale-read protection; read legacy imports in bounded batches before creating copies; announce active select options and update menus when options become hidden.
- Add a 176-scene design audit and a reproducible search benchmark without adding runtime dependencies.

- Fix compact calendar cards shrinking horizontally to their title inside column flex containers. Set an explicit full container width while retaining content-sized heights; verify width as well as visible-line height for plain and lane cards.
- Restore visible daily workload bars on every calendar week, including adjacent-month dates. Share the existing planned-load/capacity calculation with the details popup; keep overload red and use only a small date underline for the current week.
- Apply muted closed-task text to continuation cards, including hover and keyboard-linked highlights; quiet closed-task priority markers.
- Simplify reading surfaces: unboxed projects and statistics, quieter navigation, neutral task titles, compact context lines and hover/focus actions on desktop. Preserve status accents, touch actions, full titles and current-week highlighting.
- Add a separate multiline Result beside Description, including draft recovery, conflict protection, Undo and independent results for recurring occurrences.
- Keep calendar markers on the first title line and use uniform line metrics for content-sized cards; subtly highlight the current Monday–Sunday week in Month.
- Normalize project/area action icons, button spacing, input and choice surfaces across pages, forms and settings; retain touch-sized controls on phones.
- Add browser checks for equal card heights by visible line count and control geometry across all nine pages, both themes and three widths.
- Add the Contact task type (Связаться), with a message icon and ru/en labels.
- Reduce form clutter using disclosures for planning, repeats, time tracking, descriptions and budgets; expand filled sections automatically.
- Restore navigation, calendar display and filters, while opening dates relative to today.
- Add removable active-filter labels and contextual empty states.
- Edit additional work dates and preview exact per-day estimate allocation.
- Add visual repeat intervals, weekly days, counts and five-date previews without replacing the guarded engine or advanced RRULE mode.
- Keep up to 20 recent form drafts and show inline save errors; protect task forms from overwriting external edits.
- Add commands to open Today, Calendar and Inbox.
- Lighten neutral borders and typography, and compute visible daily loads in one pass per series.
- Add portable, deterministic source ZIP packaging with automatically included new modules.


- Keep calendar type/priority/deadline markers beside titles without a separate footer; keep continuation surfaces transparent.
- Align the first title line with its checkbox consistently on marked and plain cards; remove the forced two-line minimum height.
- Quiet empty dates and grid lines; emphasize today with a bolder date and accent top border.
- Reduce day headings to date and planned time, with accessible hover/tap load details that close on Escape, outside interaction, scrolling or resize.

- Give a same-day task start/deadline card matching straight status rails on both sides; keep multi-day closing cards right-only.

- Make list Filters explicit and keep their active indicator synchronized; distinguish quick-capture project assignment. Exercise actual filter controls across sections and pane widths.
- Add confirmed project/area trash actions in the hierarchy and edit forms, preserving linked notes and supporting Undo.
- Keep failed overdue tasks/occurrences out of Today and the Today board while retaining calendar history and late completion history.

- Show complete wrapping task and continuation titles even with task details off; remove fixed title/card heights and line limits while retaining minimum touch sizes and aligned weekly lanes.

- Keep the monthly entry-limit checkbox usable in Day and Week, so its active state can always be cleared; add regression coverage across details and period combinations.
- Remove the spacing option and its unused state/styles/translations.

- Reduce primary calendar controls to period selection and one display icon; replace secondary button pairs with five labelled native checkboxes.
- Move the final task card’s status stripe to the right while preserving title alignment and overdue color.

- Quiet continuation typography, lighter day lines and clearer week boundaries; use straight, square status rails without protruding chain end caps.
- Group secondary options under Display, keep fixed compact spacing, and shorten empty phone days while preserving a 44 px date action.

- Align multi-day work and deadlines on packed weekly rows in wide calendars, retaining the narrow agenda and a fallback for older browsers.
- Add linked-card highlighting, daily capacity meters, deadline icons, date navigation from the period title and drag destination previews.

- Refine calendar alignment, neutral card surfaces, today/weekend landmarks and grouped controls.
- Replace intermediate cards with compact status-aware continuation strips; keep time, priority and original-task editing.
- Add optional Month overview: three entries per day and an accessible link to the complete day; all entries remain visible by default.
- Keep narrow panes as readable agendas, with whole-page scrolling and touch targets.

## 1.0.5

- Fix Obsidian review findings: textarea sizing uses setCssStyles, selection controls use createDiv/createSpan, and the redundant ToggleEvent assertion is removed.
- Replace :has selectors with an explicit expansion class and use gap shorthands.
- Precisely type three upstream declaration signatures, keeping executable vendor bytes unchanged.
- Add pinned official Obsidian lint to Checks and Release; audit the isolated toolchain and fail on source warnings.
- Validate YAML scalars before converting them to text; malformed recurrence remains flagged rather than silently discarded.

## 1.0.4

- Correct workload for multiple repeats moved onto one day and explicitly reopened repeats in legacy closed series.
- Synchronize programmatic choice labels and saved clock values without firing change handlers; fit menus with a bounded nonrecursive loop.
- Remove unused task-context styling and date helper; reconcile release, mobile and calendar documentation.

- Equal closed calendar card heights, vertical ellipsis and status-aware continuation marks. Long names expand through the disclosure.

- Minimal calendar cards show checkbox, title and uniform icons; ellipsis reveals project/time/actions, including area/project context. Subtle intermediate-day marks connect start to deadline without workload or completion controls.

- Improve phone layouts, touch controls and readable calendar agendas.
- Add an independent failed-task calendar filter and low priority; use red/white outlined priority markers.
- Add explicit subscription editing and protect stale forms with field-level conflict checks.
- Use consistent themed selection controls with keyboard navigation, searchable long catalogs and pagination.
- Remove component scroll areas and restore whole-page scrolling over the calendar; use uniform compact heights with full titles available in task details.


## 1.0.3

- Reissue the verified 1.0.2 corrections under a distinct version for a new Community release review; retain the same runtime code, interface and data format.
- Preserve strict source/bundle verification, compatibility with Obsidian 1.7.2 and safe retries of GitHub Release publication.
- Replace obsolete bundle-synchronization instructions with the verified-source publication procedure.

## 1.0.2

- Guard the Obsidian 1.13 settings update API explicitly while keeping the 1.7.2 settings fallback; verify language changes on a host without `update()`.
- Use owning-node Obsidian DOM helpers and preserve control-character filename protection without control-character regular expressions.
- Restore strict committed-bundle verification on all CI branches without auto-commits; build `main.js` only from TypeScript.
- Keep transparent completion/title/day controls readable under theme button overrides and preserve keyboard focus when toggling navigation.
- Fit all seven Week/Month columns in narrow panes, preserve full names and scope interface size to views and modals for pop-outs.
- Correct regression tests for rebuilt sidebar elements and expandable filters; add a theme/responsive/keyboard matrix.

- Refine sidebar alignment and navigation spacing, and keep utility actions flat without background blocks.

- Reduce typography, card padding and vertical spacing, especially across Day/Week/Month calendar layouts, while keeping full task titles visible.
- Add an adjustable 85–115% planner interface scale for fonts and spacing.
- Brighten the To do status accent and replace the collapsed sidebar rail with a single borderless chevron in the page header.
- Keep area/project filters in a compact expandable panel, while calendar completed/recurring toggles remain visible beside Day/Week/Month.
- Align search, quick task entry and date controls to a consistent height and horizontal inset.
- Align calendar daily load with its date and format duration in hours and minutes; keep unknown estimates discoverable through a small counter with a tooltip.
- Improve Obsidian Community review compatibility: reduce CSS override and selector complexity, add searchable settings for Obsidian 1.13+ while retaining settings on older versions, and tighten handling of loaded settings.
- Limit GitHub Release assets to the three files Obsidian installs and add GitHub artifact provenance attestations for all three assets.

## 1.0.1

- Keep planner leaves in their workspace positions during plugin unload and updates by letting Obsidian manage their lifecycle.

## 1.0.0 — Initial release

- Local Markdown tasks, areas and projects, with Today, Inbox, Upcoming, Calendar and Boards.
- Five workflow statuses, appointment times, priority/type markers and manual actual minutes.
- Guarded date-based recurring tasks with independent occurrence history and optional end dates.
- Day/Week/Month calendar, selected work dates, separate deadlines, exact estimate distribution and daily workload.
- Independent completed/recurring visibility controls and a collapsible left menu.
- Current-calendar work and financial reporting, complete period charts and detailed values on demand.
- Payments, subscription charge history, separate currency charts and optional project/area budgets.
- English/Russian interfaces and Guide, theme accents and responsive controls.
- Conflict-aware Undo, safe trash, preserved unknown metadata and explicit copy-based legacy import.

Calendar appearance: **Minimal view** collapses task context; **Detailed view** expands all task titles, area/project context, time and actions. The choice stays in the open planner view across day/week/month and tab navigation. Outside clicks do not collapse Detailed view. Calendar cards are separated by 7 px on desktop and 8 px in the narrow agenda.

Calendar cards now retain assigned HH:mm time before the title in Minimal and Detailed views, including continuation marks. No duplicate time appears in the expanded metadata, and untimed tasks keep their previous appearance.
