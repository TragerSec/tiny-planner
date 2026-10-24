# Tiny Planner guide

Tiny Planner keeps tasks, projects, recurring work and subscription forecasts in Markdown notes in your Obsidian vault. The working interface supports English and Russian; this file and the project documentation are in English. The built-in Guide follows the selected interface language.

## Areas, projects and tasks

An **area** is an ongoing part of life, such as Home or Work. A **project** groups actions toward an outcome. A **task** is an individual action. Tasks without a recognized project appear in Inbox. Changing a project status does not change its tasks.

## Capture and edit

The single panel button at the top of the left menu collapses or expands navigation, including in Guide. When collapsed, the same chevron moves to the page header and the content uses the full width. The navigation choice, selected section, calendar display and filters are restored on reopening; calendar dates return to the current period.

Type a task title in quick entry and press Enter or **+**. The date stays beside the title; **Options** reveals project, optional time and status. The sliders button opens the full form. Click a task title to edit its description, result, status, dates, recurrence, priority and spent minutes.

**Description and result** keeps the input brief separate from the outcome. Both fields accept multiline text and are saved with the task. Results remain when a task is reopened; each recurring occurrence has its own result. Unsaved results participate in draft recovery. In Month, a small underline under the date numbers marks the current Monday–Sunday week without a background fill; today retains its stronger date marker.

A task can have no project or date. Today starts with today's date; Inbox starts without a date. The date picker lets you choose a day, month and year, use today or clear the field. Typed dates follow the setting: DD.MM.YYYY, MM/DD/YYYY or YYYY-MM-DD. Compact digits and ISO paste are accepted. The clock picker uses local 24-hour HH:mm; 1400 becomes 14:00. Appointment time does not send a reminder.

## Statuses and Undo

- **Backlog:** deferred work.
- **To do:** planned work.
- **In progress:** started work.
- **Done:** completed work.
- **Failed:** closed without completion.

The checkmark completes or reopens a task; the cross marks failure or reopens it. Boards offers a status selector and drag-and-drop. Done and Failed titles are struck through in both calendar and board cards, with full readable text contrast.

Undo reverses up to 50 changes in the current session. It supports edits, status changes, rescheduling, occurrence deletion, trash restoration and subscription cancellation/resumption. Creation and import are excluded. Restarting clears Undo history. Conflicting external edits are preserved.

## Recurring work

Daily, weekly, weekday, monthly, yearly and custom RRULE schedules are available. Date anchors the series; **Repeat through** is an optional inclusive last date. A weekday series anchored on a weekend begins on Monday. The form previews up to five actual repeats. Set schedule edits the interval, period, weekly days and an optional repeat count. Complex rules keep the advanced RRULE editor. A range without matching dates cannot be saved.

Each occurrence has its own original date key, status, resolution date and spent minutes. Minutes entered when creating a series belong to its first actual occurrence. Future occurrences start independently. Moving a repeat changes its display date while retaining its original identity. Delete can remove one occurrence or the whole series note.

Stop future repeats retains saved history. Resume does not extend a planned end date. Monthly task rules on day 31 skip months without that day. Unsupported or excessive rules display a warning and remain read-only until edited. Series-level minutes from older notes are preserved in statistics details as unallocated time; they are not guessed to belong to a completed occurrence.

## Calendar and boards

Ordinary calendar lists put **Done first, then Failed, then unfinished work**. Wide Week and Month display aligned multi-day rows before these ordinary lists. Within each group, appointment times run earliest to latest, followed by untimed work. Every calendar card is visible directly by default. Optional **Month overview** shows the first three entries per day, including project deadlines, task continuations and subscription payments; **Show more** opens that day with every entry. The setting is restored on reopening and only applies to Month. Filters apply before counting. Cards have neutral surfaces and thin status accents; today has a subtle outline and weekends a faint background. Continuation marks show their complete wrapping title and an arrow in the checkbox gutter. Titles use normal theme text color; closed status is conveyed by the strike-through and status accent.

Project deadlines appear above ordinary one-day tasks, below aligned multi-day rows in a wide calendar. Active subscription payments use a separate section. Drag work onto another date or use Reschedule. Hovering over a month arrow during a drag changes the visible month. Dragging a work-day card moves only that day, and dragging a deadline moves only the deadline.

