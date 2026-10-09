# Development notes

Use Node.js 22+ and the committed lockfile. No Node runtime is needed inside Obsidian.

```sh
npm ci --ignore-scripts
npm run check
npm run package
```

`npm run verify:build` rebuilds the source, compares it byte-for-byte with committed `main.js`, and restores the reviewed file if verification fails. Run it after building and before committing/publishing.

`npm run validate:release` checks manifest/package/lockfile versions, the compatibility map and optional release tag. The 1.0.3 metadata is already set; do not run the version bump script while preparing this release.

The production bundle externally imports only `obsidian`. Keep the guarded engine in `vendor/rrule`; do not replace its import with the unguarded npm entry. Dependency notices are included in the bundle banner. The npm package remains pinned for provenance.

## Rendered checks and screenshots

```sh
npx --no-install playwright install chromium
npm run test:browser
npm run screenshots
```

`npm run test:browser` runs `tests/ui.cjs` and the 16-case `tests/theme-matrix.cjs` against the real build with an emulated Obsidian API. The matrix checks 390/520/840/1440px panes, dark/light themes, transparent control states, keyboard focus, Undo, menu drafts, every section and unclipped Day/Week/Month layouts. By default it uses theme fixtures. Set `TP_OBSIDIAN_CSS` and `TP_MINIMAL_CSS` to local CSS files to run the same assertions against actual application and Minimal styles; this remains an API-emulated browser test, not a native Obsidian test. `tests/previews.cjs` captures twenty clean previews using fictional notes. It writes `docs/images/`, with 1200×800 desktop images and a 900×1600 mobile image. These are optional development outputs, excluded from distributed sources, and not proof of real Obsidian device testing.

The static server serves the local bundle and styles only. Browser checks record served SHA-256 hashes for archive comparison. Preview data stays in the browser's in-memory mock vault and is never copied into the user's vault.

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
