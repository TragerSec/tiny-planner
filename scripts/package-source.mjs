import { readdir, readFile, mkdir, writeFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { resolve } from 'node:path';
import './validate-release.mjs';

// Explicit roots and extensions include new modules without admitting a whole workspace.
const roots = new Map([
  ['src', /\.ts$/],
  ['vendor', /\.(?:js|ts|md)$|(?:^|\/)LICENSE$/],
  ['scripts', /\.(?:mjs|ts)$/],
  ['tests', /\.(?:ts|js|cjs|c)$/],
  ['.github/workflows', /\.ya?ml$/],
  ['docs', /\.md$/],
  ['docs/showcase', /\.png$/],
]);
const rootFiles = [
  '.github/ISSUE_TEMPLATE.md',
  '.github/dependabot.yml',
  '.gitattributes',
  '.gitignore',
  '.nvmrc',
  '.prettierignore',
  '.prettierrc.json',
  'main.js',
  'manifest.json',
  'styles.css',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'versions.json',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'README.md',
  'GUIDE.md',
  'INSTALL.md',
  'CHANGELOG.md',
  'RELEASE_NOTES.md',
  'SECURITY.md',
  'UPDATE_NOTES.md',
  'CALENDAR_UPDATE.md',
  'tools/obsidian-lint/package.json',
  'tools/obsidian-lint/package-lock.json',
  'tools/obsidian-lint/eslint.config.mjs',
  'tools/obsidian-lint/vendor.config.mjs',
];
const paths = new Set(rootFiles);
async function walk(directory, allowed) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink())
      throw new Error(`Source symlink is not allowed: ${directory}/${entry.name}`);
    if (['node_modules', '.git', '.test-build', 'verification', 'screenshots'].includes(entry.name))
      continue;
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await walk(path, allowed);
    else if (allowed.test(path)) paths.add(path);
  }
}
for (const [directory, allowed] of roots) await walk(directory, allowed);
const files = [];
for (const path of [...paths].sort()) {
  if (!(await lstat(path)).isFile()) throw new Error(`Source is not a regular file: ${path}`);
  files.push([path, await readFile(path)]);
}
const checksums = files
  .map(([path, bytes]) => `${createHash('sha256').update(bytes).digest('hex')}  ${path}\n`)
  .join('');
files.push(['SOURCE_SHA256SUMS.txt', Buffer.from(checksums)]);
const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
const locals = [],
  central = [];
let offset = 0;
for (const [path, bytes] of files) {
  const name = Buffer.from(`tiny-planner-source/${path}`);
  const compressed = deflateRawSync(bytes, { level: 9 });
  const crc = crc32(bytes);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x800, 6);
  header.writeUInt16LE(8, 8);
  header.writeUInt16LE(20513, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(compressed.length, 18);
  header.writeUInt32LE(bytes.length, 22);
  header.writeUInt16LE(name.length, 26);
  locals.push(header, name, compressed);
  const record = Buffer.alloc(46);
  record.writeUInt32LE(0x02014b50);
  record.writeUInt16LE(0x314, 4);
  record.writeUInt16LE(20, 6);
  record.writeUInt16LE(0x800, 8);
  record.writeUInt16LE(8, 10);
  record.writeUInt16LE(20513, 14);
  record.writeUInt32LE(crc, 16);
  record.writeUInt32LE(compressed.length, 20);
  record.writeUInt32LE(bytes.length, 24);
  record.writeUInt16LE(name.length, 28);
  record.writeUInt32LE((0o100644 * 65536) >>> 0, 38);
  record.writeUInt32LE(offset, 42);
  central.push(record, name);
  offset += header.length + name.length + compressed.length;
}
const directory = Buffer.concat(central),
  end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(offset, 16);
const archive = Buffer.concat([...locals, directory, end]);
await mkdir('dist', { recursive: true });
const destination = resolve('dist/Tiny-Planner-calendar-preview-source.zip');
await writeFile(destination, archive);
await writeFile('SOURCE_SHA256SUMS.txt', checksums);
console.log(
  `Source ZIP: ${files.length - 1} files + checksums; ${archive.length} bytes; SHA-256 ${createHash('sha256').update(archive).digest('hex')}`,
);