Boards shows one representative card per task or recurring series. For a series, it represents the earliest pending repeat, today's repeat or the next repeat. Changing status affects that occurrence. Exhausted series remain read-only until the rule is changed. Date scopes include overdue unfinished work; undated work has its own scope. Done and Failed cards use their actual resolution day, or their planned day if no resolution date was recorded. A later deadline does not keep closed work on Today. All retains the full history. Columns paginate at 12 cards.

## Statistics

Work statistics start with the selected calendar period, its complete date range, completed/failed results and recorded time. Both history charts use lines on one axis. Overall statistics and project progress are explicitly marked All time; daily numbers, project tables and additional metrics remain collapsed. Area, project and search filters affect all figures. The existing current-week workload is available in a separate disclosure.

One-off progress is Done divided by all one-off tasks, including Failed. Recurring series and recorded resolutions are counted separately. Completion and work-time charts use the task’s scheduled day, or its due day when no start date exists. A repeating task uses its occurrence day, including a saved move. An unscheduled task uses its closure date as a fallback. Closing September 29 work in October therefore keeps its reporting day on September 29; closure metadata is preserved separately. Applying an unchanged status preserves its resolution date. Reopening removes that completion and its minutes from the closed totals and period charts.

Work completion and failure counts use separate lines on one shared scale. Closed minutes have a separate line chart. Every period bucket is retained, including zero-value dates, with sparse horizontal date labels. Daily figures remain available in the disclosure table.

**Closed work time** for work records includes manually saved minutes on Done and Failed one-off tasks and recorded recurring occurrences. Minutes on unfinished work are preserved, but are shown under Additional metrics rather than in the main closed total. Additional metrics also shows all saved minutes and legacy series time without an occurrence. Undated closed entries count in all-time totals; they cannot be assigned to a day. Skipped occurrences, payment tasks and subscriptions are excluded from work statistics.

## Expenses and financial statistics

The period selector is shared by Work, Finances and Expenses → Payments while the planner view is open. The complete date range appears directly beneath the period buttons. Today’s date is beside the page actions; expense, project-cost and budget ranges are compact parts of their section headings. Week means the current Monday–Sunday week; Month, Quarter and Year include the complete current calendar month, quarter and year. Financial history shows all currencies simultaneously, each in a separate line chart with the same dates and its own monetary scale. The daily disclosure includes every currency; the currency selector applies only to project allocation. Currencies are not converted or summed. Expenses has Payments and Subscriptions sections: upcoming payments and paid expenses appear together; the subscription catalog and its monthly estimate are independent of report periods. Overdue, undated and unsuccessful payments are grouped under Payments to review. Add expense/Add subscription open the corresponding section.

A subscription stores a title, amount per billing period, three-letter currency code, monthly/yearly period, optional first payment date, project and description. An empty amount is explicitly unpriced; zero means free. Cancel and resume support Undo.

**First payment** anchors the calendar forecast. A monthly subscription anchored on the 1st appears on the 1st of subsequent months. Annual subscriptions appear once per year and display the full annual charge. If the anchor day is missing, the forecast uses the last day of that month and returns to the original day when possible: January 31 → February 28/29 → March 31. February 29 annual charges use February 28 in non-leap years.

Only active, dated subscriptions appear in the calendar. The subscription catalog shows the next unrecorded payment on or after today; the calendar shows unrecorded billing dates throughout the displayed period, including past dates. Changing the amount or anchor updates future forecasts. Cancellation removes the forecast. Calendar amounts are expected commitments, not a ledger of paid transactions.

The subscription section estimates monthly commitments: active priced subscriptions only, annual amount divided by 12, totals separate by currency. There is no currency conversion or title-based price inference. Subscription payments remain excluded from Today, Inbox, Upcoming, boards, project task progress and work statistics.

The **Expenses** tab brings payment tasks and subscriptions together. **Add expense** opens a payment form with Paid selected and today's date; select To do instead to plan a future payment. Payment notes keep the ordinary task workflow, priority, project and calendar presence. There is no second copy of a payment. Areas can represent departments, and projects can represent cost centers or initiatives. Existing area, project and search filters apply to financial totals. This is a local manual tracker; it does not connect to a bank or automatically post transactions.

