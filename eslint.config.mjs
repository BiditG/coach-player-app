import nextConfig from 'eslint-config-next';
import sonarjs from 'eslint-plugin-sonarjs';

const eslintConfig = [
  {
    // `.kilo/worktrees` holds a stale duplicate checkout of this repo. It is not
    // source and must not be linted, type-checked or committed.
    ignores: ['coverage/', 'coverage/**', '.kilo/**'],
  },
  ...nextConfig,
  sonarjs.configs.recommended,
  {
    rules: {
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/no-duplicate-string': ['warn', { threshold: 5 }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/utils/db/*', 'drizzle-orm', 'drizzle-orm/*'],
              message:
                'DB access is forbidden in components. Use API routes or server actions.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['app/api/**/*.ts', 'utils/**/*.ts', 'lib/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];

export default eslintConfig;
