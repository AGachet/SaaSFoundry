/**
 * Refactored unit tests for AccountService using the new testing infrastructure
 * This demonstrates how to use the base classes and utilities for cleaner, more maintainable tests
 */

import { BadRequestException, NotFoundException, Provider, UnauthorizedException } from '@nestjs/common'

/**
 * Dependencies
 */
import { AccountAccessService } from '@common/services/account-access/account-access.service'
import { Logger } from '@common/services/logger/logger.service'
import { PaginationService } from '@common/services/pagination/pagination.service'
import { PrismaService } from '@configs/prisma/services/prisma.service'
import { AccountService } from '@modules/accounts/services/account.service'

/**
 * Test infrastructure
 */
import { ServiceTestBase } from '@common/tests/unit/base/service-test-base'
import { TestDataFactory } from '@common/tests/unit/builders/test-data-builders'
import { mockAccountAccessService, mockLogger, mockPrismaService } from '@common/tests/unit/mocks/service-mocks'
import { MockManager, TestAssertions, TestScenario } from '@common/tests/unit/utils/advanced-test-utils'

/**
 * Interface for pagination DTO
 */
interface PaginationDto {
  limit?: number
  page?: number
}

/**
 * Test implementation using the new infrastructure
 */
class AccountServiceTest extends ServiceTestBase<AccountService> {
  private mockManager = new MockManager()
  private logger: jest.Mocked<Logger>
  private prismaService: jest.Mocked<PrismaService>
  private accountAccessService: jest.Mocked<AccountAccessService>
  private paginationService: jest.Mocked<PaginationService>

  protected getServiceClass() {
    return AccountService
  }

  protected getProviders(): Provider[] {
    // Create mock for PaginationService with proper typing
    const mockPaginationService = {
      getOffset: this.mockManager.createMock('paginationGetOffset', () => 0),
      createPaginatedResponse: this.mockManager.createMock('paginationCreateResponse', (data: unknown[], dto: PaginationDto, total: number) => ({
        items: data,
        meta: {
          pagination: {
            page: 1,
            limit: dto.limit || 10,
            total
          },
          count: data.length
        }
      }))
    }

    return [
      { provide: PrismaService, useValue: mockPrismaService },
      { provide: Logger, useValue: mockLogger },
      { provide: AccountAccessService, useValue: mockAccountAccessService },
      { provide: PaginationService, useValue: mockPaginationService }
    ]
  }

  protected async customSetup(): Promise<void> {
    // Configure additional Prisma mocks with proper typing
    const prismaServiceAny = mockPrismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
    prismaServiceAny.user.count = jest.fn()
    prismaServiceAny.entity.findMany = jest.fn()
    prismaServiceAny.entity.count = jest.fn()
    prismaServiceAny.role.count = jest.fn()
    prismaServiceAny.$transaction = jest.fn()

    // Get service references
    this.logger = this.getService(Logger)
    this.prismaService = this.getService(PrismaService)
    this.accountAccessService = this.getService(AccountAccessService)
    this.paginationService = this.getService(PaginationService)
  }

