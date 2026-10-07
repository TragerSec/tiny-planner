# Schema version 1

Each planner record is an ordinary Markdown note. Only notes with `topSchema: 1` are indexed as native planner records. Reading is independent of TaskNotes and Dataview. Bodies and unknown fields survive planner updates through Obsidian's atomic `processFrontMatter()` API. YAML formatting/comments may be rewritten by that API.

## Area and project

```yaml
# Planner/Areas/Home.md
---
topSchema: 1
type: area
title: Home
---
```

```yaml
# Planner/Projects/Household.md
---
topSchema: 1
type: project
title: Household chores
area: '[[Planner/Areas/Home]]'
status: backlog # backlog | todo | in-progress | done | failed
due: null
---
```

## Task / recurring series

```yaml
---
topSchema: 1
type: task
title: Take out the trash
project: '[[Planner/Projects/Household]]'
status: todo # backlog | todo | in-progress | done | failed
description: |
  - [ ] Review
  - [ ] Release
scheduled: '2026-10-02'
due: null
recurrence: FREQ=DAILY
priority: normal # normal | high
taskType: task # task | meeting | payment | status; subscription is a separate expense record
actualMinutes: 0 # one-off total; historic unallocated time on imported series
topOccurrences:
  '2026-10-02':
    status: done
    minutes: 10
    resolvedOn: '2026-10-02' # local calendar date, used by Today history
    resolvedAt: '2026-10-02T14:00:00.000Z' # audit timestamp
  '2026-10-03':
    status: failed
    minutes: 0
    resolvedOn: '2026-10-03'
topMoves:
  '2026-10-04': '2026-11-06'
topSkipped: ['2026-10-05']
topSeriesEnd: '2026-10-10' # optional inclusive last generated day
complete_instances: ['2026-10-02'] # optional legacy-compatible completion index
---
```

`scheduled` anchors RRULE. Recurrence uses floating calendar dates represented internally at UTC midnight, with no timezone shifts. A due date is used as a one-off end/deadline; recurring tasks use their anchor and RRULE instead. RRULE daily/weekly/monthly/yearly frequencies, intervals, BYDAY, COUNT and UNTIL are supported by the bundled `rrule` library. Unknown rules are retained with a visible warning and can be edited in the task note.

An occurrence's identity is `(note path, original RRULE day)`. `topMoves` changes only its display date, preserving status and minutes. Two occurrences can share a display date. Completed/failed records remain in Calendar even after the rule changes. Skipped records are deliberately suppressed. `topSeriesEnd` restricts future generation but does not erase explicit recorded history.

`topOccurrences` takes precedence over `complete_instances`, including explicit unfinished states. Legacy `open` normalizes to `todo`. The series normally stays `status: todo`; global done/failed suppresses unrecorded occurrences. One-off `completedDate` / `failedDate` records the local resolution day. Resolution dates follow the current status: done uses only `completedDate`, failed uses only `failedDate`, and backlog/todo/in-progress use neither. Stale opposite-status dates do not enter history charts.

Full paths have priority for project/area resolution. Ambiguous display names are not guessed. UI renames change `title`, leaving path identity stable. External file renames use Obsidian's normal link-update mechanism.

## Migration

The legacy importer makes new version-1 notes and adds:

- `topLegacySource`: original note path, used for idempotency.
- `topLegacyProjects`: original multi-project values, if present.

Unknown metadata and note bodies are copied, not stripped. Original files remain untouched. Future schema versions are rejected explicitly; there is no silent downgrade. Future schema migrations should be versioned here before being implemented.

## Validation limits (1.0.0)

This is a date-based planner. Custom rules must have unique fields and use DAILY/WEEKLY/MONTHLY/YEARLY. Sub-day frequencies and non-zero BYHOUR/BYMINUTE/BYSECOND are rejected. Rule length is at most 1024 characters; COUNT/INTERVAL must be integers from 1 to 100000; recurrence anchors start in 1900 or later. Unknown/unsupported legacy rules are retained with a visible warning. Disabling recurrence preserves the selected occurrence status/minutes; inactive per-day metadata stays in the note for historical recovery. Each details save is one frontmatter operation and one Undo step.

Workflow and descriptions use schema version 1. Unknown fields and note bodies remain preserved. Descriptions are strings, edited as multiline Markdown text; service writes are capped at 100,000 characters. Date display preferences live in plugin settings, while all note dates remain ISO. Active occurrence statuses retain their recorded minutes and clear resolution dates when reopened. Creating a recurring task in Done/Failed affects its first matching occurrence only; future occurrences remain available.

## Subscription tracker

Legacy-compatible storage uses `type: task` with `taskType: subscription`; it is excluded at selector and analytics boundaries from task work/counts. The calendar renders a separate billing forecast from subscription fields, independent of task recurrence. New creation uses a separate form/service. Workflow actions reject subscriptions.

```yaml
topSchema: 1
type: task
taskType: subscription
title: Service
subscriptionActive: true
amount: 120 # null = unknown; zero = free; finite 0..1e12
currency: EUR # three-letter uppercase code, no conversion
billingPeriod: yearly # monthly | yearly
scheduled: null # optional payment date, not an actionable task
description: ''
project: ''
```

Old active state defaults from the legacy normalized status unless `subscriptionActive` is explicit. Blank amounts are not inferred from titles. Editing preserves unknown fields, body and legacy recurrence/history; old recurrence is not evaluated for subscriptions. No `completedDate` is generated by subscription cancellation. Monthly estimate divides annual fees by 12 and sums active priced records by currency separately.

