/**
 * Resources
 */
import { Provider } from '@nestjs/common'

/**
 * Dependencies
 */
import { Logger } from '@common/services/logger/logger.service'
import { PrismaService } from '@configs/prisma/services/prisma.service'
import { ExpiredInvitationsSchedulerService } from '@modules/invitation/services/expired-invitations-scheduler.service'

/**
 * Test infrastructure
 */
import { ServiceTestBase } from '@common/tests/unit/base/service-test-base'
import { mockLogger, mockPrismaService } from '@common/tests/unit/mocks/service-mocks'
import { MockManager, TestScenario } from '@common/tests/unit/utils/advanced-test-utils'

/**
 * Test implementation using the new infrastructure
 */
class ExpiredInvitationsSchedulerServiceTest extends ServiceTestBase<ExpiredInvitationsSchedulerService> {
  private mockManager = new MockManager()
  private logger: jest.Mocked<Logger>
  private prismaService: jest.Mocked<PrismaService>

  protected getServiceClass() {
    return ExpiredInvitationsSchedulerService
  }

  protected getProviders(): Provider[] {
    return [
      { provide: PrismaService, useValue: mockPrismaService },
      { provide: Logger, useValue: mockLogger }
    ]
  }

  protected async customSetup(): Promise<void> {
    // Configure additional Prisma mocks with proper typing
    const prismaServiceAny = mockPrismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
    prismaServiceAny.userToken = {
      findMany: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn()
    }
    prismaServiceAny.invitation = {
      findFirst: jest.fn(),
      update: jest.fn()
    }

    // Get service references
    this.logger = this.getService(Logger)
    this.prismaService = this.getService(PrismaService)
  }

  /**
   * Test handleExpiredInvitations functionality
   */
  testHandleExpiredInvitations(): void {
    describe('handleExpiredInvitations', () => {
      const mockExpiredTokens = [
        {
          id: '1',
          userId: 'user-1',
          token: 'expired-token-1',
          user: {
            email: 'expired1@test.com'
          }
        },
        {
          id: '2',
          userId: 'user-2',
          token: 'expired-token-2',
          user: {
            email: 'expired2@test.com'
          }
        }
      ]

      describe('when successful', () => {
        const successScenario = TestScenario.create('successful handling', async () => {
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.userToken.findMany.mockResolvedValue(mockExpiredTokens)
          prismaServiceAny.invitation.findFirst.mockResolvedValueOnce({ id: 'invitation-1', status: 'SENT' }).mockResolvedValueOnce({ id: 'invitation-2', status: 'SENT' })
        })

        it('should mark expired invitations and delete expired tokens', async () => {
          await successScenario.execute(async () => {
            // Act
            await this.service.handleExpiredInvitations()

            // Assert
            const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
            expect(prismaServiceAny.userToken.findMany).toHaveBeenCalledWith({
              where: {
                type: 'INVITATION',
                expiresAt: {
                  lt: expect.any(Date)
                }
              },
              select: expect.any(Object)
            })

            expect(prismaServiceAny.invitation.findFirst).toHaveBeenCalledTimes(2)
            expect(prismaServiceAny.invitation.update).toHaveBeenCalledTimes(2)
            expect(prismaServiceAny.userToken.delete).toHaveBeenCalledTimes(2)

            expect(prismaServiceAny.invitation.findFirst).toHaveBeenCalledWith({
              where: {
                inviteeUserEmail: 'expired1@test.com',
                status: 'SENT'
              }
            })
            expect(prismaServiceAny.invitation.update).toHaveBeenCalledWith({
              where: { id: 'invitation-1' },
              data: { status: 'EXPIRED' }
            })
            expect(prismaServiceAny.userToken.delete).toHaveBeenCalledWith({
              where: { id: '1' }
            })

            expect(this.logger.debug).toHaveBeenCalledWith('Checking for expired invitations...', 'ExpiredInvitationsSchedulerService')
            expect(this.logger.debug).toHaveBeenCalledWith('Found 2 expired invitation tokens', 'ExpiredInvitationsSchedulerService')
            expect(this.logger.debug).toHaveBeenCalledWith('Finished checking for expired invitations', 'ExpiredInvitationsSchedulerService')
          })
        })
      })

      describe('when no invitations found', () => {
        const noInvitationsScenario = TestScenario.create('no invitations found', async () => {
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.userToken.findMany.mockResolvedValue([mockExpiredTokens[0]])
          prismaServiceAny.invitation.findFirst.mockResolvedValue(null)
        })

        it('should skip invitations that are not found', async () => {
          await noInvitationsScenario.execute(async () => {
            // Act
            await this.service.handleExpiredInvitations()

            // Assert
            const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
            expect(prismaServiceAny.invitation.update).not.toHaveBeenCalled()
            expect(prismaServiceAny.userToken.delete).not.toHaveBeenCalled()
          })
        })
      })

      describe('when no expired tokens', () => {
        const noTokensScenario = TestScenario.create('no expired tokens', async () => {
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.userToken.findMany.mockResolvedValue([])
        })

        it('should handle no expired tokens gracefully', async () => {
          await noTokensScenario.execute(async () => {
            // Act
            await this.service.handleExpiredInvitations()

            // Assert
            const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
            expect(prismaServiceAny.invitation.findFirst).not.toHaveBeenCalled()
            expect(prismaServiceAny.invitation.update).not.toHaveBeenCalled()
            expect(prismaServiceAny.userToken.delete).not.toHaveBeenCalled()
            expect(this.logger.debug).toHaveBeenCalledWith('Found 0 expired invitation tokens', 'ExpiredInvitationsSchedulerService')
          })
        })
      })

      describe('when database error occurs', () => {
        const databaseErrorScenario = TestScenario.create('database error', async () => {
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.userToken.findMany.mockRejectedValue(new Error('Database connection error'))
        })

        it('should handle database errors gracefully', async () => {
          await databaseErrorScenario.execute(async () => {
            // Act
            await this.service.handleExpiredInvitations()

            // Assert
            expect(this.logger.error).toHaveBeenCalledWith('Error checking for expired invitations: Database connection error', 'ExpiredInvitationsSchedulerService')
          })
        })
      })
    })
  }
}

// Execute the tests
describe('ExpiredInvitationsSchedulerService (Refactored)', () => {
  const expiredInvitationsSchedulerServiceTest = new ExpiredInvitationsSchedulerServiceTest()

  beforeEach(async () => {
    await expiredInvitationsSchedulerServiceTest.setupTest()
  })

  afterEach(async () => {
    await expiredInvitationsSchedulerServiceTest.cleanupTest()
  })

  // Run all test suites
  expiredInvitationsSchedulerServiceTest.testHandleExpiredInvitations()
})
