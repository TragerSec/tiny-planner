# Community review follow-up for 1.0.2

The initial published `1.0.2` tag pointed to `ba685d0`. Its release assets match the
previously verified local build. GitHub CI and the Community scanner are
different checks: passing CI did not validate the API's introduction versions.

## Findings from the supplied review

| Finding                                            | Resolution                                                                                                                                                                                                                                            |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SettingTab.update` newer than `minAppVersion`     | Call it only inside `requireApiVersion('1.13.0')`; use the legacy settings renderer otherwise. Keep `minAppVersion: 1.7.2`. A regression test removes `update()` and checks language changes and persistence.                                         |
| Control characters in filename regular expressions | Replace the control-character regex range with character-code checks. Test all 32 ASCII control characters for rejected folders and sanitized filenames, while retaining the original note title.                                                     |
| Native DOM creation                                | Use `parent.createEl()` and `parent.createSvg()` so creation stays in the owning window. Text remains literal, not HTML.                                                                                                                              |
| `display()` deprecated                             | Keep this lifecycle method for hosts older than 1.13. The official API documentation explicitly prescribes this fallback; modern hosts use `getSettingDefinitions()`. Remove calls to `this.display()` from change handlers.                          |
| `any` in `vendor/rrule/rruleset.d.ts`              | Upstream third-party declarations, not executable plugin logic. Preserve upstream bytes and the existing integrity test rather than rewrite the dependency's declarations.                                                                            |
| CSS `multicolumn` warning                          | The seven cited properties are `column-gap` on Grid/Flex layouts. The stylesheet does not use CSS multi-column layout (`columns`, `column-count`, `column-width`). No layout change is needed for this warning.                                       |
| Three `!important` declarations                    | Keep the narrow transparent-control override. Its existing browser test covers a theme with important filled-button styles; removing it brings back square backgrounds. It applies only to completion/title/day controls and sidebar utility buttons. |

## Verification scope

The official `eslint-plugin-obsidianmd@0.4.2` rule
`obsidianmd/no-unsupported-api`, with `minAppVersion: 1.7.2` and the project's
Obsidian 1.13.1 type declarations, reproduces the published error at
`src/main.ts:209`. It reports zero unsupported-API errors across the fixed
`src/**/*.ts`. The focused native-DOM and control-regex rules also report no
findings in the corrected plugin sources. This is not the complete hosted
Community review service.

## Retrying release publication

The release job creates a release only when the lookup returns HTTP 404. For an
existing release it uploads the three verified assets with `--clobber`, then
updates the title and `RELEASE_NOTES.md` description. API permission/network
errors and failed uploads or edits remain failures; they do not turn the job
green. Runs for the same tag are serialized, and tag-deletion events do not
publish a release. The workflow test executes both branches and failed API,
create, upload and edit commands with a fake CLI; it makes no GitHub writes.

Run the normal build, unit tests and browser matrix before sending the changes
for a new **Review branch** scan. A hosted scan has not been run for this local
correction. Publishing a newer version, changing the existing tag or replacing
release assets requires the maintainer's decision; this correction keeps the
version at 1.0.2 and does not mutate the published release.

Official references:

- <https://docs.obsidian.md/plugins/guides/migrate-declarative-settings>
- <https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts>
- <https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/no-unsupported-api.md>