  /**
   * Test fetchAccount functionality
   */
  testFetchAccount(): void {
    describe('fetchAccount', () => {
      const testUser = TestDataFactory.user().withId('user-1').build()
      const testAccount = TestDataFactory.account().withId('account-1').build()

      describe('when successful', () => {
        const successScenario = TestScenario.create('successful fetch', async () => {
          // Setup scenario-specific mocks
          const mockPeople = { id: '1', firstname: 'Bruce', lastname: 'Wayne' }
          const mockRole = TestDataFactory.role().build()
          const mockEntity = TestDataFactory.entity().build()

          const userWithCompleteStructure = {
            ...testUser,
            people: mockPeople,
            rolesLinked: [{ role: mockRole }],
            entitiesLinked: [{ entity: { ...mockEntity, organization: null } }],
            accountsLinked: [{ accountId: testAccount.id }],
            createdAt: new Date(),
            updatedAt: new Date()
          }

          const enhancedAccount = {
            ...testAccount,
            description: 'Test Account Description',
            createdAt: new Date(),
            updatedAt: new Date()
          }

          const userAccountLink = TestDataFactory.userAccountLink().withUserId(testUser.id).withAccountId(testAccount.id).build()

          this.accountAccessService.validateUserAccountAccess.mockResolvedValue({
            ...userAccountLink,
            account: enhancedAccount,
            indirectAccess: false
          })

          // Mock the 6 queries that the transaction performs in the exact order
          const mockTransactionResults = [
            [userWithCompleteStructure], // users query (findMany)
            1, // users count
            [{ ...mockEntity, organization: null }], // entities query (findMany)
            1, // entities count
            [mockRole], // roles query (findMany)
            1 // roles count
          ]

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.$transaction.mockResolvedValue(mockTransactionResults)
        })

        it('should fetch account details with all related data', async () => {
          await successScenario.execute(async () => {
            // Act
            const result = await this.service.fetchAccount(testUser.id, testAccount.id)

            // Assert
            expect(result).toBeDefined()
            expect(this.accountAccessService.validateUserAccountAccess).toHaveBeenCalledWith(testUser.id, testAccount.id, 'getAccountDetails')

            const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
            expect(prismaServiceAny.$transaction).toHaveBeenCalled()
          })
        })

        it('should return structured account data', async () => {
          await successScenario.execute(async () => {
            // Act
            const result = await this.service.fetchAccount(testUser.id, testAccount.id)

            // Assert with advanced assertions - check the exact structure
            TestAssertions.assertObjectStructure(result, {
              id: 'string',
              name: 'string',
              description: 'string',
              isActive: 'boolean',
              createdAt: 'object', // Date
              updatedAt: 'object', // Date
              users: {
                count: 'number',
                values: 'object'
              },
              entities: {
                count: 'number',
                values: 'object'
              },
              roles: {
                count: 'number',
                values: 'object'
              }
            })

            // Check that we have the expected values
            expect(result.users.count).toBe(1)
            expect(result.entities.count).toBe(1)
            expect(result.roles.count).toBe(1)
            expect(result.users.values).toHaveLength(1)
            expect(result.entities.values).toHaveLength(1)
            expect(result.roles.values).toHaveLength(1)
          })
        })
      })

      describe('when user has no access', () => {
        const unauthorizedScenario = TestScenario.create('unauthorized access', async () => {
          this.accountAccessService.validateUserAccountAccess.mockRejectedValue(new UnauthorizedException('Access denied'))
        })

        it('should throw UnauthorizedException', async () => {
          await unauthorizedScenario.execute(async () => {
            // Act & Assert
            await TestAssertions.assertThrows(() => this.service.fetchAccount(testUser.id, testAccount.id), UnauthorizedException, 'Access denied')
          })
        })
      })

      describe('when account not found', () => {
        const notFoundScenario = TestScenario.create('account not found', async () => {
          this.accountAccessService.validateUserAccountAccess.mockRejectedValue(new NotFoundException('Account not found'))
        })

        it('should throw NotFoundException', async () => {
          await notFoundScenario.execute(async () => {
            // Act & Assert
            await TestAssertions.assertThrows(() => this.service.fetchAccount(testUser.id, 'non-existent-account'), NotFoundException, 'Account not found')
          })
        })
      })

      describe('when database error occurs', () => {
        const databaseErrorScenario = TestScenario.create('database error', async () => {
          const userAccountLink = TestDataFactory.userAccountLink().withUserId(testUser.id).withAccountId(testAccount.id).build()

          this.accountAccessService.validateUserAccountAccess.mockResolvedValue({
            ...userAccountLink,
            account: testAccount,
            indirectAccess: false
          })

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.$transaction.mockRejectedValue(new Error('Database connection error'))
        })

        it('should throw BadRequestException', async () => {
          await databaseErrorScenario.execute(async () => {
            // Act & Assert
            await TestAssertions.assertThrows(() => this.service.fetchAccount(testUser.id, testAccount.id), BadRequestException, 'Failed to get account details')
          })
        })
      })
    })
  }

