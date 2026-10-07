# Real Obsidian verification

Browser tests emulate the API. Use a disposable vault with demonstration notes for these application compatibility checks.

1. Install the final main.js, manifest.json and styles.css together. Enable the plugin, open every view, then disable/re-enable and restart Obsidian. Check the developer console for unexpected errors.
2. Repeat with Minimal Theme in dark/light modes, change its accent, and use a narrow pane. Inspect full titles/context, dates, charts, keyboard focus and stable controls.
3. Collapse/expand the left menu, keep an unsaved quick-entry draft, switch to Guide and back, and confirm the single toggle stays available.
4. Create a task with a planned date, a separate deadline and an estimate. Check both calendar cards and move them independently; Undo each change. Add two valid dates to the note's `workDates` frontmatter and set `plannedMinutes: 91`. Expect 31/30/30 on the three work days, no intermediate copies, and unchanged work dates after editing the title or estimate in the form.
5. Complete older work today with minutes, then reopen. Work reporting must use its planned day; reopening removes closed totals without erasing minutes. Completed cards show Plan/Spent when supplied.
   In Boards → Today, closed work uses its resolution date. Check an older closed task with no resolution date and a future deadline: it must stay out of Today and remain in All. Repeat for Failed and for a recurring record with only a saved resolution timestamp.
6. Create weekday and monthly repeats, complete/skip/move individual occurrences, and stop/resume a series. Independent Hide completed/Hide recurring calendar controls must leave totals and notes intact.
7. Record payments and subscription charges in two currencies. Confirm actual payment dates drive spending, every currency chart remains visible, and payments/subscriptions do not increase work metrics. Check duplicate-charge prevention and Undo.
8. Change Week/Month/Quarter/Year in work, finance and payment reports. Verify full current-calendar bounds, shared period, grouped chart values, exact daily details and retained scroll.
9. Set a monthly project/area budget. Check actual, planned and remaining values per currency, including zero/blank limits and cross-currency warnings.
10. Edit unknown frontmatter and the note body outside the plugin. Save through the planner and confirm they survive. Create an Undo conflict and confirm it is refused.
11. Rename/delete a containing planner folder; corrupt/repair planner frontmatter; reclassify a note while its modal is open. Stale entries must disappear and stale mutations/delete must refuse unrelated or future notes.
12. Move a planner view into a native pop-out window. Check forms, date/time pickers, board dragging, navigation and resizing. Keep the view open across midnight or wake after a day change; today's header date must refresh.
13. Repeat essential creation, editing, date/time entry, navigation and financial checks on a real mobile device. The manifest enables mobile; it is not a device test result.
14. Verify the declared `minAppVersion` on that Obsidian version. Keep `versions.json` consistent with any compatibility changes.
