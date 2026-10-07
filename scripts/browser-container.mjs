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
const suite = process.argv[2] || 'tests/ui.cjs';
if (!['tests/ui.cjs', 'tests/previews.cjs'].includes(suite))
  throw new Error('Unknown browser suite.');
const run = spawnSync(process.execPath, [suite], {
  stdio: 'inherit',
  timeout: 180000,
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
process.exitCode = run.status ?? 1;