  /**
   * Test updateAccountStatus functionality
   */
  testUpdateAccountStatus(): void {
    describe('updateAccountStatus', () => {
      const testUser = TestDataFactory.user().build()
      const testAccount = TestDataFactory.account().build()

      it('should update account status successfully', async () => {
        // Arrange
        const updateDto = { isActive: false }
        const expectedResponse = {
          id: testAccount.id,
          name: testAccount.name,
          isActive: false
        }

        this.accountAccessService.validateUserAccountAccess.mockResolvedValue({
          userId: testUser.id,
          accountId: testAccount.id,
          account: testAccount,
          indirectAccess: false
        })

        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        prismaServiceAny.account.update.mockResolvedValue({
          id: testAccount.id,
          name: testAccount.name,
          isActive: false,
          // The service only uses id, name, and isActive from the result
          description: 'Test Description',
          createdAt: new Date(),
          updatedAt: new Date()
        })

        // Act
        const result = await this.service.updateAccountStatus(testUser.id, testAccount.id, updateDto.isActive)

        // Assert - Only check the fields that the service actually returns
        expect(result).toEqual(expectedResponse)
        expect(prismaServiceAny.account.update).toHaveBeenCalledWith({
          where: { id: testAccount.id },
          data: { isActive: false }
        })
      })

      it('should not update if account is already in desired state', async () => {
        // Arrange
        this.accountAccessService.validateUserAccountAccess.mockResolvedValue({
          userId: testUser.id,
          accountId: testAccount.id,
          account: testAccount, // Already active by default in TestDataFactory
          indirectAccess: false
        })

        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any

        // Act
        const result = await this.service.updateAccountStatus(testUser.id, testAccount.id, true) // Same as default

        // Assert
        expect(result).toEqual({
          id: testAccount.id,
          name: testAccount.name,
          isActive: true
        })

        // Verify update is not called since state hasn't changed
        expect(prismaServiceAny.account.update).not.toHaveBeenCalled()
      })

      it('should handle validation errors', async () => {
        // Arrange - Test with invalid user access
        this.accountAccessService.validateUserAccountAccess.mockRejectedValue(new UnauthorizedException('Access denied'))

        // Act & Assert
        await TestAssertions.assertThrows(() => this.service.updateAccountStatus(testUser.id, testAccount.id, false), UnauthorizedException, 'Access denied')
      })

      it('should handle database errors', async () => {
        // Arrange
        this.accountAccessService.validateUserAccountAccess.mockResolvedValue({
          userId: testUser.id,
          accountId: testAccount.id,
          account: testAccount,
          indirectAccess: false
        })

        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        prismaServiceAny.account.update.mockRejectedValue(new Error('Database error'))

        // Act & Assert
        await TestAssertions.assertThrows(() => this.service.updateAccountStatus(testUser.id, testAccount.id, false), BadRequestException, 'Failed to deactivate account')
      })
    })
  }

