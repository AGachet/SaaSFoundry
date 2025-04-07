import jsoncPlugin from 'eslint-plugin-jsonc'
import prettier from 'eslint-plugin-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import noVersionPrefixPlugin from './eslint-rules/no-version-prefix.js'

export default [
  {
    ignores: ['dist', 'node_modules', 'src/components/ui/shadcn/**']
  },

  ...tseslint.configs.recommended,

  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      prettier
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
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
