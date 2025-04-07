export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // New features
        'fix', // Bug fixes
        'docs', // Documentation
        'style', // Formatting, missing semi colons, etc
        'refactor', // Code refactoring
        'perf', // Performance improvements
        'test', // Adding or updating tests
        'chore', // Maintenance tasks
        'ci', // CI/CD related
        'build', // Build system
        'revert' // Revert changes
      ]
    ],
    'scope-empty': [2, 'never'], // Scope is required
    'scope-case': [0], // Disable scope case validation
    'subject-case': [0], // Disable subject case validation
    'header-max-length': [2, 'always', 100], // Line length
    'scope-enum': [0, 'never'] // Disable scope enum to allow any scope
  },
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w*)\(#(\d+)\): (.*)$/,
      headerCorrespondence: ['type', 'scope', 'subject']
    }
  }
}
