# Development notes

Use Node.js 22+ and the committed lockfile. No Node runtime is needed inside Obsidian.

```sh
npm ci --ignore-scripts
npm ci --prefix tools/obsidian-lint --ignore-scripts
npm run check
npm run package
```

`npm run verify:build` rebuilds the source, compares it byte-for-byte with committed `main.js`, and restores the reviewed file if verification fails. Run it after building and before committing/publishing.

`npm run validate:release` checks manifest/package/lockfile versions, the compatibility map and optional release tag. The 1.0.6 metadata is already set. Use the version script only when preparing a later release.

The production bundle externally imports only `obsidian`. Keep the guarded engine in `vendor/rrule`; do not replace its import with the unguarded npm entry. Dependency notices are included in the bundle banner. The npm package remains pinned for provenance.

## Rendered checks and screenshots

```sh
npx --no-install playwright install chromium
npm run test:browser
npm run screenshots
```

`npm run test:browser` runs seven suites: UI, usability, theme matrix, mobile, controls, calendar surfaces and design audit. They cover pages, forms, settings, keyboard actions, responsive layouts and the compact calendar. By default it uses theme fixtures. Set `TP_OBSIDIAN_CSS` and `TP_MINIMAL_CSS` to local CSS files to run the same assertions against actual application and Minimal styles; this remains an API-emulated browser test, not a native Obsidian test. `tests/previews.cjs` captures twenty clean previews using fictional notes. It writes `docs/images/`, with 1200×800 desktop images and a 900×1600 mobile image. These are optional development outputs, excluded from distributed sources, and not proof of real Obsidian device testing.

The static server serves the local bundle and styles only. Browser checks record served SHA-256 hashes for archive comparison. Preview data stays in the browser's in-memory mock vault and is never copied into the user's vault.

Set `TP_SKIP_SCREENSHOTS=1` to omit optional full-page diagnostic captures in `tests/ui.cjs` when the container compositor stalls; behavior assertions still run. Both GitHub jobs have a 20-minute upper bound.

## Linux containers without /proc

The optional runner compensates for the missing `/proc/self/exe` by returning the explicitly supplied Chromium path for that exact readlink query. Other readlink calls are delegated unchanged. The adapter belongs to the test harness, is built inside `.test-build/` and is not a plugin runtime asset. It requires Linux, gcc and a local Chromium executable.

```sh
TP_CHROMIUM_EXECUTABLE=/absolute/path/to/chromium npm run test:browser:container
TP_CHROMIUM_EXECUTABLE=/absolute/path/to/chromium node scripts/browser-container.mjs tests/previews.cjs
```

Ordinary desktop/CI environments should use the standard commands instead.

## GitHub Actions

GitHub Actions checks pushes and pull requests. The Release workflow expects a public repository, a numeric tag matching the manifest, and write permission for its generated `GITHUB_TOKEN`. It checks out public sources using Git, selects Node.js 22 through the SHA-pinned official setup-node action, and uses the runner's GitHub CLI with an explicit repository. Both workflows verify the committed bundle and run automated and browser tests before release creation. Private repository checkout is outside this workflow's scope.

Update CHANGELOG and RELEASE_NOTES before creating the next tag.

## Large-fixture measurements

`npm run test:perf` generates 50,000 local fixture notes (5,000 planner tasks), exercises repository load and recurrence selectors, and measures representative DOM rendering in jsdom. Generated notes and results live in `.perf-work/`; exclude that directory from archives and version control. Measurements are optional development evidence and are not included in the release source archive. These are container/Node measurements, not real Obsidian/device benchmarks.

## Official Obsidian lint

`npm run lint:obsidian` runs the full official `eslint-plugin-obsidianmd` recommended configuration on first-party TypeScript with zero warnings allowed. The plugin name is configured as a brand for sentence-case checking. Upstream declarations have a separate no-explicit-any check and exact provenance tests. The tools have their own pinned lockfile and are installed with `npm ci --prefix tools/obsidian-lint --ignore-scripts`; both workflows install and audit them before `check`. Their pinned moment override removes the known advisory in the lint toolchain.

Three narrow CSS `!important` declarations are intentional: normal specificity cannot override a theme declaring the same properties important. Browser tests exercise that case. All column gaps use the Grid/Flex `gap` shorthand, and expanded card state uses `.tp-card-expanded`, without `:has`.


### Usability preview checks and packaging

`npm run test:browser` also runs `tests/usability.cjs`: progressive forms, Contact, retained drafts, work-day editing, the visual recurrence editor, filters and restored views across dark/light and 1440/390/320 px.

`npm run package:source` verifies the current main.js and creates `dist/Tiny-Planner-calendar-preview-source.zip`. The dependency-free packer uses explicit source roots/extensions, automatically includes new source/test modules, rejects source symlinks, fixes ZIP metadata and includes per-file checksums. It excludes node_modules, logs, personal vaults and generated screenshots.

The container runner accepts ui, usability, theme-matrix and mobile suites individually. It requires an existing Chromium executable; the compatibility adapter is test-only. Native Obsidian/device QA remains a manual check in docs/OBSIDIAN-QA.md.


## Design review regression suite

`node tests/design-audit.cjs` checks nine pages, twelve form variants and settings in RU/EN, light/dark, 320/1440 px and 115% UI scale. It tests horizontal overflow, clipped controls, accessible names and long-result/footer overlap. `tests/controls.cjs` additionally compares normal and continuation card heights by actual rendered title lines, including inline markers.

Run `node scripts/performance.mjs search` for the focused search benchmark: 1,000 tasks, 100 historical results each and 20 successive queries, five samples. The default performance command still includes the larger vault benchmark.

Internal screenshots and JSON evidence are written under `.test-build`, excluded from source packages. The browser suites use a local Obsidian API adapter; they do not replace native application and device checks.
