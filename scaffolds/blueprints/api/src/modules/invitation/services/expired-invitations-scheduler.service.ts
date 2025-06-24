/**
 * Resources
 */
import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

/**
 * Dependencies
 */
import { Logger } from '@common/services/logger/logger.service'
import { PrismaService } from '@configs/prisma/services/prisma.service'

/**
 * Declaration
 */
@Injectable()
export class ExpiredInvitationsSchedulerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger
  ) {}

  /**
   * Run every week to check for expired invitations
   * and mark them as expired in the database
   */
  @Cron(CronExpression.EVERY_WEEKEND)
  async handleExpiredInvitations() {
    this.logger.debug('Checking for expired invitations...', 'ExpiredInvitationsSchedulerService')

    try {
      // Get all invitation tokens that are expired
      const expiredTokens = await this.prisma.userToken.findMany({
        where: {
          type: 'INVITATION',
          // Find tokens where expiresAt is in the past
          expiresAt: {
            lt: new Date()
          }
        },
        select: {
          id: true,
          userId: true,
          token: true,
          user: {
            select: {
              email: true
            }
          }
        }
      })

      this.logger.debug(`Found ${expiredTokens.length} expired invitation tokens`, 'ExpiredInvitationsSchedulerService')

      // For each expired token, update the corresponding invitation to EXPIRED
      for (const token of expiredTokens) {
        // Find the invitation by user email
        const invitation = await this.prisma.invitation.findFirst({
          where: {
            inviteeUserEmail: token.user.email,
            status: 'SENT'
          }
        })

        if (invitation) {
          // Update invitation status to EXPIRED
          await this.prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: 'EXPIRED' }
          })

          // Delete the expired token
          await this.prisma.userToken.delete({
            where: { id: token.id }
          })

          this.logger.debug(`Marked invitation ${invitation.id} as EXPIRED`, 'ExpiredInvitationsSchedulerService')
        }
      }

      this.logger.debug('Finished checking for expired invitations', 'ExpiredInvitationsSchedulerService')
    } catch (error) {
      this.logger.error(`Error checking for expired invitations: ${error.message}`, 'ExpiredInvitationsSchedulerService')
    }
  }
}
