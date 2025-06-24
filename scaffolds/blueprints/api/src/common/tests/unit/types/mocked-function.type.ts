/**
 * Type definition for a mocked function that can be used in tests
 * Combines a function type with Jest mock methods
 */

// Mock function type that extends the original function type with Jest mock methods
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MockedFunction<T extends (...args: any[]) => unknown> = jest.Mock<ReturnType<T>, Parameters<T>> & {
  mockResolvedValue: (value: Awaited<ReturnType<T>>) => MockedFunction<T>
  mockResolvedValueOnce: (value: Awaited<ReturnType<T>>) => MockedFunction<T>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockRejectedValue: (reason: any) => MockedFunction<T>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockRejectedValueOnce: (reason: any) => MockedFunction<T>
  mockImplementation: (fn: (...args: Parameters<T>) => ReturnType<T>) => MockedFunction<T>
  mockImplementationOnce: (fn: (...args: Parameters<T>) => ReturnType<T>) => MockedFunction<T>
  mockReturnValue: (value: ReturnType<T>) => MockedFunction<T>
  mockReturnValueOnce: (value: ReturnType<T>) => MockedFunction<T>
}
