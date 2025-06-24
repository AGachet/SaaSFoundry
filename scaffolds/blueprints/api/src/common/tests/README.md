# Factorized Test Infrastructure - User Guide

This document explains how to use the new factorized test infrastructure to make your tests more maintainable, readable, and consistent.

## 🎯 Objectives

- **Standardization**: Standardize the way tests are written across all modules
- **Reusability**: Factor out common code to avoid duplication
- **Maintainability**: Make it easier to update and maintain tests
- **Readability**: Improve test comprehension for developers

## 📁 Structure

```
src/common/tests/
├── unit/
│   ├── base/
│   │   └── service-test-base.ts       # Base class for unit tests
│   ├── builders/
│   │   └── test-data-builders.ts      # Builders to create test data
│   ├── mocks/
│   │   ├── service-mocks.ts           # Common service mocks
│   │   └── test-data.ts               # Static test data (legacy)
│   ├── utils/
│   │   ├── test-utils.ts              # Basic utilities
│   │   └── advanced-test-utils.ts     # Advanced utilities
│   └── types/
├── e2e/
│   ├── base/
│   │   └── e2e-test-base.ts           # Base class for E2E tests
│   └── utils/
│       ├── setup-test-user.ts         # Utilities for test users
│       └── setup-test-*.ts            # Other setup utilities
```

## 🔧 Unit Tests

### Using the `ServiceTestBase` base class

```typescript
import { ServiceTestBase } from '@common/tests/unit/base/service-test-base'
import { TestDataFactory } from '@common/tests/unit/builders/test-data-builders'
import { TestAssertions, MockManager } from '@common/tests/unit/utils/advanced-test-utils'

class MyServiceTest extends ServiceTestBase<MyService> {
  private mockManager = new MockManager()

  protected getServiceClass() {
    return MyService
  }

  protected getProviders(): Provider[] {
    return [
      { provide: PrismaService, useValue: mockPrismaService },
      { provide: Logger, useValue: mockLogger }
    ]
  }

  protected async customSetup(): Promise<void> {
    // Service-specific configuration
    this.mockManager.createMock('mySpecificMock')
  }

  testMyMethod(): void {
    describe('myMethod', () => {
      it('should work correctly', async () => {
        // Arrange
        const testData = TestDataFactory.user().withEmail('test@example.com').build()

        // Act
        const result = await this.service.myMethod(testData.id)

        // Assert
        expect(result).toBeDefined()
      })
    })
  }
}

// Running the tests
describe('MyService', () => {
  const myServiceTest = new MyServiceTest()

  beforeEach(async () => {
    await myServiceTest.setupTest()
  })

  afterEach(async () => {
    await myServiceTest.cleanupTest()
  })

  myServiceTest.testMyMethod()
})
```

### Test Data Builders

Instead of using static objects, use builders for more flexibility:

```typescript
// ❌ Old style (rigid)
const mockUser = {
  id: '1',
  email: 'test@example.com',
  isActive: true
}

// ✅ New style (flexible)
const testUser = TestDataFactory.user().withId('user-123').withEmail('john.doe@example.com').withActiveStatus(false).build()

const inactiveUser = TestDataFactory.user().withActiveStatus(false).build()
```

### Test Scenarios

Use `TestScenario` to organize complex test setups:

```typescript
const successScenario = TestScenario.create(
  'successful operation',
  async () => {
    // Setup for this scenario
    mockService.findUser.mockResolvedValue(testUser)
    mockService.updateUser.mockResolvedValue(updatedUser)
  },
  async () => {
    // Scenario-specific cleanup (optional)
  }
)

it('should handle success case', async () => {
  await successScenario.execute(async () => {
    const result = await service.updateUser(testUser.id, updateData)
    expect(result).toEqual(updatedUser)
  })
})
```

### Advanced Assertions

```typescript
// Object structure verification
TestAssertions.assertObjectStructure(result, {
  id: 'string',
  name: 'string',
  isActive: 'boolean',
  metadata: {
    createdAt: 'string',
    updatedAt: 'string'
  }
})

// Error verification with specific message
await TestAssertions.assertThrows(() => service.invalidOperation(), BadRequestException, 'Expected error message')

// Mock call order verification
TestAssertions.assertMockCallSequence(mockService.method, [
  ['arg1', 'arg2'],
  ['arg3', 'arg4']
])
```

## 🌐 E2E Tests

### Using the `E2ETestBase` base class

