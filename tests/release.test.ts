import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
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
