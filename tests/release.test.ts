import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  rmSync,
  chmodSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
const root = process.cwd();
const names = ['manifest.json', 'package.json', 'package-lock.json', 'versions.json'];
const read = (folder: string, name: string) => JSON.parse(readFileSync(join(folder, name), 'utf8'));
const fixture = () => {
  const folder = mkdtempSync(resolve('.test-build/release-'));
  for (const name of names) copyFileSync(resolve(name), join(folder, name));
  return folder;
};
const run = (folder: string, script: string, args: string[] = [], tag = '') =>
  spawnSync(process.execPath, [resolve(root, 'scripts', script), ...args], {
    cwd: folder,
    encoding: 'utf8',
    env: { ...process.env, RELEASE_TAG: tag },
  });

test('CI verifies the reviewed bundle before rebuilding on every branch and releases only updater assets', () => {
  type Workflow = {
    permissions: { contents: string };
    jobs: Record<
      string,
      {
        steps: {
          run?: string;
          if?: string;
          name?: string;
          uses?: string;
          with?: Record<string, string>;
        }[];
      }
    >;
  };
  const check = parse(readFileSync('.github/workflows/check.yml', 'utf8')) as Workflow;
  assert.deepEqual(Object.keys(check.jobs), ['check']);
  assert.equal(check.permissions.contents, 'read');
  const steps = check.jobs.check!.steps;
  const verification = steps.findIndex((s) => s.run === 'npm run verify:build');
  assert.ok(verification >= 0 && verification < steps.findIndex((s) => s.run === 'npm run check'));
  assert.equal(steps[verification]!.if, undefined);
  assert.ok(steps.every((s) => !s.run || !/git (push|commit)|--method PUT/.test(s.run)));
  assert.ok(steps.some((s) => s.run === 'npm run test:browser'));
  const release = parse(readFileSync('.github/workflows/release.yml', 'utf8')) as Workflow;
  const publish = release.jobs.release!.steps.find(
    (s) => s.name === 'Create or update release',
  )!.run!;
  assert.match(publish, /main\.js manifest\.json styles\.css --verify-tag/);
  assert.match(publish, /--notes-file RELEASE_NOTES\.md/);
  assert.doesNotMatch(publish, /LICENSE|THIRD_PARTY/);
  const attest = release.jobs.release!.steps.find((s) => s.name === 'Attest release assets')!;
  assert.match(attest.uses!, /@[0-9a-f]{40}$/);
  assert.deepEqual(attest.with!['subject-path']!.trim().split('\n'), [
    'main.js',
    'manifest.json',
    'styles.css',
  ]);
});
test('release publication creates missing releases, updates existing releases and preserves failures', () => {
  const workflow = parse(readFileSync('.github/workflows/release.yml', 'utf8'));
  const publish = workflow.jobs.release.steps.find(
    (step: { name?: string }) => step.name === 'Create or update release',
  ).run;
  assert.equal(workflow.jobs.release.if, 'github.event.deleted != true');
  assert.equal(workflow.concurrency['cancel-in-progress'], false);
  assert.match(workflow.concurrency.group, /github.ref/);
  const folder = mkdtempSync(resolve('.test-build/release-publish-'));
  const log = join(folder, 'gh-calls.jsonl');
  const executable = join(folder, 'gh');
  writeFileSync(
    executable,
    `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TP_RELEASE_CALLS, JSON.stringify(args) + '\\n');
if (args[0] === 'api') {
  if (process.env.TP_RELEASE_SCENARIO === 'missing') {
    console.error('gh: Not Found (HTTP 404)'); process.exit(1);
  }
  if (process.env.TP_RELEASE_SCENARIO === 'forbidden') {
    console.error('gh: Resource not accessible (HTTP 403)'); process.exit(1);
  }
  if (process.env.TP_RELEASE_SCENARIO === 'network') {
    console.error('connection timed out'); process.exit(1);
  }
} else if (args[1] === process.env.TP_RELEASE_FAIL) {
  console.error('simulated ' + args[1] + ' failure'); process.exit(1);
}
`,
  );
  chmodSync(executable, 0o755);
  const execute = (scenario: string, fail = '') => {
    writeFileSync(log, '');
    const result = spawnSync('bash', ['-c', publish], {
      cwd: folder,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: folder + ':' + process.env.PATH,
        RELEASE_TAG: '1.0.2',
        GITHUB_REPOSITORY: 'TragerSec/tiny-planner',
        TP_RELEASE_SCENARIO: scenario,
        TP_RELEASE_FAIL: fail,
        TP_RELEASE_CALLS: log,
      },
    });
    const calls = readFileSync(log, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    return { result, calls, operations: calls.slice(1).map((args) => args[1]) };
  };
  try {
    const missing = execute('missing');
    assert.equal(missing.result.status, 0, missing.result.stderr);
    assert.deepEqual(missing.operations, ['create']);
    assert.deepEqual(missing.calls[0], ['api', 'repos/TragerSec/tiny-planner/releases/tags/1.0.2']);
    assert.ok(missing.calls[1].includes('--verify-tag'));
    for (const repeat of [0, 1]) {
      const existing = execute('exists');
      assert.equal(existing.result.status, 0, `Retry ${repeat}: ${existing.result.stderr}`);
      assert.deepEqual(existing.operations, ['upload', 'edit']);
      assert.deepEqual(existing.calls[1], [
        'release',
        'upload',
        '1.0.2',
        '--repo',
        'TragerSec/tiny-planner',
        'main.js',
        'manifest.json',
        'styles.css',
        '--clobber',
      ]);
      assert.deepEqual(existing.calls[2], [
        'release',
        'edit',
        '1.0.2',
        '--repo',
        'TragerSec/tiny-planner',
        '--verify-tag',
        '--title',
        'Tiny Planner 1.0.2',
        '--notes-file',
        'RELEASE_NOTES.md',
        '--draft=false',
      ]);
    }
    for (const scenario of ['forbidden', 'network']) {
      const failure = execute(scenario);
      assert.notEqual(failure.result.status, 0);
      assert.deepEqual(failure.operations, []);
    }
    for (const [scenario, operation, expected] of [
      ['missing', 'create', ['create']],
      ['exists', 'upload', ['upload']],
      ['exists', 'edit', ['upload', 'edit']],
    ] as const) {
      const failure = execute(scenario, operation);
      assert.notEqual(failure.result.status, 0);
      assert.deepEqual(failure.operations, expected);
    }
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
test('release metadata validates consistent assets and rejects a wrong tag or compatibility map', () => {
  const folder = fixture();
  try {
    const current = read(folder, 'manifest.json').version;
    assert.equal(run(folder, 'validate-release.mjs', [], current).status, 0);
    assert.notEqual(run(folder, 'validate-release.mjs', [], 'v' + current).status, 0);
    const versions = read(folder, 'versions.json');
    versions[current] = '0.0.0';
    writeFileSync(join(folder, 'versions.json'), JSON.stringify(versions));
    assert.notEqual(run(folder, 'validate-release.mjs').status, 0);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
test('release bump preserves dependency packages and history; invalid inputs do not mutate metadata', () => {
  const folder = fixture();
  try {
    const before = Object.fromEntries(
      names.map((name) => [name, readFileSync(join(folder, name), 'utf8')]),
    );
    for (const next of ['v1.0.1', '1.0.1-beta', '0.0.1'])
      assert.notEqual(run(folder, 'version.mjs', [next]).status, 0);
    for (const name of names) assert.equal(readFileSync(join(folder, name), 'utf8'), before[name]);
    const manifest = read(folder, 'manifest.json'),
      numbers = manifest.version.split('.').map(Number);
    const next = `${numbers[0]}.${numbers[1]}.${numbers[2] + 1}`;
    assert.equal(run(folder, 'version.mjs', [next]).status, 0);
    assert.equal(run(folder, 'validate-release.mjs', [], next).status, 0);
    const lock = read(folder, 'package-lock.json'),
      old = JSON.parse(before['package-lock.json']!);
    assert.equal(lock.version, next);
    assert.equal(lock.packages[''].version, next);
    assert.deepEqual(
      Object.fromEntries(Object.entries(lock.packages).filter(([name]) => name)),
      Object.fromEntries(Object.entries(old.packages).filter(([name]) => name)),
    );
    assert.equal(read(folder, 'versions.json')[manifest.version], manifest.minAppVersion);
    assert.equal(read(folder, 'versions.json')[next], manifest.minAppVersion);
    assert.notEqual(run(folder, 'version.mjs', [next]).status, 0);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test('committed build verification rejects stale runtime without replacing it', () => {
  const folder = fixture();
  try {
    mkdirSync(join(folder, 'src'));
    writeFileSync(join(folder, 'src/main.ts'), 'export const version = 1;\n');
    writeFileSync(join(folder, 'THIRD_PARTY_NOTICES.md'), 'Test fixture.\n');
    assert.equal(run(folder, 'build.mjs').status, 0);
    const committed = readFileSync(join(folder, 'main.js'));
    assert.equal(run(folder, 'verify-build.mjs').status, 0);
    writeFileSync(join(folder, 'src/main.ts'), 'export const version = 2;\n');
    const stale = run(folder, 'verify-build.mjs');
    assert.notEqual(stale.status, 0);
    assert.match(stale.stderr, /main.js differs from the source build/);
    assert.deepEqual(readFileSync(join(folder, 'main.js')), committed);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