A payment stores `amount` and `currency`. **Paid** counts as actual spending; **Not paid** does not. Reopening removes the expense from actual totals while preserving entered amounts. One-off payments store a `topPayment` snapshot and use `completedDate` as the actual payment day. Recurring payments store the amount, currency and actual resolution date in each `topOccurrences` entry. Moving or stopping a series and changing its default price preserve paid snapshots. Editing a paid repeat changes only its recorded amount, currency and payment date. To change the series default for future payments, open a pending repeat. A payment date is required when saving Paid in the form; undated legacy records are not silently assigned today's date. Type and one-off/recurring mode cannot be changed while payment snapshots exist; create a separate note instead. Skip excludes the skipped repeat from actual totals. Undo supports payment status and record edits.

Subscriptions require an explicit **Record charge** action. The scheduled billing day identifies that charge; the separate payment day determines which reporting period it belongs to. Each billing key can be recorded once. You may record a past charge or an advance payment by choosing its billing date. `topCharges` stores amount, currency and payment day by original billing key. Recording removes that billing date from the calendar and upcoming forecast. Changing a subscription's price or cancelling it preserves recorded charges. **Undo payment** removes the record and restores its forecast when the subscription remains active; Undo can restore the removed record. Keep the subscription anchor unchanged when merely recording a charge.

**Statistics → Work** excludes payments and subscriptions from task progress and time. **Statistics → Finances** shows spent/planned totals, spending over time, exact daily sums and a project breakdown. Paid expenses, editable payment plans, subscription management and Undo payment belong to **Expenses**; statistics provides a link to that ledger and does not repeat its transaction lists. **Week / Month / Quarter / Year** select the current calendar period in the local date: Monday–Sunday, the first–last day of the current month, the current three-month quarter, or January 1–December 31. The full range is displayed and includes future dates within that period; there is no rolling window from today. Leap years include February 29. Charts fit the pane without horizontal scrolling: weeks and months show every day, quarters group days into weeks, and years group them into calendar months. Line charts retain the whole period on one axis, with fewer visible date labels in narrow panes and all data points accessible by keyboard. Exact daily values, including zero days, remain in the expandable detail table. Switching periods preserves your scroll position. Expenses uses the same period selector, with paid history and a separate dated payment plan; overdue and undated payments appear separately. The subscription catalog and its monthly estimate are independent of that period. Currencies are kept separate: every currency has its own financial chart, and the currency selector applies to the project breakdown. Annual subscription forecasts use the full charge, while the monthly commitment estimate uses annual price / 12. These figures are not added together.

Unpriced payments are marked explicitly and excluded from amount totals; zero is a valid free payment. Actual records without a payment date cannot be assigned to a period and are flagged. Pending undated payments are flagged and remain in Expenses, without invented forecast dates. Overdue payment tasks have a separate section; the payment plan covers the complete selected calendar period. Pending payments before its start are shown separately as overdue. Payment forecasts use their scheduled start day, or the due day when no start is set. A task range overlapping the forecast window does not move an older planned payment date into that window. Failed and cancelled legacy payments are not spending. No currency conversion, revenue accounting or shared-vault access control is provided.

## Storage and import

Defaults are Planner/Areas, Planner/Projects and Planner/Tasks. Settings change the root folder, interface language and date format. Native records use topSchema: 1. Existing bodies and unknown frontmatter fields are preserved; Obsidian may normalize YAML formatting and comments.

Optional Import old TOP notes copies Tasks/ and Projects/ into the configured folders and leaves originals intact. topLegacySource makes repeat imports idempotent. Finished legacy timers become manual minutes; unfinished timers do not run. Dataview and TaskNotes are unnecessary.

The plugin uses Obsidian APIs without an account, telemetry, remote code or runtime network requests. Vault synchronization is whatever you already use. The built-in Guide includes the manifest's author and version.

The calendar toolbar includes **Hide completed** / **Show completed**. It only filters completed task occurrences in the calendar, retains failed tasks and subscription forecasts, and never changes notes or spending totals. The choice is restored on reopening. **Hide recurring** / **Show recurring** hides all task cards belonging to recurrence series in Day, Week and Month, independently of the completed filter. The choice is restored on reopening. Planned workload and subscription forecasts remain visible; other tabs and note data are unchanged.

Period behavior, chart grouping, financial accounting rules and subscription estimate explanations are documented in the English/Russian built-in guide rather than shown as long explanatory paragraphs on the work or expense dashboards.

Project dropdowns in task and subscription forms, quick entry and filters sort alphabetically by the visible area/project label, with a stable path tie-breaker. Calendar visibility, subscription cancellation/resumption and series stop/resume controls reserve both state labels’ widths, so pressing them does not resize their buttons.

