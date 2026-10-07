import { readFile } from 'node:fs/promises';
const read = async (name) => JSON.parse(await readFile(name, 'utf8'));
const [manifest, pkg, lock, versions] = await Promise.all(
  ['manifest.json', 'package.json', 'package-lock.json', 'versions.json'].map(read),
);
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const requireValue = (condition, message) => {
  if (!condition) throw new Error(message);
};
requireValue(
  semver.test(manifest.version),
  'Release version must be x.y.z, without v or prerelease suffix.',
);
requireValue(
  /^[a-z]+(?:-[a-z]+)*$/.test(manifest.id) &&
    !manifest.id.includes('obsidian') &&
    !manifest.id.endsWith('plugin'),
  'Invalid Community plugin ID.',
);
requireValue(
  typeof manifest.name === 'string' && manifest.name.trim().length > 0,
  'Plugin name is required.',
);
requireValue(
  typeof manifest.author === 'string' && manifest.author.trim().length > 0,
  'Author is required.',
);
requireValue(
  typeof manifest.description === 'string' &&
    manifest.description.length <= 250 &&
    manifest.description.endsWith('.'),
  'Description must have at most 250 characters and end with a period.',
);
requireValue(semver.test(manifest.minAppVersion), 'minAppVersion must be x.y.z.');
requireValue(typeof manifest.isDesktopOnly === 'boolean', 'isDesktopOnly must be a boolean.');
requireValue(
  pkg.version === manifest.version &&
    lock.version === manifest.version &&
    lock.packages?.['']?.version === manifest.version,
  'Manifest, package and lockfile versions must agree.',
);
requireValue(
  versions[manifest.version] === manifest.minAppVersion,
  'versions.json must include the current version and minimum app version.',
);
const compare = (a, b) => {
  const aa = a.split('.').map(Number),
    bb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (aa[i] !== bb[i]) return aa[i] - bb[i];
  return 0;
};
for (const [version, minimum] of Object.entries(versions)) {
  requireValue(semver.test(version) && semver.test(minimum), 'Invalid versions.json entry.');
  requireValue(
    compare(version, manifest.version) <= 0,
    'versions.json contains a future plugin release.',
  );
}
const tag = process.env.RELEASE_TAG;
if (tag)
  requireValue(
    tag === manifest.version,
    'Release tag must exactly match manifest.version, without v.',
  );
console.log(`Release metadata valid: ${manifest.name} ${manifest.version}.`);
