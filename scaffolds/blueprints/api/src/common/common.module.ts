import { AccountAccessService } from '@common/services/account-access/account-access.service'
import { Logger } from '@common/services/logger/logger.service'
import { PaginationService } from '@common/services/pagination/pagination.service'
import { Module } from '@nestjs/common'

/**
 * Module for common services, DTOs and utilities used across the application
 */
@Module({
  providers: [Logger, AccountAccessService, PaginationService],
  exports: [Logger, AccountAccessService, PaginationService]
})
export class CommonModule {}
