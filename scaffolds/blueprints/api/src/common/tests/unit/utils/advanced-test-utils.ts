/**
 * Advanced test utilities for more sophisticated testing patterns
 */

import { TestingModule } from '@nestjs/testing'

/**
 * Mock manager for handling complex mock scenarios
 */
export class MockManager {
  private mocks: Map<string, jest.Mock> = new Map()

  /**
   * Create and register a named mock
   */
  createMock<T extends (...args: unknown[]) => unknown>(name: string, implementation?: T): jest.Mock<ReturnType<T>, Parameters<T>> {
    const mock = jest.fn(implementation) as jest.Mock<ReturnType<T>, Parameters<T>>
    this.mocks.set(name, mock)
    return mock
  }

  /**
   * Get a registered mock by name
   */
  getMock<T extends (...args: unknown[]) => unknown>(name: string): jest.Mock<ReturnType<T>, Parameters<T>> | undefined {
    return this.mocks.get(name) as jest.Mock<ReturnType<T>, Parameters<T>> | undefined
  }

  /**
   * Clear all registered mocks
   */
  clearAll(): void {
    this.mocks.forEach((mock) => mock.mockClear())
  }

  /**
   * Reset all registered mocks
   */
  resetAll(): void {
    this.mocks.forEach((mock) => mock.mockReset())
  }

  /**
   * Restore all registered mocks
   */
  restoreAll(): void {
    this.mocks.forEach((mock) => mock.mockRestore())
  }
}

/**
 * Test scenario manager for organizing complex test cases
 */
export class TestScenario {
  constructor(
    private name: string,
    private setup: () => Promise<void> | void = () => {},
    private teardown: () => Promise<void> | void = () => {}
  ) {}

  /**
   * Execute the test scenario
   */
  async execute<T>(testFunction: () => Promise<T> | T): Promise<T> {
    try {
      await this.setup()
      return await testFunction()
    } finally {
      await this.teardown()
    }
  }

  /**
   * Create a new test scenario
   */
  static create(name: string, setup?: () => Promise<void> | void, teardown?: () => Promise<void> | void): TestScenario {
    return new TestScenario(name, setup, teardown)
  }
}

/**
 * Assertion utilities for common test patterns
 */
export class TestAssertions {
  /**
   * Assert that a function throws a specific error
   */
  static async assertThrows<T extends Error>(fn: () => Promise<unknown> | unknown, errorClass: new (...args: unknown[]) => T, expectedMessage?: string): Promise<T> {
    try {
      await fn()
      throw new Error(`Expected function to throw ${errorClass.name}, but it didn't throw`)
    } catch (error) {
      if (!(error instanceof errorClass)) {
        throw new Error(`Expected error to be instance of ${errorClass.name}, but got ${error?.constructor.name}`)
      }
      if (expectedMessage && error.message !== expectedMessage) {
        throw new Error(`Expected error message to be "${expectedMessage}", but got "${error.message}"`)
      }
      return error
    }
  }

  /**
   * Assert that a promise resolves to a specific value
   */
  static async assertResolves<T>(promise: Promise<T>, expectedValue: T, customMatcher?: (actual: T, expected: T) => boolean): Promise<void> {
    const result = await promise
    if (customMatcher) {
      if (!customMatcher(result, expectedValue)) {
        throw new Error(`Custom matcher failed for expected value`)
      }
    } else if (result !== expectedValue) {
      throw new Error(`Expected promise to resolve to ${expectedValue}, but got ${result}`)
    }
  }

