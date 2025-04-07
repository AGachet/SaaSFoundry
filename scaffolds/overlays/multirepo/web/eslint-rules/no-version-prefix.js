// eslint-rules/no-version-prefix.js
export default {
  rules: {
    'no-version-prefix': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow version prefixes (^, ~) in package.json',
          category: 'Best Practices',
          recommended: true
        },
        schema: []
      },
      create(context) {
        const DEPENDENCY_TYPES = ['dependencies', 'devDependencies']
        const VERSION_PREFIXES = ['^', '~']

        return {
          Property(node) {
            if (DEPENDENCY_TYPES.includes(node.key.value)) {
              node.value.properties.forEach((dep) => {
                const version = dep.value.value
                if (version && VERSION_PREFIXES.some((prefix) => version.startsWith(prefix))) {
                  context.report({
                    node: dep.value,
                    message: `Version for "${dep.key.value}" should be fixed (no "^" or "~").`
                  })
                }
              })
            }
          }
        }
      }
    }
  }
}