```typescript
import { E2ETestBase } from '@common/tests/e2e/base/e2e-test-base'

class MyModuleE2ETest extends E2ETestBase {
  protected getTestConfig(): E2ETestConfig {
    return {
      moduleImports: [MyModule, AuthModule, PrismaModule],
      testUsers: [
        {
          email: 'admin@test.com',
          password: 'TestPassword123',
          firstname: 'Admin',
          lastname: 'User',
          roles: ['admin'],
          identifier: 'admin'
        },
        {
          email: 'user@test.com',
          password: 'TestPassword123',
          firstname: 'Regular',
          lastname: 'User',
          roles: ['user'],
          identifier: 'user'
        }
      ]
    }
  }

  async testEndpoints(): Promise<void> {
    describe('API Endpoints', () => {
      it('should allow admin access', async () => {
        await this.loginAs('admin')

        const response = await this.testEndpoint({
          method: 'GET',
          endpoint: '/api/admin/users',
          expectedStatus: 200,
          authenticated: true
        })

        expect(response.body).toHaveProperty('users')
      })

      it('should deny user access to admin endpoints', async () => {
        await this.testEndpoint({
          method: 'GET',
          endpoint: '/api/admin/users',
          expectedStatus: 403,
          userIdentifier: 'user'
        })
      })
    })
  }
}

describe('MyModule (e2e)', () => {
  const e2eTest = new MyModuleE2ETest()

  beforeAll(async () => {
    await e2eTest.setupE2ETest()
  })

  afterAll(async () => {
    await e2eTest.cleanupE2ETest()
  })

  e2eTest.testEndpoints()
})
```

## 📋 Best Practices

### 1. Test Organization

- **Group tests by feature**: One test method per main feature
- **Use descriptive names**: `testFetchUserWithValidId()` rather than `testFetch()`
- **Separate scenarios**: Success, error cases, edge cases

### 2. Test Data

- **Use builders**: More flexible than static objects
- **Create specific data**: Each test should have its own data
- **Avoid dependencies between tests**: Each test must be independent

### 3. Mocks and Stubs

- **Use MockManager**: To organize your mocks
- **Configure mocks in the right place**: In `customSetup()` or in scenarios
- **Check important interactions**: Don't hesitate to verify that the right methods are called

### 4. Assertions

- **Be specific**: Check the exact structure of returned objects
- **Test error cases**: Use `TestAssertions.assertThrows()`
- **Check side effects**: Logs, external service calls, etc.

## 🔄 Migration from the Old System

### Migration Steps

1. **Create a new test class** inheriting from `ServiceTestBase`
2. **Replace static mock objects** with builders
3. **Organize tests into methods** rather than nested `describe` blocks
4. **Use advanced utilities** for complex assertions
5. **Test and compare** with the old tests

### Migration Example

```typescript
// ❌ Old style
describe('UserService', () => {
  let service: UserService
  let prismaService: jest.Mocked<PrismaService>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: mockPrismaService }]
    }).compile()

    service = module.get<UserService>(UserService)
    prismaService = module.get(PrismaService)
  })

  describe('findById', () => {
    it('should return user', async () => {
      const mockUser = { id: '1', email: 'test@example.com' }
      prismaService.user.findUnique.mockResolvedValue(mockUser)

      const result = await service.findById('1')
      expect(result).toEqual(mockUser)
    })
  })
})

// ✅ New style
class UserServiceTest extends ServiceTestBase<UserService> {
  protected getServiceClass() {
    return UserService
  }
  protected getProviders(): Provider[] {
    return [{ provide: PrismaService, useValue: mockPrismaService }]
  }

  testFindById(): void {
    describe('findById', () => {
      it('should return user', async () => {
        const testUser = TestDataFactory.user().build()
        this.getService(PrismaService).user.findUnique.mockResolvedValue(testUser)

        const result = await this.service.findById(testUser.id)
        expect(result).toEqual(testUser)
      })
    })
  }
}
```

## 🐛 Debugging and Troubleshooting

### Common Issues

1. **Mocks not configured**: Check that all necessary mocks are set up in `customSetup()`
2. **Tests polluting each other**: Make sure `clearAllMocks()` is called properly
3. **Invalid test data**: Use builders to create consistent data

### Debugging Tools

```typescript
// Use MockManager to trace calls
const mockManager = new MockManager()
const trackedMock = mockManager.createMock('myMethod', (...args) => {
  console.log('Mock called with:', args)
  return 'result'
})

// Measure performance
const { result, executionTime } = await PerformanceTestHelper.measureExecutionTime(() => service.heavyOperation())
console.log(`Operation took ${executionTime}ms`)
```

## 📊 Metrics and Coverage

The new infrastructure also facilitates:

- **Coverage measurement**: More targeted and organized tests
- **Performance metrics**: Built-in tools to measure execution times
- **Quality reporting**: Consistent structure for test analysis

## 🚀 Next Steps

1. **Gradually migrate** existing tests to the new infrastructure
2. **Create templates** for new modules
3. **Add ESLint rules** to enforce best practices
4. **Document patterns** specific to your application domain
