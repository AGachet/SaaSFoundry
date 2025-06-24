/**
 * Base class for service unit tests
 * Provides common setup and utilities for testing services
 */

import { clearAllMocks, createTestingModule } from '@common/tests/unit/utils/test-utils'
import { Provider } from '@nestjs/common'
import { TestingModule } from '@nestjs/testing'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceConstructor<T = any> = new (...args: any[]) => T

export abstract class ServiceTestBase<T> {
  protected service: T
  protected module: TestingModule

  /**
   * Abstract method to define the service class to test
   */
  protected abstract getServiceClass(): ServiceConstructor<T>

  /**
   * Abstract method to define additional providers
   */
  protected abstract getProviders(): Provider[]

  /**
   * Setup method to be called in beforeEach
   */
  public async setupTest(): Promise<void> {
    clearAllMocks()

    const providers = [this.getServiceClass(), ...this.getProviders()]

    this.module = await createTestingModule(providers)
    this.service = this.module.get<T>(this.getServiceClass())

    // Call custom setup if defined
    await this.customSetup()
  }

  /**
   * Override this method for custom setup logic
   */
  protected async customSetup(): Promise<void> {
    // Default implementation does nothing
  }

  /**
   * Cleanup method to be called in afterEach
   */
  public async cleanupTest(): Promise<void> {
    jest.clearAllMocks()

    // Call custom cleanup if defined
    await this.customCleanup()
  }

  /**
   * Override this method for custom cleanup logic
   */
  protected async customCleanup(): Promise<void> {
    // Default implementation does nothing
  }

  /**
   * Get a service from the module
   */
  protected getService<S>(serviceClass: ServiceConstructor<S>): jest.Mocked<S> {
    return this.module.get(serviceClass)
  }

  /**
   * Helper method to create test context for a specific test scenario
   */
  protected createTestContext(testName: string): TestContext<T> {
    return new TestContext(testName, this.service)
  }
}

/**
 * Test context for organizing test scenarios
 */
export class TestContext<T> {
  constructor(
    private testName: string,
    private service: T
  ) {}

  describe(description: string, testFn: () => void): void {
    describe(description, testFn)
  }

  it(description: string, testFn: () => void): void {
    it(description, testFn)
  }

  /**
   * Helper to create a test case with setup and teardown
   */
  testCase(description: string, testFn: () => void | Promise<void>): void {
    it(description, async () => {
      try {
        const result = testFn()
        if (result instanceof Promise) {
          await result
        }
      } catch (error) {
        console.error(`Test failed in ${this.testName}: ${description}`, error)
        throw error
      }
    })
  }
}
