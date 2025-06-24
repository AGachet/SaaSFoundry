/**
 * Common utilities for unit tests
 */

import { mockChalk, mockWinston } from '@configs/test/unit-mocks-glob'
import { Provider } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

/**
 * Reset all global mocks
 */
export function resetGlobalMocks(): void {
  Object.values(mockChalk).forEach((mock: jest.Mock) => mock.mockClear())
  Object.values(mockWinston.format).forEach((mock: jest.Mock) => mock.mockClear())
  mockWinston.createLogger.mockClear()
}

/**
 * Clear all mocks including Jest mocks
 */
export function clearAllMocks(): void {
  resetGlobalMocks()
  jest.clearAllMocks()
}

/**
 * Create a testing module with common providers
 * @param providers Array of providers to include in the module
 * @returns The testing module
 */
export async function createTestingModule(providers: Provider[]): Promise<TestingModule> {
  return Test.createTestingModule({
    providers
  }).compile()
}

/**
 * Create a mock response object for testing
 */
export function createMockResponse() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn()
  }
}

/**
 * Create a mock request object for testing
 */
export function createMockRequest() {
  return {
    cookies: {},
    headers: {}
  }
}

/**
 * Create a mock error object for testing
 */
export function createMockError(message: string): Error {
  return new Error(message)
}

/**
 * Create a mock date for testing
 */
export function createMockDate(): Date {
  return new Date('2024-01-01T00:00:00.000Z')
}

/**
 * Create a mock token for testing
 */
export function createMockToken(): string {
  return 'mock.jwt.token'
}

/**
 * Create a mock user ID for testing
 */
export function createMockUserId(): string {
  return '1'
}

/**
 * Create a mock account ID for testing
 */
export function createMockAccountId(): string {
  return '1'
}

/**
 * Create a mock organization ID for testing
 */
export function createMockOrganizationId(): string {
  return '1'
}

/**
 * Create a mock entity ID for testing
 */
export function createMockEntityId(): string {
  return '1'
}
