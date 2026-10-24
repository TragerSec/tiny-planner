# Release checks: 1.0.6

Prepared on 24 October 2026. No GitHub push, tag or publication was performed.

- Manifest, package, lockfile and versions.json agree on 1.0.6; minimum Obsidian remains 1.7.2 and schema remains 1.
- README, installation notes and release notes are current. The bilingual built-in Guide was shortened by more than half while preserving navigation and the icon legend.
- Official Obsidian recommended lint and vendor declaration lint pass with zero warnings. Strict type checking and all 300 automated tests pass.
- All seven browser suites pass: UI 88/88, usability 6 combinations, theme matrix 16/16, mobile 36 layouts, controls 54 combinations, calendar 20 cases and design audit 176 scenes.
- The final committed-style main.js matches a fresh source build byte-for-byte. Browser-served bundle and stylesheet hashes match the final files.
- Dependency records are unchanged from the audited baseline: both npm audit checks found no known vulnerabilities and both signature checks passed during the pre-release audit.

The guide assertions now check the shortened bilingual explanations of periods, payment dates and subscription forecasts. An initial test expected the previous paragraphs verbatim; the final full run passes with the revised expectations.

Browser tests use Chromium with mocked Obsidian APIs and theme fixtures. The final container run used TP_SKIP_SCREENSHOTS=1 for optional UI diagnostic captures after the initial capture-enabled run stalled; every behavior assertion stayed enabled. Native Obsidian/device tests and a remote GitHub Actions run on this final commit were not performed here.

Three narrowly scoped CSS !important declarations remain as known warnings, preserving transparent controls under conflicting themes. The full Obsidian scanner has not been run for 1.0.6.

Before tagging, obtain a green GitHub Checks run and an Obsidian preview scan on the exact final commit. Create tag 1.0.6 on that checked commit; the Release workflow repeats checks and publishes the three attested updater assets. Verify the resulting Obsidian review before treating the version as published successfully.
