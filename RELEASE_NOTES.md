# Tiny Planner 1.0.5

- Fix the blocking Obsidian static-style assignment finding in resizable description fields.
- Use Obsidian createDiv/createSpan helpers in choice controls and remove the redundant ToggleEvent cast.
- Replace calendar :has selectors with an explicit card expansion class; retain the same Minimal/Detailed behavior.
- Use Grid/Flex gap shorthands and precise upstream declaration types without changing the recurrence runtime.
- Add the official Obsidian recommended source linter to both GitHub workflows; audit the isolated pinned toolchain and reject warnings before publication.
- Validate YAML scalar text without invoking collection stringification. Malformed repeat metadata remains visible as unsupported.

Minimum Obsidian remains 1.7.2 and schema remains 1. Existing task data and the visible appointment-time feature are retained.

The vault enumeration recommendation is inherent to discovering planner notes anywhere in the vault. Three tightly scoped CSS !important declarations preserve transparent controls under themes that force important button fills; the hostile-theme regression checks remain enabled.
