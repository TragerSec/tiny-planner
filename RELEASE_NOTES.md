# Tiny Planner 1.0.2

- Add an interface size setting (85–115%) for planner text, spacing and calendar density.
- Use a brighter azure-blue accent for To do tasks.
- Remove the collapsed sidebar rail: one plain chevron moves to the page header and leaves the content full-width.
- Move area/project filters into a compact expandable panel next to search. Keep the completed/recurring calendar buttons visible beside Day/Week/Month. Align search, task entry and date controls to the same height.
- Display calendar day workload in hours and minutes beside the date, with a compact count for tasks without estimates.
- Preserve full task names, existing task data and calendar visibility settings.
- Align sidebar brand, navigation and utility links on one gutter; add navigation spacing and remove utility-button fills.
- Refine stylesheet selectors for theme compatibility and lower rendering overhead. Add modern searchable settings on Obsidian 1.13+ with a legacy fallback.
- GitHub Release now includes only supported Obsidian assets, with provenance attestations for all three release assets.

- Keep completion circles, task titles and sidebar utility actions transparent across theme button skins, with a rounded keyboard focus indicator on completion circles.
- Keep all seven Week/Month calendar columns within narrow panes, without an internal horizontal scroller or clipped task titles.
- Preserve keyboard focus when collapsing navigation and apply interface scale to the owning planner view and modal, including pop-out windows.
- Restore strict source/bundle verification on every CI branch and remove automatic commits of generated bundles. Correct regression tests for rebuilt navigation and expandable filters.

Update the separate `main.js`, `manifest.json` and `styles.css` files together. Obsidian 1.7.2 or newer is required.
