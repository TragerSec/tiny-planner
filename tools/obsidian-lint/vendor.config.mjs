import tseslint from 'typescript-eslint';
// Upstream declarations are syntax-checked separately; executable vendor integrity
// and the two precisely documented declaration edits are tested against npm bytes.
export default [
  tseslint.configs.base,
  { files: ['vendor/**/*.d.ts'], rules: { '@typescript-eslint/no-explicit-any': 'error' } },
];