By default the calendar renders every selected work day, separate deadline, project deadline and subscription charge directly. Optional Month overview shows three entries with a Show more link to the complete day. Wide calendars align multi-day tasks on weekly rows; Day and narrow agendas place separate deadline cards after ordinary work and subscription charges. Full task titles always wrap without clipping; the vertical ellipsis reveals wrapping project labels; areas are shown beside projects. The completed-task toggle remains calendar-only.

## Work days, deadlines and workload

The task's main **Date** is its primary work day; **Deadline** is the separate final limit. In **Planning**, add or remove additional work days and review their share of the estimate. Dates in the note's `workDates` field remain visible in Calendar **Day / Week / Month**. Subtle continuation marks appear between the start and deadline. They open the original task, have no checkbox and do not create work sessions or additional workload. A work day identical to the deadline creates one card. Each task retains one status and one total of actual minutes. Recurring tasks use their rule instead of extra work days. Work dates after the deadline are rejected. The Today/Tomorrow shortcut changes the primary work day without replacing the deadline.

Dragging a work-day card moves only that day. Dragging a deadline-only card moves only the deadline. Other reschedule actions retain their existing task-range behavior. Existing notes are not migrated or rewritten: their scheduled day and due day become the visible calendar events.

**Estimated time** estimates the whole task, independently of manually entered spent minutes. Its total is split evenly among unique work days with exact integer rounding: 91 minutes over three days becomes 31, 30 and 30. With no work days it belongs to the deadline. Each recurring occurrence receives the full estimate. Closed work, payment tasks and subscriptions do not enter the outstanding load. Unknown estimates are counted separately. Daily capacity is configurable, defaults to 480 minutes and may range from zero to 1440; zero means no available time. Calendar, Today and the current-week panel in work statistics use these estimates. They do not start a timer or infer time spent.

## Budgets

Edit a project or area to set an optional **Monthly budget** and three-letter currency, or choose it through **Statistics → Finances → Budgets**. Blank removes the budget; zero is a valid configured limit. Budgets use the selected current calendar period: one monthly limit for a month, three for a quarter, twelve for a year. Weeks and partial months prorate the monthly amount by their actual calendar days, including leap days.

**Spent** uses actual payment dates and saved paid snapshots. **Planned** uses outstanding payment tasks and unrecorded subscription charges inside the period. **Remaining** is limit minus spent; **After planned payments** also subtracts the forecast. Overruns are marked in red. Unpriced commitments and other currencies are explicitly flagged, with no exchange conversion.

An area budget includes expenses from its linked projects. Project and area limits are independent; overlapping limits are not added into a grand budget or treated as duplicate expense records. Existing area/project/search filters narrow the spending shown. Payment entries, edits and charge recording remain in Expenses; financial statistics provides aggregates and budget comparisons without repeating the transaction ledger.

Optional note fields are `workDates`, `plannedMinutes`, `monthlyBudget` and `budgetCurrency`; existing fields and unknown metadata are preserved. Capacity is stored in plugin settings.

## Workload presentation and day agenda

Week/month workload totals show explicitly estimated time, unique one-off tasks without estimates (recurring occurrences counted separately), and the number of overloaded days. Available time is labelled separately in Day and Today, using the daily setting. Unknown estimates display “Time not estimated” and no empty progress bar. Day view is a compact agenda capped at 880 px. It uses the same Minimal/Detailed appearance as Week and Month; title, area/project, time and four action buttons are available in the task disclosure. It retains all cards, the date-add action, completion toggle and independent calendar moves.

The document icon sits beside the task title rather than among time metadata. Card estimates are formatted as **Estimate: 3 h** or **Estimate: 1 h 30 min**; the form accepts minutes. The displayed estimate remains the whole task total, while daily workload retains its existing exact distribution.

Completed work cards in lists, the calendar and boards show **Plan: 3 h** and **Spent: 2 h 15 min** when the corresponding estimate and positive spent minutes exist. Unrecorded spent time is omitted, rather than shown as zero; missing estimates are omitted too. Repeats use the selected occurrence’s spent minutes. Reopening retains saved minutes and switches the estimate label back to Estimate.

## Mobile and compact calendar

