# Architecture

## Modules and data flow

Vault notes → normalized repository snapshot → pure selectors/aggregators → scoped DOM view. Mutations go through TaskService and refresh the changed note from fresh contents.

| Module                       | Responsibility                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| `src/main.ts`                | Plugin lifecycle, commands, settings and registered vault events.                    |
| `src/core/`                  | Models, date arithmetic, normalization, guarded recurrence, calendars and reporting. |
| `src/services/repository.ts` | Path-keyed index, revision-aware reads, bounded initial scan and cached snapshots.   |
| `src/services/tasks.ts`      | Validated, serialized note writes, trash deletion and conflict-aware Undo.           |
| `src/services/importer.ts`   | Explicit copy-based legacy import with retained metadata and warnings.               |
| `src/ui/`                    | ItemView/Modal controls, SVG charts, localized labels and Guide.                     |
| `vendor/rrule/`              | Guarded recurrence runtime and retained third-party notices.                         |

The installed bundle imports only Obsidian's API externally. It includes the protected local recurrence engine and helpers; no Node/Electron or network client is used at runtime. The pinned npm rrule package establishes provenance and supplies the bundled helper dependency, not the unguarded execution entry point.

## Persistence and lifecycle

Schema 1 frontmatter stores tasks, areas, projects and financial history. `processFrontMatter` changes validated owned fields, preserving unknown properties and the body. Future schemas and reclassified notes cannot be silently adopted by stale edit/delete controls.

Repository revisions discard stale asynchronous reads. Malformed, future-schema, renamed and deleted notes leave the cache. MetadataCache resolves links; fresh note contents determine task state.

Writes are serialized per path. Undo keeps up to 50 touched-field snapshots, verifies that current values match the last write, and restores only those fields. Trash restoration refuses an occupied path. Creation/import are not undo entries.

The midnight interval refreshes the repository's subscribers when the local day changes; it writes no timing data. Header date and report content refresh together. Registered listeners/intervals are released on unload. Views unsubscribe, disconnect their ResizeObserver and cancel month-hover timers on close.

DOM creation and browser constructors use the owning document/window, including board drag targets in pop-out windows. Vault strings use textContent. Quick-entry drafts, focus and existing per-view controls survive ordinary refreshes. Cross-month dragging retains the source subtree while updating the calendar around it.

## Planning and accounting

`core/calendar.ts` emits unique primary/additional work-day cards and a separate deadline when needed. One-off tasks do not expand into every intermediate day. Estimates distribute integer minutes across work dates with an exact sum. Actual minutes are independent.

Work statistics aggregate stored resolutions without running the recurrence generator. Work events use planned/moved days, with deadline and closure fallbacks for undated plans. Financial reports use actual payment dates. Payments/subscriptions are excluded from work totals; currencies stay independent.

A shared date helper defines full current week/month/quarter/year bounds. Charts include the complete interval, with daily week/month points, seven-day quarter buckets and calendar-month year buckets. All original daily values remain available. Financial charts render one panel per currency, measured after all panels are attached, with independent scales.

Lists, board columns and project tables paginate; calendars display every matching task. Recurrence expansion has explicit budgets and fails closed with an actionable warning. Aggregation is linear in selected tasks/history/period, plus project sorting; it is not constant-time for an arbitrarily large vault.

## Development harness

Tests use an emulated Obsidian API. Browser fixtures run the built bundle and stylesheet with fictional notes, record asset hashes and capture diagnostic screenshots. Generated previews and diagnostics are ignored by Git. README screenshots live in `docs/showcase/`.

The optional Linux container adapter compiles into .test-build and handles only the configured Chromium `/proc/self/exe` readlink. It is development tooling, never an installation asset. See [DEVELOPMENT.md](DEVELOPMENT.md).
