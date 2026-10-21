# Tiny Planner 1.0.4

- Phone layouts and readable dated calendar agendas, with touch-sized controls.
- Independent Hide failed filter and Low priority, shown with a transparent white marker. High priority is red.
- Explicit subscription editing. Unchanged fields preserve outside edits; conflicting edits fail atomically and leave the form open. History and Undo are preserved.
- Consistent themed choice fields with search and pages for long lists, keyboard support and no nested scrollbars.
- Minimal calendar cards with up to two title lines and expandable full titles, with consistent icons; project/time/actions appear on ellipsis. Subtle intermediate-day marks connect start and deadline without checkboxes or workload. Only one page scroller. Calendar cells, navigation and tables no longer trap wheel or touch scrolling.

Minimum Obsidian version remains 1.7.2. Data schema remains 1. This release is prepared locally; creating the GitHub tag or publishing requires separate authorization.

Calendar work, deadline and continuation cards use the same closed height with up to two title lines. The vertical ellipsis expands metadata and the full title; opening a task also shows its full name. Continuations inherit all five statuses and their colors; Done and Failed titles are struck through. Filters and Undo keep these marks synchronized.

Calendar appearance: **Minimal view** collapses task context; **Detailed view** expands all task titles, area/project context, time and actions. The choice stays in the open planner view across day/week/month and tab navigation. Outside clicks do not collapse Detailed view. Calendar cards are separated by 7 px on desktop and 8 px in the narrow agenda.

Calendar polish: expanded card context and four equal action buttons align with the title after the checkbox. Project and overdue/deadline labels wrap on their own rows. Period, appearance and visibility controls use consistent button sizing, borders, selected states and keyboard focus, with symmetric responsive groups.

Calendar controls now distinguish their roles: a shared segmented period switch, underlined appearance tabs, and rectangular visibility buttons with state indicators. Thin separators become horizontal in narrow panes; keyboard focus and touch targets remain visible.

Choice menus float above the page and never resize forms or calendar pickers. Search and viewport-adaptive pagination avoid internal scrollbars. Status-type tasks retain a flag; final task deadlines use a calendar-clock icon. Yellow task accents mean In progress, including continuation marks, independently of priority.

The built-in bilingual guide now has a Colors and icons chapter with five status swatches, priority markers and the actual task/action icons. Continuation titles reserve the same empty checkbox gutter as ordinary cards. Only visibility filter buttons use a compact 4 px corner radius and indicators centered 16 px from the leading edge.

Final audit: choice labels follow programmatic changes without firing business handlers; clock choices initially show the saved time. Choice-menu height fitting uses a bounded loop without recursive rendering. Removed unused legacy task-context CSS and date formatting helper. README, guide and technical planning documentation were reconciled with 1.0.4. CI jobs have a 20-minute bound.

Workload counts each active repeat independently when several repeats share a day, including explicitly reopened records in a legacy closed series.

Calendar cards now retain assigned HH:mm time before the title in Minimal and Detailed views, including continuation marks. No duplicate time appears in the expanded metadata, and untimed tasks keep their previous appearance.