Small panes (up to 1100 px) show Week and Month as a dated agenda, retaining all tasks, deadlines and subscription forecasts. Larger panes retain the seven-column calendar. Phone navigation wraps and forms use a single column. Only the planner page scrolls; calendar days, navigation and statistics have no internal scroll areas. Compact cards show the status checkbox, full wrapping titles and consistent icons. Titles are readable with task details off; project names appear when details are expanded. The ellipsis reveals project, time and actions inline; the area is shown beside the project from calendar cards. Subtle intermediate-day marks connect start and deadline without checkboxes or additional workload. Escape, outside click or focus leaving the disclosure closes it.

All choice fields use theme-owned controls. Long catalogs offer search and pages; they never introduce a nested scrollbar. Keyboard users can open a field with Enter or an arrow key, move with arrows, choose with Enter, and close with Escape.

The Display icon contains independent **Completed**, **Failed** and **Recurring** checkboxes. Checked means visible. They apply across Day, Week and Month without changing notes, work estimates or subscription forecasts.

Priority offers **Low / Normal / High**. High has a red outlined ! marker; Low has a white outlined downward arrow with a transparent background. Normal has no extra marker. Lists, calendar and boards show the priority.

Use **Expenses → Subscriptions → Edit subscription** to change subscription fields. Untouched fields retain outside edits. Independent edits merge; a conflict in the same field rejects the whole save and leaves the form open. Reopen it to resolve the conflict. Charge history, unknown metadata and note bodies are preserved. Undo restores only fields changed by the operation.

Calendar work and deadline cards grow to show their complete titles, without line limits. Intermediate continuation strips also wrap the complete title and use a direction arrow; their leading text edge matches ordinary cards. In narrow panes they retain at least a 44 px tap target. The vertical ellipsis expands metadata; opening a task also shows its full name. Continuations inherit all five statuses and their colors; Done and Failed titles are struck through. Filters and Undo keep these marks synchronized.

Calendar appearance: the **Task details** checkbox expands all task titles, area/project context, time and actions. Clearing it restores minimal cards. The choice stays in the open planner view across day/week/month and tab navigation. Outside clicks do not collapse details. Calendar cards are separated by 7 px on desktop and 8 px in the narrow agenda.

Calendar polish: expanded card context and four equal action buttons align with the title after the checkbox. Project and overdue/deadline labels wrap on their own rows. Period, appearance and visibility controls use consistent button sizing, borders, selected states and keyboard focus, with symmetric responsive groups.

Calendar controls distinguish their roles: a segmented period switch and one display icon. Secondary choices use checkboxes in two separated groups; keyboard focus and touch targets remain visible.

Choice menus float above the page and never resize forms or calendar pickers. Search and viewport-adaptive pagination avoid internal scrollbars. Status-type tasks retain a flag; final task deadlines use a calendar-clock icon. Yellow task accents mean In progress, including continuation marks, independently of priority.

The built-in bilingual guide has a Colors and icons chapter with five status swatches, priority markers and the actual task/action icons. Continuation titles reserve the same checkbox gutter as ordinary cards, with a small direction arrow instead of a checkbox. Display checkboxes have fixed captions and labels with a touch target of at least 44 px.

Assigned task time (HH:mm) stays visible before the title in both Minimal and Detailed calendar views, including work, deadline and continuation cards. Untimed tasks show no placeholder. This is the optional local appointment time, not the estimated duration.

### Aligned deadline rows and calendar navigation

In a wide Week or Month, tasks with a start before their deadline occupy shared rows across the week. The lowest available row is reused after its inclusive deadline; each week is packed independently to minimize empty space. There are no placeholder cards. Expanded details grow the shared row automatically and preserve alignment. Ordinary entries follow below; Day and narrow panes keep the compact agenda. A browser without CSS subgrid uses the ordinary layout.

Hover or keyboard focus highlights the related start, continuation and deadline. The final date carries the distinct calendar-clock icon, including a work day that coincides with its deadline. A thin bar and planned/available time show daily capacity; overload is marked red. Untimed estimates remain separate. Clicking the period title opens day/month/year navigation, validates real dates and accepts leap days. Dragging shows the destination date; dropping or cancelling removes the preview. These display controls do not change notes.

### Display controls