  /**
   * Test updateAccountUsers functionality
   */
  testUpdateAccountUsers(): void {
    describe('updateAccountUsers', () => {
      const testUser = TestDataFactory.user().build()
      const testAccount = TestDataFactory.account().build()

      const mockAccountWithUsers = {
        ...testAccount,
        usersLinked: [
          {
            userId: testUser.id,
            accountId: testAccount.id,
            user: {
              ...testUser,
              people: {
                firstname: 'Bruce',
                lastname: 'Wayne'
              }
            }
          }
        ],
        entities: [
          {
            ...TestDataFactory.entity().build(),
            users: [{ user: testUser }]
          }
        ]
      }

      const mockNewUsers = [
        {
          id: '2',
          email: 'user2@test.com',
          isActive: true,
          people: {
            firstname: 'Jane',
            lastname: 'Doe'
          }
        },
        {
          id: '3',
          email: 'user3@test.com',
          isActive: true,
          people: {
            firstname: 'John',
            lastname: 'Smith'
          }
        }
      ]

      beforeEach(() => {
        this.accountAccessService.validateUserAccountAccess.mockResolvedValue({
          userId: testUser.id,
          accountId: testAccount.id,
          account: testAccount,
          indirectAccess: false
        })
      })

      it('should update account users successfully', async () => {
        // Arrange
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        prismaServiceAny.account.findUnique.mockResolvedValue(mockAccountWithUsers)
        prismaServiceAny.$transaction.mockImplementation(
          async (
            callback: (tx: any) => Promise<any> // eslint-disable-line @typescript-eslint/no-explicit-any
          ) =>
            callback({
              userAccountLink: {
                deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
                createMany: jest.fn().mockResolvedValue({ count: 2 })
              }
            })
        )
        prismaServiceAny.userAccountLink.findMany.mockResolvedValue(mockNewUsers.map((user) => ({ user })))

        // Act
        const newUserIds = ['2', '3']
        const result = await this.service.updateAccountUsers(testUser.id, testAccount.id, newUserIds)

        // Assert
        expect(result).toEqual({
          id: testAccount.id,
          name: testAccount.name,
          users: expect.arrayContaining([
            expect.objectContaining({
              id: '2',
              email: 'user2@test.com',
              isActive: true,
              people: {
                firstname: 'Jane',
                lastname: 'Doe'
              }
            }),
            expect.objectContaining({
              id: '3',
              email: 'user3@test.com',
              isActive: true,
              people: {
                firstname: 'John',
                lastname: 'Smith'
              }
            })
          ])
        })
      })

      it('should handle partial update (add and remove users simultaneously)', async () => {
        // Arrange
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        prismaServiceAny.account.findUnique.mockResolvedValue(mockAccountWithUsers)
        prismaServiceAny.$transaction.mockImplementation(
          async (
            callback: (tx: any) => Promise<any> // eslint-disable-line @typescript-eslint/no-explicit-any
          ) =>
            callback({
              userAccountLink: {
                deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
                createMany: jest.fn().mockResolvedValue({ count: 1 })
              }
            })
        )
        prismaServiceAny.userAccountLink.findMany.mockResolvedValue([{ user: mockNewUsers[0] }])

        // Act
        const result = await this.service.updateAccountUsers(testUser.id, testAccount.id, ['2'])

        // Assert
        expect(result).toEqual({
          id: testAccount.id,
          name: testAccount.name,
          users: expect.arrayContaining([
            expect.objectContaining({
              id: '2',
              email: 'user2@test.com',
              isActive: true,
              people: {
                firstname: 'Jane',
                lastname: 'Doe'
              }
            })
          ])
        })
      })

      it('should handle users with inactive status', async () => {
        // Arrange
        const inactiveUser = { ...mockNewUsers[0], isActive: false }
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        prismaServiceAny.account.findUnique.mockResolvedValue(mockAccountWithUsers)
        prismaServiceAny.$transaction.mockImplementation(
          async (
            callback: (tx: any) => Promise<any> // eslint-disable-line @typescript-eslint/no-explicit-any
          ) =>
            callback({
              userAccountLink: {
                deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
                createMany: jest.fn().mockResolvedValue({ count: 1 })
              }
            })
        )
        prismaServiceAny.userAccountLink.findMany.mockResolvedValue([{ user: inactiveUser }])

        // Act
        const result = await this.service.updateAccountUsers(testUser.id, testAccount.id, ['2'])

        // Assert
        expect(result.users).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: '2',
              isActive: false
            })
          ])
        )
      })

      it('should throw UnauthorizedException if user does not have access', async () => {
        // Arrange
        this.accountAccessService.validateUserAccountAccess.mockRejectedValue(new UnauthorizedException())

        // Act & Assert
        await TestAssertions.assertThrows(() => this.service.updateAccountUsers(testUser.id, testAccount.id, ['2', '3']), UnauthorizedException)
      })

      it('should throw NotFoundException if account does not exist', async () => {
        // Arrange
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        prismaServiceAny.account.findUnique.mockResolvedValue(null)

        // Act & Assert
        await TestAssertions.assertThrows(() => this.service.updateAccountUsers(testUser.id, testAccount.id, ['2', '3']), NotFoundException, 'Account with ID 1 not found')
      })

      it('should throw BadRequestException if update would leave account without active users', async () => {
        // Arrange
        const emptyAccount = {
          ...mockAccountWithUsers,
          usersLinked: [], // No direct users
          entities: [] // No entities with users
        }
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        prismaServiceAny.account.findUnique.mockResolvedValue(emptyAccount)

        // Act & Assert
        await TestAssertions.assertThrows(
          () => this.service.updateAccountUsers(testUser.id, testAccount.id, []),
          BadRequestException,
          'Cannot update users as it would leave the account without any active users (directly or via active entities)'
        )
      })

      it('should handle case where some users do not exist', async () => {
        // Arrange
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        prismaServiceAny.account.findUnique.mockResolvedValue(mockAccountWithUsers)
        const foreignKeyError = new Error('Foreign key constraint failed')
        prismaServiceAny.$transaction.mockRejectedValue(foreignKeyError)

        // Act & Assert
        await TestAssertions.assertThrows(() => this.service.updateAccountUsers(testUser.id, testAccount.id, ['999']), BadRequestException)
      })
    })
  }

  /**
   * Test fetchAccountUsers functionality
   */
  testFetchAccountUsers(): void {
    describe('fetchAccountUsers', () => {
      const testUser = TestDataFactory.user().build()
      const testAccount = TestDataFactory.account().build()

      const mockUsersList = [
        {
          ...testUser,
          people: {
            id: '1',
            firstname: 'Bruce',
            lastname: 'Wayne'
          },
          rolesLinked: [{ role: TestDataFactory.role().build() }],
          entitiesLinked: [{ entity: { ...TestDataFactory.entity().build(), accountId: testAccount.id } }],
          accountsLinked: [{ accountId: testAccount.id }]
        }
      ]

      beforeEach(() => {
        this.accountAccessService.validateUserAccountAccess.mockResolvedValue({
          userId: testUser.id,
          accountId: testAccount.id,
          account: testAccount,
          indirectAccess: false
        })

        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        prismaServiceAny.$transaction.mockResolvedValue([mockUsersList, 1])
      })

      it('should fetch account users with pagination', async () => {
        // Arrange
        const dto = { page: 1, limit: 10 }

        // Act
        const result = await this.service.fetchAccountUsers(testUser.id, testAccount.id, dto)

        // Assert
        expect(result).toBeDefined()
        expect(result.items).toBeDefined()
        expect(result.meta).toBeDefined()
        expect(this.accountAccessService.validateUserAccountAccess).toHaveBeenCalledWith(testUser.id, testAccount.id, 'fetchAccountUsers')
      })

      it('should apply search filter when provided', async () => {
        // Arrange
        const dto = { search: 'Wayne', page: 1, limit: 10 }

        // Act
        await this.service.fetchAccountUsers(testUser.id, testAccount.id, dto)

        // Assert
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(prismaServiceAny.$transaction).toHaveBeenCalled()
      })

      it('should apply entity filter when provided', async () => {
        // Arrange
        const dto = { entityIds: ['entity-1'], page: 1, limit: 10 }

        // Act
        await this.service.fetchAccountUsers(testUser.id, testAccount.id, dto)

        // Assert
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(prismaServiceAny.$transaction).toHaveBeenCalled()
      })

      it('should apply role filter when provided', async () => {
        // Arrange
        const dto = { roleIds: [1], page: 1, limit: 10 }

        // Act
        await this.service.fetchAccountUsers(testUser.id, testAccount.id, dto)

        // Assert
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(prismaServiceAny.$transaction).toHaveBeenCalled()
      })

      it('should apply isActive filter when provided', async () => {
        // Arrange
        const dto = { isActive: true, page: 1, limit: 10 }

        // Act
        await this.service.fetchAccountUsers(testUser.id, testAccount.id, dto)

        // Assert
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(prismaServiceAny.$transaction).toHaveBeenCalled()
      })

      it('should apply correct order when orderBy is provided', async () => {
        // Arrange
        const dto = { orderBy: 'name' as any, page: 1, limit: 10 } // eslint-disable-line @typescript-eslint/no-explicit-any

        // Act
        await this.service.fetchAccountUsers(testUser.id, testAccount.id, dto)

        // Assert
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(prismaServiceAny.$transaction).toHaveBeenCalled()
      })

      it('should throw UnauthorizedException if user does not have access', async () => {
        // Arrange
        this.accountAccessService.validateUserAccountAccess.mockRejectedValue(new UnauthorizedException())
        const dto = { page: 1, limit: 10 }

        // Act & Assert
        await TestAssertions.assertThrows(() => this.service.fetchAccountUsers(testUser.id, testAccount.id, dto), UnauthorizedException)
      })

      it('should handle database errors gracefully', async () => {
        // Arrange
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        prismaServiceAny.$transaction.mockRejectedValue(new Error('Database error'))
        const dto = { page: 1, limit: 10 }

        // Act & Assert
        await TestAssertions.assertThrows(() => this.service.fetchAccountUsers(testUser.id, testAccount.id, dto), BadRequestException)
      })
    })
  }

  /**
   * Test fetchAccountEntities functionality
   */
  testFetchAccountEntities(): void {
    describe('fetchAccountEntities', () => {
      const testUser = TestDataFactory.user().build()
      const testAccount = TestDataFactory.account().build()

      const mockEntitiesList = [
        {
          ...TestDataFactory.entity().build(),
          organization: {
            id: '1',
            name: 'Wayne Enterprises'
          }
        }
      ]

      beforeEach(() => {
        this.accountAccessService.validateUserAccountAccess.mockResolvedValue({
          userId: testUser.id,
          accountId: testAccount.id,
          account: testAccount,
          indirectAccess: false
        })

        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        prismaServiceAny.$transaction.mockResolvedValue([mockEntitiesList, 1])
      })

      it('should fetch account entities with pagination', async () => {
        // Arrange
        const dto = { page: 1, limit: 10 }

        // Act
        const result = await this.service.fetchAccountEntities(testUser.id, testAccount.id, dto)

        // Assert
        expect(result).toBeDefined()
        expect(result.items).toBeDefined()
        expect(result.meta).toBeDefined()
        expect(this.accountAccessService.validateUserAccountAccess).toHaveBeenCalledWith(testUser.id, testAccount.id, 'fetchAccountEntities')
      })

      it('should apply search filter when provided', async () => {
        // Arrange
        const dto = { search: 'Wayne', page: 1, limit: 10 }

        // Act
        await this.service.fetchAccountEntities(testUser.id, testAccount.id, dto)

        // Assert
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(prismaServiceAny.$transaction).toHaveBeenCalled()
      })

      it('should apply user filter when provided', async () => {
        // Arrange
        const dto = { userIds: [testUser.id], page: 1, limit: 10 }

        // Act
        await this.service.fetchAccountEntities(testUser.id, testAccount.id, dto)

        // Assert
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(prismaServiceAny.$transaction).toHaveBeenCalled()
      })

      it('should apply isActive filter when provided', async () => {
        // Arrange
        const dto = { isActive: true, page: 1, limit: 10 }

        // Act
        await this.service.fetchAccountEntities(testUser.id, testAccount.id, dto)

        // Assert
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(prismaServiceAny.$transaction).toHaveBeenCalled()
      })

      it('should apply correct order when orderBy is provided', async () => {
        // Arrange
        const dto = { orderBy: 'name' as any, page: 1, limit: 10 } // eslint-disable-line @typescript-eslint/no-explicit-any

        // Act
        await this.service.fetchAccountEntities(testUser.id, testAccount.id, dto)

        // Assert
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(prismaServiceAny.$transaction).toHaveBeenCalled()
      })

      it('should throw UnauthorizedException if user does not have access', async () => {
        // Arrange
        this.accountAccessService.validateUserAccountAccess.mockRejectedValue(new UnauthorizedException())
        const dto = { page: 1, limit: 10 }

        // Act & Assert
        await TestAssertions.assertThrows(() => this.service.fetchAccountEntities(testUser.id, testAccount.id, dto), UnauthorizedException)
      })

      it('should handle database errors gracefully', async () => {
        // Arrange
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        prismaServiceAny.$transaction.mockRejectedValue(new Error('Database error'))
        const dto = { page: 1, limit: 10 }

        // Act & Assert
        await TestAssertions.assertThrows(() => this.service.fetchAccountEntities(testUser.id, testAccount.id, dto), BadRequestException)
      })
    })
  }

  /**
   * Test fetchAccountRoles functionality
   */
  testFetchAccountRoles(): void {
    describe('fetchAccountRoles', () => {
      const testUser = TestDataFactory.user().build()
      const testAccount = TestDataFactory.account().build()

      const mockRolesList = [
        {
          ...TestDataFactory.role().build(),
          accountId: testAccount.id,
          description: 'Account admin role'
        }
      ]

      beforeEach(() => {
        this.accountAccessService.validateUserAccountAccess.mockResolvedValue({
          userId: testUser.id,
          accountId: testAccount.id,
          account: testAccount,
          indirectAccess: false
        })

        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        prismaServiceAny.$transaction.mockResolvedValue([mockRolesList, 1])
      })

      it('should fetch account roles with pagination', async () => {
        // Arrange
        const dto = { page: 1, limit: 10 }

        // Act
        const result = await this.service.fetchAccountRoles(testUser.id, testAccount.id, dto)

        // Assert
        expect(result).toBeDefined()
        expect(result.items).toBeDefined()
        expect(result.meta).toBeDefined()
        expect(this.accountAccessService.validateUserAccountAccess).toHaveBeenCalledWith(testUser.id, testAccount.id, 'fetchAccountRoles')
      })

      it('should apply search filter when provided', async () => {
        // Arrange
        const dto = { search: 'Admin', page: 1, limit: 10 }

        // Act
        await this.service.fetchAccountRoles(testUser.id, testAccount.id, dto)

        // Assert
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(prismaServiceAny.$transaction).toHaveBeenCalled()
      })

      it('should apply isActive filter when provided', async () => {
        // Arrange
        const dto = { isActive: true, page: 1, limit: 10 }

        // Act
        await this.service.fetchAccountRoles(testUser.id, testAccount.id, dto)

        // Assert
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(prismaServiceAny.$transaction).toHaveBeenCalled()
      })

      it('should apply correct order when orderBy is provided', async () => {
        // Arrange
        const dto = { orderBy: 'name' as any, page: 1, limit: 10 } // eslint-disable-line @typescript-eslint/no-explicit-any

        // Act
        await this.service.fetchAccountRoles(testUser.id, testAccount.id, dto)

        // Assert
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(prismaServiceAny.$transaction).toHaveBeenCalled()
      })

      it('should throw UnauthorizedException if user does not have access', async () => {
        // Arrange
        this.accountAccessService.validateUserAccountAccess.mockRejectedValue(new UnauthorizedException())
        const dto = { page: 1, limit: 10 }

        // Act & Assert
        await TestAssertions.assertThrows(() => this.service.fetchAccountRoles(testUser.id, testAccount.id, dto), UnauthorizedException)
      })

      it('should handle database errors gracefully', async () => {
        // Arrange
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        prismaServiceAny.$transaction.mockRejectedValue(new Error('Database error'))
        const dto = { page: 1, limit: 10 }

        // Act & Assert
        await TestAssertions.assertThrows(() => this.service.fetchAccountRoles(testUser.id, testAccount.id, dto), BadRequestException)
      })
    })
  }
}

// Execute the tests
describe('AccountService (Refactored)', () => {
  const accountServiceTest = new AccountServiceTest()

  beforeEach(async () => {
    await accountServiceTest.setupTest()
  })

  afterEach(async () => {
    await accountServiceTest.cleanupTest()
  })

  // Run all test suites
  accountServiceTest.testFetchAccount()
  accountServiceTest.testUpdateAccountStatus()
  accountServiceTest.testUpdateAccountUsers()
  accountServiceTest.testFetchAccountUsers()
  accountServiceTest.testFetchAccountEntities()
  accountServiceTest.testFetchAccountRoles()
})
