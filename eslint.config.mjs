import { FlatCompat } from '@eslint/eslintrc'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

// Integrate Prettier: disable stylistic rules that conflict and run prettier as an ESLint rule.
const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  // Disable conflicting stylistic rules
  prettierConfig,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { prettier: prettierPlugin },
    rules: {
      'prettier/prettier': 'error',
    },
  },
  {
    ignores: [
      'node_modules',
      'dist',
      '.next',
      'build',
      'coverage',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
    ],
  },
]

export default eslintConfig
