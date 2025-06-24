/**
 * Resources
 */
import { BadRequestException, NotFoundException, Provider, UnauthorizedException } from '@nestjs/common'
import { OrganizationType } from '@prisma/client'

/**
 * Dependencies
 */
import { AccountAccessService } from '@common/services/account-access/account-access.service'
import { Logger } from '@common/services/logger/logger.service'
import { PrismaService } from '@configs/prisma/services/prisma.service'
import { OrganizationService } from '@modules/organizations/services/organization.service'

/**
 * Test infrastructure
 */
import { ServiceTestBase } from '@common/tests/unit/base/service-test-base'
import { TestDataFactory } from '@common/tests/unit/builders/test-data-builders'
import { mockAccountAccessService, mockLogger, mockPrismaService } from '@common/tests/unit/mocks/service-mocks'
import { MockManager, TestAssertions, TestScenario } from '@common/tests/unit/utils/advanced-test-utils'

/**
 * Test implementation using the new infrastructure
 */
class OrganizationServiceTest extends ServiceTestBase<OrganizationService> {
  private mockManager = new MockManager()
  private logger: jest.Mocked<Logger>
  private prismaService: jest.Mocked<PrismaService>
  private accountAccessService: jest.Mocked<AccountAccessService>

  protected getServiceClass() {
    return OrganizationService
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
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    }
    prismaServiceAny.organizationAccountLink = {
      create: jest.fn()
    }
    prismaServiceAny.$transaction = jest.fn()

