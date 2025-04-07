import prettier from 'eslint-plugin-prettier'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import noVersionPrefixPlugin from './eslint-rules/no-version-prefix.mjs'

export default [
  {
    ignores: ['node_modules', 'dist', 'scaffolds', 'blueprints', 'overlays']
  },

  ...tseslint.configs.recommended,

  // TypeScript files config
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node
    },
    plugins: {
      prettier: prettier
    },
    rules: {
      'no-trailing-spaces': 'error',
      '@typescript-eslint/no-require-imports': 'off',
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          semi: false,
          trailingComma: 'none',
          printWidth: 200,
          proseWrap: 'always',
          endOfLine: 'lf',
          trimTrailingWhitespace: true
        }
      ]
    }
  },

  // JSON files config
  {
    files: ['package.json'],
    plugins: {
      'no-version-prefix': noVersionPrefixPlugin
    },
    rules: {
      'no-version-prefix/no-version-prefix': 'error',
      '@typescript-eslint/no-unused-expressions': 'off'
    }
  }
]