  /**
   * Assert that an object has the expected structure
   */
  static assertObjectStructure(actual: unknown, expectedStructure: Record<string, unknown>): void {
    if (typeof actual !== 'object' || actual === null) {
      throw new Error('Expected actual value to be an object')
    }

    const actualObj = actual as Record<string, unknown>

    for (const [key, expectedType] of Object.entries(expectedStructure)) {
      if (!(key in actualObj)) {
        throw new Error(`Expected object to have property '${key}'`)
      }

      if (typeof expectedType === 'string') {
        if (typeof actualObj[key] !== expectedType) {
          throw new Error(`Expected property '${key}' to be of type '${expectedType}', but got '${typeof actualObj[key]}'`)
        }
      } else if (expectedType !== null && typeof expectedType === 'object') {
        TestAssertions.assertObjectStructure(actualObj[key], expectedType as Record<string, unknown>)
      }
    }
  }

  /**
   * Assert that a mock was called with specific arguments in order
   */
  static assertMockCallSequence(mock: jest.Mock, expectedCalls: unknown[][]): void {
    if (mock.mock.calls.length !== expectedCalls.length) {
      throw new Error(`Expected ${expectedCalls.length} calls, but got ${mock.mock.calls.length}`)
    }

    for (let i = 0; i < expectedCalls.length; i++) {
      const actualCall = mock.mock.calls[i]
      const expectedCall = expectedCalls[i]

      if (actualCall.length !== expectedCall.length) {
        throw new Error(`Call ${i}: expected ${expectedCall.length} arguments, but got ${actualCall.length}`)
      }

      for (let j = 0; j < expectedCall.length; j++) {
        if (actualCall[j] !== expectedCall[j]) {
          throw new Error(`Call ${i}, argument ${j}: expected ${expectedCall[j]}, but got ${actualCall[j]}`)
        }
      }
    }
  }
}

/**
 * Database transaction utilities for testing
 */
export class TestTransactionHelper {
  /**
   * Execute a test within a database transaction that gets rolled back
   */
  static async withTransaction<T>(prismaService: { $transaction: (fn: (tx: unknown) => Promise<T>) => Promise<T> }, testFunction: (tx: unknown) => Promise<T>): Promise<T> {
    return prismaService
      .$transaction(async (tx) => {
        const result = await testFunction(tx)
        // Force rollback by throwing an error, then catch and return the result
        throw new TestTransactionRollback(result)
      })
      .catch((error) => {
        if (error instanceof TestTransactionRollback) {
          return error.result
        }
        throw error
      })
  }
}

/**
 * Custom error for transaction rollback
 */
class TestTransactionRollback<T> extends Error {
  constructor(public result: T) {
    super('Test transaction rollback')
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestHelper {
  /**
   * Measure execution time of a function
   */
  static async measureExecutionTime<T>(fn: () => Promise<T> | T): Promise<{ result: T; executionTime: number }> {
    const startTime = process.hrtime.bigint()
    const result = await fn()
    const endTime = process.hrtime.bigint()
    const executionTime = Number(endTime - startTime) / 1_000_000 // Convert to milliseconds

    return { result, executionTime }
  }

  /**
   * Assert that a function executes within a time limit
   */
  static async assertExecutionTime<T>(fn: () => Promise<T> | T, maxTimeMs: number): Promise<T> {
    const { result, executionTime } = await PerformanceTestHelper.measureExecutionTime(fn)

    if (executionTime > maxTimeMs) {
      throw new Error(`Function took ${executionTime}ms, which exceeds the limit of ${maxTimeMs}ms`)
    }

    return result
  }
}

/**
 * Module testing utilities
 */
export class ModuleTestHelper {
  /**
   * Get all providers from a testing module
   */
  static getProviders(module: TestingModule): string[] {
    // This is a simplified version - in reality, you'd need to inspect the module's metadata
    return Object.getOwnPropertyNames(module).filter((prop) => typeof module[prop as keyof TestingModule] === 'object' && module[prop as keyof TestingModule] !== null)
  }

  /**
   * Verify that all required providers are present in the module
   */
  static assertProvidersPresent(module: TestingModule, requiredProviders: (new (...args: unknown[]) => unknown)[]): void {
    for (const provider of requiredProviders) {
      try {
        module.get(provider)
      } catch {
        throw new Error(`Required provider ${provider.name} is not present in the module`)
      }
    }
  }
}
