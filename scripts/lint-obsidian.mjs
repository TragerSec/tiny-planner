import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const eslint = 'tools/obsidian-lint/node_modules/eslint/bin/eslint.js';
if (!existsSync(eslint)) {
  console.error('Install the pinned lint tools: npm ci --prefix tools/obsidian-lint --ignore-scripts');
  process.exit(1);
}
for (const [config, files] of [
  ['eslint.config.mjs', 'src/**/*.ts'],
  ['vendor.config.mjs', 'vendor/**/*.d.ts'],
]) {
  const result = spawnSync(process.execPath, [eslint, '--config', 'tools/obsidian-lint/' + config, files, '--max-warnings', '0'], { stdio: 'inherit' });
  if (result.error) console.error(result.error);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('Official Obsidian recommended source lint and vendor declaration check passed.');
