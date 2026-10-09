# Changelog

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
