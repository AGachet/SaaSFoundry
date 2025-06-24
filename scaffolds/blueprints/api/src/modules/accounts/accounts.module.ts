/**
 * Resources
 */
import { Module } from '@nestjs/common'

/**
 * Dependencies
 */
import { CommonModule } from '@common/common.module'
import { AccountController } from '@modules/accounts/controllers/account.controller'
import { AccountService } from '@modules/accounts/services/account.service'

/**
 * Declaration
 */
@Module({
  imports: [CommonModule],
  controllers: [AccountController],
  providers: [AccountService]
})
export class AccountsModule {}
