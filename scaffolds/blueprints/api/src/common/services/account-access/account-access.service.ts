/**
 * Resources
 */
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'

/**
 * Dependencies
 */
import { Logger } from '@common/services/logger/logger.service'
import { PrismaService } from '@configs/prisma/services/prisma.service'

/**
 * Type definitions
 */
export interface UserAccountAccess {
  account: {
    id: string
    name: string
    description: string | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
  }
  userId: string
  accountId: string
  indirectAccess: boolean
}

/**
 * Declaration
 */
@Injectable()
export class AccountAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger
  ) {}

  /**
   * Check if a user has access to a specific account
   * @param userId User ID
   * @param accountId Account ID
   * @param methodName Name of the calling method (for logging)
   * @returns The user-account access information if successful
   * @throws UnauthorizedException if the user doesn't have access to the account
   * @throws NotFoundException if the account doesn't exist
   */
  async validateUserAccountAccess(userId: string, accountId: string, methodName: string): Promise<UserAccountAccess> {
    this.logger.debug(`Validating access for user ${userId} to account ${accountId}`, methodName)

    // First check if the account exists
    const account = await this.prisma.account.findUnique({
      where: { id: accountId }
    })

    if (!account) throw new NotFoundException(`Account with ID ${accountId} not found`)

    // Check for direct link between user and account
    const userAccountLink = await this.prisma.userAccountLink.findUnique({
      where: {
        userId_accountId: {
          userId,
          accountId
        }
      }
    })

    if (userAccountLink) {
      return {
        account,
        userId,
        accountId,
        indirectAccess: false
      }
    }

    // If no direct link, check if the user is linked via an entity associated with the account
    const userEntityLink = await this.prisma.userEntityLink.findFirst({
      where: {
        userId,
        entity: {
          accountId
        }
      }
    })

    if (userEntityLink) {
      return {
        account,
        userId,
        accountId,
        indirectAccess: true
      }
    }

    // If no access found, log and throw an exception
    this.logger.warn(`User ${userId} tried to access unauthorized account ${accountId}`, methodName)
    throw new UnauthorizedException('You do not have access to this account')
  }
}
