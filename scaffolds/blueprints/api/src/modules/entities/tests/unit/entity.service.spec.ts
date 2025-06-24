/**
 * Resources
 */
import { BadRequestException, NotFoundException, Provider, UnauthorizedException } from '@nestjs/common'

/**
 * Dependencies
 */
import { AccountAccessService } from '@common/services/account-access/account-access.service'
import { Logger } from '@common/services/logger/logger.service'
import { PrismaService } from '@configs/prisma/services/prisma.service'
import { EntityService } from '@modules/entities/services/entity.service'

/**
 * Test infrastructure
 */
import { ServiceTestBase } from '@common/tests/unit/base/service-test-base'
import { mockAccountAccessService, mockLogger, mockPrismaService } from '@common/tests/unit/mocks/service-mocks'
import { mockAccount, mockEntity, mockOrganization, mockUser, mockUserAccountLink } from '@common/tests/unit/mocks/test-data'
import { MockManager, TestAssertions, TestScenario } from '@common/tests/unit/utils/advanced-test-utils'

/**
 * Test implementation using the new infrastructure
 */
class EntityServiceTest extends ServiceTestBase<EntityService> {
  private mockManager = new MockManager()
  private logger: jest.Mocked<Logger>
  private prismaService: jest.Mocked<PrismaService>
  private accountAccessService: jest.Mocked<AccountAccessService>

  protected getServiceClass() {
    return EntityService
  }

  protected getProviders(): Provider[] {
    return [
      { provide: PrismaService, useValue: mockPrismaService },
      { provide: Logger, useValue: mockLogger },
      { provide: AccountAccessService, useValue: mockAccountAccessService }
    ]
  }

