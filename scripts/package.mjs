import './validate-release.mjs';
import { readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
if (!/^[a-z]+(?:-[a-z]+)*$/.test(manifest.id) || !/^\d+\.\d+\.\d+$/.test(manifest.version))
  throw new Error('Invalid plugin ID or release version');
if (pkg.version !== manifest.version)
  throw new Error('package.json and manifest.json versions differ');

const names = [
  'main.js',
  'manifest.json',
  'styles.css',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'INSTALL.md',
  'GUIDE.md',
];
const files = await Promise.all(names.map(async (name) => [name, await readFile(name)]));
const destination = resolve('dist', manifest.id);
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const [name, bytes] of files) await writeFile(resolve(destination, name), bytes);
await writeFile(
  resolve(destination, 'SHA256SUMS.txt'),
  files
    .map(([name, bytes]) => `${createHash('sha256').update(bytes).digest('hex')}  ${name}\n`)
    .join(''),
);
console.log(`Packaged Tiny Planner ${manifest.version}: dist/${manifest.id}/`);
