import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Ignore build output and plain-JS build scripts.
  { ignores: ['dist/**', 'scripts/**'] },

  // TypeScript source — full type-aware rules.
  {
    files: ['src/**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Async callbacks passed to addEventListener etc. are safe to ignore.
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { arguments: false } },
      ],
    },
  },

  // Tests — recommended rules without type-aware checks.
  // Test files are not part of the compilation tsconfig, so we skip the
  // project-service pass here and rely on basic TypeScript ESLint rules.
  {
    files: ['tests/**/*.ts'],
    extends: [...tseslint.configs.recommended],
  },
);
