# Tiny Planner guide

Tiny Planner keeps tasks, projects, recurring work and subscription forecasts in Markdown notes in your Obsidian vault. The working interface supports English and Russian; this file and the project documentation are in English. The built-in Guide follows the selected interface language.

## Areas, projects and tasks

An **area** is an ongoing part of life, such as Home or Work. A **project** groups actions toward an outcome. A **task** is an individual action. Tasks without a recognized project appear in Inbox. Changing a project status does not change its tasks.

## Capture and edit

The single panel button at the top of the left menu collapses or expands navigation, including in Guide. When collapsed, the same chevron moves to the page header and the content uses the full width. The choice lasts while this planner view is open.

Type a task title in quick entry and press Enter or **+**. The date stays beside the title; **Options** reveals project, optional time and status. The sliders button opens the full form. Click a task title to edit its description, status, dates, recurrence, priority and spent minutes.

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

Daily, weekly, weekday, monthly, yearly and custom RRULE schedules are available. Date anchors the series; **Repeat through** is an optional inclusive last date. A weekday series anchored on a weekend begins on Monday. The form shows the first actual repeat. A range without matching dates cannot be saved.

Each occurrence has its own original date key, status, resolution date and spent minutes. Minutes entered when creating a series belong to its first actual occurrence. Future occurrences start independently. Moving a repeat changes its display date while retaining its original identity. Delete can remove one occurrence or the whole series note.

Stop future repeats retains saved history. Resume does not extend a planned end date. Monthly task rules on day 31 skip months without that day. Unsupported or excessive rules display a warning and remain read-only until edited. Series-level minutes from older notes are preserved in statistics details as unallocated time; they are not guessed to belong to a completed occurrence.

## Calendar and boards

Calendar cells put **Done first, then Failed, then unfinished work**. Within each group, appointment times run earliest to latest, followed by untimed work. Every calendar card is visible directly. Titles use normal theme text color; closed status is conveyed by the strike-through and status accent.

Project deadlines appear above the day's tasks. Active subscription payments appear in a separate section at the bottom. Drag work onto another date or use Reschedule. Hovering over a month arrow during a drag changes the visible month. Dragging a work-day card moves only that day, and dragging a deadline moves only the deadline.

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

Only active, dated subscriptions appear in the calendar. Cards show the next payment on or after today. Changing the amount or anchor updates future forecasts. Cancellation removes the forecast. Calendar amounts are expected commitments, not a ledger of paid transactions.

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

The calendar toolbar includes **Hide completed** / **Show completed**. It only filters completed task occurrences in the calendar, retains failed tasks and subscription forecasts, and never changes notes or spending totals. The choice is remembered while that planner view stays open. **Hide recurring** / **Show recurring** hides all task cards belonging to recurrence series in Day, Week and Month, independently of the completed filter. The choice stays with the open view. Planned workload and subscription forecasts remain visible; other tabs and note data are unchanged.

Period behavior, chart grouping, financial accounting rules and subscription estimate explanations are documented in the English/Russian built-in guide rather than shown as long explanatory paragraphs on the work or expense dashboards.

Project dropdowns in task and subscription forms, quick entry and filters sort alphabetically by the visible area/project label, with a stable path tie-breaker. Calendar visibility, subscription cancellation/resumption and series stop/resume controls reserve both state labels’ widths, so pressing them does not resize their buttons.

The calendar renders selected work days, separate deadlines, project deadlines and subscription charges directly, without count or Show more buttons. Deadline-only cards follow ordinary work and subscription charges at the bottom of the same day cell. Full titles and area/project labels wrap without truncation. The completed-task toggle remains calendar-only.

## Work days, deadlines and workload

The task's main **Date** is its primary work day; **Deadline** is the separate final limit. Additional dates already stored in the note's `workDates` field are preserved when editing the task and remain visible in Calendar **Day / Week / Month**. The calendar does not fill every day between the first date and a distant deadline. A work day identical to the deadline creates one card. Each task retains one status and one total of actual minutes. Recurring tasks use their rule instead of extra work days. Work dates after the deadline are rejected. The Today/Tomorrow shortcut changes the primary work day without replacing the deadline.

Dragging a work-day card moves only that day. Dragging a deadline-only card moves only the deadline. Other reschedule actions retain their existing task-range behavior. Existing notes are not migrated or rewritten: their scheduled day and due day become the visible calendar events.

**Estimated time** estimates the whole task, independently of manually entered spent minutes. Its total is split evenly among unique work days with exact integer rounding: 91 minutes over three days becomes 31, 30 and 30. With no work days it belongs to the deadline. Each recurring occurrence receives the full estimate. Closed work, payment tasks and subscriptions do not enter the outstanding load. Unknown estimates are counted separately. Daily capacity is configurable, defaults to 480 minutes and may range from zero to 1440; zero means no available time. Calendar, Today and the current-week panel in work statistics use these estimates. They do not start a timer or infer time spent.

## Budgets

Edit a project or area to set an optional **Monthly budget** and three-letter currency, or choose it through **Statistics → Finances → Budgets**. Blank removes the budget; zero is a valid configured limit. Budgets use the selected current calendar period: one monthly limit for a month, three for a quarter, twelve for a year. Weeks and partial months prorate the monthly amount by their actual calendar days, including leap days.

**Spent** uses actual payment dates and saved paid snapshots. **Planned** uses outstanding payment tasks and unrecorded subscription charges inside the period. **Remaining** is limit minus spent; **After planned payments** also subtracts the forecast. Overruns are marked in red. Unpriced commitments and other currencies are explicitly flagged, with no exchange conversion.

An area budget includes expenses from its linked projects. Project and area limits are independent; overlapping limits are not added into a grand budget or treated as duplicate expense records. Existing area/project/search filters narrow the spending shown. Payment entries, edits and charge recording remain in Expenses; financial statistics provides aggregates and budget comparisons without repeating the transaction ledger.

Optional note fields are `workDates`, `plannedMinutes`, `monthlyBudget` and `budgetCurrency`; existing fields and unknown metadata are preserved. Capacity is stored in plugin settings.

## Workload presentation and day agenda

Week/month workload totals show explicitly estimated time, unique one-off tasks without estimates (recurring occurrences counted separately), and the number of overloaded days. Available time is labelled separately in Day and Today, using the daily setting. Unknown estimates display “Time not estimated” and no empty progress bar. Day view is a compact agenda capped at 880 px: full titles and project context, inline desktop actions and wrapping mobile actions. It retains all cards, the date-add action, completion toggle and independent calendar moves.

The document icon sits beside the task title rather than among time metadata. Card estimates are formatted as **Estimate: 3 h** or **Estimate: 1 h 30 min**; the form accepts minutes. The displayed estimate remains the whole task total, while daily workload retains its existing exact distribution.

Completed work cards in lists, the calendar and boards show **Plan: 3 h** and **Spent: 2 h 15 min** when the corresponding estimate and positive spent minutes exist. Unrecorded spent time is omitted, rather than shown as zero; missing estimates are omitted too. Repeats use the selected occurrence’s spent minutes. Reopening retains saved minutes and switches the estimate label back to Estimate.
