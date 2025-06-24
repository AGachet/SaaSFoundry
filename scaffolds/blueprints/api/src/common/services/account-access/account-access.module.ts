/**
 * Resources
 */
import { Global, Module } from '@nestjs/common'

/**
 * Dependencies
 */
import { LoggerModule } from '@common/services/logger/logger.module'
import { PrismaModule } from '@configs/prisma/prisma.module'
import { AccountAccessService } from './account-access.service'

/**
 * Declaration
 */
@Global()
@Module({
  imports: [PrismaModule, LoggerModule],
  providers: [AccountAccessService],
  exports: [AccountAccessService]
})
export class AccountAccessModule {}