**Display** expands independent visibility filters, task details and the three-entry monthly limit. It starts collapsed; Enter/Space opens it and Escape closes it with focus restored. Choices remain in the open planner view. Continuations use quieter regular text and stronger time; status accents, closed-title tint/strikethrough and linked highlights remain. Straight status rails mark the start on the left and the deadline on the right, with square edges and no protruding caps. Day grid lines are faint and week boundaries stronger. Empty phone days are shorter with a full-width date button at least 44 px high. All these controls are presentation only, with no vault writes or nested scrolling.

### Simplified calendar controls

Only Day, Week, Month and a display icon remain on the calendar control row. The icon opens five native checkboxes in two groups. **Show tasks**: Completed, Failed, Recurring (checked means visible). **Cards**: Task details, Up to 3 entries per day (Month). Their labels stay fixed. Clearing Task details restores minimal cards; the monthly limit can be toggled in every view, including Day and Week, and only limits the Month view. Escape closes settings and restores focus. The last task card has its status stripe only on the right; a transparent leading border preserves title alignment. Overdue closing cards retain the red accent. No note data or task status changes when adjusting display.

### Filters and entity deletion

Use **Filters** beside search to select an area or project across sections. The project chooser in quick capture assigns the new task; it does not filter the list. The filter button shows its active state and Clear resets the search and selection.

Area headers and expanded project tools provide trash buttons, also available in entity edit forms. Confirmation deletes only the selected note, preserves linked tasks/projects and supports Undo. Deleting a project leaves its tasks accessible in Inbox; deleting an area retains its projects under the missing-area group. Undo reconnects their existing links.

Failing an overdue task or recurring occurrence no longer brings it into Today or the Today board. Calendar history and the All board retain it. Current-day failures remain available for reopening, while late completed work retains its completion-day history.

When task start and deadline share one day, the single calendar card has straight status rails on both sides. Multi-day closing cards retain only the right rail.

### Calendar reading rhythm

Task markers sit beside the first title line; equal visible line counts use equal compact card heights. Empty dates and grid separators recede; today has a stronger date and accented top edge. Day headers show the date, planned time and a compact workload bar on every week. The bar uses the existing planned-load/capacity calculation and turns red when overloaded. Hover or click/tap the time for capacity and estimates; Escape, outside clicks or scrolling closes the details. Unestimated-only days show a dash. Intermediate cards keep full titles, status rails and strikethrough on transparent surfaces.


## Usability preview · 23 October 2026

**Contact / Связаться** is a normal work task for a message or phone call, marked by a message icon. It supports dates, estimates, recurrence, priorities and task statuses.

The task editor initially shows title, project, type and dates. Planning, Repeat, Time tracking and Description are disclosures; saved values expand their sections automatically. Project/area budgets and subscription descriptions use disclosures too. Invalid inputs open their containing section. Active area/project/search filters appear as removable labels below quick entry. Empty sections distinguish an empty plan from no search matches.

Closed task, project, area and subscription editors keep up to 20 recent drafts in plugin settings. Reopen the same form to resume or discard its draft. Changes to an existing note require an explicit choice before restoring an old draft. Failed saves keep the input and show an inline error; stale task forms refuse to overwrite changed task fields. Changes to unrelated note fields or body are preserved. Drafts contain your input; retain your existing data.json during plugin upgrades.

The selected section, calendar mode/display, board scope, expense/statistics mode, sidebar and filters restore on reopening. An old calendar date is deliberately not restored: the current day/week/month is used. Unsaved quick-entry text continues to survive navigation within the open view. The commands **Open today**, **Open calendar** and **Open inbox** can be assigned Obsidian hotkeys.

For reproducible source archives run `npm run package:source` after the checks. It packages approved source roots, including newly added modules/tests, generates SHA-256 checksums and excludes dependencies, vaults, logs and private diagnostics. The source release is 1.0.6; run GitHub checks and an Obsidian preview scan on the final commit before tagging.

### Minimal reading surfaces

Task names use a neutral reading color; closed tasks are muted and struck through. Checkboxes, thin status rails and overdue labels carry status colors. Projects and reports use open sections with quiet dividers. On a desktop, hover a task row or focus it with the keyboard to reveal secondary actions; touch layouts keep those actions visible. Metadata wraps naturally without a separate repeated workflow line. Earlier references to colored task names are superseded by this presentation.

Saturday and Sunday headings and date numbers use a subtle theme-derived text color; their cells have the same background as weekdays. In Month, the current Monday–Sunday week has a small underline under the date numbers, without a week background fill. Today retains its own marker. Closed continuation cards keep muted text even when hovered or focused.
