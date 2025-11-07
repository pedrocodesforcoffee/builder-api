const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const prettier = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**', '.env', '.env.*', '*.log'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
      globals: {
        node: true,
        jest: true,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      prettier: prettier,
    },
    rules: {
      ...prettierConfig.rules,
      ...typescriptEslint.configs.recommended.rules,
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        },
        {
          selector: 'class',
          format: ['PascalCase'],
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
        },
      ],
      'max-len': ['error', { code: 120, ignoreStrings: true, ignoreTemplateLiterals: true }],
      semi: ['error', 'always'],
      quotes: ['error', 'single', { avoidEscape: true }],
      'prettier/prettier': 'error',
    },
  },
];
