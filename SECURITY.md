# Privacy and security

Tiny Planner reads and writes Markdown notes only inside the active vault through Obsidian APIs. It never sends vault contents, filenames or usage information to external services. There is no telemetry, account system, remote code loading, command execution, API key, CDN or remote font.

Vault text is inserted through `textContent`, not HTML interpolation. File paths for new records are validated and titles are sanitized for filenames. Deletes use Obsidian's configured trash. Undo refuses conflicting external changes. Import creates copies rather than changing legacy notes.

Report security problems privately to the repository owner through GitHub's private vulnerability reporting if enabled. For public issues, provide only anonymized minimal notes.

## Dependency policy

Direct npm versions and the lockfile are pinned. Dev moment is overridden to 2.31.0. CI runs npm ci with --ignore-scripts, then audit and registry-signature checks before building. The public-repository workflows use Git directly and pin the official actions/setup-node action by commit SHA; build Node.js is selected explicitly. Production main.js must have no external imports except obsidian; rrule/tslib are included locally. Registry signatures authenticate registry distribution, not the absence of malicious author code. Updates require a fresh audit and tests.
