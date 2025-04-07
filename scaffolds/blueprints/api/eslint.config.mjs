import prettier from 'eslint-plugin-prettier'
import globals from 'globals'
import jsoncPlugin from 'eslint-plugin-jsonc'
import tseslint from 'typescript-eslint'
import noVersionPrefixPlugin from './eslint-rules/no-version-prefix.mjs'

export default [
  {
    ignores: ['node_modules', 'dist']
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
      jsonc: jsoncPlugin.default || jsoncPlugin,
      'no-version-prefix': noVersionPrefixPlugin
    },
    languageOptions: {
      parser: jsoncPlugin.parsers?.jsonc || jsoncPlugin.parsers
    },
    rules: {
      'jsonc/no-useless-escape': 'error',
      'jsonc/sort-keys': 'error',
      'no-version-prefix/no-version-prefix': 'error',
      '@typescript-eslint/no-unused-expressions': 'off'
    }
  }
]
