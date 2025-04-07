module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: 'src/.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest'
  },
  moduleNameMapper: {
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@configs/(.*)$': '<rootDir>/src/configs/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1'
  },
  globalSetup: '<rootDir>/src/configs/test/e2e-environment.ts',
  globalTeardown: '<rootDir>/src/configs/test/e2e-teardown.ts'
}
