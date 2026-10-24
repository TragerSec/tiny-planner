import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Optional runner for Linux test containers without /proc/self/exe.
// No production asset or plugin dependency is changed by this runner.
if (process.platform !== 'linux') throw new Error('This runner requires Linux.');
const supplied = process.env.TP_CHROMIUM_EXECUTABLE;
if (!supplied) throw new Error('Set TP_CHROMIUM_EXECUTABLE to your local Chromium binary.');
const executable = resolve(supplied);
if (!existsSync(executable)) throw new Error('Chromium executable does not exist.');
const temporary = resolve('.test-build/browser-tmp');
const adapter = resolve('.test-build/chromium-compat.so');
mkdirSync(temporary, { recursive: true });
const compiler = spawnSync(
  'gcc',
  ['-shared', '-fPIC', '-o', adapter, 'tests/chromium-compat.c', '-ldl'],
  { stdio: 'inherit' },
);
if (compiler.error) throw compiler.error;
if (compiler.status !== 0) process.exit(compiler.status ?? 1);
const suite = process.argv[2] || 'all';
if (
  ![
    'all',
    'tests/ui.cjs',
    'tests/previews.cjs',
    'tests/theme-matrix.cjs',
    'tests/mobile.cjs',
    'tests/usability.cjs',
    'tests/controls.cjs',
    'tests/calendar-surfaces.cjs',
    'tests/design-audit.cjs',
  ].includes(suite)
)
  throw new Error('Unknown browser suite.');
const suites =
  suite === 'all'
    ? [
        'tests/ui.cjs',
        'tests/usability.cjs',
        'tests/theme-matrix.cjs',
        'tests/mobile.cjs',
        'tests/controls.cjs',
        'tests/calendar-surfaces.cjs',
        'tests/design-audit.cjs',
      ]
    : [suite];
for (const selected of suites) {
  const run = spawnSync(process.execPath, [selected], {
    stdio: 'inherit',
    timeout: 600000,
    env: {
      ...process.env,
      TP_BROWSER_EXE: executable,
      TP_CHROMIUM_EXECUTABLE: executable,
      LD_PRELOAD: adapter,
      TMPDIR: temporary,
      TP_CHROMIUM_ARGS: JSON.stringify([
        '--no-sandbox',
        '--no-zygote',
        '--single-process',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ]),
    },
  });
  if (run.error) console.error(run.error);
  if (run.status !== 0) {
    process.exitCode = run.status ?? 1;
    break;
  }
}
