/**
 * Resources
 */
import { EnvConfig } from '@configs/env/services/env.service'
import { Module } from '@nestjs/common'

/**
 * Services
 */
import { EmailService } from '@modules/email/services/email.service'
import { TranslationService } from '@modules/email/services/translation.service'

/**
 * Declaration
 */
@Module({
  providers: [EmailService, EnvConfig, TranslationService],
  exports: [EmailService]
})
export class EmailModule {}
