import { DEFAULT_BRANDS } from './node_modules/eslint-plugin-obsidianmd/dist/lib/rules/ui/brands.js';
import obsidianmd from 'eslint-plugin-obsidianmd';
export default [
  { ignores: ['tests/**', 'scripts/**', 'tools/**', 'vendor/**', 'main.js', '.test-build/**', 'dist/**', 'verification/**'] },
  ...obsidianmd.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: { 'obsidianmd/ui/sentence-case': ['warn', { enforceCamelCaseLower: true, brands: [...DEFAULT_BRANDS, 'Tiny Planner'] }] },
    languageOptions: { parserOptions: { project: './tsconfig.json', tsconfigRootDir: process.cwd() } },
  },
];