    // Get service references
    this.logger = this.getService(Logger)
    this.prismaService = this.getService(PrismaService)
    this.accountAccessService = this.getService(AccountAccessService)
  }

  /**
   * Test fetchOrganization functionality
   */
  testFetchOrganization(): void {
    describe('fetchOrganization', () => {
      const testUser = TestDataFactory.user().withId('user-1').build()
      const testAccount = TestDataFactory.account().withId('account-1').build()
      const testOrganization = TestDataFactory.organization().withId('org-1').withType(OrganizationType.COMPANY).build()

      describe('when successful', () => {
        const successScenario = TestScenario.create('successful fetch', async () => {
          const organizationWithAccounts = {
            ...testOrganization,
            accountsLinked: [{ accountId: testAccount.id }]
          }

          const userAccountLink = TestDataFactory.userAccountLink().withUserId(testUser.id).withAccountId(testAccount.id).build()

          this.accountAccessService.validateUserAccountAccess.mockResolvedValue({
            ...userAccountLink,
            account: testAccount,
            indirectAccess: false
          })

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.organization.findUnique.mockResolvedValue(organizationWithAccounts)
        })

        it('should fetch organization details successfully', async () => {
          await successScenario.execute(async () => {
            // Act
            const result = await this.service.fetchOrganization(testUser.id, testOrganization.id)

            // Assert
            expect(result).toBeDefined()
            expect(this.accountAccessService.validateUserAccountAccess).toHaveBeenCalledWith(testUser.id, testAccount.id, 'fetchOrganization')
            expect(result).toEqual({
              id: testOrganization.id,
              name: testOrganization.name,
              type: testOrganization.type,
              description: testOrganization.description,
              website: testOrganization.website,
              createdAt: testOrganization.createdAt,
              updatedAt: testOrganization.updatedAt
            })
          })
        })
      })

      describe('when organization not found', () => {
        const notFoundScenario = TestScenario.create('organization not found', async () => {
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.organization.findUnique.mockResolvedValue(null)
        })

        it('should throw NotFoundException', async () => {
          await notFoundScenario.execute(async () => {
            // Act & Assert
            await TestAssertions.assertThrows(() => this.service.fetchOrganization(testUser.id, 'non-existent-id'), NotFoundException)
          })
        })
      })

      describe('when organization has no linked accounts', () => {
        const noAccountsScenario = TestScenario.create('no linked accounts', async () => {
          const organizationWithoutAccounts = {
            ...testOrganization,
            accountsLinked: []
          }

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.organization.findUnique.mockResolvedValue(organizationWithoutAccounts)
        })

        it('should throw NotFoundException', async () => {
          await noAccountsScenario.execute(async () => {
            // Act & Assert
            await TestAssertions.assertThrows(() => this.service.fetchOrganization(testUser.id, testOrganization.id), NotFoundException)
          })
        })
      })

      describe('when user has no access', () => {
        const unauthorizedScenario = TestScenario.create('unauthorized access', async () => {
          const organizationWithAccounts = {
            ...testOrganization,
            accountsLinked: [{ accountId: testAccount.id }]
          }

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.organization.findUnique.mockResolvedValue(organizationWithAccounts)
          this.accountAccessService.validateUserAccountAccess.mockRejectedValue(new UnauthorizedException())
        })

        it('should throw UnauthorizedException', async () => {
          await unauthorizedScenario.execute(async () => {
            // Act & Assert
            await TestAssertions.assertThrows(() => this.service.fetchOrganization(testUser.id, testOrganization.id), UnauthorizedException)
          })
        })
      })

      describe('when database error occurs', () => {
        const databaseErrorScenario = TestScenario.create('database error', async () => {
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.organization.findUnique.mockRejectedValue(new Error('Database error'))
        })

        it('should throw BadRequestException', async () => {
          await databaseErrorScenario.execute(async () => {
            // Act & Assert
            await TestAssertions.assertThrows(() => this.service.fetchOrganization(testUser.id, testOrganization.id), BadRequestException, 'Failed to get organization')
          })
        })
      })
    })
  }

  /**
   * Test createOrganization functionality
   */
  testCreateOrganization(): void {
    describe('createOrganization', () => {
      const testUser = TestDataFactory.user().withId('user-1').build()
      const testAccount = TestDataFactory.account().withId('account-1').build()
      const testOrganization = TestDataFactory.organization().withId('org-1').withType(OrganizationType.COMPANY).build()

      describe('when successful', () => {
        const successScenario = TestScenario.create('successful creation', async () => {
          const userAccountLink = TestDataFactory.userAccountLink().withUserId(testUser.id).withAccountId(testAccount.id).build()

          this.accountAccessService.validateUserAccountAccess.mockResolvedValue({
            ...userAccountLink,
            account: testAccount,
            indirectAccess: false
          })

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.$transaction.mockImplementation(async (callback) => {
            const tx = {
              organization: {
                create: jest.fn().mockResolvedValue(testOrganization)
              },
              organizationAccountLink: {
                create: jest.fn().mockResolvedValue({
                  organizationId: testOrganization.id,
                  accountId: testAccount.id
                })
              }
            }
            return callback(tx)
          })
        })

        it('should create organization successfully', async () => {
          await successScenario.execute(async () => {
            // Arrange
            const createOrganizationDto = {
              name: testOrganization.name,
              type: testOrganization.type as OrganizationType,
              description: testOrganization.description,
              website: testOrganization.website,
              accountId: testAccount.id
            }

            // Act
            const result = await this.service.createOrganization(testUser.id, createOrganizationDto)

            // Assert
            expect(result).toBeDefined()
            expect(this.accountAccessService.validateUserAccountAccess).toHaveBeenCalledWith(testUser.id, testAccount.id, 'createOrganization')
            expect(result).toEqual({
              id: testOrganization.id,
              name: testOrganization.name,
              type: testOrganization.type,
              description: testOrganization.description,
              website: testOrganization.website,
              createdAt: testOrganization.createdAt,
              updatedAt: testOrganization.updatedAt
            })
          })
        })
      })

      describe('when user has no access', () => {
        const unauthorizedScenario = TestScenario.create('unauthorized access', async () => {
          this.accountAccessService.validateUserAccountAccess.mockRejectedValue(new UnauthorizedException())
        })

        it('should throw UnauthorizedException', async () => {
          await unauthorizedScenario.execute(async () => {
            // Arrange
            const createOrganizationDto = {
              name: testOrganization.name,
              type: testOrganization.type as OrganizationType,
              description: testOrganization.description,
              website: testOrganization.website,
              accountId: testAccount.id
            }

            // Act & Assert
            await TestAssertions.assertThrows(() => this.service.createOrganization(testUser.id, createOrganizationDto), UnauthorizedException)
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
          prismaServiceAny.organization.create.mockRejectedValue(new Error('Database error'))
        })

        it('should throw BadRequestException', async () => {
          await databaseErrorScenario.execute(async () => {
            // Arrange
            const createOrganizationDto = {
              name: testOrganization.name,
              type: testOrganization.type as OrganizationType,
              description: testOrganization.description,
              website: testOrganization.website,
              accountId: testAccount.id
            }

            // Act & Assert
            await TestAssertions.assertThrows(() => this.service.createOrganization(testUser.id, createOrganizationDto), BadRequestException, 'Failed to create organization')
          })
        })
      })
    })
  }

  /**
   * Test updateOrganization functionality
   */
  testUpdateOrganization(): void {
    describe('updateOrganization', () => {
      const testUser = TestDataFactory.user().withId('user-1').build()
      const testAccount = TestDataFactory.account().withId('account-1').build()
      const testOrganization = TestDataFactory.organization().withId('org-1').withType(OrganizationType.COMPANY).build()

      describe('when successful', () => {
        const successScenario = TestScenario.create('successful update', async () => {
          const organizationWithAccounts = {
            ...testOrganization,
            accountsLinked: [{ accountId: testAccount.id }]
          }

          const userAccountLink = TestDataFactory.userAccountLink().withUserId(testUser.id).withAccountId(testAccount.id).build()

          this.accountAccessService.validateUserAccountAccess.mockResolvedValue({
            ...userAccountLink,
            account: testAccount,
            indirectAccess: false
          })

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.organization.findUnique.mockResolvedValue(organizationWithAccounts)
          prismaServiceAny.organization.update.mockResolvedValue({
            ...testOrganization,
            name: 'Updated Organization Name',
            description: 'Updated Organization Description'
          })
        })

        it('should update organization successfully', async () => {
          await successScenario.execute(async () => {
            // Arrange
            const updateOrganizationDto = {
              name: 'Updated Organization Name',
              description: 'Updated Organization Description'
            }

            // Act
            const result = await this.service.updateOrganization(testUser.id, testOrganization.id, updateOrganizationDto)

            // Assert
            expect(result).toBeDefined()
            expect(this.accountAccessService.validateUserAccountAccess).toHaveBeenCalledWith(testUser.id, testAccount.id, 'updateOrganization')
            expect(result).toEqual({
              id: testOrganization.id,
              name: 'Updated Organization Name',
              type: testOrganization.type,
              description: 'Updated Organization Description',
              website: testOrganization.website,
              createdAt: testOrganization.createdAt,
              updatedAt: testOrganization.updatedAt
            })
          })
        })

        it('should return current organization if no fields to update', async () => {
          await successScenario.execute(async () => {
            // Act
            const result = await this.service.updateOrganization(testUser.id, testOrganization.id, {})

            // Assert
            expect(result).toEqual({
              id: testOrganization.id,
              name: testOrganization.name,
              type: testOrganization.type,
              description: testOrganization.description,
              website: testOrganization.website,
              createdAt: testOrganization.createdAt,
              updatedAt: testOrganization.updatedAt
            })

            const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
            expect(prismaServiceAny.organization.update).not.toHaveBeenCalled()
          })
        })
      })

      describe('when organization not found', () => {
        const notFoundScenario = TestScenario.create('organization not found', async () => {
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.organization.findUnique.mockResolvedValue(null)
        })

        it('should throw NotFoundException', async () => {
          await notFoundScenario.execute(async () => {
            // Arrange
            const updateOrganizationDto = {
              name: 'Updated Organization Name'
            }

            // Act & Assert
            await TestAssertions.assertThrows(() => this.service.updateOrganization(testUser.id, 'non-existent-id', updateOrganizationDto), NotFoundException)
          })
        })
      })

      describe('when organization has no linked accounts', () => {
        const noAccountsScenario = TestScenario.create('no linked accounts', async () => {
          const organizationWithoutAccounts = {
            ...testOrganization,
            accountsLinked: []
          }

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.organization.findUnique.mockResolvedValue(organizationWithoutAccounts)
        })

        it('should throw NotFoundException', async () => {
          await noAccountsScenario.execute(async () => {
            // Arrange
            const updateOrganizationDto = {
              name: 'Updated Organization Name'
            }

            // Act & Assert
            await TestAssertions.assertThrows(() => this.service.updateOrganization(testUser.id, testOrganization.id, updateOrganizationDto), NotFoundException)
          })
        })
      })

      describe('when user has no access', () => {
        const unauthorizedScenario = TestScenario.create('unauthorized access', async () => {
          const organizationWithAccounts = {
            ...testOrganization,
            accountsLinked: [{ accountId: testAccount.id }]
          }

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.organization.findUnique.mockResolvedValue(organizationWithAccounts)
          this.accountAccessService.validateUserAccountAccess.mockRejectedValue(new UnauthorizedException())
        })

        it('should throw UnauthorizedException', async () => {
          await unauthorizedScenario.execute(async () => {
            // Arrange
            const updateOrganizationDto = {
              name: 'Updated Organization Name'
            }

            // Act & Assert
            await TestAssertions.assertThrows(() => this.service.updateOrganization(testUser.id, testOrganization.id, updateOrganizationDto), UnauthorizedException)
          })
        })
      })

      describe('when database error occurs', () => {
        const databaseErrorScenario = TestScenario.create('database error', async () => {
          const organizationWithAccounts = {
            ...testOrganization,
            accountsLinked: [{ accountId: testAccount.id }]
          }

          const userAccountLink = TestDataFactory.userAccountLink().withUserId(testUser.id).withAccountId(testAccount.id).build()

          this.accountAccessService.validateUserAccountAccess.mockResolvedValue({
            ...userAccountLink,
            account: testAccount,
            indirectAccess: false
          })

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.organization.findUnique.mockResolvedValue(organizationWithAccounts)
          prismaServiceAny.organization.update.mockRejectedValue(new Error('Database error'))
        })

        it('should throw BadRequestException', async () => {
          await databaseErrorScenario.execute(async () => {
            // Arrange
            const updateOrganizationDto = {
              name: 'Updated Organization Name'
            }

            // Act & Assert
            await TestAssertions.assertThrows(() => this.service.updateOrganization(testUser.id, testOrganization.id, updateOrganizationDto), BadRequestException, 'Failed to update organization')
          })
        })
      })
    })
  }
}

// Execute the tests
describe('OrganizationService (Refactored)', () => {
  const organizationServiceTest = new OrganizationServiceTest()

  beforeEach(async () => {
    await organizationServiceTest.setupTest()
  })

  afterEach(async () => {
    await organizationServiceTest.cleanupTest()
  })

  // Run all test suites
  organizationServiceTest.testFetchOrganization()
  organizationServiceTest.testCreateOrganization()
  organizationServiceTest.testUpdateOrganization()
})