  protected async customSetup(): Promise<void> {
    // Configure additional Prisma mocks with proper typing
    const prismaServiceAny = mockPrismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
    prismaServiceAny.organization = {
      findUnique: jest.fn()
    }
    prismaServiceAny.entity = {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
    prismaServiceAny.userEntityLink = {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn()
    }
    prismaServiceAny.userAccountLink = {
      findMany: jest.fn()
    }
    prismaServiceAny.$transaction = jest.fn().mockImplementation(async (callback) => {
      if (typeof callback === 'function') {
        return await callback(prismaServiceAny)
      }
      return Promise.resolve(callback)
    })

    // Get service references
    this.logger = this.getService(Logger)
    this.prismaService = this.getService(PrismaService)
    this.accountAccessService = this.getService(AccountAccessService)
  }

  /**
   * Test createEntity functionality
   */
  testCreateEntity(): void {
    describe('createEntity', () => {
      const createEntityDto = {
        name: 'Test Entity',
        description: 'Test Entity Description',
        accountId: mockAccount.id,
        organizationId: mockOrganization.id
      }

      describe('when successful', () => {
        const successScenario = TestScenario.create('successful creation', async () => {
          this.accountAccessService.validateUserAccountAccess.mockResolvedValue(mockUserAccountLink)
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.organization.findUnique.mockResolvedValue(mockOrganization)
          prismaServiceAny.entity.create.mockResolvedValue(mockEntity)
        })

        it('should create an entity successfully', async () => {
          await successScenario.execute(async () => {
            // Act
            const result = await this.service.createEntity(mockUser.id, createEntityDto)

            // Assert
            expect(result).toEqual(
              expect.objectContaining({
                id: mockEntity.id,
                name: mockEntity.name,
                isActive: mockEntity.isActive,
                description: mockEntity.description,
                organization: expect.objectContaining({
                  id: mockOrganization.id,
                  name: mockOrganization.name
                })
              })
            )

            // Verify
            expect(this.accountAccessService.validateUserAccountAccess).toHaveBeenCalledWith(mockUser.id, mockAccount.id, expect.any(String))
            const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
            expect(prismaServiceAny.organization.findUnique).toHaveBeenCalledWith({
              where: { id: mockOrganization.id }
            })
            expect(prismaServiceAny.entity.create).toHaveBeenCalledWith({
              data: expect.objectContaining({
                name: createEntityDto.name,
                description: createEntityDto.description,
                accountId: createEntityDto.accountId,
                organizationId: createEntityDto.organizationId
              })
            })
          })
        })
      })

      describe('when errors occur', () => {
        it('should throw NotFoundException if organization does not exist', async () => {
          // Arrange
          this.accountAccessService.validateUserAccountAccess.mockResolvedValue(mockUserAccountLink)
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.organization.findUnique.mockResolvedValue(null)

          // Act & Assert
          await TestAssertions.assertThrows(() => this.service.createEntity(mockUser.id, createEntityDto), NotFoundException)
        })

        it('should throw UnauthorizedException if user does not have access to account', async () => {
          // Arrange
          this.accountAccessService.validateUserAccountAccess.mockRejectedValue(new UnauthorizedException())
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.organization.findUnique.mockResolvedValue(mockOrganization)

          // Act & Assert
          await TestAssertions.assertThrows(() => this.service.createEntity(mockUser.id, createEntityDto), UnauthorizedException)
        })

        it('should handle database error gracefully', async () => {
          // Arrange
          this.accountAccessService.validateUserAccountAccess.mockResolvedValue(mockUserAccountLink)
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.organization.findUnique.mockResolvedValue(mockOrganization)
          prismaServiceAny.entity.create.mockRejectedValue(new Error('Database error'))

          // Act & Assert
          await TestAssertions.assertThrows(() => this.service.createEntity(mockUser.id, createEntityDto), BadRequestException)

          // Verify
          expect(this.logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to create entity'), 'createEntity')
        })
      })
    })
  }

  /**
   * Test updateEntityUsers functionality
   */
  testUpdateEntityUsers(): void {
    describe('updateEntityUsers', () => {
      const mockEntityWithUsers = {
        ...mockEntity,
        account: mockAccount,
        users: [
          {
            userId: '1',
            user: {
              id: '1',
              email: 'user1@test.com',
              isActive: true,
              people: {
                id: '1',
                firstname: 'John',
                lastname: 'Doe'
              }
            }
          }
        ]
      }

      describe('when successful', () => {
        const successScenario = TestScenario.create('successful update', async () => {
          this.accountAccessService.validateUserAccountAccess.mockResolvedValue(mockUserAccountLink)
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.entity.findUnique.mockResolvedValue(mockEntityWithUsers)
          prismaServiceAny.userEntityLink.deleteMany.mockResolvedValue({ count: 1 })
          prismaServiceAny.userEntityLink.createMany.mockResolvedValue({ count: 1 })
          prismaServiceAny.userEntityLink.findMany.mockResolvedValue([
            {
              user: {
                id: '2',
                email: 'user2@test.com',
                isActive: true,
                people: {
                  id: '2',
                  firstname: 'Jane',
                  lastname: 'Smith'
                }
              }
            }
          ])
          prismaServiceAny.userAccountLink.findMany.mockResolvedValue([
            {
              userId: '2',
              accountId: mockAccount.id
            }
          ])
        })

        it('should update entity users successfully', async () => {
          await successScenario.execute(async () => {
            // Act
            const result = await this.service.updateEntityUsers(mockUser.id, mockEntity.id, ['2'])

            // Assert
            expect(result).toEqual({
              id: mockEntity.id,
              name: mockEntity.name,
              users: [
                expect.objectContaining({
                  id: '2',
                  email: 'user2@test.com',
                  firstname: 'Jane',
                  lastname: 'Smith',
                  isActive: true
                })
              ]
            })

            // Verify
            expect(this.accountAccessService.validateUserAccountAccess).toHaveBeenCalledWith(mockUser.id, mockAccount.id, expect.any(String))
            const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
            expect(prismaServiceAny.userEntityLink.deleteMany).toHaveBeenCalled()
            expect(prismaServiceAny.userEntityLink.createMany).toHaveBeenCalled()
          })
        })
      })

      describe('when errors occur', () => {
        it('should throw NotFoundException if entity does not exist', async () => {
          // Arrange
          this.accountAccessService.validateUserAccountAccess.mockResolvedValue(mockUserAccountLink)
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.entity.findUnique.mockResolvedValue(null)

          // Act & Assert
          await TestAssertions.assertThrows(() => this.service.updateEntityUsers(mockUser.id, 'non-existent-id', ['2']), NotFoundException)
        })

        it('should throw UnauthorizedException if user does not have access to account', async () => {
          // Arrange
          this.accountAccessService.validateUserAccountAccess.mockRejectedValue(new UnauthorizedException())
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.entity.findUnique.mockResolvedValue(mockEntityWithUsers)

          // Act & Assert
          await TestAssertions.assertThrows(() => this.service.updateEntityUsers(mockUser.id, mockEntity.id, ['2']), UnauthorizedException)
        })

        it('should throw BadRequestException if removing all users would leave account without active users', async () => {
          // Arrange
          this.accountAccessService.validateUserAccountAccess.mockResolvedValue(mockUserAccountLink)
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.entity.findUnique.mockResolvedValue(mockEntityWithUsers)
          prismaServiceAny.userAccountLink.findMany.mockResolvedValue([])
          prismaServiceAny.userEntityLink.findMany.mockResolvedValue([])

          // Act & Assert
          await TestAssertions.assertThrows(() => this.service.updateEntityUsers(mockUser.id, mockEntity.id, []), BadRequestException)
        })

        it('should handle database error gracefully', async () => {
          // Arrange
          this.accountAccessService.validateUserAccountAccess.mockResolvedValue(mockUserAccountLink)
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.entity.findUnique.mockResolvedValue(mockEntityWithUsers)
          prismaServiceAny.userAccountLink.findMany.mockResolvedValue([{ userId: '3', accountId: mockAccount.id }])
          prismaServiceAny.userEntityLink.findMany.mockResolvedValue([{ userId: '3', entityId: 'other-entity' }])

          // Reset les mocks
          this.logger.error.mockClear()

          // Mock transaction to throw error
          prismaServiceAny.$transaction.mockImplementationOnce(() => {
            throw new Error('Database error')
          })

          // Act & Assert
          await TestAssertions.assertThrows(() => this.service.updateEntityUsers(mockUser.id, mockEntity.id, []), BadRequestException)

          // Verify
          expect(this.logger.error).toHaveBeenCalledWith(expect.stringContaining(`Failed to manage users for entity ${mockEntity.id}`), 'updateEntityUsers')
        })
      })
    })
  }
}

// Execute the tests
describe('EntityService (Refactored)', () => {
  const entityServiceTest = new EntityServiceTest()

  beforeEach(async () => {
    await entityServiceTest.setupTest()
  })

  afterEach(async () => {
    await entityServiceTest.cleanupTest()
  })

  // Run all test suites
  entityServiceTest.testCreateEntity()
  entityServiceTest.testUpdateEntityUsers()
})
