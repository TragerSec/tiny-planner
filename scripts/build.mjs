import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
const notices = (await readFile('THIRD_PARTY_NOTICES.md', 'utf8')).replaceAll('*/', '* /');
await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian'],
  platform: 'browser',
  target: 'es2022',
  format: 'cjs',
  outfile: 'main.js',
  banner: { js: '/* Tiny Planner — MIT. Generated from src/main.ts.\n' + notices + '\n*/' },
  logLevel: 'info',
});
