# rrule 2.8.1 · guarded runtime

This is the published `rrule@2.8.1` `dist/esm` JavaScript and declarations, copied from the lockfile-verified package without source maps. LICENSE is the upstream LICENCE. All upstream files except `iter/index.js` are byte-identical to the installed package.

The only engine modification is in `iter/index.js`:

- At most 20,000 date-period iterations per query; exceeding the limit throws `RecurrenceLimitError`.
- The first date in the current period is compared with UNTIL and the query's maximum date before filtering. Empty candidate sets therefore respect bounded queries.

`src/core/recurrence.ts` imports this local entry for both production and tests. The original npm package remains pinned for provenance and review; no installation script patches node_modules. `tslib` helpers are still bundled from the pinned dependency.

The adapter also rejects incompatible month/day constraints and bounds simple generated results to 20,000. Representative selection inspects at most 256 resolved future candidates. Selectors catch only the explicit budget error, mark the rule unsupported, return no generated occurrences and expose a read-only series with a warning. Partial results are not reported as complete. Simplify a rule or shorten its anchor/history to restore generation. Stored notes and explicit history are not rewritten.

This fixes TP-SEC-001, demonstrated by an isolated child process with a 1.5-second timeout. Leap dates, COUNT origin and monthly positions have regression coverage. This is a local defensive patch, not an assertion that upstream published a security fix.