Project status is now the shared Status type: backlog/todo/in-progress/done/failed. Legacy active → in-progress, paused/on-hold → backlog, completed/archived → done. Native notes are normalized in memory; no bulk migration. Saving changes uses canonical values. Project status does not cascade to task status.

TP-SEC-001: runtime recurrence uses the guarded upstream copy in `vendor/rrule`. Only iterator code differs; it respects bounded queries even with empty candidates, caps 20,000 periods and throws a named error. Simple generated results share the 20,000 bound; representative selection caps 256 resolved future candidates. Selectors fail closed with a visible warning and a read-only series; they never present partial generated results as complete. Analytics retains unsupported series/history separately. See vendor README and security regression tests.

## Planned recurrence end

The form exposes a calendar date as **Repeat through · inclusive**. It stores the date as `UNTIL=YYYYMMDDT235959Z` in the existing recurrence field. An unchanged existing UNTIL time is preserved verbatim; clearing the field removes only UNTIL. COUNT and other custom constraints remain. End dates must not precede the anchor. topSchema remains 1.

The boundary applies to original recurrence keys. Pending records beyond UNTIL are excluded from generation/selection while remaining stored in topOccurrences/topMoves. Explicit terminal history beyond the new boundary remains visible in Calendar. Moving an allowed original occurrence past the end preserves that explicit reschedule. A planned UNTIL is independent of topSeriesEnd, the existing stop/resume switch; resuming a manually stopped series does not silently extend its planned date.

## Optional appointment time

Schema stays 1. `scheduledTime: "14:00"` is optional on a task; omitted, null or empty means no appointment time. Valid values are canonical 24-hour HH:mm (00:00–23:59). Normalization can read 9:05 as 09:05, but malformed external values are ignored in the UI without rewriting the note. UI saves normalize input and services validate canonical strings. Older callers omitting the field preserve existing times; clearing it writes null. All writes and Undo preserve unknown properties and the Markdown body.

The time is a local wall-clock label and belongs to the whole repeat series. It does not alter RRULE DTSTART/UNTIL, original day keys, recorded duration, cutoff inclusivity or subscription accounting. Moves retain it. There is no occurrence-specific time override, alarm or UTC conversion. Initial recurring status/history use the first matching RRULE date, which may differ from the anchor for weekday rules started on a weekend. A new series or one-off conversion with no matching date is rejected.

## UI conveniences

Calendar selection and compact typed digits normalize into the same ISO note dates, independently of the displayed DMY/MDY/ISO format. The theme-owned text/clock control retains scheduledTime as local HH:mm; no timezone conversion or recurrence time expansion occurs. Guide reads manifest author/version and has no data storage. Schema remains 1.

## Theme-owned time selection

The clock popover and compact typed input normalize to the same local scheduledTime HH:mm. Canonical service validation remains; no AM/PM, UTC conversion, separate occurrence time or extra metadata is introduced. Guide chapters and priority placement do not change stored data.

## Billing forecasts and closed time

Subscription `scheduled` is the first payment anchor. Monthly/yearly forecasts use `billingPeriod` and clamp a missing day to month end without changing the anchor. No task RRULE is evaluated and no synthetic notes or payment history are written. Cancelled/undated subscriptions produce no calendar events. Each forecast shows the full period amount; annual / 12 belongs only to the monthly estimate.

Analytics primary minutes include terminal one-offs and explicit terminal occurrences, excluding skips. Open minutes and legacy series-level minutes are preserved as separate details. Applying the same status does not update resolution dates. New series creation stores supplied minutes on its first actual occurrence and sets series-level actualMinutes to zero. No migration is applied to existing notes.

## Optional work planning and budget fields

Schema remains 1; existing notes are not migrated. One-off tasks may add `workDates: ['2026-10-06', '2026-10-08']` and `plannedMinutes: 120`. The existing `scheduled` date is the primary work day, while `due` is the deadline. Unique work dates and due render as separate calendar events; the intervening interval does not create daily cards. With extra dates alone, their first date is the representative/reporting fallback. There is still one task status and one `actualMinutes` total. Planned minutes are independent estimates, distributed across unique selected work days; they never overwrite actual minutes or create spent-time records.

Writes require canonical valid dates, at most 1000 extra dates, no selected day after due, and a finite nonnegative minute estimate up to 10,000,000. Minutes are rounded to integers. Extra work dates cannot be saved together with a recurrence rule. Recurring occurrences keep their original keys and each receives the series estimate. Omitted optional fields preserve existing metadata for older service callers. Explicit calendar-role moves touch only the selected day or deadline. Undo covers those fields.

Projects and areas may have `monthlyBudget: 250` and `budgetCurrency: USD`. Empty/absent limit means no configured budget; zero is valid. Amount validation matches expense amounts (finite 0..1e12); currency is a three-letter uppercase code. Area budgets include linked projects and do not create additional payment records. The reporting period prorates monthly limits using actual calendar month lengths. Scope limits are independent and are not summed together. Payment snapshots and actual payment dates retain their existing accounting semantics.

`dailyCapacityMinutes` is a plugin setting, with a default of 480 and accepted range 0..1440; zero means no available time. Calendar view/focus selection stays within the open view's state and changes no note dates.
