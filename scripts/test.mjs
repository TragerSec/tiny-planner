import { build } from 'esbuild';
import { readdir, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('.test-build', { recursive: true });
const files = (await readdir('tests')).filter(
  (f) => f.endsWith('.test.ts') && (!process.argv.includes('ui') || f === 'ui.test.ts'),
);
for (const file of files)
  await build({
    entryPoints: ['tests/' + file],
    bundle: true,
    external: ['obsidian', 'jsdom', 'yaml', '../tests/mock-obsidian.cjs'],
    platform: 'node',
    format: 'cjs',
    outfile: '.test-build/' + file.replace('.ts', '.cjs'),
  });
await build({
  entryPoints: ['tests/recurrence-probe.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: '.test-build/recurrence-probe.cjs',
});
const run = spawnSync(
  process.execPath,
  [
    '--require',
    './tests/register.cjs',
    '--test',
    ...files.map((f) => '.test-build/' + f.replace('.ts', '.cjs')),
  ],
  { stdio: 'inherit' },
);
if (run.error) console.error(run.error);
process.exitCode = run.status ?? 1;
