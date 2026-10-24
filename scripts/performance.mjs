import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('.test-build', { recursive: true });
await build({
  entryPoints: ['scripts/performance.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['obsidian', '../tests/mock-obsidian.cjs'],
  outfile: '.test-build/performance.cjs',
});
const mode = process.argv[2] || 'all';
if (!['all', 'load', 'selectors', 'dom', 'search'].includes(mode))
  throw new Error('Unknown performance mode.');
const run = spawnSync(
  process.execPath,
  ['--require', './tests/register.cjs', '.test-build/performance.cjs', 'run', mode],
  { stdio: 'inherit' },
);
if (run.error) console.error(run.error);
process.exitCode = run.status ?? 1;
