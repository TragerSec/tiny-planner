import { readFile, writeFile } from 'node:fs/promises';
const next = process.argv[2];
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(next || ''))
  throw new Error('Usage: npm run version:release -- x.y.z');
const names = ['manifest.json', 'package.json', 'package-lock.json', 'versions.json'];
const [manifest, pkg, lock, versions] = await Promise.all(
  names.map(async (name) => JSON.parse(await readFile(name, 'utf8'))),
);
if (
  pkg.version !== manifest.version ||
  lock.version !== manifest.version ||
  lock.packages?.['']?.version !== manifest.version ||
  versions[manifest.version] !== manifest.minAppVersion
)
  throw new Error('Current release metadata is inconsistent; fix it before bumping.');
const a = next.split('.').map(Number),
  b = manifest.version.split('.').map(Number);
const difference = a.map((n, i) => n - b[i]).find((n) => n !== 0) || 0;
if (difference <= 0)
  throw new Error('Next release version must be greater than the current version.');
manifest.version = pkg.version = lock.version = lock.packages[''].version = next;
versions[next] = manifest.minAppVersion;
const values = [manifest, pkg, lock, versions];
for (let i = 0; i < names.length; i++)
  await writeFile(names[i], JSON.stringify(values[i], null, 2) + '\n');
console.log(
  `Prepared ${next}. Update CHANGELOG.md and RELEASE_NOTES.md, run npm run check and npm run package, then commit and tag.`,
);
