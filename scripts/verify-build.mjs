import { readFile, writeFile } from 'node:fs/promises';

const committed = await readFile('main.js');
try {
  await import('./build.mjs');
  if (!committed.equals(await readFile('main.js')))
    throw new Error('main.js differs from the source build. Run npm run build and commit main.js.');
} finally {
  // Verification must not silently replace the artifact being reviewed.
  await writeFile('main.js', committed);
}
console.log('Committed main.js matches the source build.');
